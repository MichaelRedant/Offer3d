<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$userId = 1; // gesimuleerde gebruiker
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['quote_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'quote_id is verplicht.']);
    exit;
}

try {
    ensureInvoiceTables($pdo);
    ensureClientExtendedColumns($pdo);
    ensureSettingsExtendedColumns($pdo);
    ensureQuoteTaxColumns($pdo);

    $quoteId = (int) $data['quote_id'];
    $issueDate = !empty($data['issue_date']) ? $data['issue_date'] : date('Y-m-d');
    $currency = $data['currency'] ?? 'EUR';

    $quote = fetchQuoteWithItems($pdo, $quoteId);
    if (!$quote) {
        http_response_code(404);
        echo json_encode(['error' => 'Offerte niet gevonden.']);
        exit;
    }

    $clientId = (int) ($quote['client_id'] ?? 0);
    if ($clientId <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'Offerte heeft geen gekoppelde klant.']);
        exit;
    }

    $settingsRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
    $defaultDueDays = isset($settingsRow['default_due_days']) ? (int)$settingsRow['default_due_days'] : 14;
    $dueDate = !empty($data['due_date']) ? $data['due_date'] : date('Y-m-d', strtotime($issueDate . " +{$defaultDueDays} days"));

    $supplierSnapshot = [
        'name' => $settingsRow['company_name'] ?? '',
        'address' => $settingsRow['company_address'] ?? '',
        'street' => $settingsRow['company_street'] ?? '',
        'postalCode' => $settingsRow['company_postal_code'] ?? '',
        'city' => $settingsRow['company_city'] ?? '',
        'countryCode' => $settingsRow['company_country_code'] ?? 'BE',
        'email' => $settingsRow['company_email'] ?? '',
        'phone' => $settingsRow['company_phone'] ?? '',
        'vatNumber' => $settingsRow['vat_number'] ?? '',
        'iban' => $settingsRow['iban'] ?? '',
        'bic' => $settingsRow['bic'] ?? '',
        'peppolEndpointId' => $settingsRow['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $settingsRow['peppol_scheme'] ?? '',
    ];

    // Probeer adresvelden te vullen vanuit vrij adres (best effort)
    if (empty($supplierSnapshot['street']) && !empty($supplierSnapshot['address'])) {
        $supplierSnapshot['street'] = $supplierSnapshot['address'];
    }
    if ((empty($supplierSnapshot['postalCode']) || empty($supplierSnapshot['city'])) && !empty($supplierSnapshot['address'])) {
        if (preg_match('/^(.*?)[,\\s]+(\\d{4,})\\s+(.+)$/', $supplierSnapshot['address'], $m)) {
            $supplierSnapshot['street'] = $supplierSnapshot['street'] ?: trim($m[1]);
            $supplierSnapshot['postalCode'] = $supplierSnapshot['postalCode'] ?: trim($m[2]);
            $supplierSnapshot['city'] = $supplierSnapshot['city'] ?: trim($m[3]);
        }
    }

    $customerSnapshot = [
        'name' => $quote['klant_naam'] ?? '',
        'company' => $quote['klant_bedrijf'] ?? '',
        'email' => $quote['klant_email'] ?? '',
        'vatNumber' => $quote['btw_nummer'] ?? '',
        'address' => $quote['adres'] ?? '',
        'street' => $quote['street'] ?? '',
        'postalCode' => $quote['postal_code'] ?? '',
        'city' => $quote['city'] ?? '',
        'countryCode' => $quote['country_code'] ?? 'BE',
        'phone' => $quote['telefoon'] ?? '',
        'peppolEndpointId' => $quote['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $quote['peppol_scheme'] ?? '',
    ];

    if (empty($customerSnapshot['street']) && !empty($customerSnapshot['address'])) {
        $customerSnapshot['street'] = $customerSnapshot['address'];
    }
    if ((empty($customerSnapshot['postalCode']) || empty($customerSnapshot['city'])) && !empty($customerSnapshot['address'])) {
        if (preg_match('/^(.*?)[,\\s]+(\\d{4,})\\s+(.+)$/', $customerSnapshot['address'], $m)) {
            $customerSnapshot['street'] = $customerSnapshot['street'] ?: trim($m[1]);
            $customerSnapshot['postalCode'] = $customerSnapshot['postalCode'] ?: trim($m[2]);
            $customerSnapshot['city'] = $customerSnapshot['city'] ?: trim($m[3]);
        }
    }

    $missingSupplier = [];
    foreach (['name','vatNumber','street','postalCode','city','countryCode'] as $key) {
        if (empty($supplierSnapshot[$key])) {
            $missingSupplier[] = $key;
        }
    }
    if ($missingSupplier) {
        http_response_code(422);
        echo json_encode(['error' => 'Ontbrekende bedrijfsgegevens voor factuur: ' . implode(', ', $missingSupplier) . ' (vul aan in Instellingen)']);
        exit;
    }
    if (empty($supplierSnapshot['iban'])) {
        // Geen harde blocker, maar meldbaar in client
        $supplierSnapshot['iban'] = '';
    }

    $invoiceNumberInput = trim((string)($data['invoice_number'] ?? ''));
    $paymentReference = trim((string)($data['payment_reference'] ?? ''));
    $buyerReference = trim((string)($data['buyer_reference'] ?? ''));
    $paymentTerms = trim((string)($data['payment_terms'] ?? ($settingsRow['payment_terms'] ?? '')));

    $vatRate = (float) ($quote['btw_perc'] ?? 0);
    $vatExempt = !empty($quote['vat_exempt']);
    $vatReason = $quote['vat_exempt_reason'] ?? null;
    $totalExcl = (float) ($quote['totaal_netto'] ?? 0);
    $totalVat = (float) ($quote['totaal_btw'] ?? 0);
    $totalIncl = (float) ($quote['totaal_bruto'] ?? 0);

    if ($paymentReference === '' && $invoiceNumberInput !== '') {
        $paymentReference = $invoiceNumberInput;
    }
    if ($buyerReference === '') {
        $buyerReference = $paymentReference !== '' ? $paymentReference : ('QUOTE-' . $quoteId);
    }

    $pdo->beginTransaction();

    $insertInvoice = $pdo->prepare("INSERT INTO invoices (
        quote_id, client_id, user_id, invoice_number, issue_date, due_date, currency_code,
        status, total_excl, total_vat, total_incl, vat_rate, vat_exempt, vat_exempt_reason, payment_reference, payment_terms,
        buyer_reference, supplier_snapshot, customer_snapshot
    ) VALUES (
        :quote_id, :client_id, :user_id, :invoice_number, :issue_date, :due_date, :currency_code,
        :status, :total_excl, :total_vat, :total_incl, :vat_rate, :vat_exempt, :vat_exempt_reason, :payment_reference, :payment_terms,
        :buyer_reference, :supplier_snapshot, :customer_snapshot
    )");

    $insertInvoice->execute([
        ':quote_id' => $quoteId,
        ':client_id' => $clientId,
        ':user_id' => $userId,
        ':invoice_number' => $invoiceNumberInput ?: 'PENDING',
        ':issue_date' => $issueDate,
        ':due_date' => $dueDate,
        ':currency_code' => $currency,
        ':status' => 'draft',
        ':total_excl' => $totalExcl,
        ':total_vat' => $totalVat,
        ':total_incl' => $totalIncl,
        ':vat_rate' => $vatRate,
        ':vat_exempt' => $vatExempt ? 1 : 0,
        ':vat_exempt_reason' => $vatReason,
        ':payment_reference' => $paymentReference,
        ':payment_terms' => $paymentTerms,
        ':buyer_reference' => $buyerReference,
        ':supplier_snapshot' => json_encode($supplierSnapshot, JSON_UNESCAPED_UNICODE),
        ':customer_snapshot' => json_encode($customerSnapshot, JSON_UNESCAPED_UNICODE),
    ]);

    $invoiceId = (int)$pdo->lastInsertId();
    $invoiceNumber = $invoiceNumberInput;
    if ($invoiceNumber === '') {
        $invoiceNumber = sprintf('INV-%s-%04d', date('Ym'), $invoiceId);
        $pdo->prepare("UPDATE invoices SET invoice_number = ? WHERE id = ?")->execute([$invoiceNumber, $invoiceId]);
    }

    $insertItem = $pdo->prepare("INSERT INTO invoice_items (
        invoice_id, quote_item_id, description, quantity, unit_code, unit_price, line_extension_amount, vat_rate, vat_code
    ) VALUES (
        :invoice_id, :quote_item_id, :description, :quantity, :unit_code, :unit_price, :line_extension_amount, :vat_rate, :vat_code
    )");

    foreach ($quote['items'] as $item) {
        $qty = max(1, (float)($item['aantal'] ?? 1));
        $lineTotal = (float)($item['subtotaal'] ?? 0);
        $unitPrice = (float)($item['verkoopprijs_per_stuk'] ?? 0);
        if ($unitPrice <= 0 && $qty > 0) {
            $unitPrice = $lineTotal / $qty;
        }
        $insertItem->execute([
            ':invoice_id' => $invoiceId,
            ':quote_item_id' => $item['id'] ?? null,
            ':description' => $item['naam'] ?? 'Item',
            ':quantity' => $qty,
            ':unit_code' => 'C62',
            ':unit_price' => $unitPrice,
            ':line_extension_amount' => $lineTotal,
            ':vat_rate' => $vatRate,
            ':vat_code' => deriveVatCode($vatRate),
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'invoice_id' => $invoiceId,
        'invoice_number' => $invoiceNumber,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij aanmaken factuur: ' . $e->getMessage()]);
}
