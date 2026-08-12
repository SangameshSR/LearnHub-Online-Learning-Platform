// Central API client + Auth helpers
const API_BASE = "http://localhost:8080/api";

const log = (...args) => {
  // avoid logging full tokens
  console.debug("[API]", ...args);
};

const handleResponse = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("application/json")) {
    try { body = await res.json(); } catch (e) { body = null; }
  } else {
    body = await res.text().catch(()=>null);
  }

  const normalized = { success: res.ok, status: res.status, data: body };
  if (!res.ok) {
    log("API Error:", res.status, res.url);
    // Keep standardized errors
    normalized.error = body || res.statusText;
  } else {
    log("API Response:", res.status, res.url);
  }
  return normalized;
};

const buildHeaders = (isJson=true) => {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";
  const token = Auth.getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
};

const api = {
  get: async (path) => {
    try {
      const res = await fetch(API_BASE + path, { headers: buildHeaders(false) });
      return await handleResponse(res);
    } catch (err) {
      console.error("API Request failed:", path, err);
      return { success:false, status:0, error:"Network failure" };
    }
  },
  post: async (path, body) => {
    try {
      const res = await fetch(API_BASE + path, { method:"POST", headers: buildHeaders(true), body: JSON.stringify(body) });
      return await handleResponse(res);
    } catch (err) {
      console.error("API Request failed:", path, err);
      return { success:false, status:0, error:"Network failure" };
    }
  },
  put: async (path, body) => {
    try {
      const res = await fetch(API_BASE + path, { method:"PUT", headers: buildHeaders(true), body: JSON.stringify(body) });
      return await handleResponse(res);
    } catch (err) {
      console.error("API Request failed:", path, err);
      return { success:false, status:0, error:"Network failure" };
    }
  },
  delete: async (path) => {
    try {
      const res = await fetch(API_BASE + path, { method:"DELETE", headers: buildHeaders(false) });
      return await handleResponse(res);
    } catch (err) {
      console.error("API Request failed:", path, err);
      return { success:false, status:0, error:"Network failure" };
    }
  }
};

// Auth helpers
const Auth = {
  tokenKey: "lh_token",
  userKey: "lh_user",
  save: (token, user) => {
    if (token) localStorage.setItem(Auth.tokenKey, token);
    if (user) localStorage.setItem(Auth.userKey, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(Auth.tokenKey);
    localStorage.removeItem(Auth.userKey);
  },
  logout: () => {
    Auth.clear();
    // don't auto-redirect here; app.js decides navigation
  },
  getToken: () => {
    const t = localStorage.getItem(Auth.tokenKey);
    if (!t) return null;
    if (!Auth._isTokenWellFormed(t)) { Auth.clear(); return null; }
    if (Auth._isExpired(t)) { Auth.clear(); return null; }
    return t;
  },
  getUser: () => {
    const s = localStorage.getItem(Auth.userKey);
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  },
  isLoggedIn: () => !!Auth.getToken(),
  isAdmin: () => {
    const u = Auth.getUser();
    if (!u) return false;
    return (u.role === "ADMIN" || u.role === "ROLE_ADMIN");
  },
  _isTokenWellFormed: (token) => {
    return typeof token === "string" && token.split(".").length === 3;
  },
  _decodePayload: (token) => {
    try {
      const payload = token.split(".")[1];
      const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch (e) {
      return null;
    }
  },
  _isExpired: (token) => {
    const payload = Auth._decodePayload(token);
    if (!payload) return true;
    if (!payload.exp) return false; // if backend doesn't set exp, assume non-expiring
    const now = Math.floor(Date.now()/1000);
    return payload.exp < now;
  }
};

// Export to global scope for other scripts
window.api = api;
window.Auth = Auth;