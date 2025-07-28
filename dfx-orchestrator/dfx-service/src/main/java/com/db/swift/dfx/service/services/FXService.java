package com.db.swift.dfx.service.services;

import com.db.swift.dfx.jaxb.model.fxtr014.*;
import com.db.swift.dfx.openapi.model.AuditTrailEntry;
import com.db.swift.dfx.openapi.model.StoredMessage;
import com.db.swift.dfx.service.utils.JaxbMarshallingUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;


import static com.db.swift.dfx.service.constants.DfxConstants.DIGITAL_CURRENCIES;

@Service
@RequiredArgsConstructor
@Slf4j
public class FXService {
    private final MessageStorageService messageStorageService;
    private final FXRateProvider fxRateProvider;
    private final JaxbMarshallingUtil jaxbMarshallingUtil;
    private static final Base64 base64 = new Base64();


    public void handleFxTradeCreation(String messageId) {
        log.info("Received successful LEI verification event for messageId: {}. Starting FX Conversion creation.", messageId);
        Optional<StoredMessage> messageOptional = messageStorageService.findMessageById(messageId);

        if (messageOptional.isEmpty()) {
            log.error("Cannot create FX Conversion. Message with ID {} not found.", messageId);
            return;
        }

        StoredMessage storedMessage = messageOptional.get();
        storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.FX_MESSAGE_CREATION_IN_PROGRESS);
        storedMessage.addAuditTrailItem(createAuditEntry("FX Conversion Creation Started", "Beginning creation of fxtr.014 message."));
        messageStorageService.updateMessage(storedMessage);
        try {
            // 1. Unmarshal original pacs.008 to get required data
            com.db.swift.dfx.jaxb.model.pacs008.Document pacs008 = jaxbMarshallingUtil.unmarshall(
                    new String(base64.decode(storedMessage.getPayload())),
                    com.db.swift.dfx.jaxb.model.pacs008.Document.class,
                    "/xsd/pacs.008.001.09.xsd"
            );

            // 2. Parse currencies from Remittance Information
            String sourceCurrency = storedMessage.getCcy();
            String targetCurrency = storedMessage.getTargetCcy();

            if (pacs008.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getCcy().equals("XXX")) {
                log.info("Message {} has a digital token as source currency", messageId);
            } else if (!pacs008.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0).getIntrBkSttlmAmt().getCcy().equals(sourceCurrency)) {
                throw new IllegalStateException("Message " + messageId + " has mismatching source currency information");
            }

            // 3. Get FX Rate
            BigDecimal rate = fxRateProvider.getRate(sourceCurrency, targetCurrency)
                    .orElseThrow(() -> new IllegalStateException("No FX rate found for " + sourceCurrency + " to " + targetCurrency));

            // 4. Create fxtr.014 message
            Document fxtr014 = createFxTradeInstruction(pacs008, sourceCurrency, targetCurrency, rate);
            storedMessage.setFxRate(fxtr014.getFXTradInstr().getAgrdRate().getXchgRate());
            LocalDate fxTradeDate = fxtr014.getFXTradInstr().getTradInf().getTradDt();
            storedMessage.setFxTradeDate(fxTradeDate);

            storedMessage.addAuditTrailItem(createAuditEntry("FX Conversion initiated", "Agreed FX Rate: " + rate
                    + ", FX Conversion Date: " + fxTradeDate));

            if (DIGITAL_CURRENCIES.contains(targetCurrency)) {
                storedMessage.setTargetAmt(fxtr014.getFXTradInstr().getTradAmts().getTradgSdBuyAmt().getDgtlTknAmt().getUnit());
            } else {
                storedMessage.setTargetAmt(fxtr014.getFXTradInstr().getTradAmts().getTradgSdBuyAmt().getAmt().getValue());
            }
            storedMessage.setTargetCcy(targetCurrency);

            // 5. Marshal fxtr.014 to XML string
            String fxtrPayload = base64.encodeToString(jaxbMarshallingUtil.marshall(fxtr014).getBytes(StandardCharsets.UTF_8));

            // 6. Update StoredMessage with result
            storedMessage.setFxtrPayload(fxtrPayload);
            storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.COMPLETED);
            storedMessage.addAuditTrailItem(createAuditEntry("FX Conversion Created",
                    "Successfully created fxtr.014 message."));
            log.info("Successfully created fxtr.014 for messageId: {}", messageId);
            storedMessage.addAuditTrailItem(createAuditEntry("Transaction completed",
                    "Successfully completed all flows linked to this transaction."));


        } catch (Exception e) {
            log.error("Failed to create FX for messageId: {}", messageId, e);
            storedMessage.setTransactionStatus(StoredMessage.TransactionStatusEnum.FAILED);
            storedMessage.addAuditTrailItem(createAuditEntry("FX Conversion Creation Failed", e.getMessage()));
        } finally {
            messageStorageService.updateMessage(storedMessage);
        }

    }

    private Document createFxTradeInstruction(com.db.swift.dfx.jaxb.model.pacs008.Document pacs008, String sourceCcy, String targetCcy, BigDecimal rate) {
        var pacsTxInf = pacs008.getFIToFICstmrCdtTrf().getCdtTrfTxInf().get(0);

        // Create the root fxtr.014 document
        Document fxtrDocument = new Document();
        ForeignExchangeTradeInstructionV06 fxTrade = new ForeignExchangeTradeInstructionV06();
        fxtrDocument.setFXTradInstr(fxTrade);

        // --- Trade Agreement ---
        TradeAgreement14 tradeAgreement = new TradeAgreement14();
        tradeAgreement.setTradDt(LocalDate.now());
        tradeAgreement.setOrgtrRef(pacsTxInf.getPmtId().getInstrId());
        fxTrade.setTradInf(tradeAgreement);

        // --- Trading Side (Debtor) ---
        TradePartyIdentification8 tradingSide = new TradePartyIdentification8();
        PartyIdentification242Choice tradingParty = new PartyIdentification242Choice();
        PartyIdentification266 tradingPartyId = new PartyIdentification266();
        tradingPartyId.setPtyNm(pacsTxInf.getDbtr().getNm());
        tradingPartyId.setLglNttyIdr(pacsTxInf.getDbtr().getId().getOrgId().getLEI());
        tradingParty.setPtyId(tradingPartyId);
        tradingSide.setSubmitgPty(tradingParty);
        fxTrade.setTradgSdId(tradingSide);

        // --- Counterparty Side (Creditor) ---
        TradePartyIdentification8 counterpartySide = new TradePartyIdentification8();
        PartyIdentification242Choice counterparty = new PartyIdentification242Choice();
        PartyIdentification266 counterpartyId = new PartyIdentification266();
        counterpartyId.setPtyNm(pacsTxInf.getCdtr().getNm());
        counterpartyId.setLglNttyIdr(pacsTxInf.getCdtr().getId().getOrgId().getLEI());
        counterparty.setPtyId(counterpartyId);
        counterpartySide.setSubmitgPty(counterparty);
        fxTrade.setCtrPtySdId(counterpartySide);

        // --- Amounts ---
        AmountsAndValueDate8 amounts = new AmountsAndValueDate8();
        BigDecimal sourceAmount = pacsTxInf.getIntrBkSttlmAmt().getValue();
        BigDecimal targetAmount = sourceAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        amounts.setTradgSdSellAmt(createCurrencyOrDigitalTokenAmount(sourceCcy, sourceAmount));
        amounts.setTradgSdBuyAmt(createCurrencyOrDigitalTokenAmount(targetCcy, targetAmount));

        amounts.setSttlmDt(LocalDate.now().plusDays(2)); // T+2 settlement
        fxTrade.setTradAmts(amounts);

        // --- Agreed Rate ---
        AgreedRate3 agreedRate = new AgreedRate3();
        agreedRate.setXchgRate(rate);
        if (DIGITAL_CURRENCIES.contains(sourceCcy)) {
            agreedRate.setUnitCcy("XXX");
        } else {
            agreedRate.setUnitCcy(sourceCcy);
        }
        if (DIGITAL_CURRENCIES.contains(targetCcy)) {
            agreedRate.setQtdCcy("XXX");
        } else {
            agreedRate.setQtdCcy(targetCcy);
        }
        fxTrade.setAgrdRate(agreedRate);

        return fxtrDocument;
    }

    /**
     * IMPROVEMENT: A dedicated helper method to build the CurrencyOrDigitalTokenAmount2Choice element.
     * It checks if the currency is a digital token and creates the appropriate JAXB object.
     *
     * @param currency The currency code (e.g., "EUR", "USDC").
     * @param amount   The amount of the transaction.
     * @return A populated CurrencyOrDigitalTokenAmount2Choice object.
     */
    private CurrencyOrDigitalTokenAmount2Choice createCurrencyOrDigitalTokenAmount(String currency, BigDecimal amount) {
        CurrencyOrDigitalTokenAmount2Choice choice = new CurrencyOrDigitalTokenAmount2Choice();

        if (DIGITAL_CURRENCIES.contains(currency)) {
            log.debug("Creating DigitalTokenAmount for currency: {}", currency);
            DigitalTokenAmount3 digitalToken = new DigitalTokenAmount3();
            digitalToken.setUnit(amount);
            digitalToken.setDesc(currency); // Use currency code as a description
            choice.setDgtlTknAmt(digitalToken);
        } else {
            log.debug("Creating ActiveOrHistoricCurrencyAndAmount for currency: {}", currency);
            ActiveOrHistoricCurrencyAndAmount fiatAmount = new ActiveOrHistoricCurrencyAndAmount();
            fiatAmount.setCcy(currency);
            fiatAmount.setValue(amount);
            choice.setAmt(fiatAmount);
        }
        return choice;
    }


    private AuditTrailEntry createAuditEntry(String action, String details) {
        return AuditTrailEntry.builder()
                .timestamp(OffsetDateTime.now())
                .action(action)
                .details(details)
                .build();
    }

}
