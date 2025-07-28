package com.db.swift.dfx.service.dto.gleif;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Represents a single LEI record within the "data" array.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LeiRecord {
    private LeiAttributes attributes;
}