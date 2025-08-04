package com.db.swift.dfx.service.controller;

import com.db.swift.dfx.jaxb.model.pacs008.Document;
import com.db.swift.dfx.openapi.api.PostMessageApi;
import com.db.swift.dfx.openapi.model.*;
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

import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static com.db.swift.dfx.service.constants.DfxConstants.*;

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

            Document payload = jaxbMarshallingUtil.unmarshall(new String(base64.decode(postMessageRequest.getPayload())), Document.class, "/xsd/pacs.008.001.14.xsd");
            Set<ConstraintViolation<Document>> violations = validator.validate(payload);
            if (!violations.isEmpty()) {
                throw new ConstraintViolationException(violations);
            }

            StoredMessage storedMessage = StoredMessage.builder()
                    .messageId(messageId.toString())
                    .timestamp(receivedTimestamp)
                    .creditorAgentBIC(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAgt().getFinInstnId().getBICFI())
                    .creditorAgentLEI(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAgt().getFinInstnId().getLEI())
                    .debitorAgentBIC(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAgt().getFinInstnId().getBICFI())
                    .debitorAgentLEI(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAgt().getFinInstnId().getLEI())
                    .direction(getDirectionEnum(payload))
                    .payload(postMessageRequest.getPayload())
                    .transactionStatus(StoredMessage.TransactionStatusEnum.RECEIVED)
                    .auditTrail(auditTrail)
                    .build();

            if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getTokenId() != null ) {
                storedMessage.setDebitorWallet(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getWalletId().getDbtrWalletAddr());
                storedMessage.setDebitorNetwork(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getWalletNtwrk().getDbtrWalletNtwrk());
                storedMessage.setCcy(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getTokenId());
            } else {
                storedMessage.setCcy(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getCcy());
            }

            if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAcct().getTokenId() != null ) {
                storedMessage.setCreditorWallet(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAcct().getWalletId().getCdtrWalletAddr());
                storedMessage.setCreditorNetwork(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAcct().getWalletNtwrk().getCdtrWalletNtwrk());
                storedMessage.setTargetCcy(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAcct().getTokenId());
            } else {
                storedMessage.setTargetCcy(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAcct().getCcy());
            }
            storedMessage.setTargetAmt(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getValue());

            if (storedMessage.getDirection().equals(StoredMessage.DirectionEnum.INBOUND)) {
                storedMessage.setFxTradeDate(LocalDate.now());
                storedMessage.setAmt(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getInstdAmt().getValue());
                storedMessage.setFxRate(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getValue()
                                .divide(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getInstdAmt().getValue(), RoundingMode.HALF_UP)
                        );
            }

            BlockchainTransactionDetails blockchainTransactionDetails =
                    BlockchainTransactionDetails.builder()
                            .network(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getWalletNtwrk().getDbtrWalletNtwrk())
                            .token(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAcct().getTokenId())
                            .txId(payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getPmtId().getTxHash())
                            .build();
            storedMessage.setBlckchnDetails(blockchainTransactionDetails);
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
            log.error("Failed to process outgoing message with ID: {}. Reason: {}", messageId, e.toString());
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
        if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getCdtrAgt().getFinInstnId().getBICFI().equals("DEUTDEFFXXX")) {
            msgDirection = StoredMessage.DirectionEnum.INBOUND;
        } else if (payload.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getDbtrAgt().getFinInstnId().getBICFI().equals("DEUTDEFFXXX")) {
            msgDirection = StoredMessage.DirectionEnum.OUTBOUND;
        } else {
            throw new IllegalStateException(DB_LEGAL_NAME + " is neither Debitor nor Creditor Agent. Aborting...");
        }
        return msgDirection;
    }
}
