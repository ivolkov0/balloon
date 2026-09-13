package com.crash.Raketka.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    private String passwordHash;

    private int balance;

    private int points;

    // Коллекция пазла (п.1.5 ТЗ + Критерии, Раздел 2 "разные роли для баллов,
    // очков и наград") — сколько штук каждого фрагмента накопил игрок,
    // навсегда, независимо от points/balance. Не сет "есть/нет" — счётчик,
    // чтобы дубликаты не терялись впустую (см. RoundService.finalizeCrash:
    // полный комплект = min по всем четырём > 0 одновременно, бонус даётся
    // при каждом новом наборе, а не разово).
    private int puzzleA;
    private int puzzleB;
    private int puzzleC;
    private int puzzleD;

    @Version
    private Long version;

    protected User() {
    }

    public User(String username, String passwordHash, int balance, int points) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.balance = balance;
        this.points = points;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public int getBalance() {
        return balance;
    }

    public void setBalance(int balance) {
        this.balance = balance;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public int getPuzzleA() {
        return puzzleA;
    }

    public void setPuzzleA(int puzzleA) {
        this.puzzleA = puzzleA;
    }

    public int getPuzzleB() {
        return puzzleB;
    }

    public void setPuzzleB(int puzzleB) {
        this.puzzleB = puzzleB;
    }

    public int getPuzzleC() {
        return puzzleC;
    }

    public void setPuzzleC(int puzzleC) {
        this.puzzleC = puzzleC;
    }

    public int getPuzzleD() {
        return puzzleD;
    }

    public void setPuzzleD(int puzzleD) {
        this.puzzleD = puzzleD;
    }

    public int getPuzzleCount(Reward reward) {
        return switch (reward) {
            case PUZZLE_A -> puzzleA;
            case PUZZLE_B -> puzzleB;
            case PUZZLE_C -> puzzleC;
            case PUZZLE_D -> puzzleD;
        };
    }

    public void incrementPuzzleCount(Reward reward) {
        switch (reward) {
            case PUZZLE_A -> puzzleA++;
            case PUZZLE_B -> puzzleB++;
            case PUZZLE_C -> puzzleC++;
            case PUZZLE_D -> puzzleD++;
        }
    }

    /** Сколько полных комплектов (все 4 фрагмента хотя бы по одному) уже собрано. */
    public int getSetsCompleted() {
        return Math.min(Math.min(puzzleA, puzzleB), Math.min(puzzleC, puzzleD));
    }
}