(function () {
  "use strict";
  const session = QSApi.session();
  if (!QSApi.token() || !session || session.role !== "ADMIN") { location.href = "admin.html"; return; }
  const status = document.querySelector("[data-admin-status]"); let dashboard = {};
  document.querySelector("[data-admin-user]").textContent = session.email || "Authorised Admin";
  function note(text, error) { status.textContent = text; status.classList.toggle("error", !!error); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function go(tab) { document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab)); document.querySelectorAll(".admin-section").forEach(s => s.classList.toggle("active", s.id === tab)); window.scrollTo({ top: 0, behavior: "smooth" }); }
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => go(b.dataset.tab)); document.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => go(b.dataset.jump));
  document.querySelector("[data-admin-logout]").onclick = () => { QSApi.clearSession(); location.href = "admin.html"; };

  async function payloadFromForm(form) {
    const payload = {}; for (const [key, value] of new FormData(form)) payload[key] = value instanceof File ? "" : value;
    for (const input of form.querySelectorAll('input[type="file"]')) if (input.files[0]) payload[input.name] = await QSApi.fileToDataUrl(input.files[0], 6);
    return payload;
  }
  document.querySelectorAll("[data-admin-form]").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault(); note("Saving…");
    try { await QSApi.post(form.dataset.action, await payloadFromForm(form), QSApi.token()); note("Saved successfully."); if (!form.dataset.keep) form.reset(); await load(); }
    catch (error) { note(error.message, true); }
  }));

  async function action(name, payload) { note("Processing…"); try { await QSApi.post(name, payload, QSApi.token()); note("Completed successfully."); await load(); } catch (error) { note(error.message, true); } }
  function media(items, type) { return (items || []).map(x => `<article class="media-card">${x.imageUrl || x.thumbnail ? `<img src="${esc(x.imageUrl || x.thumbnail)}" alt="">` : '<div class="media-placeholder">No image</div>'}<div><b>${esc(x.title || x.name)}</b><small>${esc(x.role || x.url || x.status || "")}</small></div><button data-delete-type="${type}" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">Nothing added yet.</p>'; }
  function bindDelete() { document.querySelectorAll("[data-delete-type]").forEach(b => b.onclick = () => confirm("Remove this item?") && action("deleteContent", { type: b.dataset.deleteType, id: b.dataset.deleteId })); }
  function fillSettings() {
    const s = dashboard.settings || {}, social = document.querySelector('[data-action="saveSocial"]');
    const keys = ["heroTitle","heroText","phone1","phone2","email","gstRate","supplierState","sellerName","sellerAddress","sellerGstin","sacCode","msme","bankName","bankAccount","ifsc","trialDownloadUrl","softwareVersion","trialDays","trialSoftwareFileId","trialRequirements","trialInstructions"];
    document.querySelectorAll('[data-action="saveSettings"]').forEach(form => keys.forEach(k => {
      if (form.elements[k]) form.elements[k].value = s[k] || form.elements[k].value || "";
    }));
    const links = dashboard.social || {}; ["youtube","instagram","facebook","linkedin","twitter","awtaxation","whatsapp"].forEach(k => { if (social.elements[k]) social.elements[k].value = links[k] || social.elements[k].value || ""; });
    (links.custom || []).slice(0, 2).forEach((x, i) => { if (social.elements[`customLabel${i+1}`]) social.elements[`customLabel${i+1}`].value = x.label || ""; if (social.elements[`customUrl${i+1}`]) social.elements[`customUrl${i+1}`].value = x.url || ""; });
  }
  function render() {
    const c = dashboard.counts || {}; document.querySelector("[data-admin-stats]").innerHTML = [[c.customers||0,"Customers"],[c.pendingPayments||0,"Pending Payments"],[c.activeSubscriptions||0,"Active Subscriptions"],[c.publishedBlogs||0,"Published Blogs"],[c.openEnquiries||0,"Open Enquiries"],[c.trialRequests||0,"Trial Registrations"]].map(([n,l]) => `<article><small>${l}</small><h3>${n}</h3><span class="badge">Live Data</span></article>`).join("");
    document.querySelector("[data-admin-banners]").innerHTML = media(dashboard.banners,"BANNERS"); document.querySelector("[data-admin-partners]").innerHTML = media(dashboard.partners,"PARTNERS"); document.querySelector("[data-admin-brands]").innerHTML = media(dashboard.brands,"BRANDS"); document.querySelector("[data-admin-videos]").innerHTML = media(dashboard.videos,"VIDEOS");
    document.querySelector("[data-admin-blogs]").innerHTML = (dashboard.blogs||[]).map(x => `<article><span><b>${esc(x.title)}</b><br><small>/${esc(x.slug)} · ${esc(x.status)}</small></span><a href="blog.html?slug=${encodeURIComponent(x.slug)}" target="_blank">View</a><button data-delete-type="BLOGS" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">No blogs yet.</p>';
    document.querySelector("[data-admin-help]").innerHTML = (dashboard.help||[]).map(x => `<article><span><b>${esc(x.title)}</b><br><small>${esc(x.category)} · /${esc(x.slug)} · ${esc(x.status)} · ${esc(x.language)}</small></span><a href="${x.slug==='myntra'?'myntra-help.html':`help-detail.html?slug=${encodeURIComponent(x.slug)}`}" target="_blank">View</a><button data-delete-type="HELP_ARTICLES" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">No help guides yet.</p>';
    document.querySelector("[data-admin-queries]").innerHTML = (dashboard.enquiries||[]).map(x => `<article class="query-card"><div><span class="badge ${x.status==='OPEN'?'warn':''}">${esc(x.status)}</span><h3>${esc(x.id)} · ${esc(x.name)}</h3><p><b>Email:</b> ${esc(x.email)} &nbsp; <b>Phone:</b> ${esc(x.phone)}<br><b>Company:</b> ${esc(x.company||'Not provided')}<br><small>${esc(x.createdAt)}</small></p><blockquote>${esc(x.message)}</blockquote>${x.reply?`<p class="query-last-reply"><b>Last response:</b> ${esc(x.reply)}</p>`:''}</div><div class="query-reply"><textarea rows="4" data-query-reply="${esc(x.id)}" placeholder="Type response to client…"></textarea><button class="btn btn-primary" data-send-query="${esc(x.id)}">Send Email Response</button></div></article>`).join("") || '<p class="empty-state">No client enquiries yet.</p>';
    document.querySelectorAll("[data-send-query]").forEach(b => b.onclick = () => { const reply = document.querySelector(`[data-query-reply="${b.dataset.sendQuery}"]`).value.trim(); if (reply) action("enquiryAction", { id:b.dataset.sendQuery, task:"REPLY", reply }); else note("Please type a response first.", true); });
    document.querySelector("[data-admin-trials]").innerHTML = (dashboard.trialLeads||[]).map(x => `<tr><td><b>${esc(x.name)}</b><br><small>${esc(x.email)} · ${esc(x.phone)}</small></td><td>${esc(x.company)}<br><small>${esc(x.state)}</small></td><td>${esc(x.createdAt)}</td><td><span class="badge ${x.downloads>0?'':'warn'}">${esc(x.downloads>0?'DOWNLOADED':(x.verified?'VERIFIED':'PENDING'))}</span></td><td>${esc(x.downloads>0?'Granted':'Not downloaded')}</td></tr>`).join("") || '<tr><td colspan="5">No trial registrations yet.</td></tr>';
    document.querySelector("[data-admin-payments]").innerHTML = (dashboard.payments||[]).map(x => `<tr><td><b>${esc(x.orderId)}</b><br>${esc(x.name)}<br><small>${esc(x.phone)} · ${esc(x.state)}</small></td><td>${esc(x.plan)}</td><td>₹${Number(x.amount||0).toLocaleString("en-IN")}</td><td><a href="${esc(x.screenshotUrl)}" target="_blank" rel="noopener">View Screenshot</a></td><td><span class="badge ${x.status==='PENDING'?'warn':''}">${esc(x.status)}</span></td><td>${x.status==='PENDING'?`<select data-plan-for="${esc(x.orderId)}"><option value="MONTHLY" ${x.plan==='MONTHLY'?'selected':''}>Monthly</option><option value="HALF_YEARLY" ${x.plan==='HALF_YEARLY'?'selected':''}>Half-Yearly</option><option value="YEARLY" ${x.plan==='YEARLY'?'selected':''}>Yearly</option><option value="CUSTOM">Custom Days</option></select><input data-days-for="${esc(x.orderId)}" type="number" placeholder="Days"><button class="approve-btn" data-approve="${esc(x.orderId)}">Approve</button><button class="reject-btn" data-reject="${esc(x.orderId)}">Reject</button>`:"—"}</td></tr>`).join("") || '<tr><td colspan="6">No payment attempts.</td></tr>';
    document.querySelectorAll("[data-approve]").forEach(b => b.onclick = () => action("approvePayment", { orderId:b.dataset.approve, plan:document.querySelector(`[data-plan-for="${b.dataset.approve}"]`).value, days:document.querySelector(`[data-days-for="${b.dataset.approve}"]`).value }));
    document.querySelectorAll("[data-reject]").forEach(b => b.onclick = () => action("rejectPayment", { orderId:b.dataset.reject }));
    document.querySelector("[data-admin-reviews]").innerHTML = (dashboard.reviews||[]).map(x => `<article><span><b>${"★".repeat(+x.rating||0)} ${esc(x.name)}</b><br>${esc(x.comment)}<br><small>${esc(x.status)}${x.reply?" · Reply: "+esc(x.reply):""}</small></span><button data-review-approve="${esc(x.id)}">Approve</button><button data-review-reply="${esc(x.id)}">Reply</button><button data-delete-type="REVIEWS" data-delete-id="${esc(x.id)}">Remove</button></article>`).join("") || '<p class="empty-state">No reviews or comments.</p>';
    document.querySelectorAll("[data-review-approve]").forEach(b => b.onclick = () => action("reviewAction", { id:b.dataset.reviewApprove, task:"APPROVE" })); document.querySelectorAll("[data-review-reply]").forEach(b => b.onclick = () => { const reply = prompt("Enter public reply:"); if (reply) action("reviewAction", { id:b.dataset.reviewReply, task:"REPLY", reply }); });
    document.querySelector("[data-admin-customers]").innerHTML = (dashboard.customers||[]).map(x => `<article><span><b>${esc(x.name||x.email)}</b><br><small>${esc(x.email)} · ${esc(x.phone)} · ${esc(x.state)}</small></span><em>${esc(x.plan||"No plan")}</em></article>`).join("") || '<p class="empty-state">No customers yet.</p>';
    document.querySelector("[data-admin-invoices]").innerHTML = (dashboard.invoices||[]).map(x => `<article><span><b>${esc(x.invoiceNumber)}</b><br><small>${esc(x.customer)} · ₹${esc(x.total)}</small></span><a href="${esc(x.pdfUrl)}" target="_blank">PDF</a></article>`).join("") || '<p class="empty-state">No invoices yet.</p>';
    fillSettings(); bindDelete();
  }
  async function load() { try { dashboard = await QSApi.post("adminDashboard", {}, QSApi.token()); render(); note("Dashboard is up to date."); } catch (error) { note(error.message, true); if (/token|admin|author/i.test(error.message)) setTimeout(() => { QSApi.clearSession(); location.href = "admin.html"; }, 1200); } }
  load();
})();
