// Player that loads YouTube playlist and posts progress when video ends
let ytPlayer;
let playlistVideoIds = []; // fallback if needed
let currentIndex = 0;
let courseId = null;
let totalLessons = 0;
let completed = new Set();

const playlistMapping = {
  // If your backend provides playlistId as course.playlistId, these are not used.
  // These are small fallback mappings by known course titles or ids if necessary.
  "Java Programming": "PLfqMhTWNBTe3LtFWcvwpqTkUSlB32kJop",
  "Spring Boot Development": "PLUcsbZa0qzu0gVRFlVfscqjD84TqMssOt",
  "Full Stack Web Development": "PLfqMhTWNBTe3H6c9OGXb5_6wcc1Mca52n"
};

function onYouTubeIframeAPIReady() {
  // placeholder, actual init happens after we fetch playlist
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.isLoggedIn()) {
    alert("Please log in to access the player.");
    window.location.href = "/pages/login.html";
    return;
  }
  const params = new URLSearchParams(window.location.search);
  courseId = params.get("courseId");
  if (!courseId) { document.getElementById("playlist").innerHTML = "<li class='muted'>Course ID missing</li>"; return; }

  // Fetch course details to get playlist ID or fallback mapping
  const courseRes = await api.get("/courses/" + courseId);
  let course = null;
  if (courseRes.success && courseRes.data) course = courseRes.data;
  else {
    const list = await api.get("/courses");
    const arr = Array.isArray(list.data) ? list.data : (list.data && list.data.data) || [];
    course = arr.find(c => String(c.id) === String(courseId) || String(c.courseId) === String(courseId));
  }
  if (!course) { document.getElementById("playlist").innerHTML = "<li class='error'>Course not found</li>"; return; }

  totalLessons = course.totalLessons || course.lessonCount || 0;
  // load existing progress
  const prog = await api.get(`/enrollments/${courseId}/progress`);
  if (prog.success && prog.data) {
    // Accept response as array of completed lesson numbers or object with completedLessons array
    if (Array.isArray(prog.data)) prog.data.forEach(n => completed.add(Number(n)));
    else if (Array.isArray(prog.data.completed)) prog.data.completed.forEach(n => completed.add(Number(n)));
    else if (typeof prog.data.completedLessons === "number") {
      // nothing to do
    } else if (prog.data.completedLessonNumbers) prog.data.completedLessonNumbers.forEach(n=>completed.add(Number(n)));
  }

  // determine playlist id
  const playlistId = course.playlistId || playlistMapping[course.title] || playlistMapping[course.name] || null;
  if (!playlistId) {
    document.getElementById("playlist").innerHTML = "<li class='muted'>No playlist configured for this course.</li>";
    return;
  }

  // create the player using playlist
  ytPlayer = new YT.Player("player", {
    height: "390",
    width: "640",
    playerVars: {
      listType: 'playlist',
      list: playlistId,
      origin: window.location.origin,
      rel: 0
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });

  // load playlist UI
  renderPlaylist(totalLessons, playlistId);
});

function onPlayerReady(event) {
  updateLessonInfo();
}

function onPlayerStateChange(event) {
  // YT ended state = 0
  if (event.data === YT.PlayerState.ENDED) {
    // mark current as complete
    const lessonNum = currentIndex + 1;
    postProgress(lessonNum);
  }
  if (event.data === YT.PlayerState.PLAYING) {
    // update currentIndex
    const playlistIndex = ytPlayer.getPlaylistIndex();
    currentIndex = (typeof playlistIndex === "number") ? playlistIndex : currentIndex;
    highlightCurrent();
    updateLessonInfo();
  }
}

async function postProgress(lessonNum) {
  // ensure we only post if not already completed
  if (completed.has(lessonNum)) return;
  const res = await api.post(`/enrollments/${courseId}/progress/${lessonNum}`, {});
  if (res.success) {
    completed.add(lessonNum);
    renderProgressSummary();
    highlightCurrent();
  } else {
    console.warn("Could not post progress", res);
  }
}

function renderPlaylist(total, playlistId) {
  const list = document.getElementById("playlist");
  list.innerHTML = "";
  const count = total || 50; // fallback
  for (let i=1;i<=count;i++){
    const li = document.createElement("li");
    li.id = "lesson-"+i;
    li.className = completed.has(i) ? "completed" : "";
    li.innerHTML = `<span>Lesson ${i}</span><span>${completed.has(i) ? "✓": (i === currentIndex+1 ? "▶":"🔒")}</span>`;
    li.addEventListener("click", (e) => {
      // Only allow navigation to unlocked lessons: previous lessons or next unlocked
      if (i === 1 || completed.has(i-1) || completed.has(i)) {
        // play playlist index i-1 via playlist index
        ytPlayer.playVideoAt(i-1);
      } else {
        alert("Please complete previous lessons to unlock this one.");
      }
    });
    list.appendChild(li);
  }
  renderProgressSummary();
}

function highlightCurrent() {
  const items = document.querySelectorAll("#playlist li");
  items.forEach((li, idx) => {
    li.classList.toggle("active", idx === currentIndex);
    const num = idx+1;
    li.querySelector("span:last-child").textContent = completed.has(num) ? "✓" : (idx === currentIndex ? "▶" : (completed.has(idx+1) ? "✓" : ( (idx>0 && completed.has(idx)) ? "Unlocked":"🔒")));
  });
}

function updateLessonInfo() {
  document.getElementById("lesson-info").textContent = `Lesson ${currentIndex+1} • ${completed.has(currentIndex+1) ? "Completed": "In progress"}`;
}

function renderProgressSummary() {
  const total = document.querySelectorAll("#playlist li").length;
  const completedCount = completed.size;
  const pct = Math.round((completedCount / Math.max(1,total))*100);
  document.getElementById("progress-summary").innerHTML = `<div>Progress: ${pct}% • ${completedCount}/${total} lessons</div>`;
  if (pct === 100) {
    document.getElementById("finish-course").style.display = "inline-block";
    document.getElementById("finish-course").addEventListener("click", ()=> {
      alert("Congratulations! Course completed.");
      window.location.href = "/pages/certificate.html?courseId=" + courseId;
    });
  }
}