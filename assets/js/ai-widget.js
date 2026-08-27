(function () {
  "use strict";
  if (document.querySelector("[data-qs-ai]")) return;
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const root = document.createElement("div");
  root.className = "qs-ai"; root.dataset.qsAi = "";
  root.innerHTML = `<div class="qs-ai-tip" data-ai-tip><button aria-label="Close help notification" data-ai-tip-close>×</button><b>Need help? Ask Queshift AI</b><span>Myntra, GST, reconciliation aur software errors ka turant solution paayein.</span><button class="tip-open" data-ai-open>Ask Now</button></div><button class="qs-ai-fab" data-ai-open aria-label="Ask Queshift AI" title="Ask Queshift AI for instant help"><span class="ai-new">AI</span><span class="ai-pulse"></span>✦</button><section class="qs-ai-panel" data-ai-panel hidden aria-label="Queshift AI chat"><header><div><b>Queshift AI</b><small>Answers from Queshift Help</small></div><button data-ai-close aria-label="Close chat">×</button></header><div class="qs-ai-messages" data-ai-messages><div class="ai-message bot">Namaste! Myntra, Tally/BUSY, settlement, GST ya Queshift error ke baare mein poochhiye.</div></div><form data-ai-form><textarea name="question" rows="2" placeholder="Type your question…" required></textarea><button type="submit">Ask</button></form></section>`;
  document.body.appendChild(root);
  const panel = root.querySelector("[data-ai-panel]"), messages = root.querySelector("[data-ai-messages]"), tip = root.querySelector("[data-ai-tip]");
  const open = () => { panel.hidden = false; tip.hidden = true; root.querySelector("textarea").focus(); sessionStorage.setItem("qs_ai_tip_seen","1"); };
  root.querySelectorAll("[data-ai-open]").forEach(x => x.addEventListener("click", open));
  root.querySelector("[data-ai-close]").onclick = () => panel.hidden = true;
  root.querySelector("[data-ai-tip-close]").onclick = () => { tip.hidden = true; sessionStorage.setItem("qs_ai_tip_seen","1"); };
  if (sessionStorage.getItem("qs_ai_tip_seen")) tip.hidden = true; else setTimeout(() => tip.classList.add("show"), 900);

  function fallback(question) {
    const q = question.toLowerCase();
    if (/state|mapping/.test(q)) return { answer: "STATE MAPPING REQUIRED ka matlab marketplace State abhi Tally/BUSY State se map nahi hai. Validation mein correct searchable State select karke Save Mapping karein, phir Validation dobara run karein.", matchedSlug: "myntra", needsQuery: false };
    if (/hsn|item name|gst rate/.test(q)) return { answer: "Order ID, Packet ID aur SKU check karein. Validation window mein suggested HSN accept/correct karke mapping save karein. Item Name valid hone se pehle report Generate na karein.", matchedSlug: "myntra", needsQuery: false };
    if (/settle|pending|unsettled|suspense/.test(q)) return { answer: "100% Settled mein expected aur received tolerance ke andar match hote hain. Pending/Unsettled unpaid ya short-paid amount hai. Suspense ka matlab settlement mila, lekin reliable SALE/order match nahi mila.", matchedSlug: "myntra", needsQuery: false };
    if (/network|offline|server/.test(q)) return { answer: "Server PC ON rakhein, client aur server ko same LAN/Wi-Fi par check karein, phir Queshift Network Connection Check chalayein. Database ya security key manually copy/replace na karein.", matchedSlug: "myntra", needsQuery: false };
    return { answer: "Mujhe published Help content mein confident answer nahi mila. Aap apni query bhej sakte hain; Queshift team aapse shortly contact karegi.", needsQuery: true };
  }
  function add(type, html) { const item = document.createElement("div"); item.className = `ai-message ${type}`; item.innerHTML = html; messages.appendChild(item); messages.scrollTop = messages.scrollHeight; return item; }
  root.querySelector("[data-ai-form]").addEventListener("submit", async event => {
    event.preventDefault(); const input = event.currentTarget.question, question = input.value.trim(); if (!question) return;
    add("user", esc(question)); input.value = ""; const waiting = add("bot", "Searching Queshift Help…");
    try {
      const result = QSApi.isConfigured() ? await QSApi.post("aiHelp", { question }) : fallback(question);
      const guide = result.matchedSlug ? `<a class="ai-guide" href="${result.matchedSlug === "myntra" ? "myntra-help.html" : `help-detail.html?slug=${encodeURIComponent(result.matchedSlug)}`}">Open related Help Guide →</a>` : "";
      const query = `<a class="ai-query" href="contact.html?message=${encodeURIComponent(question)}">Still need help? Send your query</a>`;
      waiting.innerHTML = `<span>${esc(result.answer).replace(/\n/g,"<br>")}</span>${guide}${query}`;
    } catch (error) { waiting.innerHTML = `${esc(error.message)}<a class="ai-query" href="contact.html?message=${encodeURIComponent(question)}">Send this query to our team</a>`; }
    messages.scrollTop = messages.scrollHeight;
  });
})();
