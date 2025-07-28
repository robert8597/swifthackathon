import React, {useState, useEffect} from "react";
import {FiColumns} from "react-icons/fi";

export default function ConverterTab() {
    const [rates, setRates] = useState({});
    const [currencies, setCurrencies] = useState([]);
    const [amount, setAmount] = useState("");
    const [fromCurrency, setFromCurrency] = useState("");
    const [toCurrency, setToCurrency] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    // Load exchange rates on mount
    useEffect(() => {
        setLoading(true);
        fetch("http://localhost:8080/rates")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch rates");
                return res.json();
            })
            .then(data => {
                setRates(data);
                const currs = Object.keys(data);
                setCurrencies(currs);
                setFromCurrency(currs[0] || "");
                setToCurrency(currs[1] || "");
                setLoading(false);
            })
            .catch(e => {
                setError("Error loading rates: " + e.message);
                setLoading(false);
            });
    }, []);

    // Calculate conversion result
    let result = "";
    let localError = "";
    let currentRate = "";

    if (!loading && currencies.length >= 2 && fromCurrency && toCurrency) {
        if (!amount || isNaN(amount)) {
            result = "";
        } else if (fromCurrency === toCurrency) {
            result = amount;
            currentRate = "1";
        } else {
            const rate = rates?.[fromCurrency]?.[toCurrency];
            if (!rate) {
                localError = "No exchange rate available.";
                result = "";
            } else {
                result = (parseFloat(amount) * rate).toFixed(8).replace(/\.?0+$/, "");
                currentRate = rate;
            }
        }
    }

    useEffect(() => {
        setError(localError);
    }, [amount, fromCurrency, toCurrency, loading]);

    const inputStyle = {
        width: 120,
        fontSize: 16,
        padding: 8,
        borderRadius: 6,
        border: "1px solid #bfc8d2",
        background: "#fff",
        color: "#222",
        outline: "none"
    };

    const selectStyle = {
        fontSize: 16,
        padding: 8,
        borderRadius: 6,
        border: "1px solid #bfc8d2",
        background: "#fff",
        color: "#222",
        outline: "none"
    };

    const resultStyle = {
        width: 160,
        fontSize: 16,
        padding: 8,
        borderRadius: 6,
        border: "1px solid #bfc8d2",
        background: "#f5f7fa",
        color: "#222",
        outline: "none"
    };

    if (loading) {
        return (
            <div className="pro-tab-root">
                <header className="pro-tab-header">
                    <h2>Converter</h2>
                </header>
                <div style={{padding: 32, textAlign: "center"}}>
                    Loading rates...
                </div>
            </div>
        );
    }

    if (!currencies || currencies.length < 2 || !rates) {
        return (
            <div className="pro-tab-root">
                <header className="pro-tab-header">
                    <h2>Converter</h2>
                </header>
                <div style={{padding: 32, textAlign: "center"}}>
                    No rates available.
                </div>
            </div>
        );
    }

    return (
        <div className="pro-tab-root">
            <header className="pro-tab-header">
                <h2>
                    Converter <span className="pro-tab-count"></span>
                </h2>
            </header>
            <section className="pro-tab-cols">
                <div className="pro-tab-cols-title" style={{marginBottom: 24}}>
                    <span style={{display: "flex", alignItems: "center", fontWeight: 600, color: "#1976d2"}}>
                        <FiColumns style={{marginRight: 6}}/>
                        Digital & Fiat Currency Converter
                    </span>
                </div>
            </section>
            <div className="pro-tab-table-wrap"
                 style={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200}}>
                <div style={{display: "flex", alignItems: "center", gap: 16}}>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Amount"
                        style={inputStyle}
                        min="0"
                    />
                    <select
                        value={fromCurrency}
                        onChange={e => setFromCurrency(e.target.value)}
                        style={selectStyle}
                    >
                        {currencies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleSwap}
                        style={{
                            fontSize: 22,
                            color: "#1976d2",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0
                        }}
                        title="Swap currencies"
                    >
                        →
                    </button>
                    <select
                        value={toCurrency}
                        onChange={e => setToCurrency(e.target.value)}
                        style={selectStyle}
                    >
                        {currencies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={result}
                        readOnly
                        placeholder="Result"
                        style={resultStyle}
                    />
                </div>
            </div>
            {fromCurrency && toCurrency && fromCurrency !== toCurrency && currentRate && (
                <div style={{textAlign: "center", marginTop: 12, color: "#1976d2", fontSize: 16}}>
                    Rate: 1 {fromCurrency} = {currentRate} {toCurrency}
                </div>
            )}
            {error && <div style={{color: "#d32f2f", textAlign: "center", marginTop: 12}}>{error}</div>}
        </div>
    );
}