package com.db.swift.dfx.service.utils;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import jakarta.xml.bind.Unmarshaller;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import java.io.InputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class JaxbMarshallingUtil {

    private final Map<Class<?>, JAXBContext> jaxbContextCache = new ConcurrentHashMap<>();

    // IMPROVEMENT: Centralized method to get a cached JAXBContext.
    private JAXBContext getJaxbContext(Class<?> clazz) {
        try {
            return jaxbContextCache.computeIfAbsent(clazz, key -> {
                try {
                    return JAXBContext.newInstance(key);
                } catch (JAXBException e) {
                    throw new RuntimeException("Failed to create JAXBContext for class " + key.getName(), e);
                }
            });
        } catch (RuntimeException e) {
            // Unwrap the original JAXBException if it was thrown during context creation.
            if (e.getCause() instanceof JAXBException) {
                // It's better to throw the specific checked exception if possible.
                throw new RuntimeException(e.getCause());
            }
            throw e;
        }
    }

    /**
     * Converts a JAXB-annotated Java object into a formatted XML string.
     * This method is optimized to cache JAXBContext instances for high performance.
     *
     * @param objectToMarshall The JAXB-annotated object to be marshalled.
     * @param <T>              The generic type of the source object.
     * @return A formatted XML string representation of the object.
     * @throws JAXBException if any error occurs during the marshalling process.
     */
    public <T> String marshall(T objectToMarshall) throws JAXBException {
        if (objectToMarshall == null) {
            return null;
        }

        Class<?> objectClass = objectToMarshall.getClass();
        log.debug("Marshalling object of class {}", objectClass.getSimpleName());

        try {
            JAXBContext jaxbContext = getJaxbContext(objectClass);
            Marshaller marshaller = jaxbContext.createMarshaller();
            // For pretty-printing the XML output
            marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);

            StringWriter stringWriter = new StringWriter();
            marshaller.marshal(objectToMarshall, stringWriter);

            return stringWriter.toString();
        } catch (RuntimeException e) {
            // Unwrap the original JAXBException if it was thrown during context creation.
            if (e.getCause() instanceof JAXBException) {
                throw (JAXBException) e.getCause();
            }
            throw e;
        }
    }

    /**
     * Unmarshalls an XML string into a Java object of the specified type,
     * validating it against the provided XSD schema.
     *
     * @param xmlString   The XML content to parse as a string.
     * @param targetClass The target class to convert the XML into (e.g., GETPESONETINFO.class).
     * @param xsdPath     The classpath path to the XSD file for validation (e.g., "/xsd/idms.trigger.xsd").
     * @param <T>         The generic type of the target object.
     * @return An object of type T containing the data from the XML.
     * @throws JAXBException if an error occurs during unmarshalling.
     * @throws SAXException  if an error occurs during schema validation.
     */
    public <T> T unmarshall(String xmlString, Class<T> targetClass, String xsdPath) throws JAXBException, SAXException {
        log.debug("Unmarshalling XML for class {} using schema {}", targetClass.getSimpleName(), xsdPath);

        StringReader stringReader = new StringReader(xmlString);

        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        InputStream schemaStream = getClass().getResourceAsStream(xsdPath);
        if (schemaStream == null) {
            throw new IllegalStateException("Cannot find XSD schema in classpath: " + xsdPath);
        }
        Schema schema = factory.newSchema(new StreamSource(schemaStream));

        JAXBContext jaxbContext = getJaxbContext(targetClass);

        Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
        unmarshaller.setSchema(schema);

        return unmarshaller
                .unmarshal(new StreamSource(stringReader), targetClass)
                .getValue();
    }
}
