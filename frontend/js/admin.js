document.addEventListener("DOMContentLoaded", async () => {
  // show admin UI only if token role indicates admin
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    document.getElementById("admin-content").innerHTML = "<div class='error'>Access denied. Admins only.</div>";
    return;
  }
  // Inspect backend for admin endpoints — assumed none by default. If you have admin APIs like /admin/courses, adapt here.
  document.getElementById("admin-areas").innerHTML = "<div class='muted'>No admin endpoints were called. If you have admin APIs, tell me the endpoints and I'll add management UI here.</div>";
});