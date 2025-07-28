package com.db.swift.dfx.service.controller;

import com.db.swift.dfx.jaxb.model.pacs008.Document;
import com.db.swift.dfx.openapi.api.PostMessageApi;
import com.db.swift.dfx.openapi.model.AuditTrailEntry;
import com.db.swift.dfx.openapi.model.MessageResponse;
import com.db.swift.dfx.openapi.model.PostMessageRequest;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.db.swift.dfx.service.events.MessageStoredEvent;
import com.db.swift.dfx.service.services.MessageStorageService;
import com.db.swift.dfx.service.utils.JaxbMarshallingUtil;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import jakarta.xml.bind.JAXBException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.xml.sax.SAXException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;

import static com.db.swift.dfx.service.constants.DfxConstants.DB_LEGAL_NAME;
import static com.db.swift.dfx.service.constants.DfxConstants.FX_PATTERN;

@RestController
@Slf4j
@RequiredArgsConstructor
public class PostMessageApiImpl implements PostMessageApi {
    private final JaxbMarshallingUtil jaxbMarshallingUtil;
    private final Validator validator;
    private final MessageStorageService messageStorageService;
    private final ApplicationEventPublisher eventPublisher;

    private static final Base64 base64 = new Base64();

    @Override
    public ResponseEntity<MessageResponse> postMessage(PostMessageRequest postMessageRequest) {
        UUID messageId = UUID.randomUUID();
        final OffsetDateTime receivedTimestamp = OffsetDateTime.now();

        log.info("Received outgoing message, assigned ID: {}", messageId);


        try {
            List<AuditTrailEntry> auditTrail = new ArrayList<>();
            auditTrail.add(AuditTrailEntry.builder()
                    .timestamp(receivedTimestamp)
                    .action("Initial Outgoing Message Receival")
                    .details("DFX Service received initial outgoing message").
                    build()
            );

            Document payload = jaxbMarshallingUtil.unmarshall(new String(base64.decode(postMessageRequest.getPayload())), Document.class, "/xsd/pacs.008.001.09.xsd");
            Set<ConstraintViolation<Document>> violations = validator.validate(payload);
            if (!violations.isEmpty()) {
                throw new ConstraintViolationException(violations);
            }

            String remittanceInfo = payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getRmtInf().getUstrd().get(0);

            Matcher matcher = FX_PATTERN.matcher(remittanceInfo);
            if (!matcher.find()) {
                throw new IllegalStateException("Could not parse source/target currency from remittance info: " + remittanceInfo);
            }
            String sourceCurrency = matcher.group(1);
            String targetCurrency = matcher.group(2);

            if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getCcy().equals("XXX")) {
                log.info("Message {} has a digital token as source currency", messageId);
            } else if (!payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getCcy().equals(sourceCurrency)) {
                throw new IllegalStateException("Message " + messageId + " has mismatching source currency information");
            }

            StoredMessage storedMessage = StoredMessage.builder()
                    .messageId(messageId.toString())
                    .timestamp(receivedTimestamp)
                    .creditorLegalName(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtr().getNm())
                    .creditorBIC(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAgt().getFinInstnId().getBICFI())
                    .creditorLEI(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtr().getId().getOrgId().getLEI())
                    .debitorLegalName(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtr().getNm())
                    .debitorBIC(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAgt().getFinInstnId().getBICFI())
                    .debitorLEI(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtr().getId().getOrgId().getLEI())
                    .ccy(sourceCurrency)
                    .amt(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getValue())
                    .targetCcy(targetCurrency)
                    .direction(getDirectionEnum(payload))
                    .payload(postMessageRequest.getPayload())
                    .transactionStatus(StoredMessage.TransactionStatusEnum.RECEIVED)
                    .auditTrail(auditTrail)
                    .build();

            messageStorageService.storeMessage(storedMessage);
            eventPublisher.publishEvent(new MessageStoredEvent(this, messageId.toString()));
            MessageResponse response = MessageResponse.builder()
                    .messageReference(messageId.toString())
                    .sentTimestamp(receivedTimestamp)
                    .success(true)
                    .build();
            return ResponseEntity.ok(response);

        }
        catch (JAXBException | SAXException | ConstraintViolationException e) {
            // IMPROVEMENT: Unified exception handling for better readability.
            log.error("Failed to process outgoing message with ID: {}. Reason: {}", messageId, e.getMessage());
            MessageResponse response = MessageResponse.builder()
                    .success(false)
                    .messageReference(messageId.toString())
                    .sentTimestamp(receivedTimestamp)
                    .build();
            return ResponseEntity.badRequest().body(response);
        }
    }

    private static StoredMessage.DirectionEnum getDirectionEnum(Document payload) {
        StoredMessage.DirectionEnum msgDirection;
        if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtr().getNm().equals(DB_LEGAL_NAME)) {
            msgDirection = StoredMessage.DirectionEnum.INBOUND;
        } else if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtr().getNm().equals(DB_LEGAL_NAME)) {
            msgDirection = StoredMessage.DirectionEnum.OUTBOUND;
        } else {
            throw new IllegalStateException(DB_LEGAL_NAME + " is neither Debitor nor Creditor Agent. Aborting...");
        }
        return msgDirection;
    }
}
