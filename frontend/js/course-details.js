document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) { document.getElementById("course-card").innerHTML = "<div class='error'>Course ID missing</div>"; return; }
  const res = await api.get("/courses/" + id);
  // If backend doesn't have GET /courses/{id}, fallback to list
  let course = null;
  if (res.success && res.data) course = res.data;
  else {
    const list = await api.get("/courses");
    const arr = Array.isArray(list.data) ? list.data : (list.data && list.data.data) || [];
    course = arr.find(c => String(c.id) === String(id) || String(c.courseId) === String(id));
  }
  if (!course) { document.getElementById("course-card").innerHTML = "<div class='error'>Course not found</div>"; return; }
  renderCourse(course);
});

async function renderCourse(c) {
  const el = document.getElementById("course-card");
  el.innerHTML = `
    <h1>${escapeHtml(c.title||c.name)}</h1>
    <div class="meta">${escapeHtml(c.category||"")} • ${escapeHtml(c.level||"")} • ${escapeHtml(c.duration||"")}</div>
    <p class="muted">${escapeHtml(c.description||"")}</p>
  `;
  const actions = document.getElementById("course-actions");
  actions.innerHTML = `
    <h3>Course</h3>
    <p>Lessons: ${c.totalLessons || (c.lessonCount || "—")}</p>
    <p>Price: ${c.price ? "$" + c.price : "Free"}</p>
    <div id="enroll-area"></div>
  `;
  const enrollArea = document.getElementById("enroll-area");
  // check enrollment if logged in
  if (!Auth.isLoggedIn()) {
    enrollArea.innerHTML = `<a class="btn primary" href="/pages/login.html">Login to enroll</a>`;
    return;
  }

  // Show a temporary loading state while checking enrollment
  enrollArea.innerHTML = `<div class="muted">Checking enrollment...</div>`;

  const check = await api.get(`/enrollments/check/${c.id || c.courseId}`);
  let enrolled = false;
  if (check.success && check.data) {
    if (typeof check.data === "object" && ("enrolled" in check.data)) enrolled = check.data.enrolled;
    else if (check.data === true) enrolled = true;
    else if (check.data.enrolled === true) enrolled = true;
  }

  if (enrolled) {
    enrollArea.innerHTML = `<a class="btn primary" href="/pages/player.html?courseId=${c.id || c.courseId}">Continue Learning</a>`;
    return;
  }

  // Not enrolled — prepare to enroll. Get canonical profile
  let user = Auth.getUser() || {};
  try {
    const me = await api.get("/auth/me");
    if (me.success && me.data) {
      user = me.data;
      Auth.save(Auth.getToken(), user);
    }
  } catch (e) {
    console.warn("Could not fetch /auth/me before showing enroll form", e);
  }

  // detect missing required fields
  const missingFullName = !(user.fullName || user.name);
  const missingEmail = !user.email;
  const missingPhone = !user.phone;

  // If any required fields are missing, render inline profile completion form
  if (missingFullName || missingEmail || missingPhone) {
    enrollArea.innerHTML = renderProfileFormHtml(user, c);
    attachProfileFormHandler(user, c);
    return;
  }

  // Otherwise show a simple enroll button
  enrollArea.innerHTML = `<button id="enroll-btn" class="btn primary">Enroll</button>`;
  document.getElementById("enroll-btn").addEventListener("click", async () => {
    await submitEnrollWithUser(c, user);
  });
}

function renderProfileFormHtml(user, course) {
  const fullnameVal = escapeHtml(user.fullName || user.name || "");
  const emailVal = escapeHtml(user.email || "");
  const phoneVal = escapeHtml(user.phone || "");
  const qualVal = escapeHtml(user.qualification || "");
  return `
    <div class="card">
      <h4>Complete your profile to enroll</h4>
      <div id="enroll-error" class="error" style="display:none"></div>
      <label>Full name</label>
      <input id="enroll-fullname" type="text" value="${fullnameVal}" placeholder="Your full name" />
      <label>Email</label>
      <input id="enroll-email" type="email" value="${emailVal}" placeholder="you@example.com" />
      <label>Phone</label>
      <input id="enroll-phone" type="tel" value="${phoneVal}" placeholder="+1234567890" />
      <label>Qualification (optional)</label>
      <input id="enroll-qualification" type="text" value="${qualVal}" placeholder="e.g. B.Sc, M.Sc" />
      <div style="margin-top:10px">
        <button id="enroll-submit" class="btn primary">Continue & Enroll</button>
        <button id="enroll-cancel" class="btn ghost">Cancel</button>
      </div>
    </div>
  `;
}

function attachProfileFormHandler(user, course) {
  const submitBtn = document.getElementById("enroll-submit");
  const cancelBtn = document.getElementById("enroll-cancel");
  const errEl = document.getElementById("enroll-error");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      // re-render the enroll area to show default enroll button
      renderCourse(course);
    });
  }

  if (!submitBtn) return;
  submitBtn.addEventListener("click", async () => {
    // clear error
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const fullName = document.getElementById("enroll-fullname").value.trim();
    const email = document.getElementById("enroll-email").value.trim();
    const phone = document.getElementById("enroll-phone").value.trim();
    const qualification = document.getElementById("enroll-qualification").value.trim();

    // client-side validation
    if (!fullName || !email || !phone) {
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = "Full name, email and phone are required to enroll.";
      } else {
        alert("Full name, email and phone are required to enroll.");
      }
      return;
    }

    // disable UI while requesting
    submitBtn.disabled = true;
    submitBtn.textContent = "Enrolling...";

    // Build request body matching backend DTO
    const requestBody = {
      courseId: course.id || course.courseId,
      fullName: fullName,
      email: email,
      phone: phone,
      qualification: qualification
    };

    await submitEnrollWithUser(course, { ...user, fullName, email, phone, qualification });
  });
}

async function submitEnrollWithUser(course, user) {
  const enrollArea = document.getElementById("enroll-area");
  try {
    const res = await api.post("/enrollments", {
      courseId: course.id || course.courseId,
      fullName: user.fullName || user.name,
      email: user.email,
      phone: user.phone,
      qualification: user.qualification || ""
    });
    if (res.success) {
      enrollArea.innerHTML = `<a class="btn primary" href="/pages/player.html?courseId=${course.id || course.courseId}">Continue Learning</a>`;
    } else {
      const errEl = document.getElementById("enroll-error");
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = res.message || "Enrollment failed. Please try again.";
      } else {
        alert(res.message || "Enrollment failed. Please try again.");
      }
    }
  } catch (err) {
    console.error("Enrollment error:", err);
    const errEl = document.getElementById("enroll-error");
    if (errEl) {
      errEl.style.display = "block";
      errEl.textContent = "Error during enrollment. Please try again.";
    } else {
      alert("Error during enrollment. Please try again.");
    }
  }
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}