(function () {
  "use strict";

  const modal = document.querySelector("[data-trial-modal]");
  if (!modal) return;

  const states = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

  const state = modal.querySelector("[data-trial-state]");
  if (state) state.innerHTML = '<option value="">Select State</option>' + states.map(x => `<option>${x}</option>`).join("");

  const detailsForm = modal.querySelector("[data-trial-form]");
  const otpForm = modal.querySelector("[data-otp-form]");
  const status = modal.querySelector("[data-trial-status]");
  const steps = [...modal.querySelectorAll("[data-trial-step]")];
  const openButton = document.querySelector("[data-open-trial]");
  const availabilityBox = document.querySelector("[data-trial-availability]");
  const availabilityTitle = document.querySelector("[data-trial-availability-title]");
  const availabilityMessage = document.querySelector("[data-trial-availability-message]");
  const readyDownloadButton = modal.querySelector("[data-ready-download]");

  let details = {};
  let downloadUrl = "";
  let trialConfig = {};

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function show(name) {
    steps.forEach(step => step.hidden = step.dataset.trialStep !== name);
    note("");
  }

  function note(message, error) {
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("error", !!error);
  }

  function open() {
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    detailsForm.reset();
    otpForm.reset();
    details = {};
    downloadUrl = "";
    show("details");
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove("no-scroll");
  }

  if (openButton) openButton.addEventListener("click", open);
  modal.querySelector("[data-close-trial]").addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });

  function applyConfig(trial) {
    trialConfig = trial || {};

    const version = document.querySelector("[data-trial-version]");
    const days = document.querySelector("[data-trial-days]");
    const req = document.querySelector("[data-trial-requirement]");
    const instructions = document.querySelector("[data-trial-instructions]");

    if (version) version.textContent = trialConfig.version ? `Version ${trialConfig.version}` : "Current trial build";
    if (days) days.textContent = `${trialConfig.days || 15}-day trial`;
    if (req && trialConfig.requirements) req.textContent = trialConfig.requirements;
    if (instructions && trialConfig.instructions) {
      instructions.innerHTML = String(trialConfig.instructions).split(/\n+/).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("");
    }

    const comingSoon = !trialConfig.downloadReady || trialConfig.availability === "COMING_SOON";
    if (availabilityBox) availabilityBox.classList.toggle("is-ready", !comingSoon);
    if (availabilityTitle) availabilityTitle.textContent = comingSoon ? "Trial Download: Coming Soon" : "Trial Download: Available Now";
    if (availabilityMessage) availabilityMessage.textContent = trialConfig.message || (comingSoon
      ? "Register and verify your email now. When the trial is released, the same verified email or phone number will still get one download chance."
      : "The Queshift trial setup is available after OTP verification.");

    // Important: Coming Soon does NOT disable registration. The customer may register now.
    if (openButton) {
      openButton.disabled = false;
      openButton.textContent = comingSoon ? "Register for Trial – Coming Soon →" : "Download Free Trial →";
    }
  }

  detailsForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!QSApi.isConfigured()) return note("Google backend is not connected yet.", true);

    const raw = Object.fromEntries(new FormData(detailsForm));
    details = {
      name: raw.name || "",
      company: raw.company || raw.firm || "",
      email: String(raw.email || "").trim().toLowerCase(),
      phone: String(raw.phone || "").replace(/\D/g, ""),
      state: raw.state || "",
      pin: raw.pin || "",
      terms: raw.terms || ""
    };

    note("Sending a secure OTP to your email…");
    try {
      const result = await QSApi.post("trialRequestOtp", details);
      applyConfig(result.trial || trialConfig);
      modal.querySelector("[data-otp-sent]").textContent = `OTP sent to ${result.email || "your email"}. It is valid for ${result.expiresInMinutes || 10} minutes.`;
      show("otp");
    } catch (error) {
      note(error.message, true);
    }
  });

  otpForm.addEventListener("submit", async event => {
    event.preventDefault();
    note("Checking OTP…");

    try {
      const result = await QSApi.post("trialVerifyOtp", {
        email: details.email,
        otp: otpForm.otp.value
      });

      applyConfig(result.trial || trialConfig);

      if (!result.downloadReady || result.availability === "COMING_SOON") {
        const msg = modal.querySelector("[data-coming-soon-message]");
        if (msg) msg.textContent = result.message || "Coming Soon. Your verified details have been saved.";
        show("coming-soon");
        return;
      }

      downloadUrl = result.downloadUrl || "";
      const readyMsg = modal.querySelector("[data-ready-message]");
      if (readyMsg) readyMsg.textContent = result.message || "OTP verified. Your one-time trial download is ready.";
      show("download");
    } catch (error) {
      note(error.message, true);
    }
  });

  if (readyDownloadButton) readyDownloadButton.addEventListener("click", () => {
    if (!downloadUrl) return note("The download link is not available. Please try again.", true);
    readyDownloadButton.disabled = true;
    readyDownloadButton.textContent = "Opening Download…";
    window.location.assign(downloadUrl);
  });

  if (QSApi.isConfigured()) {
    QSApi.get("publicData").then(data => applyConfig((data && data.trial) || {})).catch(() => {
      if (availabilityMessage) availabilityMessage.textContent = "Trial availability could not be checked right now. You may still open the registration form and try again.";
    });
  }
})();
