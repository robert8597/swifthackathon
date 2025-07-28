import React, {useState, useEffect} from "react";
import {FiEdit2} from "react-icons/fi";
import "../css/ConversionRatesTab.css";

export default function ConversionRatesTab() {
    const [rates, setRates] = useState({});
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch rates on mount
    useEffect(() => {
        setLoading(true);
        fetch("http://localhost:8080/rates")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch rates");
                return res.json();
            })
            .then(data => {
                setRates(data);
                setCurrencies(Object.keys(data));
                setLoading(false);
            })
            .catch(e => {
                setError("Error loading rates: " + e.message);
                setLoading(false);
            });
    }, []);

    const cellStyle = {
        width: 90,
        padding: 6,
        border: "1px solid #bfc8d2",
        background: "#fff",
        color: "#222",
        borderRadius: 4,
        textAlign: "center"
    };

    return (
        <div className="pro-tab-root">
            <header className="pro-tab-header">
                <h2>
                    Conversion Rates <span className="pro-tab-count"></span>
                </h2>
            </header>
            <section className="pro-tab-cols">
                <div className="pro-tab-cols-title" style={{marginBottom: 24}}>
                    <span style={{display: "flex", alignItems: "center", fontWeight: 600, color: "#1976d2"}}>
                        <FiEdit2 style={{marginRight: 6}}/>
                        Exchange rates
                    </span>
                </div>
            </section>
            <div className="conversion-rates-tab-pro-tab-table-wrap">
                {loading ? (
                    <div style={{textAlign: "center", margin: 32, color: "#1976d2"}}>Loading rates...</div>
                ) : (
                    <div style={{overflowX: "auto"}}>
                        <table style={{borderCollapse: "collapse", margin: "0 auto", background: "#f5f7fa"}}>
                            <thead>
                            <tr>
                                <th style={cellStyle}></th>
                                {currencies.map(to => (
                                    <th key={to} style={cellStyle}>{to}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {currencies.map(from => (
                                <tr key={from}>
                                    <td style={{...cellStyle, fontWeight: 600, background: "#f0f4f8"}}>{from}</td>
                                    {currencies.map(to => (
                                        <td key={to} style={cellStyle}>
                                            {from === to ? (
                                                "-"
                                            ) : (
                                                rates[from]?.[to] ?? ""
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {error && <div style={{color: "#d32f2f", textAlign: "center", marginTop: 12}}>{error}</div>}
            </div>
        </div>
    );
}