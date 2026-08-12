// app-level utilities, navbar and session behavior
document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  // attach logout handling
  document.body.addEventListener("click", (e) => {
    if (e.target && e.target.matches("[data-logout]")) {
      Auth.logout();
      renderNav();
      // redirect to home
      window.location.href = "/index.html";
    }
  });
});

function renderNav() {
  const area = document.getElementById("nav-auth-area");
  if (!area) return;
  area.innerHTML = "";
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser() || {};
    const span = document.createElement("span");
    span.textContent = user.fullName || user.name || "Learner";
    span.className = "muted";
    area.appendChild(span);

    const myLinks = document.createElement("div");
    myLinks.innerHTML = `
      <a href="/pages/my-learning.html" class="btn">My Learning</a>
      <a href="/pages/profile.html" class="btn">Profile</a>
      <button class="btn" data-logout>Logout</button>
    `;
    area.appendChild(myLinks);

    if (Auth.isAdmin()) {
      const adminLink = document.createElement("a");
      adminLink.href = "/pages/admin.html";
      adminLink.className = "btn primary";
      adminLink.textContent = "Admin";
      area.appendChild(adminLink);
    }
  } else {
    area.innerHTML = `
      <a href="/pages/login.html" class="btn">Login</a>
      <a href="/pages/register.html" class="btn primary">Get Started</a>
    `;
  }
}

// utility to require authentication for a page. If not logged in, optionally show UI prompt or redirect.
async function requireAuth(redirect=true) {
  if (Auth.isLoggedIn()) return true;
  if (redirect) window.location.href = "/pages/login.html";
  return false;
}