package com.db.swift.dfx.service.controller;

import com.db.swift.dfx.openapi.api.ListMessagesApi;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.db.swift.dfx.service.services.MessageStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Slf4j
@RequiredArgsConstructor
public class ListMessagesApiImpl implements ListMessagesApi {
    private final MessageStorageService messageStorageService;

    @Override
    public ResponseEntity<List<StoredMessage>> getMessages() {
        log.info("Received request to list all stored messages.");
        List<StoredMessage> messages = messageStorageService.getAllMessages();
        return ResponseEntity.ok(messages);
    }
}
