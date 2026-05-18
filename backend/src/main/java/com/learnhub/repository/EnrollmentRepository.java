package com.learnhub.repository;

import com.learnhub.model.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    // Used to list all courses a specific student has joined
    List<Enrollment> findByUserId(Long userId);

    // CRITICAL: Used to check if they are already in the course before saving
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);

    // NEW: Used to retrieve the existing record to redirect the user instead of erroring
    Optional<Enrollment> findByUserIdAndCourseId(Long userId, Long courseId);

    // Dashboard Stats: Total courses joined by user
    long countByUserId(Long userId);
    
    // Optional: Find how many students are in a specific course
    long countByCourseId(Long courseId);
}