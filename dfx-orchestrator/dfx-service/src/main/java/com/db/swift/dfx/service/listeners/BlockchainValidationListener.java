package com.db.swift.dfx.service.listeners;

import com.db.swift.dfx.service.events.LEIVerificationSuccessfulEvent;
import com.db.swift.dfx.service.services.BlockchainValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainValidationListener {

    private final BlockchainValidationService validationService;

    @Async
    @EventListener
    public void handleBlockchainValidation(LEIVerificationSuccessfulEvent event) {
        log.info("Asynchronously handling blockchain validation for messageId: {}", event.getMessageId());
        try {
            validationService.validateTransaction(event.getMessageId());
        } catch (Exception e) {
            log.error("An unexpected error occurred during asynchronous blockchain validation for messageId: {}", event.getMessageId(), e);
        }
    }
}