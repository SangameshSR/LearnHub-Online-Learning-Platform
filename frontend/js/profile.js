// Enhanced profile page: full details, enrolled courses + progress, and edit form.
// Save as frontend/js/profile.js (replace existing file).

document.addEventListener("DOMContentLoaded", async () => {
  const card = document.getElementById("profile-card");
  if (!card) return;
  if (!Auth.isLoggedIn()) {
    card.innerHTML = "<div class='error'>You must be logged in to view your profile.</div>";
    return;
  }

  await renderProfile();
});

async function renderProfile() {
  const card = document.getElementById("profile-card");
  card.innerHTML = `<h2>Profile</h2><div class="muted">Loading...</div>`;

  // Fetch profile and enrollments in parallel
  const [meRes, enrollRes] = await Promise.allSettled([
    api.get("/auth/me"),
    api.get("/enrollments/my")
  ]);

  const me = (meRes.status === "fulfilled" && meRes.value.success) ? meRes.value.data : Auth.getUser();
  const enrollments = (enrollRes.status === "fulfilled" && enrollRes.value.success)
    ? (Array.isArray(enrollRes.value.data) ? enrollRes.value.data : (enrollRes.value.data && enrollRes.value.data.data) || [])
    : [];

  // Keep stored user in sync when possible
  if (me) Auth.save(Auth.getToken(), me);

  // Build profile HTML
  const created = me && me.createdAt ? formatDate(me.createdAt) : "";
  const fullname = me?.fullName || me?.name || "";
  const email = me?.email || "";
  const phone = me?.phone || "";
  const role = me?.role || "";
  const userId = me?.id || me?.userId || "";

  card.innerHTML = `
    <h2>Profile</h2>
    <div id="profile-details">
      <p><strong>Full name:</strong> <span id="pf-fullName">${escape(fullname)}</span></p>
      <p><strong>Email:</strong> <span id="pf-email">${escape(email)}</span></p>
      <p><strong>Phone:</strong> <span id="pf-phone">${escape(phone || "—")}</span></p>
      <p><strong>Role:</strong> <span id="pf-role">${escape(role)}</span></p>
      <p><strong>User ID:</strong> <span id="pf-id">${escape(userId)}</span></p>
      ${created ? `<p><strong>Member since:</strong> ${escape(created)}</p>` : ""}
      <div style="margin-top:8px">
        <button id="edit-profile-btn" class="btn">Edit profile</button>
      </div>
    </div>

    <div id="profile-courses" style="margin-top:18px">
      <h3>My Courses (${enrollments.length})</h3>
      <div id="profile-courses-list"></div>
    </div>
    <div id="profile-message" style="margin-top:12px"></div>
  `;

  renderCoursesList(enrollments);

  document.getElementById("edit-profile-btn").addEventListener("click", showEditForm);
}

function renderCoursesList(enrollments) {
  const listEl = document.getElementById("profile-courses-list");
  if (!enrollments || !enrollments.length) {
    listEl.innerHTML = "<div class='muted'>You have no enrolled courses yet.</div>";
    return;
  }

  listEl.innerHTML = "";
  enrollments.forEach(e => {
    const pct = e.progressPct ?? Math.round(((e.completedLessons || 0) / Math.max(e.totalLessons || 1, 1)) * 100);
    const title = e.title || e.name || ("Course " + (e.courseId || ""));
    const courseId = e.courseId || e.courseId;
    const card = document.createElement("div");
    card.className = "enrollment-card card";
    card.style.marginBottom = "10px";
    card.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:600">${escape(title)}</div>
        <div class="muted">${escape(e.category || "")} • ${escape(e.duration || "")}</div>
        <div style="margin-top:8px">
          <div class="progress-bar" style="max-width:300px">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
          <small>${pct}% • ${e.completedLessons || 0}/${e.totalLessons || 0} lessons</small>
        </div>
      </div>
      <div style="text-align:right">
        ${pct === 100 ? `<a class="btn" href="/pages/certificate.html?enrollmentId=${e.enrollmentId || e.id || e.courseId}">Certificate</a>`
                      : `<a class="btn primary" href="/pages/player.html?courseId=${courseId}">Continue</a>`}
      </div>
    `;
    listEl.appendChild(card);
  });
}

function showEditForm() {
  const details = document.getElementById("profile-details");
  const fullNameEl = document.getElementById("pf-fullName");
  const phoneEl = document.getElementById("pf-phone");
  const currentName = fullNameEl ? fullNameEl.textContent : "";
  const currentPhone = phoneEl ? phoneEl.textContent : "";

  // Replace details with an edit form
  details.innerHTML = `
    <form id="profile-edit-form" style="display:flex;flex-direction:column;gap:8px">
      <label>Full name</label>
      <input name="fullName" value="${escapeAttr(currentName)}" required />
      <label>Phone</label>
      <input name="phone" value="${escapeAttr(currentPhone === "—" ? "" : currentPhone)}" />
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" id="cancel-edit" class="btn">Cancel</button>
        <button type="submit" class="btn primary">Save</button>
      </div>
      <div id="profile-edit-msg" style="margin-top:6px"></div>
    </form>
  `;

  document.getElementById("cancel-edit").addEventListener("click", () => renderProfile());
  document.getElementById("profile-edit-form").addEventListener("submit", submitProfileEdit);
}

async function submitProfileEdit(e) {
  e.preventDefault();
  const msgEl = document.getElementById("profile-edit-msg");
  msgEl.innerHTML = "";
  const form = e.target;
  const fd = new FormData(form);
  const fullName = fd.get("fullName")?.trim();
  const phone = fd.get("phone")?.trim();

  if (!fullName) {
    msgEl.innerHTML = `<div class="error">Full name is required.</div>`;
    return;
  }

  const payload = { fullName, phone };

  // Attempt to send update to backend. Backend may not implement PUT /api/auth/me.
  const res = await api.put("/auth/me", payload);

  if (!res.success) {
    // If backend endpoint not implemented (404/405) or returns 403, show helpful message
    if (res.status === 404 || res.status === 405) {
      msgEl.innerHTML = `<div class="error">Update endpoint not available on server (HTTP ${res.status}). To enable profile editing, the backend must expose a user update endpoint (e.g. PUT /api/auth/me).</div>
        <div class="muted" style="margin-top:6px">If you want, I can provide the exact backend code to add this endpoint.</div>`;
      console.warn("Profile update failed (endpoint missing):", res);
      return;
    }

    const err = res.error && (res.error.message || JSON.stringify(res.error)) || `Failed (${res.status})`;
    msgEl.innerHTML = `<div class="error">Error updating profile: ${escape(err)}</div>`;
    console.warn("Profile update failed:", res);
    return;
  }

  // Success: update stored user and re-render
  const serverUser = res.data || res.data.data || {};
  // Merge: keep token and set updated fields
  const token = Auth.getToken();
  const existing = Auth.getUser() || {};
  const merged = { ...existing, ...serverUser };
  Auth.save(token, merged);

  msgEl.innerHTML = `<div class="muted">Profile updated.</div>`;
  // re-render full profile after a short delay
  setTimeout(renderProfile, 600);
}

/* --------------------
   Helpers
   -------------------- */
function escape(s){ return String(s||""); }
function escapeAttr(s){ return String(s||"").replace(/"/g,'&quot;'); }
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

/* Reuse earlier escapeHtml in other files - keep safe escaping here */
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }