package com.db.swift.dfx.service.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class FXRateProvider {

    private final ObjectMapper objectMapper;
    private Map<String, Map<String, BigDecimal>> rates;

    @PostConstruct
    public void loadRates() {
        TypeReference<Map<String, Map<String, BigDecimal>>> typeRef = new TypeReference<>() {};
        try (InputStream inputStream = TypeReference.class.getResourceAsStream("/rates.json")) {
            if (inputStream == null) {
                throw new IOException("rates.json not found in classpath");
            }
            rates = objectMapper.readValue(inputStream, typeRef);
            log.info("Successfully loaded {} currency rate sets from rates.json", rates.size());
        } catch (IOException e) {
            log.error("Failed to load FX rates from rates.json. FX service will not work.", e);
            rates = Collections.emptyMap(); // Ensure rates is not null on failure
        }
    }

    public Optional<BigDecimal> getRate(String sourceCurrency, String targetCurrency) {
        if (rates.isEmpty()) {
            log.error("FX rates are not loaded, cannot provide rate.");
            return Optional.empty();
        }
        return Optional.ofNullable(rates.get(sourceCurrency))
                .map(targetMap -> targetMap.get(targetCurrency));
    }

    /**
     * IMPROVEMENT: A new public method to return all loaded FX rates.
     *
     * @return An unmodifiable map of all rates.
     */
    public Map<String, Map<String, BigDecimal>> getAllRates() {
        return Collections.unmodifiableMap(rates);
    }
}