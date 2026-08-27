(function () {
  "use strict";
  const session = QSApi.session();
  if (!QSApi.token() || !session || session.role !== "ADMIN") { location.href = "admin.html"; return; }
  const status = document.querySelector("[data-admin-status]"); let dashboard = {};
  document.querySelector("[data-admin-user]").textContent = session.email || "Authorised Admin";
  const backendNode = document.querySelector("[data-backend-url]");
  if (backendNode) backendNode.textContent = (window.QUESHIFT_CONFIG || {}).apiUrl || "Not configured";
  function note(text, error) { status.textContent = text; status.classList.toggle("error", !!error); }
  function setupUploadGuidance() {
    document.querySelectorAll('input[type="file"][data-rec-width]').forEach(input => {
      let diag = input.parentElement.querySelector(".upload-diagnostics");
      if (!diag) { diag = document.createElement("small"); diag.className = "upload-diagnostics"; input.parentElement.appendChild(diag); }
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) { diag.textContent = ""; diag.classList.remove("warn","ok"); return; }
        const maxMb = Number(input.dataset.maxMb || 6), mb = file.size / 1024 / 1024;
        if (mb > maxMb) {
          diag.textContent = `Selected file is ${mb.toFixed(2)} MB. Maximum ${maxMb} MB allowed.`;
          diag.classList.add("warn"); diag.classList.remove("ok"); input.value = ""; return;
        }
        if (!/^image\//i.test(file.type)) { diag.textContent = `Selected: ${file.name} • ${mb.toFixed(2)} MB`; return; }
        const image = new Image(), url = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(url);
          const rw = Number(input.dataset.recWidth || 0), rh = Number(input.dataset.recHeight || 0);
          const target = rw && rh ? rw / rh : 0, actual = image.width / Math.max(1,image.height);
          const off = target ? Math.abs(actual - target) / target : 0;
          diag.textContent = `Selected: ${image.width} × ${image.height} px • ${mb.toFixed(2)} MB` + (off > .12 ? ` — recommended ratio is about ${rw}:${rh}.` : " ✓");
          diag.classList.toggle("warn", off > .12); diag.classList.toggle("ok", off <= .12);
        };
        image.onerror = () => { URL.revokeObjectURL(url); diag.textContent = `Selected: ${file.name} • ${mb.toFixed(2)} MB`; };
        image.src = url;
      });
    });
  }
  function bindAdminMedia(root) {
    (root || document).querySelectorAll("img[data-media-src]").forEach(img => {
      if (QSApi.bindImage) QSApi.bindImage(img, img.dataset.mediaSrc || "", img.dataset.mediaFallback || "");
    });
  }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function go(tab) { document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab)); document.querySelectorAll(".admin-section").forEach(s => s.classList.toggle("active", s.id === tab)); window.scrollTo({ top: 0, behavior: "smooth" }); }
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => go(b.dataset.tab)); document.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => go(b.dataset.jump));
  document.querySelector("[data-admin-logout]").onclick = async () => { await QSApi.logout(); location.href = "admin.html"; };

  async function payloadFromForm(form) {
    const payload = {}; for (const [key, value] of new FormData(form)) payload[key] = value instanceof File ? "" : value;
    for (const input of form.querySelectorAll('input[type="file"]')) if (input.files[0]) {
      const maxMb = Number(input.dataset.maxMb || 6);
      payload[input.name] = await QSApi.fileToDataUrl(input.files[0], maxMb);
    }
    return payload;
  }
  document.querySelectorAll("[data-admin-form]").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault(); note("Saving…");
    try { await QSApi.post(form.dataset.action, await payloadFromForm(form), QSApi.token()); note("Saved successfully."); if (!form.dataset.keep) form.reset(); await load(); }
    catch (error) { note(error.message, true); }
  }));

  async function action(name, payload) { note("Processing…"); try { await QSApi.post(name, payload, QSApi.token()); note("Completed successfully."); await load(); } catch (error) { note(error.message, true); } }
  function media(items, type) { return (items || []).map(x => {
    const raw = x.imageUrl || x.thumbnail || "";
    return `<article class="media-card">${raw ? `<img src="${esc(QSApi.mediaUrl(raw))}" data-media-src="${esc(raw)}" alt="">` : '<div class="media-placeholder">No image</div>'}<div><b>${esc(x.title || x.name)}</b><small>${esc(x.role || x.url || x.status || "")}</small></div><button data-delete-type="${type}" data-delete-id="${esc(x.id)}">Remove</button></article>`;
  }).join("") || '<p class="empty-state">Nothing added yet.</p>'; }
  function bindDelete() { document.querySelectorAll("[data-delete-type]").forEach(b => b.onclick = () => confirm("Remove this item?") && action("deleteContent", { type: b.dataset.deleteType, id: b.dataset.deleteId })); }
  function fillSettings() {
    const s = dashboard.settings || {}, social = document.querySelector('[data-action="saveSocial"]');
    const keys = ["heroTitle","heroText","phone1","phone2","email","gstRate","supplierState","sellerName","sellerAddress","sellerGstin","sacCode","msme","bankName","bankAccount","ifsc","firstDiscount","couponCode","softwareFileId","softwareVersion","trialDays","trialDownloadUrl","trialSoftwareFileId","trialRequirements","trialInstructions"];
    document.querySelectorAll('[data-action="saveSettings"]').forEach(form => keys.forEach(k => {
      if (form.elements[k]) form.elements[k].value = s[k] || form.elements[k].value || "";
    }));
    const links = dashboard.social || {}; ["youtube","instagram","facebook","linkedin","twitter","awtaxation","whatsapp"].forEach(k => { if (social.elements[k]) social.elements[k].value = links[k] || social.elements[k].value || ""; });
    (links.custom || []).slice(0, 2).forEach((x, i) => { if (social.elements[`customLabel${i+1}`]) social.elements[`customLabel${i+1}`].value = x.label || ""; if (social.elements[`customUrl${i+1}`]) social.elements[`customUrl${i+1}`].value = x.url || ""; });
    const preview = document.querySelector("[data-brand-preview]");
    if (preview) {
      const items = [["Current Logo",s.logoUrl],["Current Favicon",s.faviconUrl],["Current Payment QR",s.qrUrl]].filter(x=>x[1]);
      preview.innerHTML = items.map(([label,url]) => `<div class="brand-preview-item"><span>${esc(label)}</span><img src="${esc(QSApi.mediaUrl(url))}" data-media-src="${esc(url)}" alt="${esc(label)}"></div>`).join("") || '<small class="empty-state">Upload logo / favicon / QR to see current previews here.</small>';
      bindAdminMedia(preview);
    }
  }
  function planOptions(selected) {
    return (dashboard.plans || []).map(p => `<option value="${esc(p.code)}" ${String(p.code)===String(selected)?"selected":""}>${esc(p.name)} (${esc(p.code)})${p.active===false?" — Hidden":""}</option>`).join("") + '<option value="CUSTOM">Custom Days</option>';
  }
  function renderPlans() {
    const wrap = document.querySelector("[data-admin-plans]"); if (!wrap) return;
    const plans = dashboard.plans || [];
    wrap.innerHTML = plans.map(p => `<article class="plan-admin-row">
      <div><b>${esc(p.name)}</b><small>${esc(p.code)} · ${Number(p.days||0)} days · GST ${Number(p.gstRate||0)}%</small></div>
      <strong>₹${Number(p.price||0).toLocaleString("en-IN")}</strong>
      <span class="badge ${p.active===false?"warn":""}">${p.active===false?"Hidden":"Active"}</span>
      <button type="button" data-edit-plan="${esc(p.code)}">Edit</button>
    </article>`).join("") || '<p class="empty-state">No plans yet. Add your first price plan above.</p>';

    document.querySelectorAll("[data-edit-plan]").forEach(button => button.onclick = () => {
      const plan = plans.find(x => String(x.code) === String(button.dataset.editPlan)); if (!plan) return;
      const form = document.querySelector("[data-plan-form]"); if (!form) return;
      form.elements.code.value = plan.code || "";
      form.elements.name.value = plan.name || "";
      form.elements.price.value = plan.price ?? "";
      form.elements.days.value = plan.days ?? "";
      form.elements.gstRate.value = plan.gstRate ?? (dashboard.settings?.gstRate || 18);
      form.elements.active.value = plan.active === false ? "false" : "true";
      const heading = form.querySelector("[data-plan-form-title]"); if (heading) heading.textContent = `Edit Plan — ${plan.name}`;
      const save = form.querySelector("[data-plan-save]"); if (save) save.textContent = "Update Price Plan";
      go("pricing");
      form.scrollIntoView({ behavior:"smooth", block:"start" });
    });
    const fresh = document.querySelector("[data-new-plan]");
    if (fresh) fresh.onclick = () => {
      const form = document.querySelector("[data-plan-form]"); if (!form) return;
      form.reset(); form.elements.gstRate.value = dashboard.settings?.gstRate || 18; form.elements.active.value = "true";
      const heading = form.querySelector("[data-plan-form-title]"); if (heading) heading.textContent = "Add New Price Plan";
      const save = form.querySelector("[data-plan-save]"); if (save) save.textContent = "Save Price Plan";
    };
    const form = document.querySelector("[data-plan-form]");
    if (form && !String(form.elements.code.value || "").trim()) {
      form.elements.gstRate.value = dashboard.settings?.gstRate || form.elements.gstRate.value || 18;
      const heading = form.querySelector("[data-plan-form-title]"); if (heading) heading.textContent = "Add New Price Plan";
      const save = form.querySelector("[data-plan-save]"); if (save) save.textContent = "Save Price Plan";
    }
  }


  function renderEnquiries() {
    const wrap=document.querySelector('[data-admin-enquiries]'); if(!wrap)return;
    const items=dashboard.enquiries||[];
    wrap.innerHTML=items.map(x=>`<article class="admin-query-row"><header><div><b>${esc(x.name||x.email)}</b><br><small>${esc(x.createdAt||"")} · ${esc(x.company||"No company")}</small></div><span class="badge ${x.status==='OPEN'?'warn':''}">${esc(x.status||'OPEN')}</span></header><p><b>Email:</b> ${esc(x.email)} · <b>Phone:</b> ${esc(x.phone)}</p><p>${esc(x.message||"")}</p>${x.reply?`<p><b>Reply:</b> ${esc(x.reply)}</p>`:""}<div class="admin-row-actions"><button data-enquiry-reply="${esc(x.id)}">Reply by Email</button>${x.status==='CLOSED'?`<button class="success" data-enquiry-reopen="${esc(x.id)}">Reopen</button>`:`<button class="danger" data-enquiry-close="${esc(x.id)}">Close</button>`}</div></article>`).join('')||'<p class="empty-state">No website enquiries yet.</p>';
    wrap.querySelectorAll('[data-enquiry-reply]').forEach(b=>b.onclick=()=>{const reply=prompt('Type the reply to send by email:');if(reply)action('enquiryAction',{id:b.dataset.enquiryReply,task:'REPLY',reply});});
    wrap.querySelectorAll('[data-enquiry-close]').forEach(b=>b.onclick=()=>action('enquiryAction',{id:b.dataset.enquiryClose,task:'CLOSE'}));
    wrap.querySelectorAll('[data-enquiry-reopen]').forEach(b=>b.onclick=()=>action('enquiryAction',{id:b.dataset.enquiryReopen,task:'REOPEN'}));
  }
  function renderHelpArticles(){
    const wrap=document.querySelector('[data-admin-help]');if(!wrap)return;const items=dashboard.helpArticles||[];
    wrap.innerHTML=items.map(x=>`<article class="admin-help-row"><header><div><b>${esc(x.title)}</b><br><small>${esc(x.category||'General')} · /${esc(x.slug)} · ${esc(x.status||'')}</small></div></header><p>${esc(x.summary||'')}</p><div class="admin-row-actions"><a href="help-detail.html?slug=${encodeURIComponent(x.slug)}" target="_blank">View</a><button data-edit-help="${esc(x.slug)}">Edit</button><button class="danger" data-delete-type="HELP_ARTICLES" data-delete-id="${esc(x.id)}">Remove</button></div></article>`).join('')||'<p class="empty-state">No admin-published help guides yet. The built-in Myntra guide is still public.</p>';
    wrap.querySelectorAll('[data-edit-help]').forEach(b=>b.onclick=()=>{const x=items.find(v=>String(v.slug)===String(b.dataset.editHelp));const f=document.querySelector('[data-help-form]');if(!x||!f)return;['slug','category','title','summary','html','metaTitle','metaDescription','keywords','language','status'].forEach(k=>{if(f.elements[k])f.elements[k].value=x[k]||''});go('helpmanager');f.scrollIntoView({behavior:'smooth',block:'start'});});
    bindDelete();
  }
  function renderTrialLeads(){
    const wrap=document.querySelector('[data-admin-trials]');if(!wrap)return;const items=dashboard.trialLeads||[];
    wrap.innerHTML=items.map(x=>`<article class="admin-trial-row"><b>${esc(x.name||x.email)}</b> <span class="badge">${x.verified?'Verified':'Pending'}</span><br><small>${esc(x.company||'')} · ${esc(x.email)} · ${esc(x.phone)} · ${esc(x.state||'')}</small><br><small>Downloads: ${Number(x.downloads||0)} · Requested: ${esc(x.createdAt||'')} ${x.verifiedAt?'· Verified: '+esc(x.verifiedAt):''}</small></article>`).join('')||'<p class="empty-state">No trial requests yet.</p>';
  }
  function render() {
    const c = dashboard.counts || {}; document.querySelector("[data-admin-stats]").innerHTML = [[c.customers||0,"Customers"],[c.pendingPayments||0,"Pending Payments"],[c.activeSubscriptions||0,"Active Subscriptions"],[c.publishedBlogs||0,"Published Blogs"]].map(([n,l]) => `<article><small>${l}</small><h3>${n}</h3><span class="badge">Live Data</span></article>`).join("");
    document.querySelector("[data-admin-banners]").innerHTML = media(dashboard.banners,"BANNERS"); document.querySelector("[data-admin-partners]").innerHTML = media(dashboard.partners,"PARTNERS"); document.querySelector("[data-admin-brands]").innerHTML = media(dashboard.brands,"BRANDS"); document.querySelector("[data-admin-videos]").innerHTML = media(dashboard.videos,"VIDEOS");
    document.querySelector("[data-admin-blogs]").innerHTML = (dashboard.blogs||[]).map(x => `<article><span><b>${esc(x.title)}</b><br><small>/${esc(x.slug)} · ${esc(x.status)}</small></span><a href="blog.html?slug=${encodeURIComponent(x.slug)}" target="_blank">View</a><button data-delete-type="BLOGS" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">No blogs yet.</p>';
    document.querySelector("[data-admin-payments]").innerHTML = (dashboard.payments||[]).map(x => `<tr><td><b>${esc(x.orderId)}</b><br>${esc(x.name)}<br><small>${esc(x.phone)} · ${esc(x.state)}</small></td><td>${esc(x.plan)}</td><td>₹${Number(x.amount||0).toLocaleString("en-IN")}</td><td><a href="${esc(x.screenshotUrl)}" target="_blank" rel="noopener">View Screenshot</a></td><td><span class="badge ${x.status==='PENDING'?'warn':''}">${esc(x.status)}</span></td><td>${x.status==='PENDING'?`<select data-plan-for="${esc(x.orderId)}">${planOptions(x.plan)}</select><input data-days-for="${esc(x.orderId)}" type="number" placeholder="Days"><button class="approve-btn" data-approve="${esc(x.orderId)}">Approve</button><button class="reject-btn" data-reject="${esc(x.orderId)}">Reject</button>`:"—"}</td></tr>`).join("") || '<tr><td colspan="6">No payment attempts.</td></tr>';
    document.querySelectorAll("[data-approve]").forEach(b => b.onclick = () => action("approvePayment", { orderId:b.dataset.approve, plan:document.querySelector(`[data-plan-for="${b.dataset.approve}"]`).value, days:document.querySelector(`[data-days-for="${b.dataset.approve}"]`).value }));
    document.querySelectorAll("[data-reject]").forEach(b => b.onclick = () => action("rejectPayment", { orderId:b.dataset.reject }));
    document.querySelector("[data-admin-reviews]").innerHTML = (dashboard.reviews||[]).map(x => `<article><span><b>${"★".repeat(+x.rating||0)} ${esc(x.name)}</b><br>${esc(x.comment)}<br><small>${esc(x.status)}${x.reply?" · Reply: "+esc(x.reply):""}</small></span><button data-review-approve="${esc(x.id)}">Approve</button><button data-review-reply="${esc(x.id)}">Reply</button><button data-delete-type="REVIEWS" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">No reviews or comments.</p>';
    document.querySelectorAll("[data-review-approve]").forEach(b => b.onclick = () => action("reviewAction", { id:b.dataset.reviewApprove, task:"APPROVE" })); document.querySelectorAll("[data-review-reply]").forEach(b => b.onclick = () => { const reply = prompt("Enter public reply:"); if (reply) action("reviewAction", { id:b.dataset.reviewReply, task:"REPLY", reply }); });
    document.querySelector("[data-admin-customers]").innerHTML = (dashboard.customers||[]).map(x => `<article><span><b>${esc(x.name||x.email)}</b><br><small>${esc(x.email)} · ${esc(x.phone)} · ${esc(x.state)}</small></span><em>${esc(x.plan||"No plan")}</em></article>`).join("") || '<p class="empty-state">No customers yet.</p>';
    document.querySelector("[data-admin-invoices]").innerHTML = (dashboard.invoices||[]).map(x => `<article><span><b>${esc(x.invoiceNumber)}</b><br><small>${esc(x.customer)} · ₹${esc(x.total)}</small></span><a href="${esc(x.pdfUrl)}" target="_blank">PDF</a></article>`).join("") || '<p class="empty-state">No invoices yet.</p>';
    renderEnquiries(); renderHelpArticles(); renderTrialLeads(); renderPlans(); fillSettings(); bindDelete(); bindAdminMedia(document);
  }
  async function load() { try { dashboard = await QSApi.post("adminDashboard", {}, QSApi.token()); render(); note("Dashboard is up to date."); } catch (error) { note(error.message, true); if (/token|admin|author/i.test(error.message)) setTimeout(() => { QSApi.clearSession(); location.href = "admin.html"; }, 1200); } }
  setupUploadGuidance();
  load();
})();
