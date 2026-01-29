<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE :column");
    $stmt->execute([':column' => $column]);
    return $stmt->fetchColumn() !== false;
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
    $stmt->execute([':table' => $table]);
    return $stmt->fetchColumn() !== false;
}

if (!tableExists($pdo, 'material_spools')) {
    http_response_code(400);
    echo json_encode(['error' => 'Tabel material_spools ontbreekt. Voer de migratie uit (zie public/api/sql/material_spools.sql).']);
    exit;
}

// Zorg voor droogstatus kolommen
try {
    if (!columnExists($pdo, 'material_spools', 'dried_at')) {
        $pdo->exec("ALTER TABLE material_spools ADD COLUMN dried_at DATE NULL DEFAULT NULL AFTER batch_code");
    }
    if (!columnExists($pdo, 'material_spools', 'dry_valid_until')) {
        $pdo->exec("ALTER TABLE material_spools ADD COLUMN dry_valid_until DATE NULL DEFAULT NULL AFTER dried_at");
    }
    if (!columnExists($pdo, 'material_spools', 'purchase_price_eur')) {
        $pdo->exec("ALTER TABLE material_spools ADD COLUMN purchase_price_eur DECIMAL(12,2) NULL DEFAULT NULL AFTER dry_valid_until");
    }
    if (!columnExists($pdo, 'material_spools', 'overhead_eur')) {
        $pdo->exec("ALTER TABLE material_spools ADD COLUMN overhead_eur DECIMAL(12,2) NULL DEFAULT NULL AFTER purchase_price_eur");
    }
} catch (Exception $e) {
    // stilzwijgend doorgaan
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['material_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Material_id is verplicht.']);
    exit;
}

$allowedStatuses = ['sealed', 'open', 'reserve', 'empty'];
$status = in_array($data['status'] ?? '', $allowedStatuses, true) ? $data['status'] : 'sealed';

$materialId = (int) $data['material_id'];
$label = trim($data['label'] ?? '');
$locatie = trim($data['locatie'] ?? '');
$batchCode = trim($data['batch_code'] ?? '');
$aankoopDatum = !empty($data['aankoop_datum']) ? $data['aankoop_datum'] : null;
$driedAt = !empty($data['dried_at']) ? $data['dried_at'] : null;
$dryValidUntil = !empty($data['dry_valid_until']) ? $data['dry_valid_until'] : null;
$purchasePrice = isset($data['purchase_price_eur']) ? (float)$data['purchase_price_eur'] : null;
$overhead = isset($data['overhead_eur']) ? (float)$data['overhead_eur'] : null;
$notities = trim($data['notities'] ?? '');
$gewichtNetto = isset($data['gewicht_netto_gram']) ? max(0, (int) $data['gewicht_netto_gram']) : 0;
$gewichtRest = array_key_exists('gewicht_rest_gram', $data) && $data['gewicht_rest_gram'] !== ''
    ? max(0, (int) $data['gewicht_rest_gram'])
    : $gewichtNetto;

try {
    $stmt = $pdo->prepare("
        INSERT INTO material_spools 
            (material_id, label, status, locatie, gewicht_netto_gram, gewicht_rest_gram, batch_code, aankoop_datum, dried_at, dry_valid_until, purchase_price_eur, overhead_eur, notities)
        VALUES 
            (:material_id, :label, :status, :locatie, :gewicht_netto_gram, :gewicht_rest_gram, :batch_code, :aankoop_datum, :dried_at, :dry_valid_until, :purchase_price_eur, :overhead_eur, :notities)
    ");

    $stmt->execute([
        ':material_id' => $materialId,
        ':label' => $label,
        ':status' => $status,
        ':locatie' => $locatie,
        ':gewicht_netto_gram' => $gewichtNetto,
        ':gewicht_rest_gram' => $gewichtRest,
        ':batch_code' => $batchCode ?: null,
        ':aankoop_datum' => $aankoopDatum,
        ':dried_at' => $driedAt ?: null,
        ':dry_valid_until' => $dryValidUntil ?: null,
        ':purchase_price_eur' => $purchasePrice !== null ? $purchasePrice : null,
        ':overhead_eur' => $overhead !== null ? $overhead : null,
        ':notities' => $notities ?: null,
    ]);

    $id = (int) $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'spool' => [
            'id' => $id,
            'material_id' => $materialId,
            'label' => $label,
            'status' => $status,
            'locatie' => $locatie,
            'gewicht_netto_gram' => $gewichtNetto,
            'gewicht_rest_gram' => $gewichtRest,
            'batch_code' => $batchCode ?: null,
            'aankoop_datum' => $aankoopDatum,
            'dried_at' => $driedAt ?: null,
            'dry_valid_until' => $dryValidUntil ?: null,
            'purchase_price_eur' => $purchasePrice !== null ? $purchasePrice : null,
            'overhead_eur' => $overhead !== null ? $overhead : null,
            'notities' => $notities ?: null,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan rol: ' . $e->getMessage()]);
}
