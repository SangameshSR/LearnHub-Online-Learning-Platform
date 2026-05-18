let player;
let maxTimeReached = 0; // Tracks the furthest point the student has watched

// 1. Get video info from URL
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get("videoId") || "dQw4w9WgXcQ"; // Fallback ID

// 2. This function runs automatically when the YouTube API is ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player("main-video-player", {
    height: "360",
    width: "100%",
    videoId: videoId,
    playerVars: {
      controls: 0, // Hides player controls so they can't click the seek bar
      disablekb: 1, // Disables keyboard shortcuts (like arrow keys to skip)
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady(event) {
  // Start tracking the time every second
  setInterval(() => {
    if (player && player.getCurrentTime) {
      const currentTime = player.getCurrentTime();

      // If the user tries to skip ahead of what they've already watched
      if (currentTime > maxTimeReached + 2) {
        player.seekTo(maxTimeReached, true);
        showToast("No skipping! Please watch the full lesson.", "warning");
      } else {
        // Update the progress if they are watching normally
        if (currentTime > maxTimeReached) {
          maxTimeReached = currentTime;
        }
      }
    }
  }, 1000);
}

async function onPlayerStateChange(event) {
  // When the video reaches the end (State 0)
  if (event.data === YT.PlayerState.ENDED) {
    showToast("Lesson Completed!", "success");
    await markLessonAsComplete();
  }
}

async function markLessonAsComplete() {
  const courseId = urlParams.get("courseId");
  const lessonNum = urlParams.get("lessonNum");

  try {
    await fetch(`http://localhost:8080/api/progress/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ courseId, lessonNum }),
    });

    // After 2 seconds, move to next lesson or dashboard
    setTimeout(() => {
      window.location.href = "my-courses.html";
    }, 2000);
  } catch (err) {
    console.error("Progress save failed", err);
  }
}
