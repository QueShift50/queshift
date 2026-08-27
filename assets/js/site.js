(function () {
  "use strict";

  const defaults = {
    heroTitle: "Every order matched. Every rupee accounted for.",
    heroText: "Maintain e-commerce accounts, reconcile settlements and understand exact order-wise calculation across every major marketplace.",
    phone1: "9310907124", phone2: "9310907125", email: "info.queshift@gmail.com",
    logoUrl: "assets/images/queshift-logo.png",
    faviconUrl: "favicon-32x32.png",
    banners: [
      { title: "E-commerce Accounting & Reconciliation", imageUrl: "assets/images/queshift-banner-1.png", link: "contact.html" },
      { title: "Designed for Marketplace Sellers and Growing Brands", imageUrl: "assets/images/queshift-banner-2.png", link: "about.html" },
      { title: "20% OFF on First Booking — FIRST20", imageUrl: "assets/images/queshift-first20-banner.png", link: "downloads.html" },
      { title: "DC Software Tutorials & Training Videos", imageUrl: "assets/images/dc-software-channel-banner.png", link: "https://www.youtube.com/@DC-Software" }
    ],
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
    if (!String(out.faviconUrl || "").trim()) out.faviconUrl = String(cached.faviconUrl || "").trim() || defaults.faviconUrl;
    ["banners", "brands"].forEach(key => {
      if (!Array.isArray(out[key]) || !out[key].length) {
        out[key] = Array.isArray(cached[key]) && cached[key].length ? cached[key] : defaults[key];
      }
    });
    const partnerMap = new Map();
    [defaults.partners, Array.isArray(cached.partners) ? cached.partners : [], Array.isArray(remote.partners) ? remote.partners : []].forEach(list => list.forEach(item => {
      const key = String(item && item.name || "").trim().toLowerCase();
      if (!key) return;
      partnerMap.set(key, Object.assign({}, partnerMap.get(key) || {}, item));
    }));
    out.partners = Array.from(partnerMap.values());
    if (!Array.isArray(out.videos)) out.videos = [];
    out.social = Object.assign({}, defaults.social, cached.social || {}, remote.social || {});
    return out;
  }
  function mediaUrl(value, fallback) {
    const raw = window.QSApi && QSApi.mediaUrl ? QSApi.mediaUrl(value, fallback) : (value || fallback || "");
    return safeUrl(raw);
  }
  function bindMedia(root) {
    const scope = root || document;
    scope.querySelectorAll("img[data-media-src]").forEach(img => {
      const value = img.getAttribute("data-media-src") || "";
      const fallback = img.getAttribute("data-media-fallback") || "";
      if (window.QSApi && QSApi.bindImage) QSApi.bindImage(img, value, fallback);
      else {
        img.onerror = () => { img.onerror = null; if (fallback) img.src = fallback; };
        img.src = mediaUrl(value, fallback);
      }
    });
  }
  function mediaImg(value, alt, className, fallback) {
    const src = mediaUrl(value, fallback);
    return `<img${className ? ` class="${esc(className)}"` : ""} src="${esc(src)}" data-media-src="${esc(value || "")}" data-media-fallback="${esc(fallback || "")}" alt="${esc(alt || "")}" loading="lazy">`;
  }
  function applyFavicon(value) {
    const fallback = "favicon-32x32.png";
    const candidates = window.QSApi && QSApi.mediaCandidates ? QSApi.mediaCandidates(value, fallback) : [mediaUrl(value, fallback)];
    const tryAt = index => {
      if (index >= candidates.length) return;
      const test = new Image();
      test.onload = () => {
        const fresh = candidates[index] + (candidates[index].includes("?") ? "&" : "?") + "qsfv=" + Date.now();
        document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach(link => { link.href = fresh; });
        let dynamic = document.querySelector('link[data-qs-dynamic-favicon]');
        if (!dynamic) {
          dynamic = document.createElement("link"); dynamic.rel = "icon"; dynamic.setAttribute("data-qs-dynamic-favicon", "1"); document.head.appendChild(dynamic);
        }
        dynamic.href = fresh;
      };
      test.onerror = () => tryAt(index + 1);
      test.src = candidates[index];
    };
    tryAt(0);
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
      if (window.QSApi && QSApi.bindImage) QSApi.bindImage(e, data.logoUrl, fallback);
      else { e.onerror = () => { e.onerror = null; e.src = fallback; }; e.src = mediaUrl(data.logoUrl, fallback); }
    });
    applyFavicon(data.faviconUrl);
    document.querySelectorAll("[data-whatsapp]").forEach(e => e.href = "https://wa.me/91" + data.phone1 + "?text=" + encodeURIComponent("Hello Queshift, I want to know about e-commerce accounting and reconciliation software."));
    renderBrands(data.brands || []); renderPartners(data.partners || []); renderBanners(data.banners || []); renderSocial(data.social || {});
    renderVideo((data.videos || []).find(v => v.active !== false && v.featured) || (data.videos || []).find(v => v.active !== false));
    document.dispatchEvent(new CustomEvent("qs:content"));
  }

  function renderBrands(brands) {
    document.querySelectorAll("[data-brand-track]").forEach(track => {
      const items = brands.map(b => typeof b === "string" ? { name: b } : b), repeated = items.concat(items);
      track.innerHTML = repeated.map(item => `<a class="brand-pill" ${item.url ? `href="${safeUrl(item.url)}" target="_blank" rel="noopener"` : ""}>${item.imageUrl ? mediaImg(item.imageUrl, item.name || "Queshift brand", "", "") : ""}<span>${esc(item.name)}</span></a>`).join("");
      bindMedia(track);
    });
  }
  function ownerFallback(name) {
    const n = String(name || "").toLowerCase();
    return n.includes("wasim") ? "assets/images/owner-wasim-placeholder.svg" : "assets/images/owner-ajay-placeholder.svg";
  }
  function closeOwnerZoom() {
    const lightbox = document.querySelector(".owner-lightbox");
    if (!lightbox) return;
    lightbox.classList.remove("open");
    setTimeout(() => lightbox.remove(), 220);
  }
  function openOwnerZoom(img, name) {
    closeOwnerZoom();
    const lightbox = document.createElement("div");
    lightbox.className = "owner-lightbox";
    lightbox.innerHTML = `<div class="owner-lightbox-dialog" role="dialog" aria-modal="true" aria-label="${esc(name || "Co-owner photo")}">
      <button type="button" class="owner-lightbox-close" aria-label="Close photo">×</button>
      <img src="${esc(img.currentSrc || img.src)}" alt="${esc(name || img.alt || "Co-owner")}">
      <strong>${esc(name || img.alt || "")}</strong>
    </div>`;
    document.body.appendChild(lightbox);
    requestAnimationFrame(() => lightbox.classList.add("open"));
    lightbox.addEventListener("click", e => { if (e.target === lightbox) closeOwnerZoom(); });
    lightbox.querySelector(".owner-lightbox-close").onclick = closeOwnerZoom;
    document.addEventListener("keydown", function escOwner(e){ if(e.key==="Escape"){ closeOwnerZoom(); document.removeEventListener("keydown",escOwner); } });
  }
  function bindOwnerZoom(root) {
    (root || document).querySelectorAll(".owner-photo").forEach(img => {
      if (img.dataset.zoomBound) return;
      img.dataset.zoomBound = "1"; img.tabIndex = 0; img.setAttribute("role","button"); img.setAttribute("aria-label",`View ${img.alt || "co-owner"} photo`);
      img.addEventListener("click", () => openOwnerZoom(img, img.alt));
      img.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openOwnerZoom(img, img.alt); } });
    });
  }

  function renderPartners(partners) {
    document.querySelectorAll("[data-partners]").forEach(wrap => {
      const ordered = partners.slice().sort((a,b) => { const an=String(a&&a.name||"").toLowerCase(), bn=String(b&&b.name||"").toLowerCase(); const ar=an==="ajay kumar"?1:an==="wasim raza"?2:99, br=bn==="ajay kumar"?1:bn==="wasim raza"?2:99; return ar-br; });
      wrap.innerHTML = ordered.map(p => {
        const fallback = ownerFallback(p.name);
        const photo = mediaImg(p.imageUrl || fallback, p.name, "owner-photo real", fallback);
        return `<article class="owner">${photo}<div><h3>${esc(p.name)}</h3><b>${esc(p.role || "Co-Owner, Queshift")}</b><p>${esc(p.bio || "Building practical e-commerce accounting and reconciliation solutions for growing sellers.")}</p></div></article>`;
      }).join("");
      bindMedia(wrap);
      bindOwnerZoom(wrap);
    });
  }
  function renderBanners(banners) {
    const slider = document.querySelector("[data-banner-slider]"); if (!slider || !banners.length) return;
    slider.innerHTML = `<div class="banner-track" aria-live="off">${banners.map((b, i) => `<a class="banner-slide${i ? "" : " active"}" href="${safeUrl(b.link || "#")}" ${b.link && /^https?:/i.test(b.link) ? 'target="_blank" rel="noopener"' : ""} aria-hidden="${i ? "true" : "false"}">${mediaImg(b.imageUrl, b.title || "Queshift banner", "", "assets/images/queshift-banner-1.png")}<span>${esc(b.title || "")}</span></a>`).join("")}</div><div class="slider-dots">${banners.map((_, i) => `<button type="button" aria-label="Show banner ${i + 1}" class="${i ? "" : "active"}" data-slide="${i}"></button>`).join("")}</div>`;
    bindMedia(slider);
    let index = 0, timer = 0;
    const slides = Array.from(slider.querySelectorAll(".banner-slide")), dots = Array.from(slider.querySelectorAll("[data-slide]"));
    const show = n => {
      const next = (n + slides.length) % slides.length;
      if (next === index && slides[index].classList.contains("active")) return;
      slides.forEach((slide, i) => {
        const active = i === next;
        slide.classList.toggle("active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach((dot, i) => dot.classList.toggle("active", i === next));
      index = next;
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
    const start = () => {
      stop();
      if (slides.length > 1 && !document.hidden) timer = setInterval(() => show(index + 1), 6500);
    };
    dots.forEach(dot => dot.addEventListener("click", () => { show(+dot.dataset.slide); start(); }));
    slider.addEventListener("mouseenter", stop); slider.addEventListener("mouseleave", start);
    slider.addEventListener("focusin", stop); slider.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

    const imgs = slides.map(slide => slide.querySelector("img")).filter(Boolean);
    Promise.all(imgs.map(img => img.complete ? Promise.resolve() : (img.decode ? img.decode().catch(() => {}) : new Promise(resolve => { img.addEventListener("load", resolve, { once:true }); img.addEventListener("error", resolve, { once:true }); })))).finally(start);
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
      catch (error) { if (status) { status.textContent = error.message || "Query could not be submitted. Please try again."; status.classList.add("error"); } }
    });
  });
})();
