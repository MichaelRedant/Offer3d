<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$invoiceId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($invoiceId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig factuur ID.']);
    exit;
}

try {
    ensureInvoiceTables($pdo);
    ensureSettingsExtendedColumns($pdo);
    ensureClientExtendedColumns($pdo);

    $invoice = fetchInvoice($pdo, $invoiceId);
    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['error' => 'Factuur niet gevonden.']);
        exit;
    }

    $settingsRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
    $supplierFallback = [
        'name' => $settingsRow['company_name'] ?? '',
        'vatNumber' => $settingsRow['vat_number'] ?? '',
        'street' => $settingsRow['company_street'] ?? '',
        'postalCode' => $settingsRow['company_postal_code'] ?? '',
        'city' => $settingsRow['company_city'] ?? '',
        'countryCode' => $settingsRow['company_country_code'] ?? 'BE',
        'iban' => $settingsRow['iban'] ?? '',
        'bic' => $settingsRow['bic'] ?? '',
        'peppolEndpointId' => $settingsRow['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $settingsRow['peppol_scheme'] ?? '',
        'email' => $settingsRow['company_email'] ?? '',
        'phone' => $settingsRow['company_phone'] ?? '',
        'address' => $settingsRow['company_address'] ?? '',
    ];

    $supplier = $invoice['supplier_snapshot'] ?: $supplierFallback;
    $customer = $invoice['customer_snapshot'] ?: null;

    if (!$customer) {
        $clientStmt = $pdo->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
        $clientStmt->execute([$invoice['client_id']]);
        $customer = $clientStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    echo json_encode([
        'invoice' => $invoice,
        'items' => $invoice['items'],
        'supplier' => $supplier,
        'customer' => $customer,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen factuur: ' . $e->getMessage()]);
}
