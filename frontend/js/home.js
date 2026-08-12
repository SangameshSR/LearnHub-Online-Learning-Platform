// Loads featured courses
document.addEventListener("DOMContentLoaded", async () => {
  // render nav already called in app.js
  const featuredEl = document.getElementById("featured-courses");
  const coursesStat = document.getElementById("stat-courses");
  const studentsStat = document.getElementById("stat-students");
  try {
    const res = await api.get("/courses");
    if (!res.success) {
      featuredEl.innerHTML = "<div class='muted'>Unable to load courses</div>";
      return;
    }
    const courses = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
    coursesStat.textContent = courses.length;
    // try to count students across courses if field exists
    let totalStudents = 0;
    courses.forEach(c => { totalStudents += (c.students || 0); });
    studentsStat.textContent = totalStudents || "—";
    // show first 6 as featured
    featuredEl.innerHTML = "";
    courses.slice(0,6).forEach(c => {
      const card = document.createElement("div");
      card.className = "course-card";
      card.innerHTML = `
        <div class="title">${escapeHtml(c.title || c.name || "Untitled")}</div>
        <div class="meta">${escapeHtml(c.category || "")} • ${escapeHtml(c.duration || "")}</div>
        <div class="muted">${escapeHtml((c.description||"").slice(0,120))}...</div>
        <div style="margin-top:8px"><a class="btn" href="pages/course-details.html?id=${c.id || c.courseId}">View course</a></div>
      `;
      featuredEl.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
});

function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }