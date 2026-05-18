document.addEventListener("DOMContentLoaded", () => {
  if (typeof initNavbar === "function") initNavbar();
  loadMyEnrollments();
});

async function loadMyEnrollments() {
  const container = document.getElementById("myCoursesContainer");
  if (!container) return;

  try {
    const enrollments = await api.get("/enrollments/my");
    if (!enrollments || enrollments.length === 0) {
      container.innerHTML = `<h3 style="color:white; text-align:center;">No courses found.</h3>`;
      return;
    }

    container.innerHTML = enrollments
      .map((item) => {
        // Find static data by Title match (ignores case)
        const staticData =
          COURSES_DATA.find(
            (c) =>
              item.title.toLowerCase().includes(c.title.toLowerCase()) ||
              c.id == item.courseId,
          ) || {};

        const pId = staticData.playlistId || "";
        const vId = staticData.videoId || "tVzUXW6siu0";
        const progressPct = item.progressPct || 0;

        const playUrl = `player.html?courseId=${item.courseId}&playlistId=${pId}&videoId=${vId}`;

        return `
            <div class="card" style="background:#1c1c27; padding:25px; border-radius:15px; margin-bottom:20px; border:1px solid #333;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="font-size:30px; background:${staticData.color || "#444"}; padding:10px; border-radius:10px;">${staticData.emoji || "📚"}</div>
                    <h3 style="color:white; margin:0;">${item.title}</h3>
                </div>
                <div style="margin:20px 0; background:#333; height:10px; border-radius:5px; overflow:hidden;">
                    <div class="prog-fill" data-target="${progressPct}" style="width:0%; background:#3498db; height:100%; transition:2s;"></div>
                </div>
                <p style="color:#aaa; font-size:12px; margin-bottom:15px;">${progressPct}% Complete</p>
                <div style="margin-top:15px;">
                    ${
                      progressPct >= 100
                        ? `<button onclick="downloadCert('${Auth.getUser().fullName}', '${item.title}')" style="width:100%; padding:12px; background:#af9342; border:none; color:white; font-weight:bold; cursor:pointer; border-radius:8px;">🎓 DOWNLOAD PDF</button>`
                        : `<a href="${playUrl}" style="display:block; text-align:center; background:#3498db; color:white; padding:12px; border-radius:8px; text-decoration:none; font-weight:bold;">Continue Learning</a>`
                    }
                </div>
            </div>`;
      })
      .join("");

    setTimeout(() => {
      document
        .querySelectorAll(".prog-fill")
        .forEach((b) => (b.style.width = b.getAttribute("data-target") + "%"));
    }, 300);
  } catch (e) {
    console.error("Load Error", e);
  }
}

async function downloadCert(name, course) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, 297, 210, "F");
  doc.setDrawColor(175, 147, 66);
  doc.setLineWidth(5);
  doc.rect(10, 10, 277, 190);
  doc.setTextColor(175, 147, 66);
  doc.setFontSize(40);
  doc.text("CERTIFICATE OF COMPLETION", 148, 60, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(25);
  doc.text(name, 148, 110, { align: "center" });
  doc.setFontSize(18);
  doc.text(`Course: ${course}`, 148, 140, { align: "center" });
  doc.save(`${course}_Certificate.pdf`);
}
