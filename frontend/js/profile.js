document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.isLoggedIn()) { window.location.href = "/pages/login.html"; return; }
  const res = await api.get("/auth/me");
  if (!res.success) {
    document.getElementById("profile-details").innerHTML = "<div class='error'>Unable to load profile</div>";
    return;
  }
  const user = res.data || Auth.getUser();
  const el = document.getElementById("profile-details");
  el.innerHTML = `
    <p><strong>Full name:</strong> ${escape(user.fullName || user.name || "")}</p>
    <p><strong>Email:</strong> ${escape(user.email||"")}</p>
    <p><strong>Phone:</strong> ${escape(user.phone||"—")}</p>
    <p><strong>Role:</strong> ${escape(user.role||"USER")}</p>
    <p><strong>User ID:</strong> ${escape(user.userId||user.id||"—")}</p>
  `;
});

function escape(s){ return String(s||""); }