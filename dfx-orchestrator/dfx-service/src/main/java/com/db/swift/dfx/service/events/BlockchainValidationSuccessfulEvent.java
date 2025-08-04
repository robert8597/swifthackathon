package com.db.swift.dfx.service.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event published when a referenced blockchain transaction for a message
 * has been successfully validated.
 */
@Getter
public class BlockchainValidationSuccessfulEvent extends ApplicationEvent {
    private final String messageId;

    public BlockchainValidationSuccessfulEvent(Object source, String messageId) {
        super(source);
        this.messageId = messageId;
    }
}