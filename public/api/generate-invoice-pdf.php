<?php
// Factuur PDF generatie
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$invoiceId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($invoiceId <= 0) {
    http_response_code(400);
    echo "Ongeldig ID";
    exit;
}

$dompdfAutoloads = [
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../../dompdf/autoload.inc.php',
    __DIR__ . '/../dompdf/autoload.inc.php',
];
$autoloadFound = false;
foreach ($dompdfAutoloads as $autoload) {
    if (file_exists($autoload)) {
        require_once $autoload;
        $autoloadFound = true;
        break;
    }
}
if (!$autoloadFound) {
    http_response_code(500);
    echo "Dompdf niet gevonden. Plaats dompdf in /offr3d/vendor of /offr3d/dompdf.";
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

use Dompdf\Dompdf;
use Dompdf\Options;

try {
    ensureInvoiceTables($pdo);
    ensureSettingsExtendedColumns($pdo);

    $invoice = fetchInvoice($pdo, $invoiceId);
    if (!$invoice) {
        http_response_code(404);
        echo "Factuur niet gevonden";
        exit;
    }

    $settingsRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
    $supplier = $invoice['supplier_snapshot'] ?: [
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
    ];

    $customer = $invoice['customer_snapshot'] ?: null;
    if (!$customer) {
        $clientStmt = $pdo->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
        $clientStmt->execute([$invoice['client_id']]);
        $customer = $clientStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    $companyName = $supplier['name'] ?: 'Bedrijf';
    $companyAddress = $supplier['street']
        ? trim(($supplier['street'] ?? '') . "
" . ($supplier['postalCode'] ?? '') . ' ' . ($supplier['city'] ?? '') . "
" . ($supplier['countryCode'] ?? ''))
        : ($supplier['address'] ?? '');
    $companyEmail = $supplier['email'] ?? '';
    $companyPhone = $supplier['phone'] ?? '';
    $vatNumber = $supplier['vatNumber'] ?? '';

    $customerName = $customer['name'] ?? $customer['klant_naam'] ?? 'Onbekende klant';
    $customerCompany = $customer['company'] ?? $customer['klant_bedrijf'] ?? '';
    $customerAddress = $customer['street']
        ? trim(($customer['street'] ?? '') . "
" . ($customer['postalCode'] ?? '') . ' ' . ($customer['city'] ?? '') . "
" . ($customer['countryCode'] ?? ''))
        : ($customer['adres'] ?? '');

    $items = $invoice['items'] ?? [];
    $vatExempt = !empty($invoice['vat_exempt']);
    $vatReason = $invoice['vat_exempt_reason'] ?? '';

    $lineRows = '';
    foreach ($items as $index => $item) {
        $lineTotal = number_format((float)($item['line_extension_amount'] ?? 0), 2, ',', '.');
        $unitPrice = number_format((float)($item['unit_price'] ?? 0), 2, ',', '.');
        $qty = (float)($item['quantity'] ?? 1);
        $lineRows .= "<tr>
            <td>" . ($index + 1) . "</td>
            <td>" . htmlspecialchars($item['description'] ?? 'Item') . "</td>
            <td style='text-align:right;'>" . $qty . "</td>
            <td style='text-align:right;'>" . $unitPrice . " EUR</td>
            <td style='text-align:right;'>" . $lineTotal . " EUR</td>
        </tr>";
    }

    $totalExcl = number_format((float)($invoice['total_excl'] ?? 0), 2, ',', '.');
    $totalVat = number_format((float)($invoice['total_vat'] ?? 0), 2, ',', '.');
    $totalIncl = number_format((float)($invoice['total_incl'] ?? 0), 2, ',', '.');

    $paymentReference = $invoice['payment_reference'] ?? '';
    $paymentTerms = $invoice['payment_terms'] ?? ($settingsRow['payment_terms'] ?? '');

    $html = "
<!doctype html>
<html lang='nl'>
<head>
  <meta charset='utf-8'>
  <style>
    @page { margin: 24px 24px 36px 24px; }
    body { font-family: DejaVu Sans, sans-serif; color: #0f172a; background: #f9f6ec; }
    h1 { font-size: 22px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 6px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 9px 8px; font-size: 12px; }
    th { background: #ece3cd; text-align: left; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid #d6c9a9; }
    td { border-bottom: 1px solid #e6dcc4; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d6c9a9; padding-bottom: 10px; margin-bottom: 10px; }
    .company { font-size: 12px; line-height: 1.5; }
    .totals { margin-top: 16px; width: 55%; float: right; border: 1px solid #d6c9a9; border-radius: 6px; }
    .totals td { border: none; }
    .totals tr:last-child td { font-size: 13px; }
    .label { color: #374151; }
    .value { text-align: right; font-weight: 700; }
    .pill { display: inline-block; padding: 4px 8px; background: #0f172a; color: #f9f6ec; font-size: 11px; border-radius: 4px; letter-spacing: 0.4px; }
    .note { font-size: 12px; line-height: 1.6; margin-top: 12px; }
  </style>
</head>
<body>
  <div class='header'>
    <div class='company'>
      <strong>" . htmlspecialchars($companyName) . "</strong><br/>
      " . nl2br(htmlspecialchars($companyAddress)) . "<br/>
      " . ($companyEmail ? htmlspecialchars($companyEmail) . " | " : '') . ($companyPhone ? htmlspecialchars($companyPhone) : '') . "<br/>
      " . ($vatNumber ? "BTW: " . htmlspecialchars($vatNumber) : '') . "
    </div>
    <div class='pill'>Factuur</div>
  </div>

  <h1>Factuur #" . htmlspecialchars($invoice['invoice_number'] ?? '') . "</h1>
  <p><strong>Datum:</strong> " . htmlspecialchars($invoice['issue_date'] ?? '') . "</p>
  <p><strong>Vervaldatum:</strong> " . htmlspecialchars($invoice['due_date'] ?? '') . "</p>
  <p><strong>Klant:</strong> " . htmlspecialchars($customerName) . ( $customerCompany ? ' / ' . htmlspecialchars($customerCompany) : '') . "</p>
  <p><strong>Adres:</strong><br/>" . nl2br(htmlspecialchars($customerAddress ?: 'Onbekend')) . "</p>

  <h2>Items</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Omschrijving</th>
        <th style='text-align:right;'>Aantal</th>
        <th style='text-align:right;'>Prijs/stuk</th>
        <th style='text-align:right;'>Subtotaal</th>
      </tr>
    </thead>
    <tbody>
      {$lineRows}
    </tbody>
  </table>

  <table class='totals'>
    <tr><td class='label'>Totaal excl. btw</td><td class='value'>{$totalExcl} EUR</td></tr>
    <tr><td class='label'>BTW</td><td class='value'>{$totalVat} EUR</td></tr>
    <tr><td class='label'>Totaal incl. btw</td><td class='value'>{$totalIncl} EUR</td></tr>
  </table>

  " . ($vatExempt ? "<p class='note'><strong>BTW vrijgesteld:</strong> " . htmlspecialchars($vatReason ?: 'Vrijstelling toegepast (0%)') . "</p>" : "") . "

  <div style='clear:both;'></div>

  <div class='note'>
    <p><strong>IBAN:</strong> " . htmlspecialchars($supplier['iban'] ?? '') . " " . ($supplier['bic'] ? '(BIC ' . htmlspecialchars($supplier['bic']) . ')' : '') . "</p>
    " . ($paymentReference ? "<p><strong>Betalingsreferentie:</strong> " . htmlspecialchars($paymentReference) . "</p>" : '') . "
    " . ($paymentTerms ? "<p><strong>Betaalvoorwaarden:</strong><br/>" . nl2br(htmlspecialchars($paymentTerms)) . "</p>" : '') . "
  </div>
</body>
</html>
";

    $options = new Options();
    $options->set('isRemoteEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $dompdf->stream("factuur-{$invoiceId}.pdf", ['Attachment' => false]);
} catch (Exception $e) {
    http_response_code(500);
    echo "Fout bij genereren factuur: " . $e->getMessage();
}
