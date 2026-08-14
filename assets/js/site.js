(function () {
  "use strict";

  const defaults = {
    heroTitle: "Every order matched. Every rupee accounted for.",
    heroText: "Maintain e-commerce accounts, reconcile settlements and understand exact order-wise calculation across every major marketplace.",
    phone1: "9310907124", phone2: "9310907125", email: "info.queshift@gmail.com",
    logoUrl: "assets/images/queshift-logo.png",
    banners: [{ title: "E-commerce Accounting & Reconciliation", imageUrl: "assets/images/aw-taxation-banner.jpg", link: "https://www.awtaxation.com/" }],
    partners: [{ name: "Ajay Kumar", role: "Co-Owner, Queshift", imageUrl: "" }, { name: "Wasim Raza", role: "Co-Owner, Queshift", imageUrl: "" }],
    brands: ["Amazon", "Flipkart", "Myntra", "Meesho", "AJIO", "Nykaa", "JioMart", "Snapdeal", "D2C Websites", "Multi-channel Brands"],
    social: { youtube: "", instagram: "", facebook: "", awtaxation: "https://www.awtaxation.com/", whatsapp: "https://wa.me/919310907124" },
    videos: []
  };

  const i18n = {
    en: { home: "Home", services: "About & Services", downloads: "Pricing & Downloads", blogs: "Blogs", contact: "Contact", login: "Login", demo: "Book Demo" },
    hi: { home: "होम", services: "हमारे बारे में और सेवाएँ", downloads: "मूल्य और डाउनलोड", blogs: "ब्लॉग", contact: "संपर्क", login: "लॉगिन", demo: "डेमो बुक करें" }
  };
  const phraseHi = {
    "Every order matched. Every rupee accounted for.": "हर ऑर्डर का मिलान। हर रुपये का पूरा हिसाब।",
    "Maintain e-commerce accounts, reconcile settlements and understand exact order-wise calculation across every major marketplace.": "सभी प्रमुख मार्केटप्लेस पर ई-कॉमर्स खाते संभालें, सेटलमेंट मिलाएँ और ऑर्डर-वार सही गणना समझें।",
    "E-commerce accounts maintained with order-wise clarity": "ऑर्डर-वार स्पष्टता के साथ ई-कॉमर्स अकाउंटिंग",
    "Order-wise Reconciliation": "ऑर्डर-वार रिकंसिलिएशन",
    "E-commerce Accounting": "ई-कॉमर्स अकाउंटिंग",
    "Profit & Loss": "लाभ और हानि",
    "Difference Finding": "अंतर की पहचान",
    "Multi-platform Reports": "मल्टी-प्लेटफॉर्म रिपोर्ट",
    "Accounting-ready Export": "अकाउंटिंग-रेडी एक्सपोर्ट",
    "Meet the co-owners behind Queshift": "Queshift के सह-मालिकों से मिलिए",
    "Designed for marketplace sellers and growing brands": "मार्केटप्लेस सेलर्स और बढ़ते ब्रांड्स के लिए",
    "Queshift banners and announcements": "Queshift बैनर और घोषणाएँ",
    "Rate your Queshift experience.": "अपने Queshift अनुभव को रेट करें।",
    "Submit Review": "रिव्यू भेजें",
    "Choose your Queshift plan.": "अपना Queshift प्लान चुनें।",
    "One software. Three flexible subscriptions.": "एक सॉफ्टवेयर। तीन सुविधाजनक सदस्यताएँ।",
    "Complete Payment": "भुगतान पूरा करें",
    "Submit for Approval": "स्वीकृति के लिए भेजें",
    "Practical e-commerce accounting insights.": "ई-कॉमर्स अकाउंटिंग की उपयोगी जानकारी।",
    "Your company profile, subscription and invoices in one place.": "आपकी कंपनी प्रोफ़ाइल, सदस्यता और इनवॉइस एक ही जगह।",
    "Continue with Google": "Google से जारी रखें"
  };

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function safeUrl(value) { try { const u = new URL(value, location.href); return /^(https?:|mailto:|tel:)$/.test(u.protocol) ? u.href : "#"; } catch (_) { return "#"; } }
  function getLocal() { try { return JSON.parse(localStorage.getItem("qs_public_cache") || "null"); } catch (_) { return null; } }
  function merge(data) {
    const cached = getLocal() || {}, remote = data || {};
    const out = Object.assign({}, defaults, cached, remote);
    if (!String(out.logoUrl || "").trim()) out.logoUrl = String(cached.logoUrl || "").trim() || defaults.logoUrl;
    ["banners", "partners", "brands"].forEach(key => {
      if (!Array.isArray(out[key]) || !out[key].length) {
        out[key] = Array.isArray(cached[key]) && cached[key].length ? cached[key] : defaults[key];
      }
    });
    if (!Array.isArray(out.videos)) out.videos = [];
    out.social = Object.assign({}, defaults.social, cached.social || {}, remote.social || {});
    return out;
  }
  function mediaUrl(value, fallback) {
    const raw = window.QSApi && QSApi.mediaUrl ? QSApi.mediaUrl(value, fallback) : (value || fallback || "");
    return safeUrl(raw);
  }
  async function loadPublic() {
    let data = merge();
    if (window.QSApi && QSApi.isConfigured()) {
      try {
        const remote = await QSApi.get("publicData");
        data = merge(remote);
        localStorage.setItem("qs_public_cache", JSON.stringify(remote));
      } catch (_) { /* cached/default content remains available */ }
    }
    apply(data);
  }

  function apply(data) {
    document.querySelectorAll("[data-phone1]").forEach(e => e.textContent = data.phone1);
    document.querySelectorAll("[data-phone2]").forEach(e => e.textContent = data.phone2);
    document.querySelectorAll("[data-email]").forEach(e => e.textContent = data.email);
    document.querySelectorAll("[data-hero-title]").forEach(e => e.textContent = data.heroTitle);
    document.querySelectorAll("[data-hero-text]").forEach(e => e.textContent = data.heroText);
    document.querySelectorAll("[data-site-logo]").forEach(e => {
      const fallback = "assets/images/queshift-logo.png";
      e.onerror = () => { e.onerror = null; e.src = fallback; };
      e.src = mediaUrl(data.logoUrl, fallback);
    });
    document.querySelectorAll("[data-whatsapp]").forEach(e => e.href = "https://wa.me/91" + data.phone1 + "?text=" + encodeURIComponent("Hello Queshift, I want to know about e-commerce accounting and reconciliation software."));
    renderBrands(data.brands || []); renderPartners(data.partners || []); renderBanners(data.banners || []); renderSocial(data.social || {});
    renderVideo((data.videos || []).find(v => v.active !== false && v.featured) || (data.videos || []).find(v => v.active !== false));
    document.dispatchEvent(new CustomEvent("qs:content"));
  }

  function renderBrands(brands) {
    document.querySelectorAll("[data-brand-track]").forEach(track => {
      const items = brands.map(b => typeof b === "string" ? { name: b } : b), repeated = items.concat(items);
      track.innerHTML = repeated.map(item => `<a class="brand-pill" ${item.url ? `href="${safeUrl(item.url)}" target="_blank" rel="noopener"` : ""}>${item.imageUrl ? `<img src="${mediaUrl(item.imageUrl)}" alt="${esc(item.name || "Queshift brand")}" loading="lazy">` : ""}<span>${esc(item.name)}</span></a>`).join("");
    });
  }
  function renderPartners(partners) {
    const wrap = document.querySelector("[data-partners]"); if (!wrap) return;
    wrap.innerHTML = partners.map(p => `<article class="owner">${p.imageUrl ? `<img class="owner-photo real" src="${mediaUrl(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="owner-photo">${esc(p.name)}<br>PHOTO<br>COMING SOON</div>`}<div><h3>${esc(p.name)}</h3><b>${esc(p.role || "Co-Owner, Queshift")}</b><p>${esc(p.bio || "Building practical e-commerce accounting and reconciliation solutions for growing sellers.")}</p></div></article>`).join("");
  }
  function renderBanners(banners) {
    const slider = document.querySelector("[data-banner-slider]"); if (!slider || !banners.length) return;
    slider.innerHTML = `<div class="banner-track">${banners.map((b, i) => `<a class="banner-slide${i ? "" : " active"}" href="${safeUrl(b.link || "#")}" ${b.link ? 'target="_blank" rel="noopener"' : ""}><img src="${mediaUrl(b.imageUrl, "assets/images/aw-taxation-banner.jpg")}" alt="${esc(b.title || "Queshift banner")}"><span>${esc(b.title || "")}</span></a>`).join("")}</div><div class="slider-dots">${banners.map((_, i) => `<button aria-label="Banner ${i + 1}" class="${i ? "" : "active"}" data-slide="${i}"></button>`).join("")}</div>`;
    let index = 0; const slides = slider.querySelectorAll(".banner-slide"), dots = slider.querySelectorAll("[data-slide]");
    const show = n => { index = (n + slides.length) % slides.length; slides.forEach((s, i) => s.classList.toggle("active", i === index)); dots.forEach((d, i) => d.classList.toggle("active", i === index)); };
    dots.forEach(d => d.onclick = () => show(+d.dataset.slide)); if (slides.length > 1) setInterval(() => show(index + 1), 5200);
  }
  function renderSocial(social) {
    const labels = { youtube: "▶", instagram: "◎", facebook: "f", awtaxation: "AW", whatsapp: "✆", linkedin: "in", twitter: "𝕏" };
    document.querySelectorAll("[data-social-links]").forEach(wrap => {
      const standard = Object.entries(social).filter(([key, url]) => key !== "custom" && !!url).map(([key, url]) => ({ key, url, label: labels[key] || "+" }));
      const custom = Array.isArray(social.custom) ? social.custom.map(x => ({ key: "custom", url: x.url, label: x.icon || x.label || "+", title: x.label })) : [];
      wrap.innerHTML = standard.concat(custom).map(x => `<a class="social-icon ${esc(x.key)}" href="${safeUrl(x.url)}" target="_blank" rel="noopener" title="${esc(x.title || x.key)}">${esc(x.label)}</a>`).join("");
    });
  }
  function youtubeId(url) { try { const u = new URL(url); return u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop(); } catch (_) { return ""; } }
  function renderVideo(video) {
    const section = document.querySelector("[data-video-section]"); if (!section) return;
    if (!video || !video.url) { section.hidden = true; return; }
    const id = video.videoId || youtubeId(video.url); if (!id) { section.hidden = true; return; }
    section.hidden = false; const frame = section.querySelector("[data-youtube-frame]");
    frame.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(id)}&playsinline=1&controls=1&rel=0&origin=${encodeURIComponent(location.origin)}`;
    section.querySelector("[data-video-title]").textContent = video.title || "Queshift on YouTube";
    section.querySelector("[data-video-description]").textContent = video.description || "Watch how Queshift simplifies marketplace accounting and reconciliation.";
  }

  function initIntro() {
    const intro = document.querySelector(".intro"); if (!intro) return; document.body.classList.add("no-scroll");
    const video = intro.querySelector("video"), skip = intro.querySelector(".skip"), sound = intro.querySelector(".sound");
    const close = () => { intro.classList.add("hide"); document.body.classList.remove("no-scroll"); setTimeout(() => intro.remove(), 700); };
    skip.addEventListener("click", close); video.addEventListener("ended", close); video.addEventListener("error", close);
    sound.addEventListener("click", () => { video.muted = !video.muted; sound.textContent = video.muted ? "♫ Sound On" : "🔇 Mute"; video.play().catch(() => {}); });
    video.play().catch(() => {}); setTimeout(close, 15000);
  }
  function initCounters() {
    const counters = document.querySelectorAll("[data-count]"); if (!counters.length) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.done) return; entry.target.dataset.done = "1";
      const target = +entry.target.dataset.count, suffix = entry.target.dataset.suffix || ""; let start = 0;
      const tick = () => { start += Math.max(1, Math.ceil(target / 45)); entry.target.textContent = Math.min(start, target) + suffix; if (start < target) requestAnimationFrame(tick); };
      tick(); observer.unobserve(entry.target);
    }), { threshold: .35 }); counters.forEach(c => observer.observe(c));
  }
  function initLanguage() {
    const button = document.querySelector("[data-language]"); if (!button) return;
    let lang = localStorage.getItem("qs_lang") || (window.QUESHIFT_CONFIG || {}).defaultLanguage || "en";
    const paint = () => { document.documentElement.lang = lang === "hi" ? "hi-IN" : "en-IN"; document.querySelectorAll("[data-i18n]").forEach(e => { const value = i18n[lang][e.dataset.i18n]; if (value) e.textContent = value; }); document.querySelectorAll("h1,h2,h3,p,button,label").forEach(e => { if (e.children.length) return; if (!e.dataset.enText) e.dataset.enText = e.textContent.trim(); const hi = phraseHi[e.dataset.enText]; if (hi) e.textContent = lang === "hi" ? hi : e.dataset.enText; }); button.textContent = lang === "en" ? "हिंदी" : "English"; };
    button.onclick = () => { lang = lang === "en" ? "hi" : "en"; localStorage.setItem("qs_lang", lang); paint(); }; paint();
    document.addEventListener("qs:content", paint);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-year]").forEach(e => e.textContent = new Date().getFullYear());
    const menu = document.querySelector(".menu"), nav = document.querySelector(".nav-links"); if (menu && nav) menu.onclick = () => nav.classList.toggle("open");
    initIntro(); initCounters(); initLanguage(); loadPublic();
    const contact = document.querySelector("[data-contact-form]");
    if (contact) contact.addEventListener("submit", async event => {
      event.preventDefault(); const status = contact.querySelector("[data-form-status]"); if (status) status.textContent = "Sending…";
      const payload = Object.fromEntries(new FormData(contact));
      try { await QSApi.post("contact", payload); contact.reset(); if (status) status.textContent = "Thank you. Our team will contact you shortly."; }
      catch (_) { location.href = `mailto:${defaults.email}?subject=${encodeURIComponent("Queshift Website Enquiry")}&body=${encodeURIComponent(JSON.stringify(payload, null, 2))}`; if (status) status.textContent = "Opening your email application…"; }
    });
  });
})();
