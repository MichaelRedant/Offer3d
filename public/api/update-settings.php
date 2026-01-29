<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

// Haal JSON-body op (werkt niet met $_POST!)
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldige JSON ontvangen.']);
    exit;
}

// Check op aanwezigheid keys (0 is geldig, dus check op bestaan)
$required = [
    'standaardWinstmarge',
    'elektriciteitsprijs',
    'vasteStartkost',
    'vervoerskost',
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
    'iban',
    'bic',
    'companyStreet',
    'companyPostalCode',
    'companyCity',
    'companyCountryCode',
    'peppolEndpointId',
    'peppolScheme',
    'defaultDueDays',
    'paymentTerms',
    'postCost',
];
foreach ($required as $key) {
    if (!array_key_exists($key, $data)) {
        http_response_code(400);
        echo json_encode(['error' => "Veld ontbreekt: $key"]);
        exit;
    }
}

try {
    ensureSettingsExtendedColumns($pdo);

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
        "iban VARCHAR(34) NULL",
        "bic VARCHAR(32) NULL",
        "company_street VARCHAR(255) NULL",
        "company_postal_code VARCHAR(32) NULL",
        "company_city VARCHAR(128) NULL",
        "company_country_code VARCHAR(4) NULL DEFAULT 'BE'",
        "peppol_endpoint_id VARCHAR(64) NULL",
        "peppol_scheme VARCHAR(16) NULL",
        "default_due_days INT NOT NULL DEFAULT 14",
        "payment_terms TEXT NULL",
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
        INSERT INTO settings (
            id,
            standaard_winstmarge_perc,
            elektriciteitsprijs,
            vaste_startkost,
            vervoerskost,
            modellerings_tarief_per_uur,
            btw,
            korting_perc,
            company_name,
            company_address,
            company_email,
            company_phone,
            logo_url,
            vat_number,
            terms_text,
            terms_url,
            iban,
            bic,
            company_street,
            company_postal_code,
            company_city,
            company_country_code,
        peppol_endpoint_id,
        peppol_scheme,
        default_due_days,
        payment_terms,
        post_cost
    ) VALUES (
        1,
        :standaardWinstmarge,
        :elektriciteitsprijs,
        :vasteStartkost,
            :vervoerskost,
            :modelleringTarief,
            :btw,
            :korting,
            :companyName,
            :companyAddress,
            :companyEmail,
            :companyPhone,
            :logoUrl,
            :vatNumber,
            :termsText,
            :termsUrl,
            :iban,
            :bic,
            :companyStreet,
            :companyPostalCode,
            :companyCity,
            :companyCountryCode,
            :peppolEndpointId,
            :peppolScheme,
            :defaultDueDays,
            :paymentTerms,
            :postCost
        )
        ON DUPLICATE KEY UPDATE
            standaard_winstmarge_perc = VALUES(standaard_winstmarge_perc),
            elektriciteitsprijs = VALUES(elektriciteitsprijs),
            vaste_startkost = VALUES(vaste_startkost),
            vervoerskost = VALUES(vervoerskost),
            modellerings_tarief_per_uur = VALUES(modellerings_tarief_per_uur),
            btw = VALUES(btw),
            korting_perc = VALUES(korting_perc),
            company_name = VALUES(company_name),
            company_address = VALUES(company_address),
            company_email = VALUES(company_email),
            company_phone = VALUES(company_phone),
            logo_url = VALUES(logo_url),
            vat_number = VALUES(vat_number),
            terms_text = VALUES(terms_text),
            terms_url = VALUES(terms_url),
            iban = VALUES(iban),
            bic = VALUES(bic),
            company_street = VALUES(company_street),
            company_postal_code = VALUES(company_postal_code),
            company_city = VALUES(company_city),
            company_country_code = VALUES(company_country_code),
            peppol_endpoint_id = VALUES(peppol_endpoint_id),
            peppol_scheme = VALUES(peppol_scheme),
            default_due_days = VALUES(default_due_days),
            payment_terms = VALUES(payment_terms),
            post_cost = VALUES(post_cost)
    ");

    $stmt->execute([
        ':standaardWinstmarge' => (float)$data['standaardWinstmarge'],
        ':elektriciteitsprijs' => (float)$data['elektriciteitsprijs'],
        ':vasteStartkost' => (float)$data['vasteStartkost'],
        ':vervoerskost' => (float)$data['vervoerskost'],
        ':modelleringTarief' => (float)$data['modelleringTarief'],
        ':btw' => (float)$data['btw'],
        ':korting' => (float)$data['korting'],
        ':companyName' => $data['companyName'],
        ':companyAddress' => $data['companyAddress'],
        ':companyEmail' => $data['companyEmail'],
        ':companyPhone' => $data['companyPhone'],
        ':logoUrl' => $data['logoUrl'],
        ':vatNumber' => $data['vatNumber'],
        ':termsText' => $data['termsText'],
        ':termsUrl' => $data['termsUrl'],
        ':iban' => $data['iban'],
        ':bic' => $data['bic'],
        ':companyStreet' => $data['companyStreet'],
        ':companyPostalCode' => $data['companyPostalCode'],
        ':companyCity' => $data['companyCity'],
        ':companyCountryCode' => $data['companyCountryCode'],
        ':peppolEndpointId' => $data['peppolEndpointId'],
        ':peppolScheme' => $data['peppolScheme'],
        ':defaultDueDays' => (int)$data['defaultDueDays'],
        ':paymentTerms' => $data['paymentTerms'],
        ':postCost' => isset($data['postCost']) ? (float)$data['postCost'] : 7.0,
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Instellingen opslaan mislukt: ' . $e->getMessage()]);
}
