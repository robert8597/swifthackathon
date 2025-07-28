package com.db.swift.dfx.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DfxServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DfxServiceApplication.class, args);
    }
}
