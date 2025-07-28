package com.db.swift.dfx.service.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event published when both Debtor and Creditor LEIs for a message
 * have been successfully verified.
 */
@Getter
public class LEIVerificationSuccessfulEvent extends ApplicationEvent {
    private final String messageId;

    public LEIVerificationSuccessfulEvent(Object source, String messageId) {
        super(source);
        this.messageId = messageId;
    }
}