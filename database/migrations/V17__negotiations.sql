-- Negotiation threads: a customer counter-offer creates a new, immutable
-- NegotiationVersion rather than overwriting the deal's commercial history.

CREATE TABLE negotiations (
    id          UUID PRIMARY KEY,
    deal_id     UUID NOT NULL UNIQUE REFERENCES deals (id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_negotiations_customer ON negotiations (customer_id);

CREATE TABLE negotiation_versions (
    id               UUID PRIMARY KEY,
    negotiation_id   UUID           NOT NULL REFERENCES negotiations (id) ON DELETE CASCADE,
    version_number   INTEGER        NOT NULL,
    status           VARCHAR(16)    NOT NULL CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ACCEPTED', 'REJECTED')),
    discount_percent NUMERIC(7, 4)  NOT NULL,
    subtotal         NUMERIC(18, 2) NOT NULL,
    total_amount     NUMERIC(18, 2) NOT NULL,
    margin_percent   NUMERIC(7, 4),
    created_by       VARCHAR(128)   NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (negotiation_id, version_number)
);

CREATE INDEX idx_negotiation_versions_negotiation ON negotiation_versions (negotiation_id);

CREATE TABLE negotiation_version_items (
    id               UUID PRIMARY KEY,
    version_id       UUID           NOT NULL REFERENCES negotiation_versions (id) ON DELETE CASCADE,
    product_sku      VARCHAR(64)    NOT NULL,
    product_name     VARCHAR(255)   NOT NULL,
    quantity         INTEGER        NOT NULL,
    unit_price       NUMERIC(18, 2) NOT NULL,
    discount_percent NUMERIC(7, 4)  NOT NULL,
    line_total       NUMERIC(18, 2) NOT NULL
);

CREATE INDEX idx_negotiation_version_items_version ON negotiation_version_items (version_id);

CREATE TABLE negotiation_messages (
    id                    UUID PRIMARY KEY,
    negotiation_id        UUID        NOT NULL REFERENCES negotiations (id) ON DELETE CASCADE,
    negotiation_version_id UUID       REFERENCES negotiation_versions (id),
    deal_line_id          UUID        REFERENCES deal_lines (id),
    author                VARCHAR(128) NOT NULL,
    author_role           VARCHAR(16)  NOT NULL,
    content               TEXT         NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_negotiation_messages_negotiation ON negotiation_messages (negotiation_id);
