package com.db.swift.dfx.service.services;

import com.db.swift.dfx.openapi.model.AuditTrailEntry;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.db.swift.dfx.openapi.model.VerificationStatus;
import com.db.swift.dfx.service.dto.gleif.GleifApiResponse;
import com.db.swift.dfx.service.events.LEIVerificationSuccessfulEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationService {

    private final MessageStorageService messageStorageService;
    private final RestClient leiRestClient;
    private final ApplicationEventPublisher eventPublisher;
    private final static String DEBITOR = "debitor";
    private final static String CREDITOR = "creditor";

    @Value("${lei.api.path:/lei-records/}")
    private String leiApiPath;

    /**
     * Verifies the Debtor and Creditor LEIs for a given message by calling an external API.
     * It updates the message's status and audit trail in the storage.
     * This method is designed to be called asynchronously (e.g., from an event listener).
     *
     * @param messageId The ID of the message to verify.
     */
    public void verifyLeisForMessage(String messageId) {
        log.info("Starting LEI verification process for messageId: {}", messageId);

        // Step 1: Find the message in storage.
        Optional<StoredMessage> messageOptional = messageStorageService.findMessageById(messageId);
        if (messageOptional.isEmpty()) {
            log.error("Could not find message with ID {} for LEI verification.", messageId);
            return;
        }
        StoredMessage message = messageOptional.get();
        message.setTransactionStatus(StoredMessage.TransactionStatusEnum.LEI_VERIFICATION_IN_PROGRESS);
        message.addAuditTrailItem(createAuditEntry("Started LEI Verification", "LEI Verification is now in Progress"));
        messageStorageService.updateMessage(message);

        // Step 2: Verify Creditor and Debtor LEIs.
        message = verifySingleLei(message, CREDITOR);
        message.addAuditTrailItem(createAuditEntry("Creditor LEI Verification", "Verification status: " + message.getCreditorLEIStatus()));

        message = verifySingleLei(message, DEBITOR);
        message.addAuditTrailItem(createAuditEntry("Debitor LEI Verification", "Verification status: " + message.getDebitorLEIStatus()));

        if (message.getCreditorLEIStatus() == VerificationStatus.VERIFIED && message.getDebitorLEIStatus() == VerificationStatus.VERIFIED) {
            log.info("Both LEIs verified successfully for messageId: {}", messageId);
            eventPublisher.publishEvent(new LEIVerificationSuccessfulEvent(this, messageId));
        } else {
            log.error("LEI verification failed for messageId: {}. Creditor: {}, Debitor: {}", messageId, message.getCreditorLEIStatus(), message.getDebitorLEIStatus() );
            message.setTransactionStatus(StoredMessage.TransactionStatusEnum.FAILED);
        }


        // Step 3: Persist the updated message with new status and audit trail.
        messageStorageService.updateMessage(message);
        log.info("Completed LEI verification for messageId: {}. Creditor: {}, Debitor: {}",
                messageId, message.getCreditorLEIStatus(), message.getDebitorLEIStatus());
    }

    /**
     * Calls the external LEI verification API for a single LEI using Spring's RestClient.
     *
     * @return Message with updated status and audit trail.
     */
    private StoredMessage verifySingleLei(StoredMessage message, String party) {
        String lei;
        String bic;
        if (party.equals(DEBITOR)) {
            lei = message.getDebitorAgentLEI();
            bic = message.getDebitorAgentBIC();

        } else if (party.equals(CREDITOR)) {
            lei = message.getCreditorAgentLEI();
            bic = message.getCreditorAgentBIC();

        } else {
            log.warn("Unknown Party. Please check");
            message.addAuditTrailItem(createAuditEntry("Verification failed", "Party" + party + "is unknown!"));
            return message;
        }

        if (lei == null || lei.isBlank()) {
            log.warn("LEI is null or blank, cannot verify.");

            message.addAuditTrailItem(createAuditEntry("Verification failed", "LEI is null or blank, cannot verify."));
            return verificationStatusSetter(message, party, VerificationStatus.FAILED);
        }

        try {
            log.debug("Calling external API to verify LEI: {}", lei);
            GleifApiResponse response = leiRestClient.get()
                    .uri(uriBuilder ->  uriBuilder.path(leiApiPath + lei)
                            .build())
                    .retrieve()
                    .body(GleifApiResponse.class);
            if (response == null || response.getData() == null ) {
                log.warn("GLEIF API returned no data for LEI: {}", lei);
                message.addAuditTrailItem(createAuditEntry("Verification failed", "GLEIF API returned no data for LEI"));
                return verificationStatusSetter(message, party, VerificationStatus.FAILED);
            }

            String gleifEntityStatus = response.getData().getAttributes().getEntity().getStatus();
            String gleifEntityLegalName = response.getData().getAttributes().getEntity().getLegalName().getName();
            List<String> gleifEntityBic = response.getData().getAttributes().getBic();

            log.info("LEI {} has entity status: {}", lei, gleifEntityStatus);
            log.info("LEI {} has following Legal Name assigned to it: {}", lei, gleifEntityLegalName);
            log.info("LEI {} has following BICs assigned to it: {}", lei, gleifEntityBic);


            if (!"ACTIVE".equalsIgnoreCase(gleifEntityStatus)) {
                log.warn("LEI {} is not ACTIVE. Status is: {}", lei, gleifEntityStatus);
                message.addAuditTrailItem(createAuditEntry("Verification failed", "LEI " + lei + " is not ACTIVE. Status is " + gleifEntityStatus));
                return verificationStatusSetter(message, party, VerificationStatus.FAILED);
            }


            if (!gleifEntityBic.contains(bic)) {
                log.warn("Passed BIC was {}, but LEI-assigned BICs are {}", bic, gleifEntityBic);
                message.addAuditTrailItem(createAuditEntry("Verification failed", "LEI-assigned BICS" + gleifEntityBic +
                        " does not match passed BIC " + bic));
                return verificationStatusSetter(message, party, VerificationStatus.FAILED);
            }

            if (party.equals(DEBITOR)) {
                message.setDebitorAgentLegalName(gleifEntityLegalName);

            } else {
                message.setCreditorAgentLegalName(gleifEntityLegalName);
            }
            return verificationStatusSetter(message, party, VerificationStatus.VERIFIED);


        } catch (RestClientException e) {
            log.error("Error calling LEI verification API for LEI {}: {}", lei, e.getMessage());
            log.error(e.getCause().getMessage(), e.getCause());
            message.addAuditTrailItem(createAuditEntry("Verification failed", "Error while calling GLEIF API for LEI Verification"));
            return verificationStatusSetter(message, party, VerificationStatus.FAILED);
        }
    }

    private AuditTrailEntry createAuditEntry(String action, String details) {
        return AuditTrailEntry.builder()
                .timestamp(OffsetDateTime.now())
                .action(action)
                .details(details)
                .build();
    }

    private StoredMessage verificationStatusSetter(StoredMessage message, String party, VerificationStatus status) {
        if (party.equals(DEBITOR)) {
            message.setDebitorLEIStatus(status);
            return message;
        } else if (party.equals(CREDITOR)) {
            message.setCreditorLEIStatus(status);
            return message;
        } else {
            log.warn("Unknown Party. Please check");
            return message;
        }
    }
}