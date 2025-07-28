package com.db.swift.dfx.service.dto.gleif;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LegalName {
    private String name;
    private String language;
}
