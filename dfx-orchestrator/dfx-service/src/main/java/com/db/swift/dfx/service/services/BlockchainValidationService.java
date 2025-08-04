package com.db.swift.dfx.service.services;

import com.db.swift.dfx.openapi.model.AuditTrailEntry;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.db.swift.dfx.service.events.BlockchainValidationSuccessfulEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class BlockchainValidationService {

    private final MessageStorageService messageStorageService;
    private final ApplicationEventPublisher eventPublisher;

    public void validateTransaction(String messageId) {
        log.info("Starting blockchain transaction validation for messageId: {}", messageId);
        Optional<StoredMessage> messageOptional = messageStorageService.findMessageById(messageId);

        if (messageOptional.isEmpty()) {
            log.error("Cannot validate blockchain transaction. Message with ID {} not found.", messageId);
            return;
        }

        StoredMessage storedMessage = messageOptional.get();

        // If there are no blockchain details, the step is successful by default.
        if (storedMessage.getBlckchnDetails() == null || storedMessage.getBlckchnDetails().getTxId() == null) {
            log.info("No blockchain details found for messageId: {}. Skipping validation and proceeding.", messageId);
            eventPublisher.publishEvent(new BlockchainValidationSuccessfulEvent(this, messageId));
            return;
        }

        // If there are no blockchain details, the step is successful by default.
        if (storedMessage.getDirection().equals(StoredMessage.DirectionEnum.OUTBOUND)) {
            log.info("Outbound Message, no blockchain validation necessary for messageId: {}. Skipping validation and proceeding.", messageId);
            storedMessage.addAuditTrailItem(createAuditEntry("Skipping Blockchain Validation due to Outbound Message", "Outbound Message, no blockchain validation necessary for messageId: " + messageId));
            storedMessage.setBlckchnTransactionValidationStatus(StoredMessage.BlckchnTransactionValidationStatusEnum.SKIPPED);
            messageStorageService.updateMessage(storedMessage);
            eventPublisher.publishEvent(new BlockchainValidationSuccessfulEvent(this, messageId));
            return;
        }

        storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.BLOCKCHAIN_TXN_VALIDATION_IN_PROGRESS);
        storedMessage.addAuditTrailItem(createAuditEntry("Blockchain Validation Started", "Validating transaction hash on the network " + storedMessage.getBlckchnDetails().getNetwork()));
        messageStorageService.updateMessage(storedMessage);

        try {
            // Perform the mock validation
            boolean isValid = mockValidate(storedMessage.getBlckchnDetails().getTxId(), storedMessage.getBlckchnDetails().getNetwork());

            if (isValid) {
                log.info("Blockchain transaction hash is valid for messageId: {}", messageId);
                storedMessage.setBlckchnTransactionValidationStatus(StoredMessage.BlckchnTransactionValidationStatusEnum.VALIDATED);
                storedMessage.addAuditTrailItem(createAuditEntry("Blockchain Validation Succeeded", "Transaction hash is valid."));
                // Publish event to trigger the next step (e.g., FX service)
                eventPublisher.publishEvent(new BlockchainValidationSuccessfulEvent(this, messageId));
            } else {
                log.error("Blockchain transaction hash is invalid for messageId: {}", messageId);
                storedMessage.setBlckchnTransactionValidationStatus(StoredMessage.BlckchnTransactionValidationStatusEnum.FAILED);
                storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.FAILED);
                storedMessage.addAuditTrailItem(createAuditEntry("Blockchain Validation Failed", "Transaction hash is invalid."));
            }
        } catch (Exception e) {
            log.error("An error occurred during blockchain validation for messageId: {}", messageId, e);
            storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.FAILED);
            storedMessage.addAuditTrailItem(createAuditEntry("Blockchain Validation Failed", e.getMessage()));
        } finally {
            messageStorageService.updateMessage(storedMessage);
        }
    }

    /**
     * A mock validation method. In a real-world scenario, this would call a blockchain explorer API.
     * For this mock, we'll just check if the txId starts with "0x" and has a specific length.
     */
    private boolean mockValidate(String txId, String network) {
        log.info("Mock validating txId '{}' on network '{}'", txId, network);
        // A common length for Ethereum-like transaction hashes is 66 characters (0x + 64 hex chars)
        return txId != null && txId.startsWith("0x") && txId.length() == 66;
    }

    private AuditTrailEntry createAuditEntry(String action, String details) {
        return AuditTrailEntry.builder()
                .timestamp(OffsetDateTime.now())
                .action(action)
                .details(details)
                .build();
    }
}