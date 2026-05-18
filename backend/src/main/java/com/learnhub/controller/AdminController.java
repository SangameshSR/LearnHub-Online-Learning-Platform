package com.learnhub.controller;

import com.learnhub.model.*;
import com.learnhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepo;
    private final CourseRepository courseRepo;
    private final EnrollmentRepository enrollmentRepo;

    /* ── DASHBOARD STATS ──────────────────────────────────── */
    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        long totalUsers    = userRepo.countByRole(User.Role.USER);
        long totalCourses  = courseRepo.count();
        long totalEnroll   = enrollmentRepo.count();

        return ResponseEntity.ok(Map.of(
                "totalStudents",   totalUsers,
                "totalCourses",    totalCourses,
                "totalEnrollments",totalEnroll
        ));
    }

    /* ── ALL USERS ────────────────────────────────────────── */
    @GetMapping("/users")
    public ResponseEntity<?> users() {
        List<Map<String, Object>> list = userRepo.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("fullName", u.getFullName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("enrollments", enrollmentRepo.countByUserId(u.getId()));
            m.put("createdAt", u.getCreatedAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    /* ── ALL ENROLLMENTS ──────────────────────────────────── */
    @GetMapping("/enrollments")
    public ResponseEntity<?> enrollments() {
        List<Map<String, Object>> list = enrollmentRepo.findAll().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("studentName", e.getFullName());
            m.put("email", e.getEmail());
            m.put("phone", e.getPhone());
            m.put("qualification", e.getQualification());
            m.put("course", e.getCourse().getTitle());
            m.put("courseId", e.getCourse().getId());
            m.put("enrolledAt", e.getEnrolledAt());
            return m;
        }).toList();
        return ResponseEntity.ok(list);
    }

    /* ── DELETE USER ──────────────────────────────────────── */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}