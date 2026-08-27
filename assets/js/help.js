(function () {
  "use strict";
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const list = document.querySelector("[data-help-list]");
  const title = document.querySelector("[data-help-title]");
  if (list) {
    let guides = [{ slug: "myntra", title: "Myntra – Complete Client Help", category: "Myntra", summary: "Import, validation, Tally/BUSY, settlement, reconciliation, P&L and GST guide in English, Hinglish and Hindi.", language: "English, Hinglish, Hindi" }];
    const render = filter => {
      const q = String(filter || "").toLowerCase();
      const shown = guides.filter(x => !q || [x.title,x.category,x.summary,x.language].join(" ").toLowerCase().includes(q));
      list.innerHTML = shown.map(x => `<article class="help-card"><span>${esc(x.category || "General")}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary || "Queshift help guide")}</p><small>${esc(x.language || "")}</small><a href="${x.slug === "myntra" ? "myntra-help.html" : `help-detail.html?slug=${encodeURIComponent(x.slug)}`}">Open Guide →</a></article>`).join("") || '<p class="empty-state">No matching help guide found. Ask Queshift AI or send your query.</p>';
    };
    render();
    if (QSApi.isConfigured()) QSApi.get("helpArticles").then(data => { if (Array.isArray(data) && data.length) { guides = data; render(); } }).catch(() => {});
    const search = document.querySelector("[data-help-search]");
    document.querySelector("[data-help-search-button]").onclick = () => render(search.value);
    search.addEventListener("input", () => render(search.value));
  }
  if (title) {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    if (!slug || !QSApi.isConfigured()) { title.textContent = "Help guide unavailable"; document.querySelector("[data-help-body]").innerHTML = '<p>Please return to the Help Centre or contact Queshift support.</p>'; return; }
    QSApi.get("helpArticle", { slug }).then(data => {
      document.title = data.metaTitle || `${data.title} | Queshift Help`;
      let md=document.querySelector('meta[name="description"]'); if(md) md.content=data.metaDescription||data.summary||'';
      let mk=document.querySelector('meta[name="keywords"]'); if(!mk){mk=document.createElement('meta');mk.name='keywords';document.head.appendChild(mk);} mk.content=data.keywords||'';
      let canonical=document.querySelector('link[rel="canonical"]'); if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);} canonical.href=`https://queshift.in/help-detail.html?slug=${encodeURIComponent(data.slug||slug)}`;
      const schema={"@context":"https://schema.org","@type":"TechArticle",headline:data.title,description:data.metaDescription||data.summary||'',datePublished:data.isoDate,author:{"@type":"Organization",name:"Queshift by AW Taxation"},publisher:{"@type":"Organization",name:"Queshift",url:"https://queshift.in"}};const sc=document.createElement('script');sc.type='application/ld+json';sc.textContent=JSON.stringify(schema);document.head.appendChild(sc);
      title.textContent = data.title;
      document.querySelector("[data-help-category]").textContent = data.category || "Help Guide";
      document.querySelector("[data-help-summary]").textContent = data.summary || "";
      document.querySelector("[data-help-body]").innerHTML = data.html || "<p>No guide content.</p>";
    }).catch(error => { title.textContent = "Help guide unavailable"; document.querySelector("[data-help-body]").textContent = error.message; });
  }
})();
