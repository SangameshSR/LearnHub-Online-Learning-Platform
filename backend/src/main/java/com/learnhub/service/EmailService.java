package com.learnhub.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Async // Runs this method on a separate background thread to prevent API slowdowns
    public void sendEnrollmentEmail(String toEmail, String studentName, String courseName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Welcome to " + courseName + "!");
        message.setText("Hi " + studentName + ",\n\nYou have successfully enrolled in " + courseName + ".");
        mailSender.send(message);
    }
}