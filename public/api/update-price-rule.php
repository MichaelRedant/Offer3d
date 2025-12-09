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

$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? (int) $data['id'] : 0;
$materialId = isset($data['material_id']) ? (int) $data['material_id'] : null;
$clientId = isset($data['client_id']) ? (int) $data['client_id'] : null;
$segment = isset($data['segment']) ? trim($data['segment']) : null;
$minQty = isset($data['min_qty']) ? (float) $data['min_qty'] : 0;
$pricePerUnit = isset($data['price_per_unit']) ? (float) $data['price_per_unit'] : null;
$marginOverride = isset($data['margin_override']) ? (float) $data['margin_override'] : null;
$validFrom = !empty($data['valid_from']) ? $data['valid_from'] : null;
$validTo = !empty($data['valid_to']) ? $data['valid_to'] : null;
$active = isset($data['active']) ? (int) $data['active'] : 1;

if ($id <= 0 || !$materialId || ($pricePerUnit === null && $marginOverride === null)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige input.']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        UPDATE price_rules
        SET client_id = :client_id,
            segment = :segment,
            material_id = :material_id,
            min_qty = :min_qty,
            price_per_unit = :price_per_unit,
            margin_override = :margin_override,
            valid_from = :valid_from,
            valid_to = :valid_to,
            active = :active
        WHERE id = :id
    ");
    $stmt->execute([
        ':client_id' => $clientId ?: null,
        ':segment' => $segment ?: null,
        ':material_id' => $materialId,
        ':min_qty' => $minQty,
        ':price_per_unit' => $pricePerUnit,
        ':margin_override' => $marginOverride,
        ':valid_from' => $validFrom,
        ':valid_to' => $validTo,
        ':active' => $active,
        ':id' => $id,
    ]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Regel niet gevonden.']);
        exit;
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij bijwerken prijslijstregel: ' . $e->getMessage()]);
}
