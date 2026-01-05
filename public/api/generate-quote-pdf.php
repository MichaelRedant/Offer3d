<?php
// Server-side PDF generatie. Vereist Dompdf in vendor (composer require dompdf/dompdf).
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$quoteId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($quoteId <= 0) {
    http_response_code(400);
    echo "Ongeldig ID";
    exit;
}

// Dompdf check
$dompdfAutoloads = [
    __DIR__ . '/../../vendor/autoload.php',            // composer
    __DIR__ . '/../../dompdf/autoload.inc.php',        // handmatig release in project root
    __DIR__ . '/../dompdf/autoload.inc.php',           // release in public/dompdf
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
    echo "Dompdf niet gevonden. Plaats dompdf in /offr3d/vendor of /offr3d/dompdf (release) en zorg dat autoload.inc.php beschikbaar is.";
    exit;
}
require_once __DIR__ . '/db.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// Fetch settings (inclusief logo en bedrijfsinfo)
$settingsStmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
$settings = $settingsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

// Fetch quote + client
$quoteStmt = $pdo->prepare("
    SELECT q.*, c.naam AS klant_naam, c.bedrijf, c.email, c.adres, c.telefoon
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    WHERE q.id = ?
");
$quoteStmt->execute([$quoteId]);
$quote = $quoteStmt->fetch(PDO::FETCH_ASSOC);
if (!$quote) {
    http_response_code(404);
    echo "Offerte niet gevonden";
    exit;
}

// Fetch items
$itemsStmt = $pdo->prepare("
    SELECT qi.*, m.naam AS materiaal_naam, m.kleur AS materiaal_kleur, m.type AS materiaal_type
    FROM quote_items qi
    LEFT JOIN materials m ON qi.materiaal_id = m.id
    WHERE qi.quote_id = ?
");
$itemsStmt->execute([$quoteId]);
$items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

$companyName = $settings['company_name'] ?? 'Bedrijfsnaam';
$companyAddress = $settings['company_address'] ?? '';
$companyEmail = $settings['company_email'] ?? '';
$companyPhone = $settings['company_phone'] ?? '';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? '';
$baseOrigin = $host ? "{$scheme}://{$host}" : '';
$logoUrlSetting = $settings['logo_url'] ?? '';
$logoUrl = $logoUrlSetting
    ? (str_starts_with($logoUrlSetting, 'http') ? $logoUrlSetting : $baseOrigin . $logoUrlSetting)
    : '';
$termsText = trim($settings['terms_text'] ?? '');
$vatNumber = $settings['vat_number'] ?? '';
$companyBlock = "<strong>{$companyName}</strong><br/>" .
    nl2br(htmlspecialchars($companyAddress)) .
    ($companyEmail ? "<br/>" . htmlspecialchars($companyEmail) : "") .
    ($companyPhone ? " | " . htmlspecialchars($companyPhone) : "") .
    ($vatNumber ? "<br/>BTW: " . htmlspecialchars($vatNumber) : "");

$htmlItems = '';
foreach ($items as $index => $item) {
    $lineTotal = number_format((float)($item['subtotaal'] ?? 0), 2, ',', '.');
    $htmlItems .= "
        <tr>
            <td>" . ($index + 1) . "</td>
            <td>" . htmlspecialchars($item['naam'] ?? 'Onbekend') . "</td>
            <td>" . htmlspecialchars($item['materiaal_naam'] ?? '-') . "</td>
            <td style='text-align:right;'>{$item['aantal']} st.</td>
            <td style='text-align:right;'>{$lineTotal} EUR</td>
        </tr>
    ";
}

$totaalNetto = number_format((float)($quote['totaal_netto'] ?? 0), 2, ',', '.');
$totaalBtw = number_format((float)($quote['totaal_btw'] ?? 0), 2, ',', '.');
$totaalBruto = number_format((float)($quote['totaal_bruto'] ?? 0), 2, ',', '.');
$vatExempt = !empty($quote['vat_exempt']);
$vatReason = $quote['vat_exempt_reason'] ?? '';

$logoTag = $logoUrl ? "<img src='{$logoUrl}' style='max-height:60px;' alt='Logo' />" : "";
$termsBlock = '';
if (!empty($termsText)) {
    $termsBlock = "
      <div class='terms'>
        <h2>Voorwaarden</h2>
        <p>" . nl2br(htmlspecialchars($termsText)) . "</p>
      </div>
    ";
}

$pdfLink = '';
if (!empty($settings['terms_url'])) {
    $pdfLink = "<p style='margin-top:10px; font-size:12px;'>Voorwaarden (PDF): <a href='{$settings['terms_url']}'>{$settings['terms_url']}</a></p>";
}

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
    .badge { display: inline-block; padding: 4px 8px; background: #0f172a; color: #f9f6ec; font-size: 11px; border-radius: 4px; letter-spacing: 0.4px; }
    .terms { page-break-before: always; margin-top: 20px; font-size: 12px; line-height: 1.6; border-top: 2px solid #d6c9a9; padding-top: 12px; }
    .terms h2 { font-size: 14px; text-transform: uppercase; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class='header'>
    <div class='company'>
      {$companyBlock}
    </div>
    <div>{$logoTag}</div>
  </div>

  <h1>Offerte</h1>
  <p><strong>Klant:</strong> " . htmlspecialchars($quote['klant_naam'] ?? 'Onbekend') . "</p>
  " . ($quote['bedrijf'] ? "<p><strong>Bedrijf:</strong> " . htmlspecialchars($quote['bedrijf']) . "</p>" : "") . "
  " . ($quote['email'] ? "<p><strong>Email:</strong> " . htmlspecialchars($quote['email']) . "</p>" : "") . "

  <h2>Printstukken</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Naam</th>
        <th>Materiaal</th>
        <th style='text-align:right;'>Aantal</th>
        <th style='text-align:right;'>Subtotaal</th>
      </tr>
    </thead>
    <tbody>
      {$htmlItems}
    </tbody>
  </table>

  <table class='totals'>
    <tr><td class='label'>Totaal netto</td><td class='value'>{$totaalNetto} EUR</td></tr>
    <tr><td class='label'>BTW</td><td class='value'>{$totaalBtw} EUR</td></tr>
    <tr><td class='label'>Totaal incl. btw</td><td class='value'>{$totaalBruto} EUR</td></tr>
  </table>

  " . ($vatExempt ? "<p class='text-sm' style='margin-top:6px;'><strong>BTW vrijgesteld:</strong> " . htmlspecialchars($vatReason ?: '0% toegepast') . "</p>" : "") . "

  {$termsBlock}
  {$pdfLink}
</body>
</html>
";

$options = new Options();
$options->set('isRemoteEnabled', true);
$dompdf = new Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
$dompdf->stream("offerte-{$quoteId}.pdf", ['Attachment' => false]);
