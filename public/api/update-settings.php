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

// ✅ Haal JSON-body op (werkt niet met $_POST!)
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// 🔍 Debug eventueel tijdelijk:
// file_put_contents("debug_input.json", $input);

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldige JSON ontvangen.']);
    exit;
}

// ✅ Check op aanwezigheid keys (0 is geldig, dus check op bestaan)
$required = ['standaardWinstmarge', 'elektriciteitsprijs', 'vasteStartkost', 'vervoerskost', 'modelleringTarief', 'btw', 'korting'];
foreach ($required as $key) {
    if (!array_key_exists($key, $data)) {
        http_response_code(400);
        echo json_encode(['error' => "Veld ontbreekt: $key"]);
        exit;
    }
}

try {
    $columnCheck = $pdo->query("SHOW COLUMNS FROM settings LIKE 'modellerings_tarief_per_uur'");
    if ($columnCheck && !$columnCheck->fetch()) {
        $pdo->exec("ALTER TABLE settings ADD COLUMN modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00");
        $pdo->exec("UPDATE settings SET modellerings_tarief_per_uur = 40.00 WHERE modellerings_tarief_per_uur IS NULL");
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
            korting_perc
        ) VALUES (
            1,
            :standaardWinstmarge,
            :elektriciteitsprijs,
            :vasteStartkost,
            :vervoerskost,
            :modelleringTarief,
            :btw,
            :korting
        )
        ON DUPLICATE KEY UPDATE
            standaard_winstmarge_perc = VALUES(standaard_winstmarge_perc),
            elektriciteitsprijs = VALUES(elektriciteitsprijs),
            vaste_startkost = VALUES(vaste_startkost),
            vervoerskost = VALUES(vervoerskost),
            modellerings_tarief_per_uur = VALUES(modellerings_tarief_per_uur),
            btw = VALUES(btw),
            korting_perc = VALUES(korting_perc)
    ");

    $stmt->execute([
        ':standaardWinstmarge' => (float)$data['standaardWinstmarge'],
        ':elektriciteitsprijs' => (float)$data['elektriciteitsprijs'],
        ':vasteStartkost' => (float)$data['vasteStartkost'],
        ':vervoerskost' => (float)$data['vervoerskost'],
        ':modelleringTarief' => (float)$data['modelleringTarief'],
        ':btw' => (float)$data['btw'],
        ':korting' => (float)$data['korting'],
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Instellingen opslaan mislukt: ' . $e->getMessage()]);
}
