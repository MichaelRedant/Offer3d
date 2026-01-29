<?php

declare(strict_types=1);

/**
 * Hulpfuncties voor facturatie (tabellen + data ophalen).
 * Alle functies verwachten een bestaande $pdo (PDO) connectie.
 */

/**
 * Voeg kolom toe als deze nog niet bestaat.
 */
function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void
{
    $check = $pdo->prepare("SHOW COLUMNS FROM {$table} LIKE ?");
    $check->execute([$column]);
    if ($check->fetch()) {
        return;
    }
    $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$definition}");
}

/**
 * Maakt (indien nodig) de factuurtabellen aan en verrijkt ze met extra kolommen.
 */
function ensureInvoiceTables(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quote_id INT NULL,
            client_id INT NOT NULL,
            user_id INT NOT NULL,
            invoice_number VARCHAR(64) NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE NULL,
            currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
            status VARCHAR(32) NOT NULL DEFAULT 'draft',
            total_excl DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_vat DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_incl DECIMAL(12,2) NOT NULL DEFAULT 0,
            vat_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
            vat_exempt TINYINT(1) NOT NULL DEFAULT 0,
            vat_exempt_reason TEXT NULL,
            payment_reference VARCHAR(70) NULL,
            payment_terms TEXT NULL,
            buyer_reference VARCHAR(120) NULL,
            supplier_snapshot TEXT NULL,
            customer_snapshot TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");

    $invoiceColumns = [
        'buyer_reference' => "buyer_reference VARCHAR(120) NULL",
        'currency_code' => "currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR'",
        'vat_rate' => "vat_rate DECIMAL(6,2) NOT NULL DEFAULT 0",
        'vat_exempt' => "vat_exempt TINYINT(1) NOT NULL DEFAULT 0",
        'vat_exempt_reason' => "vat_exempt_reason TEXT NULL",
        'payment_reference' => "payment_reference VARCHAR(70) NULL",
        'payment_terms' => "payment_terms TEXT NULL",
        'supplier_snapshot' => "supplier_snapshot TEXT NULL",
        'customer_snapshot' => "customer_snapshot TEXT NULL",
        'due_date' => "due_date DATE NULL",
        'quote_id' => "quote_id INT NULL",
    ];
    foreach ($invoiceColumns as $column => $definition) {
        ensureColumn($pdo, 'invoices', $column, $definition);
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invoice_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            quote_item_id INT NULL,
            description VARCHAR(255) NOT NULL,
            quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
            unit_code VARCHAR(10) NOT NULL DEFAULT 'C62',
            unit_price DECIMAL(12,4) NOT NULL DEFAULT 0,
            line_extension_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            vat_rate DECIMAL(6,2) NOT NULL DEFAULT 0,
            vat_code VARCHAR(4) NULL,
            meta TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_invoice_id (invoice_id)
        )
    ");

    $itemColumns = [
        'quote_item_id' => "quote_item_id INT NULL",
        'vat_code' => "vat_code VARCHAR(4) NULL",
        'meta' => "meta TEXT NULL",
    ];
    foreach ($itemColumns as $column => $definition) {
        ensureColumn($pdo, 'invoice_items', $column, $definition);
    }
}

/**
 * Zorgt dat clients extra velden bevat voor Peppol-adresdata.
 */
function ensureClientExtendedColumns(PDO $pdo): void
{
    $columns = [
        'street' => "street VARCHAR(255) NULL",
        'postal_code' => "postal_code VARCHAR(32) NULL",
        'city' => "city VARCHAR(128) NULL",
        'country_code' => "country_code VARCHAR(4) NULL DEFAULT 'BE'",
        'peppol_endpoint_id' => "peppol_endpoint_id VARCHAR(64) NULL",
        'peppol_scheme' => "peppol_scheme VARCHAR(16) NULL",
    ];

    foreach ($columns as $column => $definition) {
        ensureColumn($pdo, 'clients', $column, $definition);
    }
}

/**
 * Zorgt dat settings extra velden bevat voor facturatie (IBAN, adres, Peppol).
 */
function ensureSettingsExtendedColumns(PDO $pdo): void
{
    $columns = [
        'iban' => "iban VARCHAR(34) NULL",
        'bic' => "bic VARCHAR(32) NULL",
        'company_street' => "company_street VARCHAR(255) NULL",
        'company_postal_code' => "company_postal_code VARCHAR(32) NULL",
        'company_city' => "company_city VARCHAR(128) NULL",
        'company_country_code' => "company_country_code VARCHAR(4) NULL DEFAULT 'BE'",
        'peppol_endpoint_id' => "peppol_endpoint_id VARCHAR(64) NULL",
        'peppol_scheme' => "peppol_scheme VARCHAR(16) NULL",
        'default_due_days' => "default_due_days INT NOT NULL DEFAULT 14",
        'payment_terms' => "payment_terms TEXT NULL",
    ];

    foreach ($columns as $column => $definition) {
        ensureColumn($pdo, 'settings', $column, $definition);
    }
}

/**
 * Zorgt dat quotes kolommen hebben voor btw-vrijstelling.
 */
function ensureQuoteTaxColumns(PDO $pdo): void
{
    $columns = [
        'vat_exempt' => "vat_exempt TINYINT(1) NOT NULL DEFAULT 0",
        'vat_exempt_reason' => "vat_exempt_reason TEXT NULL",
    ];
    foreach ($columns as $column => $definition) {
        ensureColumn($pdo, 'quotes', $column, $definition);
    }
}

/**
 * Zorgt dat offertes conditiesvelden hebben.
 */
function ensureQuoteConditionColumns(PDO $pdo): void
{
    $columns = [
        'validity_days' => "validity_days INT NOT NULL DEFAULT 30",
        'delivery_terms' => "delivery_terms TEXT NULL",
        'payment_terms' => "payment_terms TEXT NULL",
        'delivery_type' => "delivery_type VARCHAR(32) NULL DEFAULT 'afhaling'",
    ];
    foreach ($columns as $column => $definition) {
        ensureColumn($pdo, 'quotes', $column, $definition);
    }
}

/**
 * Zorgt dat offertes een aanpasbaar offertenummer hebben.
 */
function ensureQuoteNumberColumn(PDO $pdo): void
{
    ensureColumn($pdo, 'quotes', 'quote_number', "quote_number VARCHAR(64) NULL");
}

/**
 * Zorgt voor tabel voor custom offerteregels (diensten/bundels) naast prints.
 */
function ensureQuoteCustomItemsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS quote_custom_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            quote_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
            unit VARCHAR(32) NOT NULL DEFAULT 'stuk',
            cost_amount DECIMAL(12,4) NOT NULL DEFAULT 0,
            price_amount DECIMAL(12,4) NOT NULL DEFAULT 0,
            margin_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
            vat_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
            is_optional TINYINT(1) NOT NULL DEFAULT 0,
            is_selected TINYINT(1) NOT NULL DEFAULT 1,
            group_ref VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_quote_id (quote_id)
        )
    ");

    $optionalColumns = [
        'group_ref' => "group_ref VARCHAR(64) NULL",
        'margin_percent' => "margin_percent DECIMAL(6,2) NOT NULL DEFAULT 0",
        'vat_percent' => "vat_percent DECIMAL(6,2) NOT NULL DEFAULT 0",
        'is_optional' => "is_optional TINYINT(1) NOT NULL DEFAULT 0",
        'is_selected' => "is_selected TINYINT(1) NOT NULL DEFAULT 1",
    ];
    foreach ($optionalColumns as $column => $definition) {
        ensureColumn($pdo, 'quote_custom_items', $column, $definition);
    }
}

/**
 * Zorgt dat quote_items alle vereiste kolommen bevatten (marges, modellering, levering).
 */
function ensureQuoteItemsColumns(PDO $pdo): void
{
    $columns = [
        'custom_winstmarge_perc' => "custom_winstmarge_perc DECIMAL(10,2) NOT NULL DEFAULT 0",
        'override_marge' => "override_marge TINYINT(1) NOT NULL DEFAULT 0",
        'modellering_uur' => "modellering_uur DECIMAL(10,2) NOT NULL DEFAULT 0",
        'model_link' => "model_link VARCHAR(512) NULL",
    ];
    foreach ($columns as $column => $definition) {
        ensureColumn($pdo, 'quote_items', $column, $definition);
    }
}

/**
 * Haal factuur + items + klant op.
 */
function fetchInvoice(PDO $pdo, int $invoiceId): ?array
{
    $stmt = $pdo->prepare("
        SELECT i.*, c.naam AS client_name, c.bedrijf AS client_company
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.id = ?
    ");
    $stmt->execute([$invoiceId]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$invoice) {
        return null;
    }

    $itemStmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $itemStmt->execute([$invoiceId]);
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $invoice['items'] = $items;
    $invoice['supplier_snapshot'] = json_decode($invoice['supplier_snapshot'] ?? '', true) ?: null;
    $invoice['customer_snapshot'] = json_decode($invoice['customer_snapshot'] ?? '', true) ?: null;

    return $invoice;
}

/**
 * Haal offerte + items + klant op (voor factuurcreatie).
 */
function fetchQuoteWithItems(PDO $pdo, int $quoteId): ?array
{
    $stmt = $pdo->prepare("
        SELECT q.*, c.id AS client_id, c.naam AS klant_naam, c.bedrijf AS klant_bedrijf,
               c.email AS klant_email, c.btw_nummer, c.adres, c.telefoon,
               c.street, c.postal_code, c.city, c.country_code, c.peppol_endpoint_id, c.peppol_scheme
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ?
    ");
    $stmt->execute([$quoteId]);
    $quote = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$quote) {
        return null;
    }

    $itemsStmt = $pdo->prepare("SELECT * FROM quote_items WHERE quote_id = ?");
    $itemsStmt->execute([$quoteId]);
    $quote['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    return $quote;
}

/**
 * Bepaal VAT-code obv percentage.
 */
function deriveVatCode(float $rate, bool $exempt = false): string
{
    if ($exempt || $rate <= 0.0001) {
        return $exempt ? 'E' : 'Z';
    }
    if ($rate < 6) {
        return 'AA';
    }
    if ($rate < 21 && $rate >= 6) {
        return 'AA'; // reduced
    }
    return 'S';
}
