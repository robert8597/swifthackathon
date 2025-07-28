package com.db.swift.dfx.service.services;

import com.db.swift.dfx.openapi.model.AuditTrailEntry;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

@Service
@Slf4j
@RequiredArgsConstructor
public class MessageStorageService {

    @Value("${dfx.storage.path:/tmp/dfx-messages}")
    private String storagePath;
    private final ObjectMapper objectMapper;

    private final Lock fileLock = new ReentrantLock();
    private static final String STORAGE_FILE_NAME = "messages.json";

    /**
     * Persists a message by adding it to a single JSON file containing an array of all messages.
     * This operation is thread-safe to handle concurrent API calls.
     *
     * @param message The StoredMessage object to persist.
     */
    public void storeMessage(StoredMessage message) {
        fileLock.lock();
        try {
            List<StoredMessage> messages = readMessagesFromFile();

            message.addAuditTrailItem(AuditTrailEntry.builder()
                    .timestamp(OffsetDateTime.now())
                    .action("Persisting message to Storage")
                    .details("This message is now being stored into the storage")
                    .build()
            );

            messages.add(message);
            writeMessagesToFile(messages);
            log.info("Successfully stored message {} in: {}", message.getMessageId(), getStorageFilePath());
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * Retrieves all stored messages from the JSON file.
     * This operation is thread-safe to prevent reading a partially written file.
     *
     * @return A list of all StoredMessage objects, or an empty list if none exist or an error occurs.
     */
    public List<StoredMessage> getAllMessages() {
        fileLock.lock();
        try {
            return readMessagesFromFile();
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * Finds a single message by its ID from the storage file.
     * This operation is thread-safe.
     *
     * @param messageId The UUID of the message to find.
     * @return An Optional containing the StoredMessage if found.
     */
    public Optional<StoredMessage> findMessageById(String messageId) {
        fileLock.lock();
        try {
            return readMessagesFromFile().stream()
                    .filter(m -> m.getMessageId().equals(messageId))
                    .findFirst();
        } finally {
            fileLock.unlock();
        }
    }


    /**
     * Updates an existing message in the storage file. This is critical for
     * saving the results of the LEI verification.
     * This operation is thread-safe.
     *
     * @param updatedMessage The message object with updated information.
     */
    public void updateMessage(StoredMessage updatedMessage) {
        if (updatedMessage == null || updatedMessage.getMessageId() == null) {
            log.error("Cannot update a message with a null object or null ID.");
            return;
        }

        fileLock.lock();
        try {
            List<StoredMessage> messages = readMessagesFromFile();

            // Find the index of the message to update
            int messageIndex = -1;
            for (int i = 0; i < messages.size(); i++) {
                if (messages.get(i).getMessageId().equals(updatedMessage.getMessageId())) {
                    messageIndex = i;
                    break;
                }
            }

            if (messageIndex != -1) {
                // Replace the old message with the updated one
                messages.set(messageIndex, updatedMessage);
                writeMessagesToFile(messages);
                log.info("Successfully updated message with ID: {}", updatedMessage.getMessageId());
            } else {
                log.warn("Could not find message with ID {} to update. No changes were made.", updatedMessage.getMessageId());
            }
        } finally {
            fileLock.unlock();
        }
    }

    /**
     * Helper method to read the list of messages from the JSON file.
     * This method assumes a lock is already held by the calling public method.
     */
    private List<StoredMessage> readMessagesFromFile() {
        Path filePath = getStorageFilePath();
        try {
            if (Files.exists(filePath) && Files.size(filePath) > 0) {
                return objectMapper.readValue(filePath.toFile(),objectMapper.getTypeFactory()
                        .constructCollectionType(List.class, StoredMessage.class));
            }
        } catch (IOException e) {
            log.error("Failed to read messages from file: {}", filePath, e);
            // Return an empty list on error to prevent cascading failures.
            return new ArrayList<>();
        }
        // If the file doesn't exist or is empty, start with a fresh list.
        return new ArrayList<>();
    }

    /**
     * Helper method to write the list of messages to the JSON file.
     * This method assumes a lock is already held by the calling public method.
     */
    private void writeMessagesToFile(List<StoredMessage> messages) {
        Path filePath = getStorageFilePath();
        try {
            Files.createDirectories(filePath.getParent());
            String jsonContent = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(messages);
            Files.writeString(filePath, jsonContent);
        } catch (IOException e) {
            log.error("Failed to write messages to file: {}", filePath, e);
        }
    }

    private Path getStorageFilePath() {
        return Paths.get(storagePath, STORAGE_FILE_NAME);
    }
}