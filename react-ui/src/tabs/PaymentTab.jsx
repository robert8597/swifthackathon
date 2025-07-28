import React, {useState} from "react";
import {FiColumns, FiChevronDown, FiChevronUp} from "react-icons/fi";
import "../css/PaymentTab.css";

const baseFields = {
    sender: "",
    receiver: "",
    originalCurrency: "",
    originalAmount: "",
    convertedCurrency: ""
};

const paymentDetailsFields = {
    MsgId: "USDT2EUR-20250804-0004",
    CreDtTm: "2025-08-04T15:45:00Z",
    NbOfTxs: "1",
    SttlmMtd: "CLRG",
    InstrId: "USDT2EUR-INSTR-0004",
    EndToEndId: "E2E-USDT2EUR-0004",
    TxId: "TX-USDT-EUR-002",
    IntrBkSttlmAmt: "9500.00",
    IntrBkSttlmCcy: "XXX",
    ChrgBr: "SHAR",
    DbtrNm: "European Central Bank",
    DbtrLEI: "549300DTUYXVMJXZNY75",
    DbtrAcctIBAN: "DE89100000001234567890",
    DbtrAgtBIC: "ECBFDEFFXXX",
    DbtrAgtLEI: "549300DTUYXVMJXZNY75",
    CdtrAgtBIC: "DEUTDEFFXXX",
    CdtrAgtLEI: "7LTWFZYICNSX8D621K86",
    CdtrNm: "DEUTSCHE BANK AKTIENGESELLSCHAFT",
    CdtrLEI: "7LTWFZYICNSX8D621K86",
    CdtrAcctIBAN: "US00000000000003",
    RmtInfUstrd: "FX:USDT/EUR"
};

const paymentDetailsFieldsOutbound = {
    MsgId: "USDT2EUR-20250804-0004",
    CreDtTm: "2025-08-04T15:45:00Z",
    NbOfTxs: "1",
    SttlmMtd: "CLRG",
    InstrId: "USDT2EUR-INSTR-0004",
    EndToEndId: "E2E-USDT2EUR-0004",
    TxId: "TX-USDT-EUR-002",
    IntrBkSttlmAmt: "5500.00",
    IntrBkSttlmCcy: "XXX",
    ChrgBr: "SHAR",
    DbtrNm: "DEUTSCHE BANK AKTIENGESELLSCHAFT",
    DbtrLEI: "7LTWFZYICNSX8D621K86",
    DbtrAcctIBAN: "US00000000000003",
    DbtrAgtBIC: "DEUTDEFFXXX",
    DbtrAgtLEI: "7LTWFZYICNSX8D621K86",
    CdtrAgtBIC: "ECBFDEFFXXX",
    CdtrAgtLEI: "549300DTUYXVMJXZNY75",
    CdtrNm: "European Central Bank",
    CdtrLEI: "549300DTUYXVMJXZNY75",
    CdtrAcctIBAN: "DE89100000001234567890",
    RmtInfUstrd: "FX:USDT/EUR"
};

function buildPaymentDetailsXML(fields) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09">
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
            </PmtId>
            <IntrBkSttlmAmt Ccy="${fields.IntrBkSttlmCcy}">${fields.IntrBkSttlmAmt}</IntrBkSttlmAmt>
            <ChrgBr>${fields.ChrgBr}</ChrgBr>
            <Dbtr>
                <Nm>${fields.DbtrNm}</Nm>
                <Id>
                    <OrgId>
                        <LEI>${fields.DbtrLEI}</LEI>
                    </OrgId>
                </Id>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <IBAN>${fields.DbtrAcctIBAN}</IBAN>
                </Id>
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
                <Id>
                    <OrgId>
                        <LEI>${fields.CdtrLEI}</LEI>
                    </OrgId>
                </Id>
            </Cdtr>
            <CdtrAcct>
                <Id>
                    <IBAN>${fields.CdtrAcctIBAN}</IBAN>
                </Id>
            </CdtrAcct>
            <RmtInf>
                <Ustrd>${fields.RmtInfUstrd}</Ustrd>
            </RmtInf>
        </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
</Document>`;
}

export default function PaymentTab({onAddRow}) {
    const [isOutbound, setIsOutbound] = useState(false);
    const [fields, setFields] = useState({
        ...baseFields,
        ...(isOutbound ? paymentDetailsFieldsOutbound : paymentDetailsFields)
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [response, setResponse] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Change between Inbound and Outbound
    const handleDirectionChange = outbound => {
        setIsOutbound(outbound);
        setFields({
            ...baseFields,
            ...(outbound ? paymentDetailsFieldsOutbound : paymentDetailsFields)
        });
    };

    const handleChange = e => {
        setFields({...fields, [e.target.name]: e.target.value});
    };

    const handleSubmit = async e => {
        e.preventDefault();

        if (showAdvanced) {
            const paymentFields = {};
            Object.keys(isOutbound ? paymentDetailsFieldsOutbound : paymentDetailsFields).forEach(key => {
                paymentFields[key] = fields[key];
            });

            const xml = buildPaymentDetailsXML(paymentFields);
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
            ...(isOutbound ? paymentDetailsFieldsOutbound : paymentDetailsFields)
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

            <div style={{marginBottom: 16, display: "flex", gap: 12}}>
                <button
                    type="button"
                    onClick={() => handleDirectionChange(false)}
                    style={{
                        background: !isOutbound ? "#1976d2" : "#f5f5f5",
                        color: !isOutbound ? "#fff" : "#1976d2",
                        border: "1px solid #1976d2",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Inbound
                </button>
                <button
                    type="button"
                    onClick={() => handleDirectionChange(true)}
                    style={{
                        background: isOutbound ? "#1976d2" : "#f5f5f5",
                        color: isOutbound ? "#fff" : "#1976d2",
                        border: "1px solid #1976d2",
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Outbound
                </button>
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
                    className="payment-tab-form-advance"
                    onClick={() => setShowAdvanced(v => !v)}
                    style={{
                        margin: "0 0 24px 0",
                        background: "#f5f5f5",
                        border: "none",
                        borderRadius: 6,
                        padding: "10px 18px",
                        fontWeight: 600,
                        color: "#1976d2",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                    }}
                >
                    {showAdvanced ? <FiChevronUp style={{marginRight: 8}}/> : <FiChevronDown style={{marginRight: 8}}/>}
                    {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
                </button>

                {showAdvanced && (
                    <fieldset style={{border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 28, padding: 20}}>
                        <legend style={{fontWeight: 600, color: "#1976d2", padding: "0 10px"}}>Payment Details (ISO
                            20022)
                        </legend>
                        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18}}>
                            <Input label="Message ID" name="MsgId" value={fields.MsgId} onChange={handleChange}/>
                            <Input label="Creation Date Time" name="CreDtTm" value={fields.CreDtTm}
                                   onChange={handleChange}/>
                            <Input label="Number of Transactions" name="NbOfTxs" value={fields.NbOfTxs}
                                   onChange={handleChange}/>
                            <Input label="Settlement Method" name="SttlmMtd" value={fields.SttlmMtd}
                                   onChange={handleChange}/>
                            <Input label="Instruction ID" name="InstrId" value={fields.InstrId}
                                   onChange={handleChange}/>
                            <Input label="End-to-End ID" name="EndToEndId" value={fields.EndToEndId}
                                   onChange={handleChange}/>
                            <Input label="Transaction ID" name="TxId" value={fields.TxId} onChange={handleChange}/>
                            <Input label="Interbank Settlement Amount" name="IntrBkSttlmAmt"
                                   value={fields.IntrBkSttlmAmt} onChange={handleChange}/>
                            <Input label="Interbank Settlement Currency" name="IntrBkSttlmCcy"
                                   value={fields.IntrBkSttlmCcy} onChange={handleChange}/>
                            <Input label="Charge Bearer" name="ChrgBr" value={fields.ChrgBr} onChange={handleChange}/>
                            <Input label="Debtor Name" name="DbtrNm" value={fields.DbtrNm} onChange={handleChange}/>
                            <Input label="Debtor LEI" name="DbtrLEI" value={fields.DbtrLEI} onChange={handleChange}/>
                            <Input label="Debtor Account IBAN" name="DbtrAcctIBAN" value={fields.DbtrAcctIBAN}
                                   onChange={handleChange}/>
                            <Input label="Debtor Agent BIC" name="DbtrAgtBIC" value={fields.DbtrAgtBIC}
                                   onChange={handleChange}/>
                            <Input label="Debtor Agent LEI" name="DbtrAgtLEI" value={fields.DbtrAgtLEI}
                                   onChange={handleChange}/>
                            <Input label="Creditor Agent BIC" name="CdtrAgtBIC" value={fields.CdtrAgtBIC}
                                   onChange={handleChange}/>
                            <Input label="Creditor Agent LEI" name="CdtrAgtLEI" value={fields.CdtrAgtLEI}
                                   onChange={handleChange}/>
                            <Input label="Creditor Name" name="CdtrNm" value={fields.CdtrNm} onChange={handleChange}/>
                            <Input label="Creditor LEI" name="CdtrLEI" value={fields.CdtrLEI} onChange={handleChange}/>
                            <Input label="Creditor Account IBAN" name="CdtrAcctIBAN" value={fields.CdtrAcctIBAN}
                                   onChange={handleChange}/>
                            <Input label="Remittance Information" name="RmtInfUstrd" value={fields.RmtInfUstrd}
                                   onChange={handleChange}/>
                        </div>
                    </fieldset>
                )}

                <button
                    type="submit"
                    className="payment-tab-form-button"
                    style={{
                        marginTop: 8,
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "12px 28px",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px #e0e0e0"
                    }}
                >
                    Execute Payment
                </button>
            </form>
            <ResponseModal open={modalOpen && !!response} onClose={() => setModalOpen(false)} response={response}/>
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

// Modal-Component für die Response bleibt unverändert
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
                        style={{
                            background: "#e3eafc",
                            color: "#1976d2",
                            border: "none",
                            borderRadius: 6,
                            padding: "10px 24px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Show JSON
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            background: "#1976d2",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "10px 24px",
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
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
                            style={{
                                marginTop: 12,
                                background: "#fff",
                                color: "#1976d2",
                                border: "none",
                                borderRadius: 6,
                                padding: "8px 18px",
                                fontWeight: 600,
                                cursor: "pointer"
                            }}
                        >
                            Hide JSON
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}