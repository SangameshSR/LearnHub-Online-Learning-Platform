package com.learnhub.repository;

import com.learnhub.model.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    List<LessonProgress> findByUserIdAndCourseId(Long userId, Long courseId);
    long countByUserIdAndCourseIdAndCompleted(Long userId, Long courseId, Boolean completed);
    Optional<LessonProgress> findByUserIdAndCourseIdAndLessonNum(Long userId, Long courseId, Integer lessonNum);
}