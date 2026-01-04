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

$data = json_decode(file_get_contents("php://input"), true);

if (
    !$data ||
    empty($data['id']) ||
    empty($data['material_id'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'ID en material_id zijn verplicht.']);
    exit;
}

$allowedStatuses = ['sealed', 'open', 'reserve', 'empty'];
$status = in_array($data['status'] ?? '', $allowedStatuses, true) ? $data['status'] : 'sealed';

$id = (int) $data['id'];
$materialId = (int) $data['material_id'];
$label = trim($data['label'] ?? '');
$locatie = trim($data['locatie'] ?? '');
$batchCode = trim($data['batch_code'] ?? '');
$aankoopDatum = !empty($data['aankoop_datum']) ? $data['aankoop_datum'] : null;
$notities = trim($data['notities'] ?? '');
$gewichtNetto = isset($data['gewicht_netto_gram']) ? max(0, (int) $data['gewicht_netto_gram']) : 0;
$gewichtRest = array_key_exists('gewicht_rest_gram', $data) && $data['gewicht_rest_gram'] !== ''
    ? max(0, (int) $data['gewicht_rest_gram'])
    : $gewichtNetto;

try {
    $stmt = $pdo->prepare("
        UPDATE material_spools SET
            material_id = :material_id,
            label = :label,
            status = :status,
            locatie = :locatie,
            gewicht_netto_gram = :gewicht_netto_gram,
            gewicht_rest_gram = :gewicht_rest_gram,
            batch_code = :batch_code,
            aankoop_datum = :aankoop_datum,
            notities = :notities
        WHERE id = :id
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
        ':notities' => $notities ?: null,
        ':id' => $id,
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij bijwerken rol: ' . $e->getMessage()]);
}
