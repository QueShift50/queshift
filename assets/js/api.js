(function () {
  "use strict";

  const cfg = window.QUESHIFT_CONFIG || {};
  const isConfigured = () => /^https:\/\/script\.google\.com\//.test(cfg.apiUrl || "");

  async function post(action, payload, token) {
    if (!isConfigured()) throw new Error("Google backend setup is pending.");
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("payload", JSON.stringify(payload || {}));
    if (token) body.set("credential", token);
    const response = await fetch(cfg.apiUrl, { method: "POST", body });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || "Request failed.");
    return data.data;
  }

  function get(action, params) {
    if (!isConfigured()) return Promise.reject(new Error("Google backend setup is pending."));
    return new Promise((resolve, reject) => {
      const callback = "qsCallback_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeout = setTimeout(() => finish(new Error("Backend response timeout.")), 20000);
      function finish(error, value) {
        clearTimeout(timeout);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(value);
      }
      window[callback] = result => result && result.ok
        ? finish(null, result.data)
        : finish(new Error((result && result.message) || "Request failed."));
      const url = new URL(cfg.apiUrl);
      url.searchParams.set("action", action);
      url.searchParams.set("callback", callback);
      Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
      script.onerror = () => finish(new Error("Unable to connect to Google backend."));
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  function driveId(value) {
    const text = String(value || "");
    let m = text.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    if (!m) m = text.match(/\/d\/([A-Za-z0-9_-]{10,})/);
    if (!m && /^[A-Za-z0-9_-]{20,}$/.test(text)) m = [text, text];
    return m ? m[1] : "";
  }

  function mediaUrl(value, fallback) {
    const text = String(value || "").trim();
    if (!text) return fallback || "";
    const id = driveId(text);
    if (!id) return text;
    let resourceKey = "";
    try { resourceKey = new URL(text, location.href).searchParams.get("resourcekey") || ""; } catch (_) {}
    return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w2000" + (resourceKey ? "&resourcekey=" + encodeURIComponent(resourceKey) : "");
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

  window.QSApi = { cfg, isConfigured, get, post, token, session, setSession, clearSession, logout, requireUser, fileToDataUrl, mediaUrl };
})();
