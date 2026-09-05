package com.dice.integration.odoo;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Translates Odoo's loosely-typed JSON into the values DICE needs.
 *
 * <p>Odoo is generous with its shapes: a many2one comes back as
 * {@code [id, "display name"]} but as {@code false} when unset, numbers arrive
 * as ints or floats interchangeably, and missing is indistinguishable from
 * false. Every accessor here is defensive on purpose — a malformed webhook
 * should degrade, not throw.
 */
@Component
@Slf4j
public class OdooMapper {

    /** Odoo encodes "no value" as boolean false rather than null. */
    private static boolean isUnset(Object value) {
        return value == null || Boolean.FALSE.equals(value);
    }

    public Optional<Long> longValue(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (isUnset(value)) {
            return Optional.empty();
        }
        if (value instanceof Number number) {
            return Optional.of(number.longValue());
        }
        try {
            return Optional.of(Long.parseLong(value.toString()));
        } catch (NumberFormatException e) {
            log.debug("Could not read {} as a long: {}", key, value);
            return Optional.empty();
        }
    }

    public Optional<Integer> intValue(Map<String, Object> source, String key) {
        return longValue(source, key).map(Long::intValue);
    }

    public Optional<BigDecimal> decimalValue(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (isUnset(value)) {
            return Optional.empty();
        }
        if (value instanceof Number number) {
            // Via toString so a double's binary representation doesn't leak into money.
            return Optional.of(new BigDecimal(number.toString()));
        }
        try {
            return Optional.of(new BigDecimal(value.toString()));
        } catch (NumberFormatException e) {
            log.debug("Could not read {} as a decimal: {}", key, value);
            return Optional.empty();
        }
    }

    public Optional<String> stringValue(Map<String, Object> source, String key) {
        Object value = source.get(key);
        return isUnset(value) ? Optional.empty() : Optional.of(value.toString());
    }

    /** Extracts the id from a many2one field, i.e. the {@code 42} in {@code [42, "Acme"]}. */
    public Optional<Long> relationId(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (isUnset(value)) {
            return Optional.empty();
        }
        if (value instanceof List<?> pair && !pair.isEmpty() && pair.get(0) instanceof Number id) {
            return Optional.of(id.longValue());
        }
        // A plain id is also valid when the record was read without display names.
        return longValue(source, key);
    }

    /** Extracts the display name from a many2one field. */
    public Optional<String> relationName(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof List<?> pair && pair.size() > 1) {
            return Optional.ofNullable(pair.get(1)).map(Object::toString);
        }
        return Optional.empty();
    }

    /** Reads the nested payload of a webhook envelope. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> nested(Map<String, Object> source, String key) {
        Object value = source.get(key);
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> nestedList(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
        }
        return List.of();
    }
}
