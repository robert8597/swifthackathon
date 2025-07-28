package com.db.swift.dfx.service.dto.gleif;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Represents the "entity" object, containing the critical status field.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LeiEntity {
    private String status;
    private LegalName legalName;

}