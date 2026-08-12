document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const enrollmentId = params.get("enrollmentId") || params.get("courseId");
  if (!enrollmentId) return;
  // Try to fetch enrollment details if backend provides such endpoint
  const res = await api.get(`/enrollments/my`);
  let enrollment = null;
  if (res.success) {
    const arr = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
    enrollment = arr.find(e => String(e.enrollmentId) === String(enrollmentId) || String(e.courseId) === String(enrollmentId));
  }
  const fullname = (enrollment && (enrollment.fullName || enrollment.studentName)) || (Auth.getUser() && (Auth.getUser().fullName || Auth.getUser().name)) || "Student";
  const course = (enrollment && enrollment.title) || params.get("courseName") || "Course";
  const date = new Date().toLocaleDateString();
  document.getElementById("cert-fullname").textContent = fullname;
  document.getElementById("cert-course").textContent = course;
  document.getElementById("cert-date").textContent = date;
});