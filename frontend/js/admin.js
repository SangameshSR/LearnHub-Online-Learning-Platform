// js/admin.js
// Admin dashboard with stats, users, enrollments and "Add Course" form.
// Save/replace your existing js/admin.js with this file.

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("admin-content");
  if (!Auth.isLoggedIn()) {
    container.innerHTML = "<div class='error'>Access denied. Please log in as an admin.</div>";
    return;
  }
  if (!Auth.isAdmin()) {
    container.innerHTML = "<div class='error'>Access denied. Admins only.</div>";
    return;
  }

  container.innerHTML = "<div class='muted'>Loading admin dashboard...</div>";

  try {
    // Fetch stats, users, and enrollments in parallel
    const [statsRes, usersRes, enrollRes] = await Promise.allSettled([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/enrollments")
    ]);

    const unwrap = (r) => (r.status === "fulfilled" ? r.value : { success: false, status: 0, error: "Network failure" });

    const stats = unwrap(statsRes);
    const users = unwrap(usersRes);
    const enrollments = unwrap(enrollRes);

    // If any of the calls returned 401/403 show clear message
    if ((stats.status === 401 || users.status === 401 || enrollments.status === 401) ||
        (stats.status === 403 || users.status === 403 || enrollments.status === 403)) {
      container.innerHTML = "<div class='error'>You are not authorized to view admin data. Make sure you are signed in as an ADMIN.</div>";
      console.warn("Admin APIs returned auth error", { stats, users, enrollments });
      return;
    }

    // Build the dashboard UI (including Add Course form)
    container.innerHTML = `
      <div id="admin-top" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
        <div id="admin-stats" class="card glass" style="flex:1;min-width:260px"></div>
        <div id="admin-addcourse" class="card glass" style="flex:1;min-width:320px"></div>
      </div>
      <div id="admin-users" class="card glass" style="margin-bottom:16px"></div>
      <div id="admin-enrollments" class="card glass"></div>
    `;

    renderStats(stats);
    renderAddCourseForm(); // new
    renderUsers(users);
    renderEnrollments(enrollments);

  } catch (err) {
    console.error("Admin dashboard failed", err);
    container.innerHTML = "<div class='error'>Unable to load admin dashboard. Check console for details.</div>";
  }
});

/* -----------------------
   Stats
   ----------------------- */
function renderStats(statsRes) {
  const el = document.getElementById("admin-stats");
  if (!statsRes.success) {
    el.innerHTML = `<h3>Admin Dashboard</h3><div class="error">Failed to load stats: ${escapeHtml(String(statsRes.error || statsRes.status))}</div>`;
    return;
  }
  const s = statsRes.data || statsRes;
  el.innerHTML = `
    <h3>Admin Dashboard</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div class="card" style="padding:12px;min-width:120px">
        <div class="muted">Students</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(String(s.totalStudents ?? s.totalStudents))}</div>
      </div>
      <div class="card" style="padding:12px;min-width:120px">
        <div class="muted">Courses</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(String(s.totalCourses ?? s.totalCourses))}</div>
      </div>
      <div class="card" style="padding:12px;min-width:120px">
        <div class="muted">Enrollments</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(String(s.totalEnrollments ?? s.totalEnrollments))}</div>
      </div>
    </div>
  `;
}

/* -----------------------
   Add Course form (ADMIN)
   - Matches Course model fields:
     title (required), description, category, duration,
     totalLessons (optional), level, instructor, emoji, color,
     price, videoIds (comma-separated)
   ----------------------- */
function renderAddCourseForm() {
  const el = document.getElementById("admin-addcourse");
  el.innerHTML = `
    <h3>Add Course</h3>
    <form id="add-course-form" style="display:flex;flex-direction:column;gap:8px">
      <label>Title *</label>
      <input name="title" required placeholder="Course title" />
      <label>Category</label>
      <input name="category" placeholder="e.g. Java, Web" />
      <label>Level</label>
      <input name="level" placeholder="Beginner / Intermediate / Advanced" />
      <label>Duration</label>
      <input name="duration" placeholder="e.g. 8 weeks or 12h" />
      <label>Instructor</label>
      <input name="instructor" placeholder="Instructor name" />
      <label>Emoji</label>
      <input name="emoji" placeholder="☕ or 🎓" />
      <label>Color (hex)</label>
      <input name="color" placeholder="#06b6d4" />
      <label>Price</label>
      <input name="price" type="number" step="0.01" placeholder="0.00" />
      <label>Total Lessons (optional)</label>
      <input name="totalLessons" type="number" min="0" placeholder="If omitted, derived from videoIds" />
      <label>Video IDs (comma-separated) or playlist IDs</label>
      <textarea name="videoIds" rows="3" placeholder="videoId1,videoId2,... or playlist:PLxxx"></textarea>
      <label>Description</label>
      <textarea name="description" rows="4" placeholder="Course description"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="btn primary">Add Course</button>
      </div>
      <div id="add-course-msg" style="margin-top:6px"></div>
    </form>
  `;

  const form = document.getElementById("add-course-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("add-course-msg");
    msgEl.innerHTML = "";
    const fd = new FormData(form);
    const title = fd.get("title")?.trim();
    if (!title) {
      msgEl.innerHTML = `<div class="error">Title is required.</div>`;
      return;
    }

    const payload = {
      title,
      description: fd.get("description") || null,
      category: fd.get("category") || null,
      duration: fd.get("duration") || null,
      totalLessons: fd.get("totalLessons") ? Number(fd.get("totalLessons")) : null,
      level: fd.get("level") || null,
      instructor: fd.get("instructor") || null,
      emoji: fd.get("emoji") || null,
      color: fd.get("color") || null,
      price: fd.get("price") ? Number(fd.get("price")) : 0.0,
      videoIds: fd.get("videoIds") || null
    };

    // Send request to backend
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";

    const res = await api.post("/courses", payload);

    submitBtn.disabled = false;
    submitBtn.textContent = "Add Course";

    if (!res.success) {
      const err = res.error && (res.error.message || JSON.stringify(res.error)) || `Failed (${res.status})`;
      msgEl.innerHTML = `<div class="error">Error: ${escapeHtml(err)}</div>`;
      console.warn("Create course failed:", res);
      return;
    }

    // success: refresh admin sections
    msgEl.innerHTML = `<div class="muted">Course added successfully.</div>`;
    form.reset();
    await refreshAdminSection();
  });
}

/* -----------------------
   Users
   ----------------------- */
function renderUsers(usersRes) {
  const el = document.getElementById("admin-users");
  if (!usersRes.success) {
    el.innerHTML = `<h3>Users</h3><div class="error">Failed to load users: ${escapeHtml(String(usersRes.error || usersRes.status))}</div>`;
    return;
  }
  const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data && usersRes.data.data) || usersRes.data || [];
  el.innerHTML = `<h3>All Users (${users.length})</h3>`;
  if (!users.length) {
    el.innerHTML += `<div class="muted">No users found.</div>`;
    return;
  }

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left;padding:8px">ID</th>
        <th style="text-align:left;padding:8px">Name</th>
        <th style="text-align:left;padding:8px">Email</th>
        <th style="text-align:left;padding:8px">Role</th>
        <th style="text-align:left;padding:8px">Enrollments</th>
        <th style="text-align:left;padding:8px">Created</th>
        <th style="text-align:right;padding:8px">Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:8px">${escapeHtml(String(u.id||""))}</td>
      <td style="padding:8px">${escapeHtml(u.fullName||"")}</td>
      <td style="padding:8px">${escapeHtml(u.email||"")}</td>
      <td style="padding:8px">${escapeHtml(String(u.role||""))}</td>
      <td style="padding:8px">${escapeHtml(String(u.enrollments||0))}</td>
      <td style="padding:8px">${escapeHtml(String(u.createdAt||""))}</td>
      <td style="padding:8px;text-align:right">
        <button class="btn" data-delete-user="${escapeHtml(String(u.id||""))}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  el.appendChild(table);

  // Wire delete buttons
  el.querySelectorAll("[data-delete-user]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = btn.getAttribute("data-delete-user");
      if (!confirm("Delete user ID " + id + "? This cannot be undone.")) return;
      btn.disabled = true;
      const res = await api.delete(`/admin/users/${id}`);
      btn.disabled = false;
      if (!res.success) {
        alert("Delete failed: " + (res.error || res.status));
        console.warn("Delete user failed", res);
        return;
      }
      // refresh users list
      await refreshAdminSection();
    });
  });
}

/* -----------------------
   Enrollments
   ----------------------- */
function renderEnrollments(enrollRes) {
  const el = document.getElementById("admin-enrollments");
  if (!enrollRes.success) {
    el.innerHTML = `<h3>Enrollments</h3><div class="error">Failed to load enrollments: ${escapeHtml(String(enrollRes.error || enrollRes.status))}</div>`;
    return;
  }
  const enrolls = Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data && enrollRes.data.data) || enrollRes.data || [];
  el.innerHTML = `<h3>Enrollments (${enrolls.length})</h3>`;
  if (!enrolls.length) {
    el.innerHTML += `<div class="muted">No enrollments found.</div>`;
    return;
  }

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left;padding:8px">ID</th>
        <th style="text-align:left;padding:8px">Student</th>
        <th style="text-align:left;padding:8px">Email</th>
        <th style="text-align:left;padding:8px">Phone</th>
        <th style="text-align:left;padding:8px">Qualification</th>
        <th style="text-align:left;padding:8px">Course</th>
        <th style="text-align:left;padding:8px">EnrolledAt</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  enrolls.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:8px">${escapeHtml(String(e.id||e.enrollmentId||""))}</td>
      <td style="padding:8px">${escapeHtml(e.studentName||e.fullName||"")}</td>
      <td style="padding:8px">${escapeHtml(e.email||"")}</td>
      <td style="padding:8px">${escapeHtml(e.phone||"")}</td>
      <td style="padding:8px">${escapeHtml(e.qualification||"")}</td>
      <td style="padding:8px">${escapeHtml(e.course||e.title||"")}</td>
      <td style="padding:8px">${escapeHtml(String(e.enrolledAt||""))}</td>
    `;
    tbody.appendChild(tr);
  });

  el.appendChild(table);
}

/* -----------------------
   Refresh helper: re-run the admin fetch and re-render
   ----------------------- */
async function refreshAdminSection() {
  const container = document.getElementById("admin-content");
  container.innerHTML = "<div class='muted'>Refreshing...</div>";
  try {
    const [stats, users, enrollments] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/enrollments")
    ]);
    container.innerHTML = `
      <div id="admin-top" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
        <div id="admin-stats" class="card glass" style="flex:1;min-width:260px"></div>
        <div id="admin-addcourse" class="card glass" style="flex:1;min-width:320px"></div>
      </div>
      <div id="admin-users" class="card glass" style="margin-bottom:16px"></div>
      <div id="admin-enrollments" class="card glass"></div>
    `;
    renderStats(stats);
    renderAddCourseForm();
    renderUsers(users);
    renderEnrollments(enrollments);
  } catch (err) {
    container.innerHTML = "<div class='error'>Unable to refresh admin data.</div>";
    console.error(err);
  }
}

/* -----------------------
   Utilities
   ----------------------- */
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }