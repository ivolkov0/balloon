package com.crash.Raketka.security;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionService {

    private final ConcurrentHashMap<String, Long> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String create(Long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        tokens.put(token, userId);
        return token;
    }

    public Optional<Long> resolve(String token) {
        if (token == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(tokens.get(token));
    }

    public void invalidate(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }
}