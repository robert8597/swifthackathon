package com.db.swift.dfx.service.dto.gleif;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Represents the "attributes" object of an LEI record.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LeiAttributes {
    private LeiEntity entity;
    private List<String> bic;
}