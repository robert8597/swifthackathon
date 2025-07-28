package com.db.swift.dfx.service.controller;

import com.db.swift.dfx.openapi.api.RatesApi;
import com.db.swift.dfx.service.services.FXRateProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@Slf4j
@RequiredArgsConstructor
public class RatesApiImpl implements RatesApi {

    private final FXRateProvider fxRateProvider;

    @Override
    public ResponseEntity<Map<String, Map<String, BigDecimal>>> getRates() {
        log.info("Received request to list all FX rates.");
        Map<String, Map<String, BigDecimal>> rates = fxRateProvider.getAllRates();
        return ResponseEntity.ok(rates);
    }
}