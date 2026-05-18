package com.learnhub.dto;

import lombok.Data;
import jakarta.validation.constraints.*;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        @NotBlank private String fullName;
        @Email @NotBlank private String email;
        @NotBlank @Size(min=6) private String password;
        private String phone;
    }

    @Data
    public static class LoginRequest {
        @Email @NotBlank private String email;
        @NotBlank private String password;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String role;
        private String fullName;
        private Long userId;
        private String message;

        public AuthResponse(String token, String role, String fullName, Long userId) {
            this.token = token; this.role = role;
            this.fullName = fullName; this.userId = userId;
        }
    }

    @Data
    public static class EnrollRequest {
        @NotBlank private String fullName;
        @Email @NotBlank private String email;
        @NotBlank private String phone;
        private String qualification;
        @NotNull private Long courseId;
    }
}