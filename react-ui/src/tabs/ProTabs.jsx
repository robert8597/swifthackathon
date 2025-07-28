import React, {useState, useRef, useEffect} from "react";
import {FiMenu} from "react-icons/fi";

export default function ProTabs({tabs, activeTab, onTabChange}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const mainTabIdx = 2;
    const mainTab = tabs[mainTabIdx];

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <nav style={{
            display: "flex",
            alignItems: "center",
            background: "#f5f7fa",
            borderBottom: "1px solid #e0e0e0",
            padding: "0 32px",
            height: 56,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            position: "sticky",
            top: 0,
            zIndex: 100
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                justifyContent: "center",
                flex: 1
            }}>
                <button
                    className={activeTab === mainTab.key ? "tab-active" : "tab"}
                    onClick={() => onTabChange(mainTab.key)}
                    style={{
                        fontWeight: activeTab === mainTab.key ? 600 : 400,
                        color: activeTab === mainTab.key ? "#1976d2" : "#1976d2",
                        background: activeTab === mainTab.key ? "none" : "none",
                        border: "none",
                        borderRadius: activeTab === mainTab.key ? 8 : 0,
                        cursor: "pointer",
                        fontSize: 17,
                        padding: "0 16px",
                        height: 40,
                        transition: "background 0.2s, color 0.2s"
                    }}
                >
                    {mainTab.label}
                </button>
                <div style={{position: "relative"}}>
                    <button
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            height: 56,
                            display: "flex",
                            alignItems: "center"
                        }}
                        onClick={() => setMenuOpen(v => !v)}
                        title="Weitere Tabs"
                    >
                        <FiMenu size={22} color="#1976d2"/>
                    </button>
                    {menuOpen && (
                        <div
                            ref={menuRef}
                            style={{
                                position: "absolute",
                                top: 56,
                                left: 0,
                                background: "#fff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                                zIndex: 20,
                                minWidth: 180,
                                overflow: "hidden"
                            }}
                        >
                            {tabs
                                .filter((_, idx) => idx !== mainTabIdx)
                                .map(tab => (
                                    <div
                                        key={tab.key}
                                        style={{
                                            padding: "12px 20px",
                                            cursor: "pointer",
                                            fontWeight: activeTab === tab.key ? 600 : 400,
                                            color: activeTab === tab.key ? "#1976d2" : "#333",
                                            background: activeTab === tab.key ? "#f0f7ff" : "none",
                                            borderBottom: "1px solid #f5f5f5"
                                        }}
                                        onClick={() => {
                                            onTabChange(tab.key);
                                            setMenuOpen(false);
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f5f7fa"}
                                        onMouseLeave={e => e.currentTarget.style.background = activeTab === tab.key ? "#f0f7ff" : "none"}
                                    >
                                        {tab.label}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}