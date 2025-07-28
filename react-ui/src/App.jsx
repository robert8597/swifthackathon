import React, {useEffect, useState} from "react";
import ratesJson from "./resources/rates.json";
import PaymentTab from "./tabs/PaymentTab";
import ConverterTab from "./tabs/ConverterTab";
import PaymentStatusTab from "./tabs/PaymentStatusTab";
import ConversionRatesTab from "./tabs/ConversionRatesTab";
import XsdViewer from "./tabs/XsdViewer.jsx";
import ProTabs from "./tabs/ProTabs";

const tabs = [
    {key: 0, label: "Initiate Payment"},
    {key: 1, label: "Converter"},
    {key: 2, label: "Digital Payment Status"},
    {key: 3, label: "Conversion Rates"},
    {key: 4, label: "XsdViewer"}
];


export default function App() {
    const [activeTab, setActiveTab] = useState(2);
    const [rates, setRates] = useState(() => {
        const saved = localStorage.getItem("rates");
        return saved ? JSON.parse(saved) : ratesJson;
    });


    return (
        <div style={{
            background: "white",
            color: "black",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column"
        }}>
            <ProTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
            <div style={{flex: 1, display: "flex"}}>
                {activeTab === 0 && <PaymentTab/>}
                {activeTab === 1 && <ConverterTab rates={rates}/>}
                {activeTab === 2 && <PaymentStatusTab/>}
                {activeTab === 3 && <ConversionRatesTab rates={rates} setRates={setRates}/>}
                {activeTab === 4 && <XsdViewer/>}
            </div>
        </div>
    );
}