// courses listing
document.addEventListener("DOMContentLoaded", async () => {
  populateFilters();
  await loadCourses();
  document.getElementById("search-input").addEventListener("input", throttle(loadCourses, 300));
  document.getElementById("filter-category").addEventListener("change", loadCourses);
  document.getElementById("filter-level").addEventListener("change", loadCourses);
  document.getElementById("sort-by").addEventListener("change", loadCourses);
});

let allCourses = [];

async function populateFilters() {
  const res = await api.get("/courses");
  if (!res.success) return;
  allCourses = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
  const categories = Array.from(new Set(allCourses.map(c => c.category).filter(Boolean)));
  const sel = document.getElementById("filter-category");
  categories.forEach(cat => {
    const opt = document.createElement("option"); opt.value = cat; opt.textContent = cat; sel.appendChild(opt);
  });
}

async function loadCourses() {
  const container = document.getElementById("courses-list");
  container.innerHTML = "<div class='muted'>Loading...</div>";
  const res = await api.get("/courses");
  if (!res.success) { container.innerHTML = "<div class='error'>Unable to load courses</div>"; return; }
  const courses = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
  allCourses = courses;
  const q = document.getElementById("search-input").value.toLowerCase();
  const category = document.getElementById("filter-category").value;
  const level = document.getElementById("filter-level").value;
  const sort = document.getElementById("sort-by").value;
  let filtered = courses.filter(c => {
    if (category && (c.category||"") !== category) return false;
    if (level && (c.level||"") !== level) return false;
    if (q && !((c.title||c.name||"")+ " " + (c.description||"")).toLowerCase().includes(q)) return false;
    return true;
  });
  // sorting simple rules
  if (sort === "new") filtered = filtered.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0));
  if (sort === "popular") filtered = filtered.sort((a,b)=> (b.students||0)-(a.students||0));
  container.innerHTML = "";
  filtered.forEach(c => {
    const el = document.createElement("div"); el.className = "course-card card";
    el.innerHTML = `
      <div class="title">${escapeHtml(c.title||c.name||"Untitled")}</div>
      <div class="meta">${escapeHtml(c.category||"")} • ${escapeHtml(c.level||"")}</div>
      <div class="muted">${escapeHtml((c.description||"").slice(0,140))}</div>
      <div style="margin-top:8px"><a class="btn primary" href="course-details.html?id=${c.id || c.courseId}">View course</a></div>
    `;
    container.appendChild(el);
  });
}

function throttle(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait);} }
function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }