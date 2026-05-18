package com.learnhub.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courses")
@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 80)
    private String category;

    @Column(length = 30)
    private String duration;

    @Builder.Default 
    @Column(name = "total_lessons")
    private Integer totalLessons = 0;

    @Column(length = 30)
    private String level;

    @Builder.Default
    private Double rating = 4.5;

    @Builder.Default
    private Integer students = 0;

    @Column(length = 100)
    private String instructor;

    @Column(length = 10)
    private String emoji;

    @Column(length = 200)
    private String color;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Builder.Default
    private Double price = 0.0;

    @Column(columnDefinition = "TEXT")
    private String videoIds;

    @PrePersist
    @PreUpdate
    protected void onSave() { 
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(); 
        }
        if (this.videoIds != null && !this.videoIds.isBlank()) {
            this.totalLessons = this.videoIds.split(",").length;
        }
    }
}