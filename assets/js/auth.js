(function () {
  "use strict";
  const root = document.querySelector("[data-google-login]"); if (!root) return;
  const isAdmin = root.dataset.mode === "admin", status = document.querySelector("[data-auth-status]");
  const requested = new URLSearchParams(location.search).get("next") || "";
  const safeNext = /^(?:[a-z0-9-]+\.html(?:[?#][^\s]*)?|index\.html#[^\s]*)$/i.test(requested) && !requested.includes("//") ? requested : "";
  const next = safeNext || (isAdmin ? "admin-dashboard.html" : "dashboard.html");
  function message(text, error) { if (status) { status.textContent = text; status.classList.toggle("error", !!error); } }
  async function callback(response) {
    message("Verifying your Google account…");
    try {
      const data = await QSApi.post(isAdmin ? "adminLogin" : "login", {}, response.credential);
      QSApi.setSession(response.credential, data);
      location.href = next;
    } catch (error) { message(error.message, true); }
  }
  function start() {
    if (!QSApi.isConfigured() || !QSApi.cfg.googleClientId || QSApi.cfg.googleClientId.startsWith("PASTE_")) {
      message("Secure Google login setup is pending. Complete SETUP-GUIDE before testing login.", true); return;
    }
    if (!(window.google && google.accounts && google.accounts.id)) return setTimeout(start, 250);
    google.accounts.id.initialize({ client_id: QSApi.cfg.googleClientId, callback, auto_select: false, cancel_on_tap_outside: true });
    google.accounts.id.renderButton(root, { theme: "filled_blue", size: "large", shape: "pill", text: isAdmin ? "signin_with" : "continue_with", width: Math.min(360, root.clientWidth || 360) });
  }
  window.addEventListener("load", start);
})();
