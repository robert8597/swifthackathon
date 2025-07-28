package com.db.swift.dfx.service.listeners;

import com.db.swift.dfx.service.events.MessageStoredEvent;
import com.db.swift.dfx.service.services.VerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LEIVerificationListener {

    private final VerificationService verificationService;

    /**
     * Handles the MessageStoredEvent asynchronously to trigger LEI verification.
     * The @Async annotation ensures this method runs in a background thread pool.
     *
     * @param event The event containing the ID of the message to verify.
     */
    @Async
    @EventListener
    public void handleMessageVerification(MessageStoredEvent event) {
        log.info("Asynchronously handling LEI verification for messageId: {}", event.getMessageId());
        try {
            verificationService.verifyLeisForMessage(event.getMessageId());
        } catch (Exception e) {
            // Catching all exceptions to prevent the async thread from dying silently.
            log.error("An unexpected error occurred during asynchronous LEI verification for messageId: {}", event.getMessageId(), e);
        }
    }
}