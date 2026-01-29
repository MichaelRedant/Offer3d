<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
    $stmt->execute([':table' => $table]);
    return $stmt->fetchColumn() !== false;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['spool_id']) || empty($data['quantity_grams'])) {
    http_response_code(400);
    echo json_encode(['error' => 'spool_id en quantity_grams zijn verplicht.']);
    exit;
}

$spoolId = (int) $data['spool_id'];
$qty = max(0, (float) $data['quantity_grams']);
$projectId = !empty($data['project_id']) ? (int) $data['project_id'] : null;
$quoteId = !empty($data['quote_id']) ? (int) $data['quote_id'] : null;
$note = isset($data['note']) ? trim($data['note']) : null;

try {
    ensureSpoolUsageTable($pdo);

    if (!tableExists($pdo, 'material_spools')) {
        throw new Exception('Tabel material_spools ontbreekt.');
    }

    // Haal huidige restgewicht op
    $stmt = $pdo->prepare("SELECT gewicht_rest_gram, gewicht_netto_gram FROM material_spools WHERE id = :id");
    $stmt->execute([':id' => $spoolId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception('Rol niet gevonden.');
    }

    $currentRest = isset($row['gewicht_rest_gram']) ? (float) $row['gewicht_rest_gram'] : (float) $row['gewicht_netto_gram'];
    $newRest = max(0, $currentRest - $qty);

    // Update restgewicht
    $update = $pdo->prepare("UPDATE material_spools SET gewicht_rest_gram = :rest WHERE id = :id");
    $update->execute([':rest' => $newRest, ':id' => $spoolId]);

    // Log usage
    $insert = $pdo->prepare("
        INSERT INTO material_spool_usage (spool_id, project_id, quote_id, quantity_grams, note)
        VALUES (:spool_id, :project_id, :quote_id, :qty, :note)
    ");
    $insert->execute([
        ':spool_id' => $spoolId,
        ':project_id' => $projectId,
        ':quote_id' => $quoteId,
        ':qty' => $qty,
        ':note' => $note ?: null,
    ]);

    echo json_encode([
        'success' => true,
        'spool_id' => $spoolId,
        'new_rest' => $newRest,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verbruik loggen: ' . $e->getMessage()]);
}
