package com.learnhub.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_progress",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","course_id","lesson_num"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "lesson_num", nullable = false)
    private Integer lessonNum;

    private Boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}