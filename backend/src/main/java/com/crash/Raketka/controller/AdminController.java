package com.crash.Raketka.controller;

import com.crash.Raketka.config.ConfigService;
import com.crash.Raketka.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ConfigService configService;

    public AdminController(ConfigService configService) {
        this.configService = configService;
    }

    @PostMapping("/config/reload")
    public ResponseEntity<?> reloadConfig() {
        try {
            configService.reload();
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("CONFIG_INVALID", e.getMessage()));
        }
    }
}
