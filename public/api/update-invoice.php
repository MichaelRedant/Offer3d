<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$userId = 1; // gesimuleerde gebruiker
$data = json_decode(file_get_contents('php://input'), true);

$invoiceId = isset($data['id']) ? (int) $data['id'] : 0;
if ($invoiceId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Factuur ID ontbreekt.']);
    exit;
}

if (!$data || empty($data['client_id']) || empty($data['lines']) || !is_array($data['lines'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Onvolledige gegevens voor factuur.']);
    exit;
}

try {
    ensureInvoiceTables($pdo);
    ensureClientExtendedColumns($pdo);
    ensureSettingsExtendedColumns($pdo);

    $existing = fetchInvoice($pdo, $invoiceId);
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Factuur niet gevonden.']);
        exit;
    }

    $clientId = (int) $data['client_id'];
    $issueDate = !empty($data['issue_date']) ? $data['issue_date'] : ($existing['issue_date'] ?? date('Y-m-d'));
    $currency = $data['currency'] ?? ($existing['currency_code'] ?? 'EUR');

    // Ophalen klant
    $clientStmt = $pdo->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
    $clientStmt->execute([$clientId]);
    $client = $clientStmt->fetch(PDO::FETCH_ASSOC);
    if (!$client) {
        http_response_code(404);
        echo json_encode(['error' => 'Klant niet gevonden.']);
        exit;
    }

    // Instellingen laden
    $settingsRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
    $defaultDueDays = isset($settingsRow['default_due_days']) ? (int) $settingsRow['default_due_days'] : 14;
    $dueDate = !empty($data['due_date'])
        ? $data['due_date']
        : (!empty($existing['due_date']) ? $existing['due_date'] : date('Y-m-d', strtotime($issueDate . " +{$defaultDueDays} days")));

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

    $customerSnapshot = [
        'name' => $client['naam'] ?? '',
        'company' => $client['bedrijf'] ?? '',
        'email' => $client['email'] ?? '',
        'vatNumber' => $client['btw_nummer'] ?? '',
        'address' => $client['adres'] ?? '',
        'street' => $client['street'] ?? '',
        'postalCode' => $client['postal_code'] ?? '',
        'city' => $client['city'] ?? '',
        'countryCode' => $client['country_code'] ?? 'BE',
        'phone' => $client['telefoon'] ?? '',
        'peppolEndpointId' => $client['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $client['peppol_scheme'] ?? '',
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
    $missingCustomer = [];
    foreach (['street','postalCode','city','countryCode'] as $key) {
        if (empty($customerSnapshot[$key])) {
            $missingCustomer[] = $key;
        }
    }
    if ($missingCustomer) {
        http_response_code(422);
        echo json_encode(['error' => 'Klantadres onvolledig: ' . implode(', ', $missingCustomer) . '. Vul adresvelden aan.']);
        exit;
    }

    $invoiceNumberInput = trim((string)($data['invoice_number'] ?? $existing['invoice_number'] ?? ''));
    $paymentReference = trim((string)($data['payment_reference'] ?? $existing['payment_reference'] ?? ''));
    $buyerReference = trim((string)($data['buyer_reference'] ?? $existing['buyer_reference'] ?? ''));
    $paymentTerms = trim((string)($data['payment_terms'] ?? ($settingsRow['payment_terms'] ?? $existing['payment_terms'] ?? '')));
    $vatExempt = !empty($data['vat_exempt']);
    $vatReason = $data['vat_exempt_reason'] ?? $existing['vat_exempt_reason'] ?? null;

    $totalExcl = 0.0;
    $totalVat = 0.0;
    $totalIncl = 0.0;
    $defaultVatRate = 0.0;
    $normalizedLines = [];

    foreach ($data['lines'] as $line) {
        $qty = max(0, (float) ($line['quantity'] ?? 0));
        $unitPrice = (float) ($line['unit_price'] ?? 0);
        $lineTotal = $qty * $unitPrice;
        $lineVatRate = $vatExempt ? 0.0 : (float) ($line['vat_rate'] ?? 0);

        $totalExcl += $lineTotal;
        $lineVatAmount = $lineTotal * ($lineVatRate / 100);
        $totalVat += $lineVatAmount;
        $totalIncl += $lineTotal + $lineVatAmount;

        if ($defaultVatRate === 0.0 && $lineVatRate > 0) {
            $defaultVatRate = $lineVatRate;
        }

        $normalizedLines[] = [
            'description' => $line['description'] ?? 'Item',
            'quantity' => $qty,
            'unit_price' => $unitPrice,
            'line_extension_amount' => $lineTotal,
            'vat_rate' => $lineVatRate,
            'vat_code' => deriveVatCode($lineVatRate, $vatExempt),
        ];
    }

    if ($paymentReference === '' && $invoiceNumberInput !== '') {
        $paymentReference = $invoiceNumberInput;
    }
    if ($buyerReference === '') {
        $buyerReference = $paymentReference !== '' ? $paymentReference : $existing['buyer_reference'];
    }

    $pdo->beginTransaction();

    $update = $pdo->prepare("
        UPDATE invoices SET
            client_id = :client_id,
            invoice_number = :invoice_number,
            issue_date = :issue_date,
            due_date = :due_date,
            currency_code = :currency_code,
            total_excl = :total_excl,
            total_vat = :total_vat,
            total_incl = :total_incl,
            vat_rate = :vat_rate,
            vat_exempt = :vat_exempt,
            vat_exempt_reason = :vat_exempt_reason,
            payment_reference = :payment_reference,
            payment_terms = :payment_terms,
            buyer_reference = :buyer_reference,
            supplier_snapshot = :supplier_snapshot,
            customer_snapshot = :customer_snapshot,
            updated_at = NOW()
        WHERE id = :id
    ");

    $update->execute([
        ':client_id' => $clientId,
        ':invoice_number' => $invoiceNumberInput ?: $existing['invoice_number'],
        ':issue_date' => $issueDate,
        ':due_date' => $dueDate,
        ':currency_code' => $currency,
        ':total_excl' => $totalExcl,
        ':total_vat' => $vatExempt ? 0 : $totalVat,
        ':total_incl' => $vatExempt ? $totalExcl : $totalIncl,
        ':vat_rate' => $vatExempt ? 0 : ($defaultVatRate ?: ($existing['vat_rate'] ?? 0)),
        ':vat_exempt' => $vatExempt ? 1 : 0,
        ':vat_exempt_reason' => $vatReason,
        ':payment_reference' => $paymentReference,
        ':payment_terms' => $paymentTerms,
        ':buyer_reference' => $buyerReference,
        ':supplier_snapshot' => json_encode($supplierSnapshot, JSON_UNESCAPED_UNICODE),
        ':customer_snapshot' => json_encode($customerSnapshot, JSON_UNESCAPED_UNICODE),
        ':id' => $invoiceId,
    ]);

    // items vervangen
    $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?")->execute([$invoiceId]);

    $insertItem = $pdo->prepare("INSERT INTO invoice_items (
        invoice_id, quote_item_id, description, quantity, unit_code, unit_price, line_extension_amount, vat_rate, vat_code
    ) VALUES (
        :invoice_id, NULL, :description, :quantity, :unit_code, :unit_price, :line_extension_amount, :vat_rate, :vat_code
    )");

    foreach ($normalizedLines as $line) {
        $insertItem->execute([
            ':invoice_id' => $invoiceId,
            ':description' => $line['description'],
            ':quantity' => $line['quantity'],
            ':unit_code' => 'C62',
            ':unit_price' => $line['unit_price'],
            ':line_extension_amount' => $line['line_extension_amount'],
            ':vat_rate' => $line['vat_rate'],
            ':vat_code' => $line['vat_code'],
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'invoice_id' => $invoiceId,
        'invoice_number' => $invoiceNumberInput ?: $existing['invoice_number'],
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij bijwerken factuur: ' . $e->getMessage()]);
}
