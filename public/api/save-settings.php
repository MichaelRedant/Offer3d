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

// Vereiste velden controleren
$required = ['standaardWinstmarge', 'elektriciteitsprijs', 'vasteStartkost', 'vervoerskost', 'modelleringTarief', 'btw', 'korting'];
foreach ($required as $field) {
    if (!isset($input[$field]) || !is_numeric($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Ongeldig of ontbrekend veld: $field"]);
        exit;
    }
}

require_once __DIR__ . '/db.php';

$conn->query("
    CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY,
        standaard_winstmarge_perc DECIMAL(6,2) NOT NULL DEFAULT 25.00,
        elektriciteitsprijs DECIMAL(10,4) NOT NULL DEFAULT 0.22,
        vaste_startkost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        vervoerskost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00,
        btw DECIMAL(6,2) NOT NULL DEFAULT 21.00,
        korting_perc DECIMAL(6,2) NOT NULL DEFAULT 0.00
    )
");

$columnCheck = $conn->query("SHOW COLUMNS FROM settings LIKE 'modellerings_tarief_per_uur'");
if ($columnCheck && $columnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE settings ADD COLUMN modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00");
    $conn->query("UPDATE settings SET modellerings_tarief_per_uur = 40.00 WHERE modellerings_tarief_per_uur IS NULL");
}

$sql = "REPLACE INTO settings (
            id,
            standaard_winstmarge_perc,
            elektriciteitsprijs,
            vaste_startkost,
            vervoerskost,
            modellerings_tarief_per_uur,
            btw,
            korting_perc
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "ddddddd",
    $input['standaardWinstmarge'],
    $input['elektriciteitsprijs'],
    $input['vasteStartkost'],
    $input['vervoerskost'],
    $input['modelleringTarief'],
    $input['btw'],
    $input['korting']
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Instellingen succesvol opgeslagen.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Opslaan van instellingen mislukt.']);
}
