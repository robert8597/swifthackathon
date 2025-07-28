package com.db.swift.dfx.service.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event published when a new message (incoming or outgoing) has been
 * successfully stored and is ready for further processing, like LEI verification.
 */
@Getter
public class MessageStoredEvent extends ApplicationEvent {
    private final String messageId;

    public MessageStoredEvent(Object source, String messageId) {
        super(source);
        this.messageId = messageId;
    }
}