package com.crash.Raketka.controller;

import com.crash.Raketka.dto.RoundStateResponse;
import com.crash.Raketka.dto.StartRoundRequest;
import com.crash.Raketka.dto.StartRoundResponse;
import com.crash.Raketka.service.RoundService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/round")
public class RoundController {

    private final RoundService roundService;

    public RoundController(RoundService roundService) {
        this.roundService = roundService;
    }

    @PostMapping("/start")
    public StartRoundResponse start(Authentication auth, @RequestBody StartRoundRequest request) {
        return roundService.startRound((Long) auth.getPrincipal(), request);
    }

    @GetMapping("/{id}/state")
    public RoundStateResponse state(Authentication auth, @PathVariable Long id) {
        return roundService.getState((Long) auth.getPrincipal(), id);
    }

    @PostMapping("/{id}/cashout")
    public RoundStateResponse cashout(Authentication auth, @PathVariable Long id) {
        return roundService.cashout((Long) auth.getPrincipal(), id);
    }
}