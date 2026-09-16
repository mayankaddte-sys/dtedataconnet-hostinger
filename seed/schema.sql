-- ============================================================
-- DTE-UP Compliance Portal — MySQL Schema for Hostinger
-- Converted from Supabase (PostgreSQL) structure
-- Charset: utf8mb4 (required for Hindi/Devanagari text)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. directorate_desks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS directorate_desks (
    id                  VARCHAR(50)   NOT NULL PRIMARY KEY,
    name                VARCHAR(500)  NOT NULL,
    code                VARCHAR(50)   NOT NULL,
    officer_in_charge   VARCHAR(255)  DEFAULT '',
    designation         VARCHAR(255)  DEFAULT NULL,
    email               VARCHAR(255)  DEFAULT NULL,
    phone               VARCHAR(50)   DEFAULT NULL,
    description         TEXT          DEFAULT NULL,
    icon_name           VARCHAR(100)  DEFAULT NULL,
    color_scheme        VARCHAR(50)   DEFAULT NULL,
    UNIQUE KEY uq_desk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. field_units
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_units (
    id                       VARCHAR(50)   NOT NULL PRIMARY KEY,
    type                     VARCHAR(20)   NOT NULL,
    name                     VARCHAR(500)  NOT NULL,
    code                     VARCHAR(50)   NOT NULL,
    zone                     VARCHAR(100)  DEFAULT NULL,
    district                 VARCHAR(100)  DEFAULT NULL,
    head_officer             VARCHAR(255)  DEFAULT '',
    designation              VARCHAR(255)  DEFAULT NULL,
    email                    VARCHAR(255)  DEFAULT NULL,
    phone                    VARCHAR(50)   DEFAULT NULL,
    address                  VARCHAR(500)  DEFAULT NULL,
    affiliated_trades_count  INT           DEFAULT NULL,
    total_seats              INT           DEFAULT NULL,
    UNIQUE KEY uq_unit_code (code),
    KEY idx_field_units_type (type),
    KEY idx_field_units_zone (zone),
    KEY idx_field_units_district (district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. app_credentials
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_credentials (
    identifier      VARCHAR(255)  NOT NULL PRIMARY KEY,
    password_hash   VARCHAR(255)  NOT NULL,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. requisitions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requisitions (
    id                                  VARCHAR(50)   NOT NULL PRIMARY KEY,
    requisition_number                 VARCHAR(100)  NOT NULL,
    title                               VARCHAR(500)  NOT NULL,
    description                         TEXT          DEFAULT NULL,
    desk_id                             VARCHAR(50)   NOT NULL,
    desk_name                           VARCHAR(500)  DEFAULT NULL,
    priority                            VARCHAR(20)   DEFAULT NULL,
    priority_label                      VARCHAR(255)  DEFAULT NULL,
    is_assembly_question                TINYINT(1)    DEFAULT 0,
    mode                                VARCHAR(50)   DEFAULT NULL,
    created_at                          DATETIME      DEFAULT CURRENT_TIMESTAMP,
    deadline                            DATETIME      DEFAULT NULL,
    is_strict_cutoff                    TINYINT(1)    DEFAULT 0,
    allow_late_submission_with_reason   TINYINT(1)    DEFAULT 0,
    target_scope                        VARCHAR(50)   DEFAULT NULL,
    target_zones                        JSON          DEFAULT NULL,
    target_districts                    JSON          DEFAULT NULL,
    target_unit_ids                     JSON          DEFAULT NULL,
    custom_fields                       JSON          DEFAULT NULL,
    google_sheet_config                 JSON          DEFAULT NULL,
    google_form_config                  JSON          DEFAULT NULL,
    forward_log                         JSON          DEFAULT NULL,
    require_officer_declaration         TINYINT(1)    DEFAULT 0,
    require_official_seal_upload        TINYINT(1)    DEFAULT 0,
    attachment_notice_doc_url           LONGTEXT      DEFAULT NULL,
    order_document_name                 VARCHAR(255)  DEFAULT NULL,
    order_document_url                  LONGTEXT      DEFAULT NULL,
    order_document_size                 INT           DEFAULT NULL,
    order_reference_number              VARCHAR(100)  DEFAULT NULL,
    order_date                          DATE          DEFAULT NULL,
    performa_file_name                  VARCHAR(255)  DEFAULT NULL,
    performa_file_url                   LONGTEXT      DEFAULT NULL,
    performa_file_size                  INT           DEFAULT NULL,
    status                              VARCHAR(30)   DEFAULT 'ACTIVE',
    UNIQUE KEY uq_requisition_number (requisition_number),
    KEY idx_req_desk (desk_id),
    KEY idx_req_status (status),
    KEY idx_req_deadline (deadline),
    CONSTRAINT fk_req_desk FOREIGN KEY (desk_id) REFERENCES directorate_desks(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. submissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id                              VARCHAR(100)  NOT NULL PRIMARY KEY,
    requisition_id                  VARCHAR(50)   NOT NULL,
    field_unit_id                   VARCHAR(50)   NOT NULL,
    field_unit_name                 VARCHAR(500)  DEFAULT NULL,
    field_unit_type                 VARCHAR(20)   DEFAULT NULL,
    field_unit_zone                 VARCHAR(100)  DEFAULT NULL,
    field_unit_district             VARCHAR(100)  DEFAULT NULL,
    submitted_at                    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    submitted_by_officer            VARCHAR(255)  DEFAULT NULL,
    officer_designation             VARCHAR(255)  DEFAULT NULL,
    officer_contact                 VARCHAR(50)   DEFAULT NULL,
    status                          VARCHAR(30)   DEFAULT 'SUBMITTED',
    is_late                         TINYINT(1)    DEFAULT 0,
    late_justification              TEXT          DEFAULT NULL,
    data                            JSON          DEFAULT NULL,
    google_sheet_submitted_url      VARCHAR(500)  DEFAULT NULL,
    google_form_response_id         VARCHAR(255)  DEFAULT NULL,
    uploaded_document_name          VARCHAR(255)  DEFAULT NULL,
    uploaded_document_url           LONGTEXT      DEFAULT NULL,
    signed_letter_dispatch_number   VARCHAR(100)  DEFAULT NULL,
    signed_letter_date              DATE          DEFAULT NULL,
    digital_signature_data_url      LONGTEXT      DEFAULT NULL,
    signature_type                  VARCHAR(30)   DEFAULT NULL,
    performa_submission_file_name   VARCHAR(255)  DEFAULT NULL,
    performa_submission_file_url    LONGTEXT      DEFAULT NULL,
    desk_reviewed_at                DATETIME      DEFAULT NULL,
    desk_reviewed_by                VARCHAR(255)  DEFAULT NULL,
    desk_comments                   TEXT          DEFAULT NULL,
    revision_notes                  TEXT          DEFAULT NULL,
    KEY idx_sub_requisition (requisition_id),
    KEY idx_sub_field_unit (field_unit_id),
    KEY idx_sub_status (status),
    CONSTRAINT fk_sub_requisition FOREIGN KEY (requisition_id) REFERENCES requisitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sub_field_unit FOREIGN KEY (field_unit_id) REFERENCES field_units(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. extension_requests
-- (found referenced in storage.ts — not in your original SQL exports,
--  so this definition is inferred from the app's TypeScript types)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extension_requests (
    id                      VARCHAR(100)  NOT NULL PRIMARY KEY,
    requisition_id          VARCHAR(50)   NOT NULL,
    field_unit_id           VARCHAR(50)   NOT NULL,
    field_unit_name         VARCHAR(500)  DEFAULT NULL,
    requested_deadline      DATETIME      DEFAULT NULL,
    reason                  TEXT          DEFAULT NULL,
    status                  VARCHAR(20)   DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
    created_at               DATETIME      DEFAULT CURRENT_TIMESTAMP,
    responded_at            DATETIME      DEFAULT NULL,
    desk_response_comment   TEXT          DEFAULT NULL,
    KEY idx_ext_requisition (requisition_id),
    KEY idx_ext_field_unit (field_unit_id),
    CONSTRAINT fk_ext_requisition FOREIGN KEY (requisition_id) REFERENCES requisitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ext_field_unit FOREIGN KEY (field_unit_id) REFERENCES field_units(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. defaulter_notices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS defaulter_notices (
    id                  VARCHAR(150)  NOT NULL PRIMARY KEY,
    requisition_id      VARCHAR(50)   NOT NULL,
    field_unit_id       VARCHAR(50)   NOT NULL,
    sent_at             DATETIME      DEFAULT CURRENT_TIMESTAMP,
    subject             VARCHAR(500)  DEFAULT NULL,
    message             TEXT          DEFAULT NULL,
    sent_by_desk_id     VARCHAR(50)   DEFAULT NULL,
    KEY idx_notice_requisition (requisition_id),
    KEY idx_notice_field_unit (field_unit_id),
    CONSTRAINT fk_notice_requisition FOREIGN KEY (requisition_id) REFERENCES requisitions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notice_field_unit FOREIGN KEY (field_unit_id) REFERENCES field_units(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_notice_desk FOREIGN KEY (sent_by_desk_id) REFERENCES directorate_desks(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
