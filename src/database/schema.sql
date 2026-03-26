-- ═══════════════════════════════════════════════════════════════════════════
-- PixFrame Workspace – SQLite Schema v1.0
-- ═══════════════════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- ─── Metadaten ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _meta (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);
INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO _meta (key, value) VALUES ('created_at', datetime('now'));

-- ─── Nummernkreise ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counters (
    type    TEXT PRIMARY KEY,
    value   INTEGER NOT NULL DEFAULT 0
);

-- ─── Kunden ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id               TEXT PRIMARY KEY,
    customer_number  TEXT NOT NULL UNIQUE,
    salutation       TEXT NOT NULL DEFAULT '',
    title            TEXT NOT NULL DEFAULT '',
    first_name       TEXT NOT NULL,
    last_name        TEXT NOT NULL,
    company          TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL,
    phone            TEXT NOT NULL DEFAULT '',
    street           TEXT NOT NULL DEFAULT '',
    house_number     TEXT NOT NULL DEFAULT '',
    zip_code         TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    vat_id           TEXT NOT NULL DEFAULT '',
    folder_path      TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_name   ON customers(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_email  ON customers(email);

-- ─── Lieferanten ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id               TEXT PRIMARY KEY,
    supplier_number  TEXT NOT NULL UNIQUE,
    company          TEXT NOT NULL DEFAULT '',
    contact_person   TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    street           TEXT NOT NULL DEFAULT '',
    zip_code         TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    country          TEXT NOT NULL DEFAULT 'Deutschland',
    vat_id           TEXT NOT NULL DEFAULT '',
    tax_number       TEXT NOT NULL DEFAULT '',
    iban             TEXT NOT NULL DEFAULT '',
    bic              TEXT NOT NULL DEFAULT '',
    bank_name        TEXT NOT NULL DEFAULT '',
    website          TEXT NOT NULL DEFAULT '',
    category         TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Artikel / Leistungen ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
    id           TEXT PRIMARY KEY,
    number       TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    unit         TEXT NOT NULL DEFAULT 'Stück',
    price_net    REAL NOT NULL DEFAULT 0,
    tax_rate     REAL NOT NULL DEFAULT 0,
    category     TEXT NOT NULL DEFAULT '',
    active       INTEGER NOT NULL DEFAULT 1,
    auto_from_nr INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_active   ON articles(active);

-- ─── Projekte ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id                  TEXT PRIMARY KEY,
    customer_id         TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    project_name        TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'Anfrage',
    booking             TEXT,
    booking_time        TEXT NOT NULL DEFAULT '00:00',
    booking_duration    TEXT NOT NULL DEFAULT '',
    booking_label       TEXT NOT NULL DEFAULT '',
    booking_info        TEXT NOT NULL DEFAULT '',
    location            TEXT NOT NULL DEFAULT '',
    fotografie          INTEGER NOT NULL DEFAULT 0,
    videografie         INTEGER NOT NULL DEFAULT 0,
    glueckwunschkarten  INTEGER NOT NULL DEFAULT 0,
    getting_ready       INTEGER NOT NULL DEFAULT 0,
    getting_ready_er    INTEGER NOT NULL DEFAULT 0,
    getting_ready_sie   INTEGER NOT NULL DEFAULT 0,
    getting_ready_beide INTEGER NOT NULL DEFAULT 0,
    budget_amount       REAL NOT NULL DEFAULT 0,
    budget_currency     TEXT NOT NULL DEFAULT 'EUR',
    notes               TEXT NOT NULL DEFAULT '',
    project_folder_path TEXT NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    delivery_date       TEXT,
    inquiry_date        TEXT,
    contract_data       TEXT NOT NULL DEFAULT '{}',
    contract_status     TEXT NOT NULL DEFAULT 'Entwurf',
    contract_addenda    TEXT NOT NULL DEFAULT '[]',
    signed_contracts    TEXT NOT NULL DEFAULT '[]',
    consultation_required       INTEGER,
    consultation_date           TEXT,
    consultation_notes          TEXT NOT NULL DEFAULT '',
    consultation_client_accepted INTEGER,
    skip_quote          INTEGER NOT NULL DEFAULT 1,
    anfrage_snapshot    TEXT NOT NULL DEFAULT '{}',
    customer_photo      TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status   ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_booking  ON projects(booking);

-- ─── Projekt: Shooting-Termine (1:N) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_shooting_dates (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    time        TEXT NOT NULL DEFAULT '00:00',
    label       TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_shooting_project ON project_shooting_dates(project_id);

-- ─── Projekt: Locations (1:N) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_locations (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_locations_project ON project_locations(project_id);

-- ─── Projekt: Team-Mitglieder (1:N) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_team (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_team_project ON project_team(project_id);

-- ─── Dokumente ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id               TEXT PRIMARY KEY,
    project_id       TEXT REFERENCES projects(id) ON DELETE SET NULL,
    customer_id      TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    type             TEXT NOT NULL,
    doc_subtype      TEXT,
    name             TEXT NOT NULL,
    document_number  TEXT,
    version          INTEGER NOT NULL DEFAULT 1,
    parent_id        TEXT,
    superseded_by    TEXT,
    is_deposit       INTEGER NOT NULL DEFAULT 0,
    quote_id         TEXT,
    correction_of    TEXT,
    issue_date       TEXT,
    service_date     TEXT,
    due_date         TEXT,
    delivery_date    TEXT,
    billing_address  TEXT NOT NULL DEFAULT '{}',
    subtotal         REAL NOT NULL DEFAULT 0,
    tax_groups       TEXT NOT NULL DEFAULT '[]',
    total            REAL NOT NULL DEFAULT 0,
    discount         REAL NOT NULL DEFAULT 0,
    intro            TEXT NOT NULL DEFAULT '',
    footer           TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    payment_terms    TEXT NOT NULL DEFAULT '',
    payment_info     TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'Entwurf',
    paid_at          TEXT,
    payment_method   TEXT,
    file_path        TEXT,
    file_size        INTEGER NOT NULL DEFAULT 0,
    file_mime_type   TEXT NOT NULL DEFAULT '',
    uploaded_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at       TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_project    ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer   ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_type       ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status     ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_number     ON documents(document_number);

-- ─── Dokument: Positionen (1:N) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_line_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    article_id   TEXT,
    description  TEXT NOT NULL DEFAULT '',
    detail       TEXT NOT NULL DEFAULT '',
    quantity     REAL NOT NULL DEFAULT 0,
    unit         TEXT NOT NULL DEFAULT 'Stück',
    price_net    REAL NOT NULL DEFAULT 0,
    tax_rate     REAL NOT NULL DEFAULT 0,
    discount     REAL NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_line_items_doc ON document_line_items(document_id);

-- ─── FiBu: Ausgaben ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id              TEXT PRIMARY KEY,
    date            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'Sonstiges',
    description     TEXT NOT NULL DEFAULT '',
    invoice_number  TEXT NOT NULL DEFAULT '',
    amount          REAL NOT NULL DEFAULT 0,
    tax_rate        REAL NOT NULL DEFAULT 0,
    vendor          TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    receipt_path    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- ─── FiBu: Fahrtenbuch ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mileage (
    id              TEXT PRIMARY KEY,
    date            TEXT NOT NULL,
    customer_id     TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name   TEXT NOT NULL DEFAULT '',
    project_id      TEXT REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number  TEXT NOT NULL DEFAULT '',
    destination     TEXT NOT NULL DEFAULT '',
    purpose         TEXT NOT NULL DEFAULT '',
    km              REAL NOT NULL DEFAULT 0,
    source          TEXT NOT NULL DEFAULT 'manual',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_mileage_date ON mileage(date);

-- ─── FiBu: Eingangsrechnungen ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_invoices (
    id              TEXT PRIMARY KEY,
    date            TEXT NOT NULL,
    vendor          TEXT NOT NULL DEFAULT '',
    invoice_number  TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'Sonstiges',
    description     TEXT NOT NULL DEFAULT '',
    amount_net      REAL NOT NULL DEFAULT 0,
    tax_rate        REAL NOT NULL DEFAULT 0,
    amount_gross    REAL NOT NULL DEFAULT 0,
    payment_status  TEXT NOT NULL DEFAULT 'Offen',
    paid_at         TEXT,
    payment_method  TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    receipt_path    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_ext_inv_date ON external_invoices(date);

-- ─── Einstellungen ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Feiertage / Ferien Cache ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holiday_cache (
    id         TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
