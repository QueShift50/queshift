(function () {
  "use strict";
  const fallback = [{ id:"sample-1", slug:"ecommerce-order-wise-reconciliation", title:"Why Order-wise Reconciliation Matters for Marketplace Sellers", summary:"Understand how sales, returns, fees, TDS, TCS and settlements connect at order level across Indian marketplaces.", imageUrl:"assets/images/aw-taxation-banner.jpg", date:"Coming soon", tags:"E-commerce Accounting, Reconciliation" }];
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function list() {
    const grid = document.querySelector("[data-blog-list]"); if (!grid) return;
    let blogs = fallback;
    try { if (QSApi.isConfigured()) blogs = await QSApi.get("blogs"); }
    catch (error) { if (QSApi.isConfigured()) { grid.innerHTML = `<p class="empty-state">Blogs could not be loaded: ${esc(error.message)}</p>`; return; } }
    grid.innerHTML = (blogs.length ? blogs : (QSApi.isConfigured()?[]:fallback)).map(b => `<article class="blog-card"><img src="${esc(QSApi.mediaUrl(b.imageUrl,"assets/images/aw-taxation-banner.jpg"))}" alt="${esc(b.title)}"><div><div class="blog-meta"><span>${esc(b.date||"")}</span><span>${esc(b.tags||"")}</span></div><h2>${esc(b.title)}</h2><p>${esc(b.summary||"")}</p><a class="btn btn-outline btn-sm" href="blog.html?slug=${encodeURIComponent(b.slug)}">Read Article →</a></div></article>`).join("");
  }
  async function detail() {
    const body = document.querySelector("[data-blog-body]"); if (!body) return; const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { body.innerHTML = "<p>Blog not found.</p>"; return; }
    try {
      if (!QSApi.isConfigured()) throw new Error("This blog will be available after Google backend setup.");
      const b = await QSApi.get("blog", { slug });
      document.title = b.metaTitle || b.title + " | Queshift Blog";
      document.querySelector('meta[name="description"]').content = b.metaDescription || b.summary || "";
      document.querySelector("[data-blog-title]").textContent = b.title; document.querySelector("[data-blog-summary]").textContent = b.summary || "";
      const cover = document.querySelector("[data-blog-cover]"); if (b.imageUrl) { cover.src = QSApi.mediaUrl(b.imageUrl, "assets/images/aw-taxation-banner.jpg"); cover.alt = b.title; } else cover.hidden = true;
      body.innerHTML = b.html || "<p>Article content is being prepared.</p>";
      document.querySelector("[data-blog-date]").textContent = b.date || ""; document.querySelector("[data-blog-tags]").textContent = b.tags || "";
      const schema = { "@context":"https://schema.org", "@type":"BlogPosting", headline:b.title, description:b.metaDescription||b.summary, image:b.imageUrl, datePublished:b.isoDate, author:{"@type":"Organization",name:"Queshift by AW Taxation"}, publisher:{"@type":"Organization",name:"Queshift",url:"https://queshift.in"}, mainEntityOfPage:`https://queshift.in/blog.html?slug=${encodeURIComponent(slug)}` };
      const script = document.createElement("script"); script.type = "application/ld+json"; script.textContent = JSON.stringify(schema); document.head.appendChild(script);
      const comments = document.querySelector("[data-comments]"); comments.innerHTML = (b.comments||[]).map(c => `<article><b>${esc(c.name)}</b><p>${esc(c.comment)}</p>${c.reply?`<small>Queshift: ${esc(c.reply)}</small>`:""}</article>`).join("") || '<p class="empty-state">Be the first to comment.</p>';
    } catch (error) { body.innerHTML = `<p>${esc(error.message)}</p>`; }
  }
  const commentForm = document.querySelector("[data-comment-form]"); if (commentForm) commentForm.addEventListener("submit", async e => { e.preventDefault(); const slug=new URLSearchParams(location.search).get("slug"); if (!QSApi.token()) { location.href = "login.html?next=" + encodeURIComponent("blog.html?slug=" + (slug || "")); return; } const status=commentForm.querySelector("[data-comment-status]"); try { await QSApi.post("submitComment", { slug, comment:commentForm.comment.value }, QSApi.token()); status.textContent="Comment submitted for approval."; commentForm.reset(); } catch(err){ status.textContent=err.message; } });
  document.addEventListener("DOMContentLoaded",()=>{list();detail();});
})();
