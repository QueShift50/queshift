import sys
import json
import zlib
import re
import secrets
import socket
import sqlite3
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from datetime import date, timedelta, datetime

from PySide6.QtCore import Qt, QDate
from PySide6.QtWidgets import (
    QApplication,
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QFormLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSpinBox,
    QDateEdit,
    QFileDialog,
    QMessageBox,
    QInputDialog,
    QScrollArea,
    QWidget,
)

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


APP_TITLE = "Queshift Activation Tool"
TOOL_VERSION = "0.6.4"
LICENSE_MAGIC = b"QSLIC1\x00"

# v0.6.3
# Primary route = the same Cloudflare Worker used by the Queshift website.
# Fallback = the CURRENT Apps Script deployment URL.
#
# This fixes the old hard-coded deployment URL that could leave Verify Order
# stuck/failing after the website backend was moved/updated.
WEBSITE_API_URL = (
    "https://throbbing-voice-37c5.info-queshift.workers.dev"
)

WEBSITE_API_FALLBACK_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbyOTDyjMh1tz3Lho6wnWprB_DdZtf9MC-ONyux3n-ezh8M1OLHbj5tXuonkzNVwckrCXQ/exec"
)

BACKEND_ENDPOINTS = (
    WEBSITE_API_URL,
    WEBSITE_API_FALLBACK_URL,
)

DEV_ROOT = Path(r"C:\QueshiftDev")
PRIVATE_ROOT = DEV_ROOT / "PRIVATE" / "LicenseKeys"
RELEASE_LICENSE_ROOT = DEV_ROOT / "Releases" / "Licenses"

PRIVATE_KEY_PATH = PRIVATE_ROOT / "queshift_private_key.pem"
PUBLIC_KEY_PATH = PRIVATE_ROOT / "queshift_public_key.pem"
ISSUED_DB_PATH = PRIVATE_ROOT / "issued_activations.db"

DEV_CLIENT_PUBLIC_KEY = Path(
    r"C:\QUESHIFTWIN\bin\License\queshift_public_key.pem"
)


def ensure_folders():
    PRIVATE_ROOT.mkdir(parents=True, exist_ok=True)
    RELEASE_LICENSE_ROOT.mkdir(parents=True, exist_ok=True)
    DEV_CLIENT_PUBLIC_KEY.parent.mkdir(parents=True, exist_ok=True)
    initialize_issued_database()


def initialize_issued_database():
    """
    v0.6:
    - Same Order ID may be issued many times.
    - Machine Request Code remains one-time.
    - License ID remains unique.
    - Existing v0.4 database is migrated without deleting old activation history.
    """
    with sqlite3.connect(ISSUED_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS issued_activations
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL,
                request_code TEXT NOT NULL UNIQUE,
                license_id TEXT NOT NULL UNIQUE,
                client_name TEXT,
                email TEXT,
                plan TEXT,
                activation_date TEXT,
                end_date TEXT,
                issued_at TEXT NOT NULL
            )
            """
        )
        conn.commit()

        # Detect the old UNIQUE(order_id) rule.
        order_is_unique = False
        for index_row in conn.execute(
            "PRAGMA index_list(issued_activations)"
        ).fetchall():
            # seq, name, unique, origin, partial
            if len(index_row) < 3 or not int(index_row[2] or 0):
                continue
            index_name = str(index_row[1])
            cols = [
                str(r[2])
                for r in conn.execute(
                    f'PRAGMA index_info("{index_name}")'
                ).fetchall()
            ]
            if cols == ["order_id"]:
                order_is_unique = True
                break

        if order_is_unique:
            conn.execute("BEGIN IMMEDIATE")
            try:
                conn.execute(
                    """
                    CREATE TABLE issued_activations_v06
                    (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id TEXT NOT NULL,
                        request_code TEXT NOT NULL UNIQUE,
                        license_id TEXT NOT NULL UNIQUE,
                        client_name TEXT,
                        email TEXT,
                        plan TEXT,
                        activation_date TEXT,
                        end_date TEXT,
                        issued_at TEXT NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    INSERT OR IGNORE INTO issued_activations_v06
                    (
                        id,
                        order_id,
                        request_code,
                        license_id,
                        client_name,
                        email,
                        plan,
                        activation_date,
                        end_date,
                        issued_at
                    )
                    SELECT
                        id,
                        order_id,
                        request_code,
                        license_id,
                        client_name,
                        email,
                        plan,
                        activation_date,
                        end_date,
                        issued_at
                    FROM issued_activations
                    """
                )
                conn.execute("DROP TABLE issued_activations")
                conn.execute(
                    "ALTER TABLE issued_activations_v06 "
                    "RENAME TO issued_activations"
                )
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS
            IX_issued_activations_order
            ON issued_activations(order_id)
            """
        )
        conn.commit()


def local_activation_exists(order_id=None, request_code=None):
    """
    Order ID is intentionally reusable in v0.6.

    Local protection remains only for a Machine Request Code so the exact
    same one-time challenge is not issued twice from this owner tool.
    """
    if not request_code:
        return False

    with sqlite3.connect(ISSUED_DB_PATH) as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM issued_activations
            WHERE UPPER(request_code)=UPPER(?)
            LIMIT 1
            """,
            (request_code.strip(),),
        ).fetchone()
        return bool(row)


def record_local_activation(payload):
    with sqlite3.connect(ISSUED_DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO issued_activations
            (
                order_id,
                request_code,
                license_id,
                client_name,
                email,
                plan,
                activation_date,
                end_date,
                issued_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["order_id"],
                payload["request_code"],
                payload["license_id"],
                payload.get("client", ""),
                payload.get("email", ""),
                payload.get("plan", ""),
                payload["activation_date"],
                payload["end_date"],
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        conn.commit()


def valid_machine_code(value):
    text = str(value or "").strip().upper()
    return bool(
        re.fullmatch(
            r"QS-(?:[A-Z0-9]{4}-){5}[A-Z0-9]{4}",
            text,
        )
    )


def _post_one_backend(endpoint, action, payload, security_code, timeout):
    body = urllib.parse.urlencode(
        {
            "action": action,
            "payload": json.dumps(payload or {}, ensure_ascii=False),
            "credential": security_code or "",
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "User-Agent": f"Queshift-Activation-Tool/{TOOL_VERSION}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Cache-Control": "no-cache",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=timeout,
        ) as response:
            raw = response.read().decode(
                "utf-8",
                "replace",
            )

    except urllib.error.HTTPError as exc:
        # A real HTTP response was received. This endpoint is reachable but failed.
        raise RuntimeError(
            f"Backend HTTP {exc.code}."
        ) from exc

    except (
        urllib.error.URLError,
        socket.timeout,
        TimeoutError,
    ) as exc:
        # Network/route failure. Caller may try the fallback endpoint.
        raise ConnectionError(
            "Unable to connect to this backend route."
        ) from exc

    try:
        data = json.loads(raw)
    except Exception as exc:
        # HTML/Drive/login page or malformed response => route is unusable.
        preview = re.sub(
            r"\s+",
            " ",
            str(raw or ""),
        )[:160]
        raise ConnectionError(
            "Backend returned a non-JSON response."
            + (f" Response: {preview}" if preview else "")
        ) from exc

    if not isinstance(data, dict):
        raise ConnectionError(
            "Backend returned an invalid response object."
        )

    if not data.get("ok"):
        message = (
            str(data.get("message") or "")
            or "Website verification failed."
        )

        # Worker connectivity failures should try the direct Apps Script fallback.
        # Real Queshift validation errors must still be shown immediately.
        if "workers.dev" in endpoint and (
            "proxy could not reach" in message.lower()
            or "upstream" in message.lower()
            or "google apps script" in message.lower()
        ):
            raise ConnectionError(message)

        raise RuntimeError(message)

    return data.get("data") or {}


def post_backend(action, payload, security_code):
    """
    v0.6.3 robust backend routing.

    Primary:
        Cloudflare Worker used by queshift.in

    Fallback:
        Current Apps Script /exec deployment

    Fallback is used only for connectivity/invalid-route problems.
    Real Queshift validation errors are returned immediately.
    """
    errors = []

    # Lookup is normally quick; commit can take longer because it writes audit
    # and activation history.
    timeout = 60 if action == "activationCommit" else 40

    for endpoint in BACKEND_ENDPOINTS:
        try:
            return _post_one_backend(
                endpoint,
                action,
                payload,
                security_code,
                timeout,
            )

        except ConnectionError as exc:
            errors.append(
                f"{endpoint}: {exc}"
            )
            continue

        except RuntimeError:
            raise

    raise RuntimeError(
        "Unable to connect to the Queshift activation backend.\n\n"
        "Both the secure website route and direct Apps Script fallback failed.\n\n"
        + "\n".join(errors)
    )



class ActivationTool(QDialog):

    def __init__(self):
        super().__init__()
        ensure_folders()

        self.output_folder = RELEASE_LICENSE_ROOT
        self.verified_order = None

        self.setWindowTitle(APP_TITLE)

        screen = QApplication.primaryScreen().availableGeometry()
        width = min(900, max(700, screen.width() - 80))
        height = min(820, max(540, screen.height() - 80))

        self.resize(width, height)
        self.setMaximumSize(
            max(700, screen.width() - 20),
            max(540, screen.height() - 20),
        )

        self.build_ui()
        self.update_key_status()
        self.invalidate_verification()

    # ========================================================
    # UI
    # ========================================================

    def build_ui(self):
        outer = QVBoxLayout(self)
        outer.setContentsMargins(8, 8, 8, 8)

        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.NoFrame)

        body = QWidget()
        root = QVBoxLayout(body)
        root.setContentsMargins(12, 8, 12, 10)
        root.setSpacing(8)

        scroll.setWidget(body)
        outer.addWidget(scroll)

        title = QLabel("QUESHIFT ACTIVATION GENERATOR")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet(
            "font-size:25px;font-weight:900;color:#075E9C;"
        )
        root.addWidget(title)

        subtitle = QLabel(
            "Owner / Administrator Tool — Never share this tool with clients"
        )
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet(
            "color:#B42318;font-weight:700;"
        )
        root.addWidget(subtitle)

        self.lbl_keys = QLabel()
        self.lbl_keys.setAlignment(Qt.AlignCenter)
        root.addWidget(self.lbl_keys)

        self.lbl_backend = QLabel(
            "Backend: Queshift secure Worker + direct Apps Script fallback"
        )
        self.lbl_backend.setAlignment(Qt.AlignCenter)
        self.lbl_backend.setStyleSheet(
            "color:#344054;font-weight:700;"
        )
        root.addWidget(self.lbl_backend)

        keys_row = QHBoxLayout()
        self.btn_create_keys = QPushButton("CREATE / RESET MASTER KEYS")
        self.btn_copy_public = QPushButton("COPY PUBLIC KEY FOR DEV TEST")
        self.btn_test_backend = QPushButton("TEST BACKEND CONNECTION")
        keys_row.addWidget(self.btn_create_keys)
        keys_row.addWidget(self.btn_copy_public)
        keys_row.addWidget(self.btn_test_backend)
        root.addLayout(keys_row)

        # ----------------------------------------------------
        # STEP 1 - ORDER LOOKUP
        # ----------------------------------------------------
        step1 = QLabel("STEP 1 — VERIFY WEBSITE ORDER")
        step1.setStyleSheet(
            "font-size:17px;font-weight:900;color:#075E9C;margin-top:8px;"
        )
        root.addWidget(step1)

        form1 = QFormLayout()

        self.txt_order = QLineEdit()
        self.txt_order.setPlaceholderText("Website Order ID / Serial No.")

        verify_row = QHBoxLayout()
        self.btn_verify = QPushButton("VERIFY ORDER ID")
        self.lbl_verify = QLabel("NOT VERIFIED")
        self.lbl_verify.setStyleSheet(
            "color:#B42318;font-weight:900;"
        )
        verify_row.addWidget(self.btn_verify)
        verify_row.addWidget(self.lbl_verify, 1)

        self.txt_client = QLineEdit()
        self.txt_client.setReadOnly(True)

        self.txt_email = QLineEdit()
        self.txt_email.setReadOnly(True)

        self.txt_plan = QLineEdit()
        self.txt_plan.setReadOnly(True)

        self.txt_sub_start = QLineEdit()
        self.txt_sub_start.setReadOnly(True)

        self.txt_expiry = QLineEdit()
        self.txt_expiry.setReadOnly(True)

        self.txt_plan_days = QLineEdit()
        self.txt_plan_days.setReadOnly(True)

        self.txt_remaining = QLineEdit()
        self.txt_remaining.setReadOnly(True)

        form1.addRow("Serial No. / Order ID:", self.txt_order)
        form1.addRow("Website Check:", verify_row)
        form1.addRow("Verified Client:", self.txt_client)
        form1.addRow("Verified Email:", self.txt_email)
        form1.addRow("Website Plan:", self.txt_plan)
        form1.addRow("Subscription Start:", self.txt_sub_start)
        form1.addRow("Subscription Expiry:", self.txt_expiry)
        form1.addRow("Plan Days:", self.txt_plan_days)
        form1.addRow("Days Remaining Today:", self.txt_remaining)
        root.addLayout(form1)

        # ----------------------------------------------------
        # STEP 2 - MACHINE + OWNER KEY
        # ----------------------------------------------------
        step2 = QLabel("STEP 2 — MACHINE REQUEST CODE + MASTER KEY")
        step2.setStyleSheet(
            "font-size:17px;font-weight:900;color:#075E9C;margin-top:8px;"
        )
        root.addWidget(step2)

        form2 = QFormLayout()

        self.txt_machine = QLineEdit()
        self.txt_machine.setPlaceholderText(
            "Paste the client's NEW Machine Request Code"
        )

        self.txt_security = QLineEdit()
        self.txt_security.setEchoMode(QLineEdit.Password)
        self.txt_security.setPlaceholderText("Master Security Code")

        self.txt_license_id = QLineEdit()
        self.txt_license_id.setReadOnly(True)
        self.txt_license_id.setPlaceholderText(
            "Generated automatically"
        )

        self.txt_output = QLineEdit(str(self.output_folder))
        self.txt_output.setReadOnly(True)
        self.btn_output = QPushButton("SELECT OUTPUT FOLDER")

        output_row = QHBoxLayout()
        output_row.addWidget(self.txt_output, 1)
        output_row.addWidget(self.btn_output)

        form2.addRow("Machine Request Code:", self.txt_machine)
        form2.addRow("Master Security Code:", self.txt_security)
        form2.addRow("License ID:", self.txt_license_id)
        form2.addRow("Output:", output_row)

        root.addLayout(form2)

        info = QLabel(
            "v0.6.2 Re-activation Rules:\n"
            "• The same Website Order ID may be used again after PC format/reinstall.\n"
            "• STEP 1 always reads the CURRENT subscription dates from the website Google Sheet.\n"
            "• Re-activation never resets or extends the existing subscription expiry date.\n"
            "• The generated license starts from today (or the future subscription start date) "
            "and ends on the SAME website expiry date.\n"
            "• Therefore only the actual remaining period is issued to the reformatted PC.\n"
            "• Every Machine Request Code remains one-time and machine-bound.\n"
            "• Every issue/re-issue is recorded as a new row in ACTIVATIONS for audit history."
        )
        info.setWordWrap(True)
        info.setStyleSheet(
            "background:#FFF8E1;border:1px solid #F3C96B;"
            "border-radius:6px;padding:8px;color:#6B4F00;"
        )
        root.addWidget(info)

        root.addStretch()

        bottom = QHBoxLayout()
        self.btn_generate = QPushButton("GENERATE ACTIVATION FILE")
        self.btn_close = QPushButton("CLOSE")
        self.btn_generate.setMinimumHeight(45)
        self.btn_close.setMinimumHeight(45)
        bottom.addWidget(self.btn_generate, 1)
        bottom.addWidget(self.btn_close)
        root.addLayout(bottom)

        self.setStyleSheet(
            """
            QDialog{background:#F7FBFF;font-size:12px;}
            QLineEdit{
                min-height:34px;
                border:1px solid #AFC5D3;
                border-radius:5px;
                padding:3px 7px;
                background:white;
            }
            QPushButton{
                padding:8px;
                border-radius:6px;
                background:#EAF5FC;
                border:1px solid #93BDD6;
                font-weight:800;
                color:#075E9C;
            }
            QPushButton:hover{background:#D7ECF8;}
            QPushButton:disabled{
                background:#E4E7EC;
                color:#98A2B3;
                border-color:#D0D5DD;
            }
            """
        )

        self.btn_create_keys.clicked.connect(self.create_master_keys)
        self.btn_copy_public.clicked.connect(self.copy_public_for_dev)
        self.btn_test_backend.clicked.connect(self.test_backend_connection)
        self.btn_output.clicked.connect(self.choose_output)
        self.btn_verify.clicked.connect(self.verify_order)
        self.btn_generate.clicked.connect(self.generate_license)
        self.btn_close.clicked.connect(self.reject)

        # Changing Order ID invalidates STEP 1.
        self.txt_order.textChanged.connect(self.invalidate_verification)

        # Machine/security are STEP 2 only; changing them does not throw away
        # the successful website order lookup.
        self.txt_machine.textChanged.connect(self.update_generate_state)
        self.txt_security.textChanged.connect(self.update_generate_state)

    # ========================================================
    # Key management
    # ========================================================
    def update_key_status(self):
        if PRIVATE_KEY_PATH.exists() and PUBLIC_KEY_PATH.exists():
            self.lbl_keys.setText("Master signing keys: READY")
            self.lbl_keys.setStyleSheet(
                "color:#067647;font-weight:800;"
            )
        else:
            self.lbl_keys.setText("Master signing keys: NOT CREATED")
            self.lbl_keys.setStyleSheet(
                "color:#B42318;font-weight:800;"
            )

    def ask_new_security_code(self):
        first, ok = QInputDialog.getText(
            self,
            "Master Security Code",
            "Create Master Security Code:",
            QLineEdit.Password,
        )
        if not ok or len(first) < 8:
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Security code must contain at least 8 characters.",
            )
            return None

        second, ok = QInputDialog.getText(
            self,
            "Confirm Security Code",
            "Confirm Master Security Code:",
            QLineEdit.Password,
        )
        if not ok or first != second:
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Security codes do not match.",
            )
            return None

        return first

    def create_master_keys(self):
        if PRIVATE_KEY_PATH.exists():
            answer = QMessageBox.warning(
                self,
                APP_TITLE,
                "Master keys already exist.\n\n"
                "Resetting them changes the signing identity and can make "
                "old licenses incompatible with the new public key.\n\n"
                "Continue only during initial setup.",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No,
            )
            if answer != QMessageBox.Yes:
                return

        security_code = self.ask_new_security_code()
        if not security_code:
            return

        try:
            private_key = Ed25519PrivateKey.generate()

            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.BestAvailableEncryption(
                    security_code.encode("utf-8")
                ),
            )

            public_pem = private_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )

            PRIVATE_KEY_PATH.write_bytes(private_pem)
            PUBLIC_KEY_PATH.write_bytes(public_pem)
            DEV_CLIENT_PUBLIC_KEY.write_bytes(public_pem)

            self.update_key_status()

            QMessageBox.information(
                self,
                APP_TITLE,
                "Master keys created successfully.\n\n"
                "IMPORTANT:\n"
                "1. Use the SAME Master Security Code in Apps Script property "
                "ACTIVATION_ADMIN_CODE.\n"
                "2. Back up the PRIVATE LicenseKeys folder in at least two "
                "protected locations.",
            )

        except Exception as exc:
            QMessageBox.critical(
                self,
                APP_TITLE,
                f"Unable to create master keys.\n\n{exc}",
            )

    def copy_public_for_dev(self):
        if not PUBLIC_KEY_PATH.exists():
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Create master keys first.",
            )
            return

        try:
            DEV_CLIENT_PUBLIC_KEY.parent.mkdir(
                parents=True,
                exist_ok=True,
            )
            DEV_CLIENT_PUBLIC_KEY.write_bytes(
                PUBLIC_KEY_PATH.read_bytes()
            )
            QMessageBox.information(
                self,
                APP_TITLE,
                "Public verification key copied for Queshift development testing.",
            )
        except Exception as exc:
            QMessageBox.critical(
                self,
                APP_TITLE,
                f"Unable to copy public key.\n\n{exc}",
            )

    def test_backend_connection(self):
        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            data = post_backend(
                "postHealth",
                {},
                "",
            )
            QMessageBox.information(
                self,
                APP_TITLE,
                "Backend connection is working.\n\n"
                f"Status: {data.get('status', 'ok')}\n"
                f"Build: {data.get('build', '')}\n"
                f"Time: {data.get('time', '')}",
            )
        except Exception as exc:
            QMessageBox.critical(
                self,
                APP_TITLE,
                "Backend test failed.\n\n"
                + str(exc),
            )
        finally:
            QApplication.restoreOverrideCursor()


    # ========================================================
    # Verification state
    # ========================================================

    def invalidate_verification(self, *args):
        self.verified_order = None

        self.lbl_verify.setText("NOT VERIFIED")
        self.lbl_verify.setStyleSheet(
            "color:#B42318;font-weight:900;"
        )

        for widget in (
            self.txt_client,
            self.txt_email,
            self.txt_plan,
            self.txt_sub_start,
            self.txt_expiry,
            self.txt_plan_days,
            self.txt_remaining,
            self.txt_license_id,
        ):
            widget.clear()

        self.txt_machine.clear()
        self.txt_security.clear()
        self.txt_machine.setEnabled(False)
        self.txt_security.setEnabled(False)
        self.btn_generate.setEnabled(False)


    def update_generate_state(self, *args):
        ready = bool(
            self.verified_order
            and valid_machine_code(
                self.txt_machine.text()
            )
            and self.txt_security.text()
        )
        self.btn_generate.setEnabled(ready)


    def verify_order(self):
        """
        STEP 1:
        Only Order ID is required.

        The website returns the current subscription dates and remaining days.
        Order reuse is allowed. Machine Request Code + Master Security Code are
        entered only after this lookup succeeds.
        """
        order_id = self.txt_order.text().strip()

        if not order_id:
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Enter the Website Order ID / Serial No.",
            )
            return

        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            data = post_backend(
                "activationVerifyOrder",
                {
                    "orderId": order_id,
                    "lookupOnly": True,
                },
                "",
            )

            if not data.get("verified"):
                raise RuntimeError(
                    "The website order could not be verified."
                )

            self.verified_order = data

            self.txt_client.setText(
                str(
                    data.get("company")
                    or data.get("name")
                    or ""
                )
            )
            self.txt_email.setText(
                str(data.get("email") or "")
            )
            self.txt_plan.setText(
                str(data.get("plan") or "")
            )
            self.txt_sub_start.setText(
                str(data.get("subscriptionStartDate") or "")
            )
            self.txt_expiry.setText(
                str(data.get("expiryDate") or "")
            )
            self.txt_plan_days.setText(
                str(data.get("planDays") or "")
            )
            self.txt_remaining.setText(
                str(data.get("remainingDays") or 0)
            )

            self.lbl_verify.setText("VERIFIED ✓")
            self.lbl_verify.setStyleSheet(
                "color:#067647;font-weight:900;"
            )

            self.txt_machine.setEnabled(True)
            self.txt_security.setEnabled(True)
            self.txt_machine.setFocus()
            self.update_generate_state()

            QMessageBox.information(
                self,
                APP_TITLE,
                "Website Order ID verified successfully.\n\n"
                f"Subscription Expiry: {data.get('expiryDate')}\n"
                f"Days Remaining: {data.get('remainingDays')}\n\n"
                "Now enter the client's Machine Request Code and "
                "your Master Security Code.",
            )

        except Exception as exc:
            self.invalidate_verification()
            QMessageBox.warning(
                self,
                APP_TITLE,
                str(exc),
            )
        finally:
            QApplication.restoreOverrideCursor()

    # ========================================================
    # Dates / output
    # ========================================================

    def calculate_end_date(self):
        # v0.6 dates are authoritative website subscription values.
        # No local/manual recalculation is performed.
        return

    def choose_output(self):
        folder = QFileDialog.getExistingDirectory(
            self,
            "Select Activation Output Folder",
            str(self.output_folder),
        )
        if folder:
            self.output_folder = Path(folder)
            self.txt_output.setText(str(self.output_folder))

    def load_private_key(self):
        if not PRIVATE_KEY_PATH.exists():
            raise FileNotFoundError(
                "Master signing keys have not been created."
            )

        password = self.txt_security.text()
        if not password:
            raise ValueError("Enter the Master Security Code.")

        return serialization.load_pem_private_key(
            PRIVATE_KEY_PATH.read_bytes(),
            password=password.encode("utf-8"),
        )

    # ========================================================
    # License generation
    # ========================================================

    def generate_license(self):
        if not self.verified_order:
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Verify the Website Order ID first.",
            )
            return

        order_id = self.txt_order.text().strip()
        machine_code = self.txt_machine.text().strip().upper()
        security_code = self.txt_security.text()

        if not valid_machine_code(machine_code):
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Paste a valid NEW Queshift Machine Request Code from the client.",
            )
            return

        if not security_code:
            QMessageBox.warning(
                self,
                APP_TITLE,
                "Enter the Master Security Code.",
            )
            return

        # Order ID is reusable. The exact Machine Request Code is not.
        if local_activation_exists(request_code=machine_code):
            QMessageBox.warning(
                self,
                APP_TITLE,
                "This Machine Request Code has already been issued from this owner tool.\n\n"
                "Ask the client to copy the current/new Machine Request Code shown by Queshift.",
            )
            return

        QApplication.setOverrideCursor(Qt.WaitCursor)
        output = None

        try:
            # STEP 2 secure validation:
            # - same reusable Order ID
            # - current subscription still active
            # - machine code not already issued
            # - Master Security Code valid
            verified = post_backend(
                "activationVerifyOrder",
                {
                    "orderId": order_id,
                    "machineCode": machine_code,
                },
                security_code,
            )

            if not verified.get("verified"):
                raise RuntimeError(
                    "Website activation verification failed."
                )

            private_key = self.load_private_key()

            client = (
                str(verified.get("company") or "").strip()
                or str(verified.get("name") or "").strip()
                or str(verified.get("email") or "").strip()
                or "Client"
            )

            license_start = str(
                verified.get("licenseStartDate") or ""
            ).strip()

            expiry_date = str(
                verified.get("expiryDate") or ""
            ).strip()

            remaining_days = int(
                verified.get("remainingDays")
            )

            if not license_start or not expiry_date:
                raise RuntimeError(
                    "Website subscription dates are incomplete."
                )

            # 0 Days Left means the subscription is still valid today and
            # expires at the end date; main Queshift validates by end_date.
            if remaining_days < 0:
                raise RuntimeError(
                    "The website subscription has expired."
                )

            # Refresh visible STEP 1 values in case the sheet was updated
            # between lookup and generation.
            self.txt_client.setText(client)
            self.txt_email.setText(
                str(verified.get("email") or "")
            )
            self.txt_plan.setText(
                str(verified.get("plan") or "")
            )
            self.txt_sub_start.setText(
                str(verified.get("subscriptionStartDate") or "")
            )
            self.txt_expiry.setText(expiry_date)
            self.txt_plan_days.setText(
                str(verified.get("planDays") or "")
            )
            self.txt_remaining.setText(
                str(remaining_days)
            )

            license_id = (
                "QSLIC-"
                + "".join(
                    secrets.choice(
                        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
                    )
                    for _ in range(20)
                )
            )
            self.txt_license_id.setText(license_id)

            payload = {
                "product": "Queshift",
                "license_version": 2,
                "license_id": license_id,
                "order_id": order_id,
                "client": client,
                "email": str(verified.get("email") or ""),
                "plan": str(verified.get("plan") or ""),
                "request_code": machine_code,
                "machine_code": machine_code,
                "activation_date": license_start,
                "days": remaining_days,
                "end_date": expiry_date,
                "issued_on": date.today().isoformat(),
                "subscription_start_date": str(
                    verified.get("subscriptionStartDate") or ""
                ),
                "reactivation": bool(
                    int(verified.get("previousIssueCount") or 0) > 0
                ),
            }

            canonical = json.dumps(
                payload,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")

            compressed = zlib.compress(canonical, 9)
            signature = private_key.sign(compressed)

            raw = (
                LICENSE_MAGIC
                + len(compressed).to_bytes(4, "big")
                + compressed
                + signature
            )

            self.output_folder.mkdir(
                parents=True,
                exist_ok=True,
            )

            safe_client = re.sub(
                r"[^A-Za-z0-9_-]+",
                "_",
                client,
            ).strip("_") or "Client"

            output = (
                self.output_folder
                / (
                    f"activation_{safe_client}_{order_id}_"
                    f"{license_id[-8:]}.qlic"
                )
            )
            output.write_bytes(raw)

            # Commit must match exactly what was signed.
            committed = post_backend(
                "activationCommit",
                {
                    "orderId": order_id,
                    "machineCode": machine_code,
                    "licenseId": license_id,
                    "activationDate": license_start,
                    "endDate": expiry_date,
                    "days": remaining_days,
                },
                security_code,
            )

            if not committed.get("committed"):
                raise RuntimeError(
                    "Website activation record could not be completed."
                )

            record_local_activation(payload)

            QApplication.restoreOverrideCursor()

            issue_type = (
                "RE-ACTIVATION"
                if int(
                    committed.get("previousIssueCount")
                    or verified.get("previousIssueCount")
                    or 0
                ) > 0
                else "ACTIVATION"
            )

            QMessageBox.information(
                self,
                APP_TITLE,
                f"{issue_type} FILE GENERATED SUCCESSFULLY.\n\n"
                f"Order ID: {order_id}\n"
                f"License ID: {license_id}\n"
                f"License Start: {license_start}\n"
                f"Subscription Expiry: {expiry_date}\n"
                f"Days Remaining: {remaining_days}\n\n"
                "The Website Order ID remains reusable for future PC format/reinstall.\n"
                "The same Machine Request Code cannot be issued twice.",
            )

            # Keep Order lookup visible, but require a new machine/key for
            # another issue.
            self.txt_machine.clear()
            self.txt_security.clear()
            self.btn_generate.setEnabled(False)
            self.lbl_verify.setText("VERIFIED — ACTIVATION ISSUED ✓")
            self.lbl_verify.setStyleSheet(
                "color:#067647;font-weight:900;"
            )

        except (TypeError, ValueError) as exc:
            QApplication.restoreOverrideCursor()

            if output and output.exists():
                try:
                    output.unlink()
                except Exception:
                    pass

            QMessageBox.warning(
                self,
                APP_TITLE,
                "Master Security Code is incorrect, the signing key could not "
                "be opened, or the website subscription values are invalid.\n\n"
                f"{exc}",
            )

        except Exception as exc:
            QApplication.restoreOverrideCursor()

            if output and output.exists():
                try:
                    output.unlink()
                except Exception:
                    pass

            QMessageBox.critical(
                self,
                APP_TITLE,
                f"Activation could not be completed.\n\n{exc}",
            )


def main():
    app = QApplication(sys.argv)
    app.setApplicationName(APP_TITLE)
    window = ActivationTool()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
