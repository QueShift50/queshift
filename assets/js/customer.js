(function () {
  "use strict";
  const states = ["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
  const form = document.querySelector("[data-profile-form]"), status = document.querySelector("[data-customer-status]");
  if (!form) return; if (!QSApi.requireUser("dashboard.html")) return;
  const stateSelect = form.querySelector("[name=state]"); stateSelect.innerHTML = `<option value="">Select State / UT</option>` + states.map(s => `<option>${s}</option>`).join("");
  function note(text, error) { status.textContent = text; status.classList.toggle("error", !!error); }
  async function load() {
    try {
      const data = await QSApi.post("userDashboard", {}, QSApi.token()), user = data.user || {};
      document.querySelector("[data-user-name]").textContent = user.name || "Queshift Customer";
      document.querySelector("[data-user-email]").textContent = user.email || "";
      ["name","company","phone","address","state","pin","gstin"].forEach(key => { if (form.elements[key]) form.elements[key].value = user[key] || ""; });
      const sub = data.subscription || {};
      document.querySelector("[data-plan]").textContent = sub.plan || "No active plan";
      document.querySelector("[data-expiry]").textContent = sub.expiry || "—";
      document.querySelector("[data-payment-status]").textContent = data.latestPayment ? data.latestPayment.status : "No payment submitted";
      const download = document.querySelector("[data-secure-download]");
      if (sub.status === "ACTIVE" && data.downloadUrl) { download.href = data.downloadUrl; download.hidden = false; } else download.hidden = true;
      const invoices = document.querySelector("[data-invoices]");
      invoices.innerHTML = (data.invoices || []).length ? data.invoices.map(x => `<a class="invoice-row" href="${x.pdfUrl}" target="_blank" rel="noopener"><b>${x.invoiceNumber}</b><span>${x.date}</span><span>₹${x.total}</span><em>Download PDF</em></a>`).join("") : `<p class="empty-state">No invoice generated yet.</p>`;
      note("");
    } catch (error) { note(error.message, true); if (/token|login|credential/i.test(error.message)) setTimeout(() => { QSApi.clearSession(); location.href = "login.html"; }, 1200); }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault(); note("Saving profile…");
    try { await QSApi.post("saveProfile", Object.fromEntries(new FormData(form)), QSApi.token()); note("Profile saved successfully."); load(); }
    catch (error) { note(error.message, true); }
  });
  document.querySelector("[data-user-logout]").onclick = () => { QSApi.clearSession(); location.href = "login.html"; };
  load();
})();
