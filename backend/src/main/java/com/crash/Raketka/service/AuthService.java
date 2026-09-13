package com.crash.Raketka.service;

import com.crash.Raketka.config.ConfigService;
import com.crash.Raketka.domain.User;
import com.crash.Raketka.dto.AuthResponse;
import com.crash.Raketka.dto.LoginRequest;
import com.crash.Raketka.dto.RegisterRequest;
import com.crash.Raketka.repository.UserRepository;
import com.crash.Raketka.security.SessionService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HexFormat;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final ConfigService configService;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       SessionService sessionService,
                       PasswordEncoder passwordEncoder,
                       ConfigService configService) {
        this.userRepository = userRepository;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.configService = configService;
    }

    public AuthResponse register(RegisterRequest req) {
        if (req.username() == null || req.username().length() < 3) {
            throw new IllegalArgumentException("username too short");
        }
        if (req.password() == null || req.password().length() < 4) {
            throw new IllegalArgumentException("password too short");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("USERNAME_TAKEN");
        }

        User user = new User(
                req.username(),
                passwordEncoder.encode(req.password()),
                configService.get().getStartingBalance(),
                0
        );
        user = userRepository.save(user);
        String token = sessionService.create(user.getId());
        return new AuthResponse(user.getId(), user.getUsername(), user.getBalance(), user.getPoints(), token);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new BadCredentialsException("invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("invalid credentials");
        }

        String token = sessionService.create(user.getId());
        return new AuthResponse(user.getId(), user.getUsername(), user.getBalance(), user.getPoints(), token);
    }

    public AuthResponse guest() {
        String username;
        do {
            byte[] bytes = new byte[4];
            random.nextBytes(bytes);
            username = "guest-" + HexFormat.of().formatHex(bytes);
        } while (userRepository.existsByUsername(username));

        User user = new User(
                username,
                null,
                configService.get().getStartingBalance(),
                0
        );
        user = userRepository.save(user);
        String token = sessionService.create(user.getId());
        return new AuthResponse(user.getId(), user.getUsername(), user.getBalance(), user.getPoints(), token);
    }

    public void logout(String token) {
        sessionService.invalidate(token);
    }
}