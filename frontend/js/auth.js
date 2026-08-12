// handles login and register pages
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const toggle = document.getElementById("toggle-password");
    toggle.addEventListener("click", () => {
      const p = document.getElementById("password");
      if (p.type === "password") { p.type = "text"; toggle.textContent = "Hide"; } else { p.type = "password"; toggle.textContent = "Show"; }
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(loginForm);
      const email = form.get("email");
      const password = form.get("password");
      document.getElementById("login-error").style.display = "none";
      const btn = document.getElementById("login-submit");
      btn.disabled = true; btn.textContent = "Signing in...";
      const res = await api.post("/auth/login", { email, password });
      btn.disabled = false; btn.textContent = "Sign In";
      if (!res.success) {
        const err = res.error && (res.error.message || JSON.stringify(res.error)) || "Sign in failed";
        showError("login-error", err);
        return;
      }
      // expected response: { token, role, fullName, userId, message }
      const body = res.data;
      if (!body || !body.token) {
        showError("login-error", "Invalid server response");
        return;
      }
      const user = { fullName: body.fullName || body.name || "", role: body.role, userId: body.userId || body.id };
      Auth.save(body.token, user);
      // Optionally verify via /auth/me
      const me = await api.get("/auth/me");
      if (me.success && me.data) Auth.save(body.token, me.data);
      // redirect: if admin go to admin, else my-learning
      if (user.role === "ADMIN" || user.role === "ROLE_ADMIN") window.location.href = "/pages/admin.html";
      else window.location.href = "/pages/my-learning.html";
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(registerForm);
      const fullName = form.get("fullName");
      const email = form.get("email");
      const password = form.get("password");
      const confirm = form.get("confirmPassword");
      if (password !== confirm) {
        showError("register-error","Passwords do not match");
        return;
      }
      const btn = document.getElementById("register-submit");
      btn.disabled = true; btn.textContent = "Creating...";
      // Assumption: registration DTO expects fullName,email,password
      const res = await api.post("/auth/register", { fullName, email, password });
      btn.disabled = false; btn.textContent = "Create account";
      if (!res.success) {
        showError("register-error", res.error || "Registration failed");
        return;
      }
      // registration success -> redirect to login with a message
      alert("Registration successful. Please sign in.");
      window.location.href = "login.html";
    });
  }
});

function showError(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
}