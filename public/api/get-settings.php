<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

try {
    ensureSettingsExtendedColumns($pdo);

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
            company_name VARCHAR(255) NULL,
            company_address TEXT NULL,
            company_email VARCHAR(255) NULL,
            company_phone VARCHAR(64) NULL,
            logo_url VARCHAR(512) NULL,
            vat_number VARCHAR(64) NULL,
            terms_text TEXT NULL,
            terms_url VARCHAR(512) NULL,
            iban VARCHAR(34) NULL,
            bic VARCHAR(32) NULL,
            company_street VARCHAR(255) NULL,
            company_postal_code VARCHAR(32) NULL,
            company_city VARCHAR(128) NULL,
            company_country_code VARCHAR(4) NULL DEFAULT 'BE',
            peppol_endpoint_id VARCHAR(64) NULL,
            peppol_scheme VARCHAR(16) NULL,
            default_due_days INT NOT NULL DEFAULT 14,
            payment_terms TEXT NULL
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
        "iban VARCHAR(34) NULL",
        "bic VARCHAR(32) NULL",
        "company_street VARCHAR(255) NULL",
        "company_postal_code VARCHAR(32) NULL",
        "company_city VARCHAR(128) NULL",
        "company_country_code VARCHAR(4) NULL DEFAULT 'BE'",
        "peppol_endpoint_id VARCHAR(64) NULL",
        "peppol_scheme VARCHAR(16) NULL",
        "default_due_days INT NOT NULL DEFAULT 14",
        "payment_terms TEXT NULL"
    ];
    foreach ($addColumns as $colDef) {
        $colName = explode(' ', $colDef)[0];
        $columnCheck = $pdo->prepare("SHOW COLUMNS FROM settings LIKE ?");
        $columnCheck->execute([$colName]);
        if (!$columnCheck->fetch()) {
            $pdo->exec("ALTER TABLE settings ADD COLUMN $colDef");
        }
    }

    $stmt = $pdo->prepare("SELECT * FROM settings WHERE id = 1");
    $stmt->execute();
    $row = $stmt->fetch();

    if ($row) {
        echo json_encode([
            'standaardWinstmarge' => (float) $row['standaard_winstmarge_perc'],
            'elektriciteitsprijs'   => (float) $row['elektriciteitsprijs'],
            'vasteStartkost'        => (float) $row['vaste_startkost'],
            'vervoerskost'          => (float) $row['vervoerskost'],
            'modelleringsTarief'    => isset($row['modellerings_tarief_per_uur'])
                ? (float) $row['modellerings_tarief_per_uur']
                : 40.0,
            'btw'                   => (float) $row['btw'],
            'korting'               => (float) $row['korting_perc'],
            'companyName'           => $row['company_name'] ?? '',
            'companyAddress'        => $row['company_address'] ?? '',
            'companyEmail'          => $row['company_email'] ?? '',
            'companyPhone'          => $row['company_phone'] ?? '',
            'logoUrl'               => $row['logo_url'] ?? '',
            'vatNumber'             => $row['vat_number'] ?? '',
            'termsText'             => $row['terms_text'] ?? '',
            'termsUrl'              => $row['terms_url'] ?? '',
            'iban'                  => $row['iban'] ?? '',
            'bic'                   => $row['bic'] ?? '',
            'companyStreet'         => $row['company_street'] ?? '',
            'companyPostalCode'     => $row['company_postal_code'] ?? '',
            'companyCity'           => $row['company_city'] ?? '',
            'companyCountryCode'    => $row['company_country_code'] ?? 'BE',
            'peppolEndpointId'      => $row['peppol_endpoint_id'] ?? '',
            'peppolScheme'          => $row['peppol_scheme'] ?? '',
            'defaultDueDays'        => isset($row['default_due_days']) ? (int) $row['default_due_days'] : 14,
            'paymentTerms'          => $row['payment_terms'] ?? '',
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $defaults = [
            'standaardWinstmarge' => 25,
            'elektriciteitsprijs' => 0.22,
            'vasteStartkost'      => 10,
            'vervoerskost'        => 15,
            'modelleringsTarief'  => 40,
            'btw'                 => 21,
            'korting'             => 0,
            'companyName'         => '',
            'companyAddress'      => '',
            'companyEmail'        => '',
            'companyPhone'        => '',
            'logoUrl'             => '',
            'vatNumber'           => '',
            'termsText'           => '',
            'termsUrl'            => '',
            'iban'                => '',
            'bic'                 => '',
            'companyStreet'       => '',
            'companyPostalCode'   => '',
            'companyCity'         => '',
            'companyCountryCode'  => 'BE',
            'peppolEndpointId'    => '',
            'peppolScheme'        => '',
            'defaultDueDays'      => 14,
            'paymentTerms'        => '',
        ];

        $pdo->prepare("
            INSERT INTO settings (
                id,
                standaard_winstmarge_perc,
                elektriciteitsprijs,
                vaste_startkost,
                vervoerskost,
                modellerings_tarief_per_uur,
                btw,
                korting_perc
            ) VALUES (
                1, :winst, :elek, :start, :vervoer, :model, :btw, :korting
            )
        ")->execute([
            ':winst' => $defaults['standaardWinstmarge'],
            ':elek' => $defaults['elektriciteitsprijs'],
            ':start' => $defaults['vasteStartkost'],
            ':vervoer' => $defaults['vervoerskost'],
            ':model' => $defaults['modelleringsTarief'],
            ':btw' => $defaults['btw'],
            ':korting' => $defaults['korting'],
        ]);

        echo json_encode($defaults, JSON_UNESCAPED_UNICODE);
    }

} catch (PDOException $e) {
    file_put_contents(__DIR__ . '/debug.log', 'DB ERROR (get-settings): ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen instellingen']);
    exit;
}
