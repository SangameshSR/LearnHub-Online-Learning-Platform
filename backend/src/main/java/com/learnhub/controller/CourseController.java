package com.learnhub.controller;

import com.learnhub.model.Course;
import com.learnhub.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;

    @GetMapping
    public List<Course> all(@RequestParam(required = false) String category,
                             @RequestParam(required = false) String search) {
        if (search != null && !search.isBlank())
            return courseRepository.findByTitleContainingIgnoreCase(search);
        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("all"))
            return courseRepository.findByCategoryIgnoreCase(category);
        return courseRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Course> one(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /* Admin only below */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Course create(@RequestBody Course course) {
        return courseRepository.save(course);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Course> update(@PathVariable Long id, @RequestBody Course updated) {
        return courseRepository.findById(id).map(c -> {
            c.setTitle(updated.getTitle());
            c.setDescription(updated.getDescription());
            c.setCategory(updated.getCategory());
            c.setDuration(updated.getDuration());
            c.setTotalLessons(updated.getTotalLessons());
            c.setLevel(updated.getLevel());
            c.setInstructor(updated.getInstructor());
            c.setEmoji(updated.getEmoji());
            c.setColor(updated.getColor());
            return ResponseEntity.ok(courseRepository.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!courseRepository.existsById(id)) return ResponseEntity.notFound().build();
        courseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}