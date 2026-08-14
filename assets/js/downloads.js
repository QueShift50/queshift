(function () {
  "use strict";

  let plans = [
    { code: "MONTHLY", name: "Monthly", price: 2500, days: 30 },
    { code: "HALF_YEARLY", name: "Half-Yearly", price: 14500, days: 182, popular: true },
    { code: "YEARLY", name: "Yearly", price: 24000, days: 365 }
  ];
  let gstRate = 18;
  let offer = { percent: 20, coupon: "FIRST20" };
  // Logged-out visitors see the advertised first-booking price. Once logged in,
  // the backend is the source of truth and checks whether the offer was already used.
  const savedSession = QSApi.session ? QSApi.session() : null;
  let offerState = { eligible: !QSApi.token() || !!(savedSession && savedSession.firstBookingEligible), verified: false };

  const grid = document.querySelector("[data-pricing-plans]"); if (!grid) return;
  const modal = document.querySelector("[data-payment-modal]");
  const form = document.querySelector("[data-payment-form]");
  const note = document.querySelector("[data-payment-note]");
  const offerNote = document.querySelector("[data-first-offer-note]");

  const money = n => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const period = p => p.period || (p.days === 30 ? "1 month" : p.days >= 360 && p.days <= 370 ? "12 months" : p.days >= 180 && p.days <= 184 ? "6 months" : `${p.days} days`);
  const discountPrice = p => Math.round((Number(p.price || 0) * (1 - Number(offer.percent || 0) / 100) + Number.EPSILON) * 100) / 100;

  function updateOfferNote() {
    if (!offerNote) return;
    if (!QSApi.token()) {
      offerNote.innerHTML = `<b>${Number(offer.percent || 20)}% OFF on First Booking</b> · Coupon <strong>${offer.coupon || "FIRST20"}</strong> · Login to verify first-booking eligibility.`;
      offerNote.className = "first-offer-note";
    } else if (offerState.eligible) {
      offerNote.innerHTML = `<b>First Booking Offer unlocked:</b> ${Number(offer.percent || 20)}% OFF automatically applied · <strong>${offer.coupon || "FIRST20"}</strong>`;
      offerNote.className = "first-offer-note verified";
    } else {
      offerNote.innerHTML = `<b>Welcome back.</b> Your account has already used the first-booking offer, so regular pricing is shown.`;
      offerNote.className = "first-offer-note used";
    }
  }

  function render() {
    const useOffer = !!offerState.eligible && Number(offer.percent || 0) > 0;
    grid.innerHTML = plans.filter(p => p.active !== false).map((p, i) => {
      const base = Number(p.price || 0);
      const sale = useOffer ? discountPrice(p) : base;
      const rate = Number(p.gstRate || gstRate || 18);
      const gst = sale * rate / 100;
      const popular = p.popular || p.code === "HALF_YEARLY" || (plans.length > 1 && i === 1);
      return `<article class="price-card${popular ? " featured" : ""}">
        ${popular ? '<span class="popular">Most Popular</span>' : ""}
        ${useOffer ? `<span class="discount-badge">${Number(offer.percent || 20)}% OFF</span>` : ""}
        <h3>${p.name}</h3>
        <p>Queshift e-commerce accounting & reconciliation subscription</p>
        <div class="price-main">
          ${useOffer ? `<del>₹${money(base)}</del>` : ""}
          <strong>₹${money(sale)}</strong>
          ${useOffer ? `<span class="coupon-chip">${offer.coupon || "FIRST20"}</span>` : ""}
        </div>
        <small>${useOffer ? "First-booking discounted price" : "Subscription price"} for ${period(p)} + GST extra</small>
        <div class="price-breakup">
          ${useOffer ? `<span>Regular price</span><b><del>₹${money(base)}</del></b><span>Offer saving</span><b>₹${money(base - sale)}</b>` : ""}
          <span>GST ${rate}%</span><b>₹${money(gst)}</b>
          <span>Total payable</span><b>₹${money(sale + gst)}</b>
        </div>
        <button class="btn btn-primary btn-block" data-buy="${p.code}">Choose ${p.name}</button>
      </article>`;
    }).join("");

    document.querySelectorAll("[data-buy]").forEach(button => button.onclick = () => {
      if (!QSApi.token()) {
        location.href = "login.html?next=" + encodeURIComponent("downloads.html?plan=" + button.dataset.buy);
        return;
      }
      form.plan.value = button.dataset.buy;
      modal.hidden = false;
      document.body.classList.add("no-scroll");
    });
    updateOfferNote();

    const requested = new URLSearchParams(location.search).get("plan");
    if (requested && QSApi.token()) setTimeout(() => document.querySelector(`[data-buy="${CSS.escape(requested)}"]`)?.click(), 180);
  }

  async function verifyOfferForLogin() {
    if (!QSApi.token()) { offerState = { eligible: true, verified: false }; render(); return; }
    try {
      const status = await QSApi.post("pricingStatus", {}, QSApi.token());
      offerState = { eligible: !!status.eligible, verified: true };
      if (Number.isFinite(Number(status.percent))) offer.percent = Number(status.percent);
      if (status.coupon) offer.coupon = status.coupon;
    } catch (_) {
      // Do not assume a discount for an authenticated account when verification fails.
      offerState = { eligible: false, verified: false };
    }
    render();
  }

  modal.querySelector("[data-close-payment]").onclick = () => {
    modal.hidden = true;
    document.body.classList.remove("no-scroll");
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    note.classList.remove("error");
    note.textContent = "Uploading payment proof…";
    try {
      const screenshot = await QSApi.fileToDataUrl(form.screenshot.files[0], 5);
      const payload = Object.fromEntries(new FormData(form));
      delete payload.screenshot;
      payload.screenshot = screenshot;
      const result = await QSApi.post("paymentAttempt", payload, QSApi.token());
      const discountText = result.discountPercent ? ` First-booking ${result.discountPercent}% discount (${result.coupon || offer.coupon}) was applied automatically.` : "";
      note.textContent = `Payment submitted. Order ID: ${result.orderId}. Status: Pending Approval.${discountText}`;
      form.reset();
      await verifyOfferForLogin();
    } catch (error) {
      note.textContent = error.message;
      note.classList.add("error");
    }
  });

  render();

  if (QSApi.isConfigured()) {
    QSApi.get("publicData").then(async data => {
      gstRate = +data.gstRate || 18;
      if (data.offer) {
        offer.percent = Number.isFinite(Number(data.offer.percent)) ? Number(data.offer.percent) : offer.percent;
        offer.coupon = data.offer.coupon || offer.coupon;
      }
      if (Array.isArray(data.plans) && data.plans.length) {
        plans = data.plans.map((p, i) => ({
          ...p,
          price: Number(p.price || 0),
          days: Number(p.days || 0),
          gstRate: Number(p.gstRate || data.gstRate || 18),
          popular: p.code === "HALF_YEARLY" || (!p.code && i === 1)
        }));
      }
      const qr = document.querySelector(".payment-qr");
      if (qr) {
        const fallbackQr = "assets/images/payment-qr.png";
        qr.onerror = () => { qr.onerror = null; qr.src = fallbackQr; };
        qr.src = QSApi.mediaUrl(data.qrUrl, fallbackQr);
      }
      await verifyOfferForLogin();
    }).catch(() => verifyOfferForLogin());
  } else {
    verifyOfferForLogin();
  }
})();