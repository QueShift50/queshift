(function () {
  "use strict";
  let plans = [
    { code: "MONTHLY", name: "Monthly", price: 2500, period: "1 month", days: 30 },
    { code: "HALF_YEARLY", name: "Half-Yearly", price: 14500, period: "6 months", days: 182, popular: true },
    { code: "YEARLY", name: "Yearly", price: 24000, period: "12 months", days: 365 }
  ];
  const grid = document.querySelector("[data-pricing-plans]"); if (!grid) return;
  let gstRate = 18;
  const modal = document.querySelector("[data-payment-modal]"), form = document.querySelector("[data-payment-form]"), note = document.querySelector("[data-payment-note]");
  function render() {
    grid.innerHTML = plans.map(p => { const gst = p.price * gstRate / 100; return `<article class="price-card${p.popular ? " featured" : ""}">${p.popular ? '<span class="popular">Most Popular</span>' : ""}<h3>${p.name}</h3><p>Queshift e-commerce accounting & reconciliation subscription</p><strong>₹${p.price.toLocaleString("en-IN")}</strong><small>Total for ${p.period} + GST extra</small><div class="price-breakup"><span>GST ${gstRate}%</span><b>₹${gst.toLocaleString("en-IN")}</b><span>Total payable</span><b>₹${(p.price + gst).toLocaleString("en-IN")}</b></div><button class="btn btn-primary btn-block" data-buy="${p.code}">Choose ${p.name}</button></article>`; }).join("");
    document.querySelectorAll("[data-buy]").forEach(button => button.onclick = () => {
      if (!QSApi.token()) { location.href = "login.html?next=" + encodeURIComponent("downloads.html?plan=" + button.dataset.buy); return; }
      form.plan.value = button.dataset.buy; modal.hidden = false; document.body.classList.add("no-scroll");
    });
    const requested = new URLSearchParams(location.search).get("plan"); if (requested && QSApi.token()) setTimeout(() => document.querySelector(`[data-buy="${requested}"]`)?.click(), 150);
  }
  modal.querySelector("[data-close-payment]").onclick = () => { modal.hidden = true; document.body.classList.remove("no-scroll"); };
  form.addEventListener("submit", async event => {
    event.preventDefault(); note.textContent = "Uploading payment proof…";
    try {
      const screenshot = await QSApi.fileToDataUrl(form.screenshot.files[0], 5);
      const payload = Object.fromEntries(new FormData(form)); delete payload.screenshot; payload.screenshot = screenshot;
      const result = await QSApi.post("paymentAttempt", payload, QSApi.token());
      note.textContent = `Payment submitted. Order ID: ${result.orderId}. Status: Pending Approval.`; form.reset();
    } catch (error) { note.textContent = error.message; note.classList.add("error"); }
  });
  render();
  if (QSApi.isConfigured()) QSApi.get("publicData").then(data => {
    gstRate = +data.gstRate || 18;
    if (Array.isArray(data.plans) && data.plans.length) plans = data.plans.map((p, i) => ({ ...p, period: p.code === "MONTHLY" ? "1 month" : p.code === "HALF_YEARLY" ? "6 months" : p.code === "YEARLY" ? "12 months" : `${p.days} days`, popular: p.code === "HALF_YEARLY" || (!p.code && i === 1) }));
    const qr = document.querySelector(".payment-qr"); if (qr) {
      const fallbackQr = "assets/images/payment-qr.png";
      qr.onerror = () => { qr.onerror = null; qr.src = fallbackQr; };
      qr.src = QSApi.mediaUrl(data.qrUrl, fallbackQr);
    }
    render();
  }).catch(() => {});
})();
