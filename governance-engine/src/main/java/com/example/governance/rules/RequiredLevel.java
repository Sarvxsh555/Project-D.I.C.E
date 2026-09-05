package com.example.governance.rules;

/** Ordered so the highest ordinal always wins when multiple rules fire. */
public enum RequiredLevel {
    NONE, SALES_MANAGER, FINANCE;

    public static RequiredLevel fromAdminLabel(String label) {
        if (label == null) return NONE;
        return switch (label.trim().toLowerCase()) {
            case "finance" -> FINANCE;
            case "sales manager" -> SALES_MANAGER;
            default -> NONE;
        };
    }

    public static RequiredLevel highestOf(RequiredLevel a, RequiredLevel b) {
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
