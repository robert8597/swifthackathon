package com.db.swift.dfx.service.listeners;

import com.db.swift.dfx.service.services.FXService;
import lombok.extern.slf4j.Slf4j;
import com.db.swift.dfx.service.events.LEIVerificationSuccessfulEvent;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;


@Slf4j
@Component
@RequiredArgsConstructor
public class FXRateListener {

    private final FXService fxService;

    /**
     * Handles the LEIVerificationSuccessfulEvent asynchronously to trigger FX rate retrieval.
     * The @Async annotation ensures this method runs in a background thread pool.
     *
     * @param event The event containing the ID of the message for which LEI verification was successful.
     */
    @Async
    @EventListener
    public void handleLEIVerificationSuccessful(LEIVerificationSuccessfulEvent event) {
        log.info("Asynchronously handling FX rate creation for messageId: {}", event.getMessageId());
        try {
            fxService.handleFxTradeCreation(event.getMessageId());
        } catch (Exception e) {
            // Catching all exceptions to prevent the async thread from dying silently.
            log.error("An unexpected error occurred during asynchronous FX rate retrieval for messageId: {}", event.getMessageId(), e);
        }

    }
}
