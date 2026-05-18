// ─────────────────────────────────────────────
// home.js
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {

  const grid = document.getElementById("featuredCourses");

  if (!grid) return;

  // Loading State
  grid.innerHTML = `
    <div class="loading-placeholder">
      Loading Courses...
    </div>
  `;

  let enrolledIds = new Set();
  let coursesToShow = [];

  try {

    // Timeout protection
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request Timeout")), 5000)
    );

    // Backend API Fetch
    const fetchPromise = fetch("http://localhost:8080/api/courses", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }).then(async (res) => {

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      return await res.json();
    });

    // Wait for API or timeout
    const courses = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]);

    console.log("Courses Loaded Successfully:", courses);

    // Validate data
    if (Array.isArray(courses) && courses.length > 0) {

      // Show first 6 courses
      coursesToShow = courses.slice(0, 6);

      // Enrollment Check
      if (window.Auth && typeof Auth.isLoggedIn === "function" && Auth.isLoggedIn()) {

        try {

          const token = localStorage.getItem("token");

          const enrolledResponse = await fetch(
            "http://localhost:8080/api/enrollments/my",
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : ""
              }
            }
          );

          if (enrolledResponse.ok) {

            const enrolledCourses = await enrolledResponse.json();

            enrolledCourses.forEach((e) => {
              enrolledIds.add(e.courseId);
            });
          }

        } catch (enrollError) {

          console.warn("Enrollment fetch failed:", enrollError);
        }
      }

    } else {

      throw new Error("No courses available");
    }

  } catch (error) {

    console.warn(
      "Backend unavailable or failed. Using fallback static data.",
      error
    );

    // Fallback Static Data
    if (window.COURSES_DATA && COURSES_DATA.length > 0) {

      coursesToShow = COURSES_DATA.slice(0, 6);

    } else {

      grid.innerHTML = `
        <div class="loading-placeholder">
          No courses found
        </div>
      `;

      return;
    }
  }

  // Render Courses
  grid.innerHTML = coursesToShow.map((course) => `

    <div class="course-card">

      <div 
        class="course-thumb"
        style="
          background:${course.color || 'linear-gradient(135deg,#00e5ff,#8b5cf6)'};
        "
      >

        ${course.emoji || "📘"}

      </div>

      <div class="course-body">

        <div class="course-category">
          ${course.category || "General"}
        </div>

        <h3 class="course-title">
          ${course.title || "Untitled Course"}
        </h3>

        <p class="course-desc">
          ${course.description || "No description available"}
        </p>

      </div>

      <div class="course-footer">

        <span>
          ⭐ ${course.rating || 0}
        </span>

        <button class="enroll-btn">

          ${
            enrolledIds.has(course.id)
              ? "Enrolled"
              : course.price && course.price > 0
                ? `₹${course.price}`
                : "Enroll Free"
          }

        </button>

      </div>

    </div>

  `).join("");

});