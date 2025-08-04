import React, {useState, useEffect} from "react";
import {FiColumns, FiChevronDown, FiChevronUp} from "react-icons/fi";
import {
    baseFields,
    paymentDetailsFieldsIncomingUsdcToEur,
    paymentDetailsFieldsOutboundUsdcToEur,
    paymentDetailsFieldsIncomingUsdcToDeur,
    paymentDetailsFieldsOutboundUsdcToDeur
} from "../resources/paymentDetailsFields";
import "../css/PaymentTab.css";

function buildPaymentDetailsXML(fields, isOutbound) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.14">
    <FIToFICstmrCdtTrf>
        <GrpHdr>
            <MsgId>${fields.MsgId}</MsgId>
            <CreDtTm>${fields.CreDtTm}</CreDtTm>
            <NbOfTxs>${fields.NbOfTxs}</NbOfTxs>
            <SttlmInf>
                <SttlmMtd>${fields.SttlmMtd}</SttlmMtd>
            </SttlmInf>
        </GrpHdr>
        <CdtTrfTxInf>
            <PmtId>
                <InstrId>${fields.InstrId}</InstrId>
                <EndToEndId>${fields.EndToEndId}</EndToEndId>
                <TxId>${fields.TxId}</TxId>
                <UETR>${fields.UETR}</UETR>
                <TxHash>${fields.TxHash}</TxHash>
            </PmtId>
            <IntrBkSttlmAmt Ccy="${fields.IntrBkSttlmCcy}">${fields.IntrBkSttlmAmt}</IntrBkSttlmAmt>
            ${isOutbound ? "" : `<InstdAmt Ccy="${fields.InstdAmtCcy}">${fields.InstdAmt}</InstdAmt>`}
            <ChrgBr>${fields.ChrgBr}</ChrgBr>
            <Dbtr>
                <Nm>${fields.DbtrNm}</Nm>
            </Dbtr>
            <DbtrAcct>
                <WalletId>
                    <DbtrWalletAddr>${fields.DbtrWalletAddr}</DbtrWalletAddr>
                </WalletId>
                <WalletNtwrk>
                    <DbtrWalletNtwrk>${fields.DbtrWalletNtwrk}</DbtrWalletNtwrk>
                </WalletNtwrk>
                <TokenId>${fields.DbtrTokenId}</TokenId>
            </DbtrAcct>
            <DbtrAgt>
                <FinInstnId>
                    <BICFI>${fields.DbtrAgtBIC}</BICFI>
                    <LEI>${fields.DbtrAgtLEI}</LEI>
                </FinInstnId>
            </DbtrAgt>
            <CdtrAgt>
                <FinInstnId>
                    <BICFI>${fields.CdtrAgtBIC}</BICFI>
                    <LEI>${fields.CdtrAgtLEI}</LEI>
                </FinInstnId>
            </CdtrAgt>
            <Cdtr>
                <Nm>${fields.CdtrNm}</Nm>
            </Cdtr>
            <CdtrAcct>
    ${
        fields.convertedCurrency === "EUR"
            ? `<Id>
            <IBAN>${fields.CdtrIban}</IBAN>
        </Id>
        <Ccy>EUR</Ccy>`
            : `<WalletId>
            <CdtrWalletAddr>${fields.CdtrWalletAddr}</CdtrWalletAddr>
        </WalletId>
        <WalletNtwrk>
            <CdtrWalletNtwrk>${fields.CdtrWalletNtwrk}</CdtrWalletNtwrk>
        </WalletNtwrk>
        <TokenId>${fields.CdtrTokenId}</TokenId>`
    }
            </CdtrAcct>
            <RmtInf>
                <Ustrd>${fields.RmtInfUstrd}</Ustrd>
            </RmtInf>
        </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
</Document>`;
}

export default function PaymentTab({
                                       onAddRow = () => {
                                       }
                                   }) {
    const [selectedCurrency, setSelectedCurrency] = useState("DEUR");
    const [isOutbound, setIsOutbound] = useState(false);
    const [fields, setFields] = useState({
        ...baseFields,
        ...paymentDetailsFieldsIncomingUsdcToDeur
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [response, setResponse] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        let newFields;
        let targetCurrency = "";
        if (selectedCurrency === "EUR") {
            newFields = paymentDetailsFieldsIncomingUsdcToEur;
            targetCurrency = "EUR";
        } else if (selectedCurrency === "DEUR" && !isOutbound) {
            newFields = paymentDetailsFieldsIncomingUsdcToDeur;
        } else {
            newFields = paymentDetailsFieldsOutboundUsdcToDeur;
        }
        setFields({
            ...baseFields,
            ...newFields,
            convertedCurrency: targetCurrency
        });
    }, [selectedCurrency, isOutbound]);

    const handleDirectionChange = outbound => setIsOutbound(outbound);

    const handleChange = e => {
        setFields({...fields, [e.target.name]: e.target.value});
    };

    const handleSubmit = async e => {
        e.preventDefault();

        let paymentFields;
        if (showAdvanced) {
            if (selectedCurrency === "DEUR" && !isOutbound) {
                paymentFields = paymentDetailsFieldsIncomingUsdcToDeur;
            } else if (selectedCurrency === "DEUR" && isOutbound) {
                paymentFields = paymentDetailsFieldsOutboundUsdcToDeur;
            } else if (selectedCurrency === "EUR" && !isOutbound) {
                paymentFields = paymentDetailsFieldsIncomingUsdcToEur;
            } else {
                paymentFields = paymentDetailsFieldsOutboundUsdcToEur;
            }
            const xmlFields = {};
            Object.keys(paymentFields).forEach(key => {
                xmlFields[key] = fields[key];
            });

            const xml = buildPaymentDetailsXML(xmlFields, isOutbound);
            console.log(xml);
            const base64 = btoa(unescape(encodeURIComponent(xml)));

            try {
                const res = await fetch("http://localhost:8080/message", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({payload: base64})
                });
                const data = await res.json();
                setResponse(data);
                setModalOpen(true);
            } catch (err) {
                setResponse({success: false, "message-reference": "Error", "sent-timestamp": ""});
                setModalOpen(true);
            }
        } else {
            onAddRow({...fields});
            setResponse(null);
        }

        setFields({
            ...baseFields,
            ...(selectedCurrency === "DEUR"
                ? (isOutbound ? paymentDetailsFieldsOutboundUsdcToDeur : paymentDetailsFieldsIncomingUsdcToDeur)
                : (isOutbound ? paymentDetailsFieldsOutboundUsdcToEur : paymentDetailsFieldsIncomingUsdcToEur))
        });
        setShowAdvanced(false);
    };

    return (
        <div className="pro-tab-root">
            <header className="pro-tab-header">
                <h2>
                    Initiate Payment <span className="pro-tab-count"></span>
                </h2>
            </header>
            <section className="pro-tab-cols">
                <div className="pro-tab-cols-title" style={{marginBottom: 24}}>
                    <span style={{display: "flex", alignItems: "center", fontWeight: 600, color: "#1976d2"}}>
                        <FiColumns style={{marginRight: 6}}/>
                        Digital & Fiat Payment Initiation
                    </span>
                </div>
            </section>
            <div style={{height: 32}}></div>

            <div className="button-row">
                <div className="button-group">
                    <button
                        type="button"
                        className={`custom-btn ${selectedCurrency === "DEUR" ? "active" : ""}`}
                        onClick={() => setSelectedCurrency("DEUR")}
                    >
                        USDC TO DEUR
                    </button>
                    <button
                        type="button"
                        className={`custom-btn ${selectedCurrency === "EUR" ? "active" : ""}`}
                        onClick={() => setSelectedCurrency("EUR")}
                    >
                        USDC TO EUR
                    </button>
                </div>
                {selectedCurrency !== "EUR" ? (
                    <div className="button-group">
                        <button
                            type="button"
                            className={`custom-btn ${!isOutbound ? "active" : ""}`}
                            onClick={() => handleDirectionChange(false)}
                        >
                            Inbound
                        </button>
                        <button
                            type="button"
                            className={`custom-btn ${isOutbound ? "active" : ""}`}
                            onClick={() => handleDirectionChange(true)}
                        >
                            Outbound
                        </button>
                    </div>
                ) : (
                    <div className="button-group">
                        <button
                            type="button"
                            className={`custom-btn active`}
                            disabled
                        >
                            Inbound
                        </button>
                    </div>
                )}
            </div>

            <form
                className="payment-tab-form"
                onSubmit={handleSubmit}
                autoComplete="on"
                style={{
                    width: "100%",
                    maxWidth: 1000,
                    margin: "0 auto",
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 2px 12px #e0e0e0",
                    padding: 32
                }}
            >
                <fieldset style={{border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 28, padding: 20}}>
                    <legend style={{fontWeight: 600, color: "#1976d2", padding: "0 10px"}}>Basic Data</legend>
                    <div style={{display: "flex", gap: 24, flexWrap: "wrap"}}>
                        <Input label="Sender" name="sender" value={fields.sender} onChange={handleChange}
                               placeholder="e.g. Max Mustermann"/>
                        <Input label="Receiver" name="receiver" value={fields.receiver} onChange={handleChange}
                               placeholder="e.g. Erika Musterfrau"/>
                        <Input label="Original Currency" name="originalCurrency" value={fields.originalCurrency}
                               onChange={handleChange} placeholder="e.g. EUR"/>
                        <Input label="Original Amount" name="originalAmount" value={fields.originalAmount}
                               onChange={handleChange} type="number" min="0" step="any" placeholder="e.g. 1000"/>
                        <Input label="Target Currency" name="convertedCurrency" value={fields.convertedCurrency}
                               onChange={handleChange} placeholder="e.g. USD"/>
                    </div>
                </fieldset>

                <button
                    type="button"
                    className="payment-tab-form-advance custom-btn"
                    onClick={() => setShowAdvanced(v => !v)}
                >
                    {showAdvanced ? <FiChevronUp style={{marginRight: 8}}/> : <FiChevronDown style={{marginRight: 8}}/>}
                    {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
                </button>

                {showAdvanced && (
                    <>
                        <fieldset style={{border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 28, padding: 20}}>
                            <legend style={{fontWeight: 600, color: "#1976d2", padding: "0 10px"}}>Payment Details (ISO
                                20022)
                            </legend>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18}}>
                                <Input label="Message ID" name="MsgId" value={fields.MsgId} onChange={handleChange}/>
                                <Input label="Creation Date/Time" name="CreDtTm" value={fields.CreDtTm}
                                       onChange={handleChange}/>
                                <Input label="Number of Transactions" name="NbOfTxs" value={fields.NbOfTxs}
                                       onChange={handleChange}/>
                                <Input label="Settlement Method" name="SttlmMtd" value={fields.SttlmMtd}
                                       onChange={handleChange}/>
                                <Input label="Instruction ID" name="InstrId" value={fields.InstrId}
                                       onChange={handleChange}/>
                                <Input label="EndToEnd ID" name="EndToEndId" value={fields.EndToEndId}
                                       onChange={handleChange}/>
                                <Input label="Transaction ID" name="TxId" value={fields.TxId} onChange={handleChange}/>
                                <Input label="UETR" name="UETR" value={fields.UETR} onChange={handleChange}/>
                                <Input label="Transaction Hash" name="TxHash" value={fields.TxHash}
                                       onChange={handleChange}/>
                                <Input label="Interbank Settlement Amount" name="IntrBkSttlmAmt"
                                       value={fields.IntrBkSttlmAmt} onChange={handleChange}/>
                                <Input label="Interbank Settlement Currency" name="IntrBkSttlmCcy"
                                       value={fields.IntrBkSttlmCcy} onChange={handleChange}/>
                                {!isOutbound && (
                                    <Input label="Instructed Amount" name="InstdAmt" value={fields.InstdAmt} onChange={handleChange}/>
                                )}
                                {!isOutbound && (
                                    <Input label="Instructed Amount Currency" name="InstdAmtCcy" value={fields.InstdAmtCcy} onChange={handleChange}/>
                                )}
                                <Input label="Charge Bearer" name="ChrgBr" value={fields.ChrgBr}
                                       onChange={handleChange}/>
                                <Input label="Remittance Information" name="RmtInfUstrd" value={fields.RmtInfUstrd}
                                       onChange={handleChange}/>
                            </div>
                        </fieldset>

                        <fieldset style={{border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 28, padding: 20}}>
                            <legend style={{fontWeight: 600, color: "#1976d2", padding: "0 10px"}}>Debitor</legend>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18}}>
                                <Input label="Debtor Name" name="DbtrNm" value={fields.DbtrNm} onChange={handleChange}/>
                                <Input label="Debtor Wallet Address" name="DbtrWalletAddr" value={fields.DbtrWalletAddr}
                                       onChange={handleChange}/>
                                <Input label="Debtor Wallet Network" name="DbtrWalletNtwrk"
                                       value={fields.DbtrWalletNtwrk} onChange={handleChange}/>
                                <Input label="Debtor Token ID" name="DbtrTokenId" value={fields.DbtrTokenId}
                                       onChange={handleChange}/>
                                <Input label="Debtor Agent BIC" name="DbtrAgtBIC" value={fields.DbtrAgtBIC}
                                       onChange={handleChange}/>
                                <Input label="Debtor Agent LEI" name="DbtrAgtLEI" value={fields.DbtrAgtLEI}
                                       onChange={handleChange}/>
                            </div>
                        </fieldset>

                        <fieldset style={{border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 28, padding: 20}}>
                            <legend style={{fontWeight: 600, color: "#1976d2", padding: "0 10px"}}>Creditor</legend>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18}}>
                                <Input label="Creditor Name" name="CdtrNm" value={fields.CdtrNm}
                                       onChange={handleChange}/>
                                {fields.convertedCurrency === "EUR" ? (
                                    <Input label="Creditor IBAN" name="CdtrIban" value={fields.CdtrIban}
                                           onChange={handleChange}/>
                                ) : (
                                    <>
                                        <Input label="Creditor Wallet Address" name="CdtrWalletAddr"
                                               value={fields.CdtrWalletAddr} onChange={handleChange}/>
                                        <Input label="Creditor Wallet Network" name="CdtrWalletNtwrk"
                                               value={fields.CdtrWalletNtwrk} onChange={handleChange}/>
                                        <Input label="Creditor Token ID" name="CdtrTokenId" value={fields.CdtrTokenId}
                                               onChange={handleChange}/>
                                    </>
                                )}
                                <Input label="Creditor Agent BIC" name="CdtrAgtBIC" value={fields.CdtrAgtBIC}
                                       onChange={handleChange}/>
                                <Input label="Creditor Agent LEI" name="CdtrAgtLEI" value={fields.CdtrAgtLEI}
                                       onChange={handleChange}/>
                            </div>
                        </fieldset>
                    </>
                )}

                <button
                    type="submit"
                    className="payment-tab-form-button custom-btn"
                >
                    Execute Payment
                </button>
            </form>
            <ResponseModal open={modalOpen && !!response} onClose={() => setModalOpen(false)} response={response}/>
            <style>{`
                .button-row {
                    display: flex;
                    justify-content: center;
                    gap: 32px;
                    margin-bottom: 32px;
                }
                .button-group {
                    display: flex;
                    gap: 16px;
                    background: #f0f7ff;
                    border-radius: 10px;
                    padding: 12px 24px;
                    box-shadow: 0 2px 8px #e0e0e0;
                }
                .custom-btn {
                    background: #f5f5f5;
                    color: #1976d2;
                    border: 2px solid #1976d2;
                    border-radius: 8px;
                    padding: 12px 32px;
                    font-weight: 600;
                    font-size: 17px;
                    cursor: pointer;
                    transition: background 0.2s, color 0.2s, box-shadow 0.2s;
                    box-shadow: 0 1px 4px #e0e0e0;
                }
                .custom-btn.active,
                .custom-btn:focus {
                    background: #1976d2;
                    color: #fff;
                    outline: none;
                    box-shadow: 0 2px 8px #1976d2;
                }
                .custom-btn:hover {
                    background: #1565c0;
                    color: #fff;
                }
                .payment-tab-form-advance.custom-btn {
                    margin-bottom: 24px;
                    background: #e3eafc;
                    color: #1976d2;
                    border: 2px solid #1976d2;
                    font-size: 16px;
                }
                .payment-tab-form-button.custom-btn {
                    margin-top: 16px;
                    background: #1976d2;
                    color: #fff;
                    border: none;
                    font-size: 18px;
                    box-shadow: 0 2px 8px #e0e0e0;
                }
            `}</style>
        </div>
    );
}

function Input({label, name, value, onChange, ...rest}) {
    return (
        <div className="payment-tab-form-field">
            <label htmlFor={name} className="payment-tab-form-label">{label}</label>
            <input
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                className="payment-tab-form-input"
                placeholder={label}
                {...rest}
            />
        </div>
    );
}

function ResponseModal({open, onClose, response}) {
    const [showJson, setShowJson] = useState(false);

    if (!open) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <div style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
                padding: 32,
                minWidth: 400,
                maxWidth: "80vw"
            }}>
                <h3 style={{color: "#1976d2", marginBottom: 16}}>Response</h3>
                <div style={{
                    background: "#f0f7ff",
                    border: "1px solid #1976d2",
                    borderRadius: 8,
                    color: "#1976d2",
                    fontSize: 16,
                    padding: 16,
                    marginBottom: 24
                }}>
                    <div style={{marginBottom: 8}}>
                        <strong>Status:</strong>{" "}
                        <span style={{
                            color: response.success ? "#2e7d32" : "#d32f2f",
                            fontWeight: 600
                        }}>
                            {response.success ? "Success" : "Error"}
                        </span>
                    </div>
                    <div style={{marginBottom: 8}}>
                        <strong>Message Reference:</strong> {response["message-reference"]}
                    </div>
                    <div style={{marginBottom: 8}}>
                        <strong>Sent Timestamp:</strong> {new Date(response["sent-timestamp"] * 1000).toLocaleString()}
                    </div>
                </div>
                <div style={{display: "flex", gap: 12}}>
                    <button
                        onClick={() => setShowJson(true)}
                        className="custom-btn"
                        style={{background: "#e3eafc", color: "#1976d2"}}
                    >
                        Show JSON
                    </button>
                    <button
                        onClick={onClose}
                        className="custom-btn"
                        style={{background: "#1976d2", color: "#fff"}}
                    >
                        Close
                    </button>
                </div>
                {showJson && (
                    <div style={{
                        marginTop: 24,
                        background: "#222",
                        color: "#fff",
                        borderRadius: 8,
                        padding: 16,
                        fontSize: 14,
                        maxHeight: 300,
                        overflow: "auto"
                    }}>
                        <pre>{JSON.stringify(response, null, 2)}</pre>
                        <button
                            onClick={() => setShowJson(false)}
                            className="custom-btn"
                            style={{marginTop: 12, background: "#fff", color: "#1976d2"}}
                        >
                            Hide JSON
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}