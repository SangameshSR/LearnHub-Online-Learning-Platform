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
    enrollArea.innerHTML = `<a class="btn primary" href="../pages/login.html">Login to enroll</a>`;
    return;
  }
  const check = await api.get(`/enrollments/check/${c.id || c.courseId}`);
  let enrolled = false;
  if (check.success && check.data) {
    if (typeof check.data === "object" && ("enrolled" in check.data)) enrolled = check.data.enrolled;
    else if (check.data === true) enrolled = true;
    else if (check.data.enrolled === true) enrolled = true;
  }
  if (enrolled) {
    enrollArea.innerHTML = `<a class="btn primary" href="../pages/player.html?courseId=${c.id || c.courseId}">Continue Learning</a>`;
  } else {
    enrollArea.innerHTML = `<button id="enroll-btn" class="btn primary">Enroll</button>`;
    document.getElementById("enroll-btn").addEventListener("click", async () => {
      const res = await api.post("/enrollments", { courseId: c.id || c.courseId });
      if (!res.success) {
        alert("Enroll failed: " + (res.error || res.status));
        return;
      }
      window.location.href = "/pages/my-learning.html";
    });
  }
}

function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }