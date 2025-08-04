import React, {useState, useEffect} from "react";
import {DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd";
import {FiColumns, FiCheckSquare, FiSquare, FiSettings} from "react-icons/fi";
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter";
import "../css/PaymentStatusTab.css";

const STORAGE_KEY = "paymentStatusTab.visibleCols";
// const LEADING_COLS = ["transactionStatus", "messageId", "debitorLegalName", "creditorLegalName"];
const LEADING_COLS = [];
const FIXED_COLS = [];
const DEFAULT_COLS = [
    ...LEADING_COLS,
    ...FIXED_COLS,
    "transactionStatus",
    "messageId",
    "debitorAgentLegalName",
    "debitorLEIStatus",
    "creditorAgentLegalName",
    "creditorLEIStatus",
    // "ccy",
    // "amt",
    // "fxRate",
    // "targetAmt",
    // "targetCcy",
    "fxTradeDate",
    "timestamp",
    "direction",
    "conversion",


    "debitorNetwork",
    "creditorNetwork",
    // "debitorWallet",
    // "creditorWallet",
    // "blckchnDetails.network",
    // "blckchnDetails.txId",
    // "blckchnDetails.token",
    "blckchnTransactionValidationStatus"
];

function formatConversion(row) {
    if (!row.amt || !row.ccy || !row.targetAmt || !row.targetCcy || !row.fxRate) return "";
    return `${row.amt} ${row.ccy} → ${row.targetAmt} ${row.targetCcy} @ ${row.fxRate}`;
}

function formatFxTradeDate(arr) {
    if (!Array.isArray(arr) || arr.length !== 3) return "";
    const [year, month, day] = arr;
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function formatTimestamp(ts) {
    if (!ts) return "";
    const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    };
    if (typeof ts === "string" && ts.includes("T")) {
        return new Date(ts).toLocaleString("en-US", options);
    }
    if (typeof ts === "number") {
        if (ts > 1e12) return new Date(ts).toLocaleString("en-US", options);
        return new Date(ts * 1000).toLocaleString("en-US", options);
    }
    if (!isNaN(ts)) {
        const num = Number(ts);
        if (num > 1e12) return new Date(num).toLocaleString("en-US", options);
        return new Date(num * 1000).toLocaleString("en-US", options);
    }
    return ts;
}

function decodeBase64(str) {
    try {
        return decodeURIComponent(escape(window.atob(str)));
    } catch {
        return "(Invalid Payload)";
    }
}

function formatXml(xml) {
    try {
        const PADDING = "  ";
        let reg = /(>)(<)(\/*)/g;
        let xmlStr = xml.replace(reg, "$1\r\n$2$3");
        let lines = xmlStr.split("\r\n");
        let pad = 0;
        let result = [];
        for (let line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.match(/^<\/\w/)) {
                pad = pad > 0 ? pad - 1 : 0;
            }
            result.push(PADDING.repeat(pad) + trimmed);
            if (
                trimmed.match(/^<\w/) &&
                !trimmed.match(/\/>$/) &&
                !trimmed.match(/^<.*<\/.*>$/)
            ) {
                pad++;
            }
        }
        return result.join("\n");
    } catch {
        return xml;
    }
}

function extractXmlType(xmlStr) {
    const match = xmlStr.match(/<Document[^>]*xmlns="([^"]+)"/);
    if (!match) return "pacs.008.001.09";
    const ns = match[1];
    const lastPart = ns.split(":").pop();
    return lastPart;
}

function getStatusColor(status) {
    return status === "VERIFIED" ? "#43a047" : status === "FAILED" ? "#e53935" : undefined;
}

export default function PaymentStatusTab() {
    const [data, setData] = useState([]);
    const [visibleCols, setVisibleCols] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_COLS;
    });
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [selectedRow, setSelectedRow] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [activePayloadTab, setActivePayloadTab] = useState("pacs");

    // Settings state
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [fetchInterval, setFetchInterval] = useState(5);

    // Default XML type based on selected row
    const xmlType = selectedRow
        ? extractXmlType(formatXml(decodeBase64(selectedRow.payload)))
        : "pacs";

    // Fetch data with interval
    useEffect(() => {
        let intervalId;
        const fetchData = () => {
            fetch("http://localhost:8080/list")
                .then(res => res.json())
                .then(setData)
                .catch(() => setData([]));
        };
        fetchData();
        intervalId = setInterval(fetchData, fetchInterval * 1000);
        return () => clearInterval(intervalId);
    }, [fetchInterval]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    }, [visibleCols]);

    const handleSort = col => {
        if (sortCol === col) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortCol(col);
            setSortDir("asc");
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortCol) return data;
        return [...data].sort((a, b) => {
            const valA = a[sortCol] ?? "";
            const valB = b[sortCol] ?? "";
            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [data, sortCol, sortDir]);

    const handleToggle = col => {
        setVisibleCols(v =>
            v.includes(col) ? v.filter(c => c !== col) : [...v, col]
        );
    };

    const handleSelectAll = () => setVisibleCols(DEFAULT_COLS);
    const handleDeselectAll = () => setVisibleCols([]);

    const draggableCols = visibleCols.filter(
        col => !LEADING_COLS.includes(col) && !FIXED_COLS.includes(col)
    );

    const onDragEnd = result => {
        if (!result.destination) return;
        const reordered = Array.from(draggableCols);
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        setVisibleCols([
            ...LEADING_COLS,
            ...FIXED_COLS,
            ...reordered,
        ]);
    };

    const getColLabel = col => {
        if (col === "conversion") return "FX Conversion & CCY";
        switch (col) {
            case "messageId":
                return "UETR";
            case "debitorAgentLegalName":
                return "Debitor FI Name";
            case "creditorAgentLegalName":
                return "Creditor FI Name";
            case "debitorBIC":
                return "Debitor BIC";
            case "creditorBIC":
                return "Creditor BIC";
            case "debitorLEI":
                return "Debitor LEI";
            case "creditorLEI":
                return "Creditor LEI";
            case "ccy":
                return "Currency";
            case "amt":
                return "Amount";
            case "targetCcy":
                return "Target Currency";
            case "targetAmt":
                return "Target Amount";
            case "fxRate":
                return "FX Rate";
            case "fxTradeDate":
                return "FX Conversion Date";
            case "timestamp":
                return "Created";
            case "direction":
                return "Direction";
            case "transactionStatus":
                return "Transaction Status";
            case "creditorLEIStatus":
                return "Creditor FI LEI Status";
            case "debitorLEIStatus":
                return "Debitor FI LEI Status";
            case "debitorNetwork":
                return "Debitor Network";
            case "creditorNetwork":
                return "Creditor Network";
            case "debitorWallet":
                return "Debitor Wallet";
            case "creditorWallet":
                return "Creditor Wallet";
            case "blckchnDetails.network":
                return "Blockchain Network";
            case "blckchnDetails.txId":
                return "Blockchain TxId";
            case "blckchnDetails.token":
                return "Blockchain Token";
            case "blckchnTransactionValidationStatus":
                return "Blockchain Validation Status";
            default:
                return col;
        }
    };

    return (
        <div className="pro-tab-root">
            <header className="pro-tab-header"
                    style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <h2>
                    Digital Payment Status{" "}
                    <span className="pro-tab-count">({sortedData.length})</span>
                </h2>
                <button
                    onClick={() => setSettingsOpen(true)}
                    style={{background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#1976d2"}}
                    title="Settings"
                >
                    <FiSettings/>
                </button>
            </header>
            <section className="pro-tab-cols">
                <div className="pro-tab-cols-title" style={{display: "flex", alignItems: "center", gap: 16}}>
                    <span style={{display: "flex", alignItems: "center", fontWeight: 600, color: "#1976d2"}}>
                        <FiColumns style={{marginRight: 6}}/>
                        Columns
                    </span>
                    <div className="pro-tab-actions" style={{display: "flex", gap: 8}}>
                        <button onClick={handleSelectAll} className="pro-btn"
                                style={{fontSize: 14, padding: "4px 14px"}}>
                            Select all
                        </button>
                        <button onClick={handleDeselectAll} className="pro-btn"
                                style={{fontSize: 14, padding: "4px 14px"}}>
                            Deselect all
                        </button>
                    </div>
                </div>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="columns" direction="horizontal">
                        {provided => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="pro-tab-cols-list">
                                {LEADING_COLS.map(col => (
                                    <label key={col} className="pro-tab-col pro-tab-col--fixed"
                                           style={{background: "#e3f2fd", fontWeight: 600}} title="Fixed Column">
                                        <span className="pro-tab-checkbox"><FiCheckSquare/></span>
                                        {getColLabel(col)}
                                    </label>
                                ))}
                                {FIXED_COLS.map(col => (
                                    <label key={col} className="pro-tab-col pro-tab-col--fixed"
                                           style={{background: "#e3f2fd", fontWeight: 600}} title="Fixed Column">
                                        <span className="pro-tab-checkbox"><FiCheckSquare/></span>
                                        {getColLabel(col)}
                                    </label>
                                ))}
                                {draggableCols.map((col, idx) => (
                                    <Draggable key={col} draggableId={col} index={idx}>
                                        {provided => (
                                            <label
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="pro-tab-col pro-tab-col--active"
                                                title="Hide or move column"
                                            >
                                                <input type="checkbox" checked={true} onChange={() => handleToggle(col)}
                                                       style={{display: "none"}}/>
                                                <span className="pro-tab-checkbox"><FiCheckSquare/></span>
                                                {getColLabel(col)}
                                                <span className="pro-tab-drag" {...provided.dragHandleProps}>⠿</span>
                                            </label>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {DEFAULT_COLS
                                    .filter(col => !visibleCols.includes(col) && !LEADING_COLS.includes(col) && !FIXED_COLS.includes(col))
                                    .map(col => (
                                        <label key={col} className="pro-tab-col pro-tab-col--inactive"
                                               title="Add column">
                                            <input type="checkbox" checked={false} onChange={() => handleToggle(col)}
                                                   style={{display: "none"}}/>
                                            <span className="pro-tab-checkbox"><FiSquare/></span>
                                            {getColLabel(col)}
                                        </label>
                                    ))}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </section>
            <div className="pro-tab-table-wrap">
                <table className="pro-tab-table">
                    <thead>
                    <tr>
                        {visibleCols.map(col => (
                            <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className={sortCol === col ? "pro-tab-th--active" : ""}
                                title="Sort"
                            >
                                {getColLabel(col)}
                                {sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {sortedData.map((row, idx) => (
                        <tr key={idx} onClick={() => setSelectedRow(row)} style={{cursor: "pointer"}}>
                            {visibleCols.map(col => (
                                <td
                                    key={col}
                                    style={
                                        col === "conversion"
                                            ? {whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}
                                            : col === "transactionStatus"
                                                ? {
                                                    background: row[col] === "COMPLETED" ? "#e8f5e9" : "#ffebee",
                                                    color: row[col] === "COMPLETED" ? "#388e3c" : "#c62828",
                                                    fontWeight: 600
                                                }
                                                : col === "creditorLEIStatus" || col === "debitorLEIStatus"
                                                    ? {color: getStatusColor(row[col]), fontWeight: 600}
                                                    : col === "blckchnTransactionValidationStatus"
                                                        ? {
                                                            color: row[col] === "VALIDATED" ? "#43a047" : "#e53935",
                                                            fontWeight: 600
                                                        }
                                                        : undefined
                                    }
                                >
                                    {col === "conversion"
                                        ? formatConversion(row)
                                        : col === "fxTradeDate"
                                            ? formatFxTradeDate(row[col])
                                            : col === "timestamp"
                                                ? formatTimestamp(row[col])
                                                : col.startsWith("blckchnDetails.")
                                                    ? row.blckchnDetails?.[col.split(".")[1]] ?? ""
                                                    : row[col] ?? ""}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {selectedRow && (
                <div
                    className="pro-modal-overlay"
                    onClick={() => setSelectedRow(null)}
                    style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(0,0,0,0.25)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    <div
                        className="pro-modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: 12,
                            boxShadow: "0 4px 24px rgba(25,118,210,0.18)",
                            padding: 32,
                            minWidth: 400,
                            maxWidth: "40vw",
                            maxHeight: "80vh",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <div className="pro-modal-header">
                            <div>
                                <div className="pro-modal-title">Payment details</div>
                                <div style={{fontSize: 15, color: "#1976d2", marginTop: 2}}>
                                    <b>Message ID:</b> {selectedRow.messageId}
                                </div>
                            </div>
                            <button
                                className="pro-modal-close"
                                onClick={() => setSelectedRow(null)}
                                title="Close"
                            >×
                            </button>
                        </div>
                        <div
                            className="pro-modal-body"
                            style={{
                                display: "flex",
                                gap: 32,
                                flex: 1,
                                minWidth: 0,
                                maxHeight: "60vh",
                                overflowY: "auto"
                            }}
                        >
                            <div style={{flex: 1, minWidth: 0}}>
                                <h3>Audit Trail</h3>
                                <ul style={{paddingLeft: 16}}>
                                    {(selectedRow.auditTrail || []).map((entry, i) => (
                                        <li key={i} style={{marginBottom: 8}}>
                                            <b>{entry.action}</b>
                                            <br/>
                                            <span style={{color: "#888", fontSize: 12}}>
                                    {formatTimestamp(entry.timestamp)}
                                </span>
                                            <br/>
                                            {entry.details && entry.details.includes("Verification status:") ? (
                                                entry.details.split(/(FAILED|VERIFIED)/).map((part, idx) =>
                                                        part === "FAILED" || part === "VERIFIED" ? (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    color: getStatusColor(part),
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                {part}
                                            </span>
                                                        ) : part
                                                )
                                            ) : (
                                                <span>{entry.details}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div style={{flex: 2, minWidth: 0}}>
                                <h3>Payload</h3>
                                <div style={{display: "flex", gap: 8, marginBottom: 12}}>
                                    <button
                                        onClick={() => setActivePayloadTab("pacs")}
                                        style={{
                                            padding: "6px 18px",
                                            borderRadius: 6,
                                            border: activePayloadTab === "pacs" ? "2px solid #1976d2" : "1px solid #ccc",
                                            background: activePayloadTab === "pacs" ? "#e3f2fd" : "#f5f5f5",
                                            color: "#1976d2",
                                            fontWeight: activePayloadTab === "pacs" ? 700 : 400,
                                            cursor: "pointer"
                                        }}
                                    >
                                        {xmlType}
                                    </button>
                                    <button
                                        onClick={() => setActivePayloadTab("fxtr")}
                                        style={{
                                            padding: "6px 18px",
                                            borderRadius: 6,
                                            border: activePayloadTab === "fxtr" ? "2px solid #1976d2" : "1px solid #ccc",
                                            background: activePayloadTab === "fxtr" ? "#e3f2fd" : "#f5f5f5",
                                            color: "#1976d2",
                                            fontWeight: activePayloadTab === "fxtr" ? 700 : 400,
                                            cursor: "pointer"
                                        }}
                                    >
                                        fxtr.014
                                    </button>
                                </div>
                                <div
                                    style={{
                                        background: "#f5f5f5",
                                        padding: 16,
                                        borderRadius: 4,
                                        maxHeight: 400,
                                        minHeight: 200,
                                        overflowY: "auto",
                                        fontSize: 14,
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    <SyntaxHighlighter
                                        language="xml"
                                        wrapLongLines={true}
                                        preTag="pre"
                                        customStyle={{background: "transparent", margin: 0, padding: 0}}
                                    >
                                        {activePayloadTab === "pacs"
                                            ? formatXml(decodeBase64(selectedRow.payload))
                                            : formatXml(decodeBase64(selectedRow.fxtrPayload))}
                                    </SyntaxHighlighter>
                                </div>
                                <button
                                    onClick={() => {
                                        const text = activePayloadTab === "pacs"
                                            ? formatXml(decodeBase64(selectedRow.payload))
                                            : formatXml(decodeBase64(selectedRow.fxtrPayload));
                                        navigator.clipboard.writeText(text);
                                        setCopySuccess(true);
                                        setTimeout(() => setCopySuccess(false), 2000);
                                    }}
                                    style={{
                                        marginTop: 16,
                                        background: "#f5f5f5",
                                        border: "1px solid #ccc",
                                        borderRadius: 6,
                                        padding: "6px 18px",
                                        fontSize: 15,
                                        cursor: "pointer",
                                        color: "#333",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                                    }}
                                    title="Copy Payload"
                                >
                                    Copy
                                </button>
                                {copySuccess && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            color: "#1976d2",
                                            fontSize: 14,
                                            background: "#e3f2fd",
                                            borderRadius: 4,
                                            padding: "4px 12px",
                                            display: "inline-block"
                                        }}
                                    >
                                        Payload copied to clipboard
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {settingsOpen && (
                <div
                    className="pro-modal-overlay"
                    onClick={() => setSettingsOpen(false)}
                    style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(0,0,0,0.25)", zIndex: 10000,
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                >
                    <div
                        className="pro-modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: 16,
                            boxShadow: "0 8px 32px rgba(25,118,210,0.18)",
                            padding: 32,
                            minWidth: 260,
                            maxWidth: 360,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch"
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 18
                        }}>
                            <div style={{fontWeight: 700, fontSize: 20, color: "#1976d2", letterSpacing: 0.5}}>
                                Settings
                            </div>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                style={{
                                    fontSize: 26,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#888",
                                    lineHeight: 1
                                }}
                                title="Close"
                            >×
                            </button>
                        </div>
                        <div style={{marginBottom: 24}}>
                            <label style={{fontWeight: 500, fontSize: 16, color: "#333"}}>
                                Fetch interval (seconds):
                                <input
                                    type="number"
                                    min={1}
                                    value={fetchInterval}
                                    onChange={e => setFetchInterval(Number(e.target.value))}
                                    style={{
                                        width: 80,
                                        marginLeft: 12,
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        border: "1px solid #bdbdbd",
                                        fontSize: 16
                                    }}
                                />
                            </label>
                        </div>
                        <div style={{display: "flex", justifyContent: "flex-end"}}>
                            <button
                                onClick={() => setSettingsOpen(false)}
                                style={{
                                    background: "#1976d2",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "8px 28px",
                                    fontWeight: 600,
                                    fontSize: 16,
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(25,118,210,0.08)"
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}