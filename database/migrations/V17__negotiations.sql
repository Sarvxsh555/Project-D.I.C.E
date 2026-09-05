-- Negotiation threads: a customer counter-offer creates a new, immutable
-- NegotiationVersion rather than overwriting the deal's commercial history.

CREATE TABLE negotiations (
    id          CHAR(36) PRIMARY KEY,
    deal_id     CHAR(36) NOT NULL UNIQUE,
    customer_id CHAR(36) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_negotiations_deal FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
    CONSTRAINT fk_negotiations_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX idx_negotiations_customer ON negotiations (customer_id);

CREATE TABLE negotiation_versions (
    id               CHAR(36)       PRIMARY KEY,
    negotiation_id   CHAR(36)       NOT NULL,
    version_number   INTEGER        NOT NULL,
    status           VARCHAR(16)    NOT NULL CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ACCEPTED', 'REJECTED')),
    discount_percent NUMERIC(7, 4)  NOT NULL,
    subtotal         NUMERIC(18, 2) NOT NULL,
    total_amount     NUMERIC(18, 2) NOT NULL,
    margin_percent   NUMERIC(7, 4),
    created_by       VARCHAR(128)   NOT NULL,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (negotiation_id, version_number),

    CONSTRAINT fk_negotiation_versions_negotiation FOREIGN KEY (negotiation_id) REFERENCES negotiations (id) ON DELETE CASCADE
);

CREATE INDEX idx_negotiation_versions_negotiation ON negotiation_versions (negotiation_id);

CREATE TABLE negotiation_version_items (
    id               CHAR(36)       PRIMARY KEY,
    version_id       CHAR(36)       NOT NULL,
    product_sku      VARCHAR(64)    NOT NULL,
    product_name     VARCHAR(255)   NOT NULL,
    quantity         INTEGER        NOT NULL,
    unit_price       NUMERIC(18, 2) NOT NULL,
    discount_percent NUMERIC(7, 4)  NOT NULL,
    line_total       NUMERIC(18, 2) NOT NULL,

    CONSTRAINT fk_negotiation_version_items_version FOREIGN KEY (version_id) REFERENCES negotiation_versions (id) ON DELETE CASCADE
);

CREATE INDEX idx_negotiation_version_items_version ON negotiation_version_items (version_id);

CREATE TABLE negotiation_messages (
    id                      CHAR(36)     PRIMARY KEY,
    negotiation_id          CHAR(36)     NOT NULL,
    negotiation_version_id  CHAR(36),
    deal_line_id            CHAR(36),
    author                  VARCHAR(128) NOT NULL,
    author_role             VARCHAR(16)  NOT NULL,
    content                 TEXT         NOT NULL,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_negotiation_messages_negotiation FOREIGN KEY (negotiation_id) REFERENCES negotiations (id) ON DELETE CASCADE,
    CONSTRAINT fk_negotiation_messages_version FOREIGN KEY (negotiation_version_id) REFERENCES negotiation_versions (id),
    CONSTRAINT fk_negotiation_messages_deal_line FOREIGN KEY (deal_line_id) REFERENCES deal_lines (id)
);

CREATE INDEX idx_negotiation_messages_negotiation ON negotiation_messages (negotiation_id);
