import React, {useEffect, useState} from "react";
import {XMLParser} from "fast-xml-parser";

const xsdFiles = [
    "pacs.002.001.12.xsd",
    "pacs.002.001.15.xsd",
    "pacs.003.001.11.xsd",
    "pacs.004.001.14.xsd",
    "pacs.007.001.13.xsd",
    "pacs.008.001.13.xsd",
    "pacs.009.001.12.xsd",
    "pacs.010.001.06.xsd",
    "pacs.028.001.06.xsd",
    "pacs.029.001.02.xsd"
];

export default function XsdViewer() {
    const [selectedFile, setSelectedFile] = useState(xsdFiles[0]);
    const [types, setTypes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchXsd() {
            setError(null);
            try {
                const res = await fetch(`/pacs/${selectedFile}`);
                const xsdText = await res.text();
                const parser = new XMLParser({ignoreAttributes: false});
                const xsdObj = parser.parse(xsdText);

                const schema = xsdObj["xs:schema"];
                let complexTypes = schema?.["xs:complexType"];
                if (!complexTypes) {
                    setError("No xs:complexType found.");
                    setTypes([]);
                    return;
                }
                if (!Array.isArray(complexTypes)) complexTypes = [complexTypes];

                const types = complexTypes.map(ct => {
                    const name = ct["@_name"];
                    let fields = [];
                    if (ct["xs:sequence"] && ct["xs:sequence"]["xs:element"]) {
                        let elements = ct["xs:sequence"]["xs:element"];
                        if (!Array.isArray(elements)) elements = [elements];
                        fields = elements.map(e => e["@_name"] || e["@_ref"]);
                    }
                    if (ct["xs:choice"] && ct["xs:choice"]["xs:element"]) {
                        let elements = ct["xs:choice"]["xs:element"];
                        if (!Array.isArray(elements)) elements = [elements];
                        fields = fields.concat(elements.map(e => e["@_name"] || e["@_ref"]));
                    }
                    return {name, fields};
                });
                setTypes(types);
            } catch (err) {
                setError("Error while parsing XSD.");
                setTypes([]);
            }
        }

        fetchXsd();
    }, [selectedFile]);

    return (
        <div>
            <h2>XSD Structure</h2>
            <a href="https://www.iso20022.org/iso-20022-message-definitions">ISO20022 Message Definitions</a>
            <br></br>
            <label>
                XSD-File:&nbsp;
                <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)}>
                    {xsdFiles.map(file => (
                        <option key={file} value={file}>{file}</option>
                    ))}
                </select>
            </label>
            {error && <div style={{color: "red"}}>{error}</div>}
            <ul>
                {types.map((type, idx) => (
                    <li key={idx}>
                        <strong>{type.name}</strong>
                        {type.fields.length > 0 && (
                            <ul>
                                {type.fields.map((field, fIdx) => (
                                    <li key={fIdx}>{field}</li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}