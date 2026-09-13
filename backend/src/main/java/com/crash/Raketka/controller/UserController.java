package com.crash.Raketka.controller;

import com.crash.Raketka.dto.UserResponse;
import com.crash.Raketka.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("")
    public UserResponse getUser(Authentication auth) {
        return userService.getProfile((Long) auth.getPrincipal());
    }
}