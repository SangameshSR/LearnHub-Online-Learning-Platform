document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.isLoggedIn()) { window.location.href = "/pages/login.html"; return; }
  const res = await api.get("/enrollments/my");
  const list = document.getElementById("enrollments-list");
  if (!res.success) { list.innerHTML = "<div class='error'>Unable to load enrollments</div>"; return; }
  const enrollments = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
  if (!enrollments.length) { list.innerHTML = "<div class='muted'>You have no enrolled courses yet.</div>"; return; }
  list.innerHTML = "";
  enrollments.forEach(e => {
    const pct = e.progressPct ?? Math.round(((e.completedLessons||0)/(e.totalLessons||1))*100);
    const card = document.createElement("div"); card.className = "enrollment-card card";
    card.innerHTML = `
      <div>
        <div style="font-weight:600">${escape(e.title||e.name)}</div>
        <div class="muted">${escape(e.category||"")} • ${escape(e.duration||"")}</div>
        <div style="margin-top:8px"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><small>${pct}% • ${e.completedLessons||0}/${e.totalLessons||0} lessons</small></div>
      </div>
      <div style="text-align:right">
        ${ (pct === 100) ? `<a class="btn" href="/pages/certificate.html?enrollmentId=${e.enrollmentId || e.id || e.courseId}">Certificate</a>` : `<a class="btn primary" href="/pages/player.html?courseId=${e.courseId || e.courseId}">Continue</a>`}
      </div>
    `;
    list.appendChild(card);
  });
});

function escape(s){ return String(s||""); }