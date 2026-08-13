(function(){
  const defaults={heroTitle:"Every order matched. Every rupee accounted for.",heroText:"Maintain e-commerce accounts, reconcile settlements and understand exact order-wise calculation across every major marketplace.",phone1:"9310907124",phone2:"9310907125",email:"info.queshift@gmail.com",trusted:["Amazon Sellers","Flipkart Sellers","Myntra Sellers","Meesho Sellers","AJIO Sellers","Nykaa Sellers","JioMart Sellers","Snapdeal Sellers","D2C Websites","Multi-channel Brands"],downloads:[{title:"Queshift for Windows",version:"Coming Soon",details:"Desktop software for e-commerce accounting and reconciliation.",url:""}]};
  function data(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem("queshift_settings")||"{}"));}catch(e){return defaults}}
  window.Queshift={data,save:v=>localStorage.setItem("queshift_settings",JSON.stringify(v)),defaults};
  document.addEventListener("DOMContentLoaded",function(){
    const d=data();
    document.querySelectorAll("[data-phone1]").forEach(e=>e.textContent=d.phone1);
    document.querySelectorAll("[data-phone2]").forEach(e=>e.textContent=d.phone2);
    document.querySelectorAll("[data-email]").forEach(e=>e.textContent=d.email);
    document.querySelectorAll("[data-hero-title]").forEach(e=>e.textContent=d.heroTitle);
    document.querySelectorAll("[data-hero-text]").forEach(e=>e.textContent=d.heroText);
    document.querySelectorAll("[data-whatsapp]").forEach(e=>e.href="https://wa.me/91"+d.phone1+"?text="+encodeURIComponent("Hello Queshift, I want to know about e-commerce accounting and reconciliation software."));
    const trusted=document.querySelector("[data-trusted-list]");if(trusted)trusted.innerHTML=d.trusted.map(x=>`<div class="trusted-item">${escapeHtml(x)}</div>`).join("");
    const downloadList=document.querySelector("[data-download-list]");if(downloadList)downloadList.innerHTML=d.downloads.map(x=>`<article class="download"><div class="download-icon">↓</div><div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.details||"")}</p><small>Version: ${escapeHtml(x.version||"")}</small></div>${x.url?`<a class="btn btn-primary btn-sm" href="${safeUrl(x.url)}" target="_blank" rel="noopener">Download</a>`:`<span class="badge coming">Coming Soon</span>`}</article>`).join("");
    const menu=document.querySelector(".menu"),nav=document.querySelector(".nav-links");if(menu&&nav)menu.addEventListener("click",()=>nav.classList.toggle("open"));
    document.querySelectorAll("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());
    const contact=document.querySelector("[data-contact-form]");if(contact)contact.addEventListener("submit",function(ev){ev.preventDefault();const fd=new FormData(contact),subject="Queshift Website Enquiry - "+(fd.get("name")||"Visitor"),body=`Name: ${fd.get("name")||""}\nPhone: ${fd.get("phone")||""}\nCompany: ${fd.get("company")||""}\n\nMessage:\n${fd.get("message")||""}`;window.location.href=`mailto:${d.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;});
    const intro=document.querySelector(".intro");if(intro){document.body.classList.add("no-scroll");const video=intro.querySelector("video"),skip=intro.querySelector(".skip"),sound=intro.querySelector(".sound");const close=()=>{intro.classList.add("hide");document.body.classList.remove("no-scroll");setTimeout(()=>intro.remove(),700)};skip.addEventListener("click",close);video.addEventListener("ended",close);video.addEventListener("error",close);sound.addEventListener("click",()=>{video.muted=!video.muted;sound.textContent=video.muted?"♫ Sound On":"🔇 Mute"});setTimeout(close,12000)}
  });
  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function safeUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:"#"}catch(e){return "#"}}
})();
