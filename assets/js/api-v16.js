(function () {
  "use strict";

  const cfg = window.QUESHIFT_CONFIG || {};
  const isConfigured = () => {
    try {
      const u = new URL(cfg.apiUrl || "");
      return u.protocol === "https:" && !!u.hostname;
    } catch (_) {
      return false;
    }
  };

  async function post(action, payload, token) {
    if (!isConfigured()) throw new Error("Queshift backend setup is pending.");
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("payload", JSON.stringify(payload || {}));
    if (token) body.set("credential", token);
    const controller = new AbortController();
    const adminActions = /^(adminDashboard|saveSettings|saveSocial|saveBanner|savePartner|saveBrand|saveVideo|saveBlog|saveHelpArticle|savePlan|saveSoftwareFile|deleteContent|approvePayment|rejectPayment|reviewAction|enquiryAction)$/;
    const timeoutMs = action === "adminDashboard" ? 35000 : (adminActions.test(action) ? 30000 : 20000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response, text, data;
    try {
      response = await fetch(cfg.apiUrl, { method: "POST", body, mode: "cors", credentials: "omit", signal: controller.signal });
      text = await response.text();
    } catch (error) {
      if (error && error.name === "AbortError") throw new Error("Backend response timeout. Please try again.");
      throw error;
    } finally { clearTimeout(timer); }
    try { data = JSON.parse(text); }
    catch (_) { throw new Error("Queshift backend returned an invalid response."); }
    if (!data.ok) throw new Error(data.message || "Request failed.");
    return data.data;
  }

  async function get(action, params) {
    if (!isConfigured()) throw new Error("Queshift backend setup is pending.");

    const url = new URL(cfg.apiUrl);
    url.searchParams.set("action", action);
    if (action === "publicData") url.searchParams.set("_qsbuild", "v16-" + Date.now());
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });

    const controller = new AbortController();
    const timeoutMs = action === "publicData" ? 15000 : 20000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response, text, data;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal
      });
      text = await response.text();
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Backend response timeout. Please try again.");
      }
      throw new Error("Unable to connect to Queshift backend.");
    } finally {
      clearTimeout(timer);
    }

    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error("Queshift backend returned an invalid response.");
    }

    if (!data || !data.ok) {
      throw new Error((data && data.message) || "Request failed.");
    }
    return data.data;
  }

  function driveId(value) {
    const text = String(value || "");
    let m = text.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    if (!m) m = text.match(/\/d\/([A-Za-z0-9_-]{10,})/);
    if (!m && /^[A-Za-z0-9_-]{20,}$/.test(text)) m = [text, text];
    return m ? m[1] : "";
  }

  function mediaCandidates(value, fallback) {
    const text = String(value || "").trim(), out = [];
    const push = x => { if (x && !out.includes(x)) out.push(x); };
    if (!text) { push(fallback || ""); return out; }
    const id = driveId(text);
    if (!id) { push(text); push(fallback || ""); return out; }
    let resourceKey = "";
    try { resourceKey = new URL(text, location.href).searchParams.get("resourcekey") || ""; } catch (_) {}
    const key = resourceKey ? "&resourcekey=" + encodeURIComponent(resourceKey) : "";
    // Googleusercontent is usually the fastest public image host. Keep Drive fallbacks for resource-key files.
    push("https://lh3.googleusercontent.com/d/" + encodeURIComponent(id) + "=w1600");
    push("https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1600" + key);
    push("https://drive.google.com/uc?export=view&id=" + encodeURIComponent(id) + key);
    push("https://drive.usercontent.google.com/download?id=" + encodeURIComponent(id) + "&export=view" + key);
    push(fallback || "");
    return out;
  }

  function mediaUrl(value, fallback) {
    return mediaCandidates(value, fallback)[0] || fallback || "";
  }

  function bindImage(img, value, fallback) {
    const candidates = mediaCandidates(value, fallback);
    try { img.referrerPolicy = "no-referrer"; } catch (_) {}
    let index = 0;
    const next = () => {
      if (index >= candidates.length) { img.onerror = null; return; }
      img.src = candidates[index++];
    };
    img.onerror = next;
    next();
  }

  function token() {
    return localStorage.getItem("qs_auth_token") || sessionStorage.getItem("qs_google_credential") || "";
  }
  function session() {
    try { return JSON.parse(localStorage.getItem("qs_session") || sessionStorage.getItem("qs_session") || "null"); }
    catch (_) { return null; }
  }
  function setSession(credential, data) {
    const appToken = (data && data.sessionToken) || credential;
    localStorage.setItem("qs_auth_token", appToken);
    localStorage.setItem("qs_session", JSON.stringify(data || {}));
    sessionStorage.removeItem("qs_google_credential");
    sessionStorage.removeItem("qs_session");
  }
  function clearSession() {
    localStorage.removeItem("qs_auth_token");
    localStorage.removeItem("qs_session");
    sessionStorage.removeItem("qs_google_credential");
    sessionStorage.removeItem("qs_session");
  }
  async function logout() {
    const t = token();
    try { if (t && isConfigured()) await post("logout", {}, t); } catch (_) {}
    clearSession();
  }
  function requireUser(next) {
    if (!token()) {
      const target = next || location.pathname.split("/").pop() || "dashboard.html";
      location.href = "login.html?next=" + encodeURIComponent(target);
      return false;
    }
    return true;
  }
  function fileToDataUrl(file, maxMb) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      if (file.size > (maxMb || 5) * 1024 * 1024) return reject(new Error("File is too large."));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });
  }

  window.QSApi = { cfg, isConfigured, get, post, token, session, setSession, clearSession, logout, requireUser, fileToDataUrl, mediaUrl, mediaCandidates, bindImage };
})();
