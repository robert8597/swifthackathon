package com.db.swift.dfx.service.dto.gleif;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Represents the top-level structure of the GLEIF API response.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GleifApiResponse {
    private LeiRecord data;
}