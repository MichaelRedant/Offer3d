<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Alleen POST toestaan
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Alleen POST requests zijn toegestaan.']);
    exit;
}

// JSON ophalen en valideren
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen of ongeldige JSON-input ontvangen.']);
    exit;
}

// Vereiste velden controleren (enkel aanwezigheid)
$required = [
    'standaardWinstmarge',
    'elektriciteitsprijs',
    'vasteStartkost',
    'vervoerskost',
    'postCost',
    'modelleringTarief',
    'btw',
    'korting',
    'companyName',
    'companyAddress',
    'companyEmail',
    'companyPhone',
    'logoUrl',
    'vatNumber',
    'termsText',
    'termsUrl',
];
foreach ($required as $field) {
    if (!array_key_exists($field, $input)) {
        http_response_code(400);
        echo json_encode(['error' => "Ongeldig of ontbrekend veld: $field"]);
        exit;
    }
}

require_once __DIR__ . '/db.php';

$pdo->exec("
    CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY,
        standaard_winstmarge_perc DECIMAL(6,2) NOT NULL DEFAULT 25.00,
        elektriciteitsprijs DECIMAL(10,4) NOT NULL DEFAULT 0.22,
        vaste_startkost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        vervoerskost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00,
        btw DECIMAL(6,2) NOT NULL DEFAULT 21.00,
        korting_perc DECIMAL(6,2) NOT NULL DEFAULT 0.00,
        post_cost DECIMAL(10,2) NOT NULL DEFAULT 7.00,
        company_name VARCHAR(255) NULL,
        company_address TEXT NULL,
        company_email VARCHAR(255) NULL,
        company_phone VARCHAR(64) NULL,
        logo_url VARCHAR(512) NULL,
        vat_number VARCHAR(64) NULL,
        terms_text TEXT NULL,
        terms_url VARCHAR(512) NULL
    )
");

$addColumns = [
    "modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00",
    "company_name VARCHAR(255) NULL",
    "company_address TEXT NULL",
    "company_email VARCHAR(255) NULL",
    "company_phone VARCHAR(64) NULL",
    "logo_url VARCHAR(512) NULL",
    "vat_number VARCHAR(64) NULL",
    "terms_text TEXT NULL",
    "terms_url VARCHAR(512) NULL",
    "post_cost DECIMAL(10,2) NOT NULL DEFAULT 7.00"
];
foreach ($addColumns as $colDef) {
    $colName = explode(' ', $colDef)[0];
    $columnCheck = $pdo->prepare("SHOW COLUMNS FROM settings LIKE ?");
    $columnCheck->execute([$colName]);
    if (!$columnCheck->fetch()) {
        $pdo->exec("ALTER TABLE settings ADD COLUMN $colDef");
    }
}

$stmt = $pdo->prepare("
    REPLACE INTO settings (
        id,
        standaard_winstmarge_perc,
        elektriciteitsprijs,
        vaste_startkost,
        vervoerskost,
        modellerings_tarief_per_uur,
        btw,
        korting_perc,
        post_cost,
        company_name,
        company_address,
        company_email,
        company_phone,
        logo_url,
        vat_number,
        terms_text,
        terms_url
    ) VALUES (
        1,
        :standaard,
        :elektriciteit,
        :startkost,
        :vervoerskost,
        :modellering,
        :btw,
        :korting,
        :post_cost,
        :companyName,
        :companyAddress,
        :companyEmail,
        :companyPhone,
        :logoUrl,
        :vatNumber,
        :termsText,
        :termsUrl
    )
");

$success = $stmt->execute([
    ':standaard' => (float) $input['standaardWinstmarge'],
    ':elektriciteit' => (float) $input['elektriciteitsprijs'],
    ':startkost' => (float) $input['vasteStartkost'],
    ':vervoerskost' => (float) $input['vervoerskost'],
    ':modellering' => (float) $input['modelleringTarief'],
    ':btw' => (float) $input['btw'],
    ':korting' => (float) $input['korting'],
    ':post_cost' => isset($input['postCost']) ? (float)$input['postCost'] : 0,
    ':companyName' => $input['companyName'],
    ':companyAddress' => $input['companyAddress'],
    ':companyEmail' => $input['companyEmail'],
    ':companyPhone' => $input['companyPhone'],
    ':logoUrl' => $input['logoUrl'],
    ':vatNumber' => $input['vatNumber'],
    ':termsText' => $input['termsText'],
    ':termsUrl' => $input['termsUrl'],
]);

if ($success) {
    echo json_encode(['success' => true, 'message' => 'Instellingen succesvol opgeslagen.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Opslaan van instellingen mislukt.']);
}
