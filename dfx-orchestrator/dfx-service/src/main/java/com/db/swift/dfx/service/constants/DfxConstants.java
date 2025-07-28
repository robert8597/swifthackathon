package com.db.swift.dfx.service.constants;

import java.util.Set;
import java.util.regex.Pattern;

public final class DfxConstants {
    public static final Set<String> DIGITAL_CURRENCIES = Set.of("USDC", "USDT", "XBS", "ECNY", "DEUR");
    public static final Pattern FX_PATTERN = Pattern.compile("FX:(\\w+)/(\\w+)");
    public static final String DB_LEGAL_NAME = "DEUTSCHE BANK AKTIENGESELLSCHAFT";
}
