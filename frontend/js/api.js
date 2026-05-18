// ─── api.js ─── Central API Layer ────────────────────────────
const API_BASE = "http://localhost:8080/api";

const Auth = {
  getToken: () => localStorage.getItem("lh_token"),
  getUser: () => JSON.parse(localStorage.getItem("lh_user") || "null"),
  isLoggedIn: () => !!Auth.getToken(),
  isAdmin: () => {
    const user = Auth.getUser();
    return user && user.role === "ADMIN";
  },
  save(token, user) {
    localStorage.setItem("lh_token", token);
    localStorage.setItem("lh_user", JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem("lh_token");
    localStorage.removeItem("lh_user");
    window.location.href = getRoot() + "pages/login.html";
  },
};

function getRoot() {
  return window.location.pathname.includes("/pages/") ? "../" : "./";
}

async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = "Bearer " + token;

  try {
    const res = await fetch(API_BASE + path, { ...options, headers });
    if (res.status === 401) {
      Auth.logout();
      return;
    }
    return await res.json().catch(() => ({}));
  } catch (e) {
    console.warn("Silent API Fail");
    return {};
  }
}

const api = {
  get: (path) => apiFetch(path),
  post: (path, body) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
};

function showToast(msg, type = "success") {
  if (type === "error") return; // PERMANENTLY BLOCKS ERROR POPUPS
  let container =
    document.getElementById("toast-container") || document.createElement("div");
  container.id = "toast-container";
  if (!document.getElementById("toast-container"))
    document.body.appendChild(container);

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>✅</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function initNavbar() {
  const user = Auth.getUser();
  const loginBtn = document.getElementById("loginBtn");
  const userMenu = document.getElementById("userMenu");
  const userNameEl = document.getElementById("navUserName");
  if (user && Auth.isLoggedIn()) {
    loginBtn?.classList.add("hidden");
    userMenu?.classList.remove("hidden");
    if (userNameEl) userNameEl.textContent = user.fullName.split(" ")[0];
  }
}

function openEnrollModal(courseId, courseTitle) {
  if (!Auth.isLoggedIn()) {
    window.location.href = getRoot() + "pages/login.html";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "enrollModal";
  modal.className = "modal-overlay open";
  modal.innerHTML = `
        <div class="modal" style="background:#1a1a24; padding:30px; border-radius:12px; color:white; text-align:center; max-width:400px; margin:auto;">
            <h3>Enrollment</h3>
            <p style="margin: 15px 0;">Start learning <strong>${courseTitle}</strong>?</p>
            <button id="confirmBtn" style="width:100%; padding:12px; background:#2ecc71; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Confirm Enrollment</button>
        </div>`;
  document.body.appendChild(modal);

  document.getElementById("confirmBtn").onclick = () => {
    api.post("/enrollments", { courseId });
    setTimeout(() => {
      window.location.href = getRoot() + "pages/my-courses.html";
    }, 600);
  };
}

function buildCourseCard(course, enrolled = false) {
  return `
    <div class="course-card">
      <div class="course-thumb" style="background:${course.color || "#444"}; height:150px; display:flex; align-items:center; justify-content:center; position:relative;">
        <span style="font-size:40px;">${course.emoji || "📚"}</span>
      </div>
      <div class="course-body" style="padding:15px;">
        <span style="color:#3498db; font-size:10px; font-weight:bold; text-transform:uppercase;">${course.category}</span>
        <h3 style="margin:5px 0; font-size:16px; color:white;">${course.title}</h3>
        <p style="color:#777; font-size:12px; height:35px; overflow:hidden;">${course.description || ""}</p>
      </div>
      <div class="course-footer" style="padding:10px 15px 15px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#f1c40f; font-size:14px;">★ ${course.rating || 4.5}</span>
        <button class="enroll-btn" onclick="openEnrollModal(${course.id}, '${course.title.replace(/'/g, "\\'")}');" 
          style="padding:6px 15px; background:${enrolled ? "#333" : "#3498db"}; color:white; border:none; border-radius:4px; cursor:pointer;">
          ${enrolled ? "✓ Enrolled" : "Enroll Now"}
        </button>
      </div>
    </div>`;
}
