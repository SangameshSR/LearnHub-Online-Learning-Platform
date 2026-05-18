package com.learnhub.controller;

import com.learnhub.dto.AuthDto;
import com.learnhub.model.*;
import com.learnhub.repository.*;
import com.learnhub.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentRepository enrollmentRepo;
    private final UserRepository userRepo;
    private final CourseRepository courseRepo;
    private final LessonProgressRepository progressRepo;
    private final EmailService emailService;

    /* ── ENROLL (UPDATED TO HANDLE RE-REGISTRATION) ────────── */
    @PostMapping
    public ResponseEntity<?> enroll(@Valid @RequestBody AuthDto.EnrollRequest req,
                                    Authentication auth) {
        
        // 1. Validate User and Course
        User user = userRepo.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Course course = courseRepo.findById(req.getCourseId())
                .orElseThrow(() -> new RuntimeException("Course not found"));

        // 2. Handle Re-Registration
        // We look for an existing enrollment instead of just checking if it exists.
        Optional<Enrollment> existing = enrollmentRepo.findByUserIdAndCourseId(user.getId(), course.getId());
        
        if (existing.isPresent()) {
            // Return 200 OK with a special flag. This stops the "Request Failed" error on frontend.
            return ResponseEntity.ok(Map.of(
                "message", "Welcome back! Redirecting to your learning dashboard...", 
                "courseId", course.getId(),
                "alreadyEnrolled", true
            ));
        }

        // 3. Create and Save New Enrollment
        Enrollment enrollment = Enrollment.builder()
                .user(user)
                .course(course)
                .fullName(req.getFullName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .qualification(req.getQualification())
                .enrolledAt(LocalDateTime.now())
                .build();
        
        Enrollment saved = enrollmentRepo.save(enrollment);

        // 4. Update Course Student Count
        course.setStudents(course.getStudents() + 1);
        courseRepo.save(course);

        // 5. Trigger Email
        try {
            emailService.sendEnrollmentEmail(
                req.getEmail(), 
                req.getFullName(), 
                course.getTitle()
            );
        } catch (Exception e) {
            System.err.println("Email failed to send: " + e.getMessage());
        }

        // 6. Return Success Response for New Enrollment
        return ResponseEntity.ok(Map.of(
            "message", "Enrolled successfully!", 
            "courseId", course.getId(),
            "enrollmentId", saved.getId(),
            "alreadyEnrolled", false
        ));
    }

    /* ── MY ENROLLMENTS ───────────────────────────────────── */
    @GetMapping("/my")
    public ResponseEntity<?> myEnrollments(Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElseThrow();
        List<Enrollment> enrollments = enrollmentRepo.findByUserId(user.getId());

        List<Map<String, Object>> result = enrollments.stream().map(e -> {
            Course c = e.getCourse();
            long completed = progressRepo.countByUserIdAndCourseIdAndCompleted(
                    user.getId(), c.getId(), true);
            
            // Logic for unskippable playlists
            int total = c.getTotalLessons() > 0 ? c.getTotalLessons() : 1;
            int pct = (int) Math.round((double) completed / total * 100);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("enrollmentId", e.getId());
            m.put("courseId", c.getId());
            m.put("title", c.getTitle());
            m.put("category", c.getCategory());
            m.put("emoji", c.getEmoji());
            m.put("color", c.getColor());
            m.put("duration", c.getDuration());
            m.put("totalLessons", total);
            m.put("completedLessons", completed);
            m.put("progressPct", pct);
            m.put("enrolledAt", e.getEnrolledAt());
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    /* ── CHECK ENROLLMENT ─────────────────────────────────── */
    @GetMapping("/check/{courseId}")
    public ResponseEntity<?> check(@PathVariable Long courseId, Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElseThrow();
        boolean enrolled = enrollmentRepo.existsByUserIdAndCourseId(user.getId(), courseId);
        return ResponseEntity.ok(Map.of("enrolled", enrolled));
    }

    /* ── MARK LESSON (FOR UNSKIPPABLE PLAYER) ─────────────── */
    @PostMapping("/{courseId}/progress/{lessonNum}")
    public ResponseEntity<?> markLesson(@PathVariable Long courseId,
                                        @PathVariable Integer lessonNum,
                                        @RequestParam boolean completed,
                                        Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElseThrow();
        var progress = progressRepo
                .findByUserIdAndCourseIdAndLessonNum(user.getId(), courseId, lessonNum)
                .orElse(LessonProgress.builder()
                        .userId(user.getId()).courseId(courseId).lessonNum(lessonNum).build());
        
        progress.setCompleted(completed);
        if (completed) progress.setCompletedAt(LocalDateTime.now());
        progressRepo.save(progress);

        long completedCount = progressRepo.countByUserIdAndCourseIdAndCompleted(user.getId(), courseId, true);
        Course c = courseRepo.findById(courseId).orElseThrow();
        int pct = (int) Math.round((double) completedCount / Math.max(c.getTotalLessons(), 1) * 100);

        return ResponseEntity.ok(Map.of("progressPct", pct, "completedLessons", completedCount));
    }

    /* ── GET LESSON PROGRESS ──────────────────────────────── */
    @GetMapping("/{courseId}/progress")
    public ResponseEntity<?> getProgress(@PathVariable Long courseId, Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElseThrow();
        List<LessonProgress> list = progressRepo.findByUserIdAndCourseId(user.getId(), courseId);
        Set<Integer> completedLessons = new HashSet<>();
        list.stream().filter(LessonProgress::getCompleted)
            .forEach(p -> completedLessons.add(p.getLessonNum()));
        return ResponseEntity.ok(Map.of("completedLessons", completedLessons));
    }
}