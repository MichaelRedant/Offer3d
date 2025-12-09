<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->query("
        SELECT id, client_id, segment, material_id, min_qty, price_per_unit, margin_override,
               valid_from, valid_to, active, created_at
        FROM price_rules
        ORDER BY created_at DESC
    ");
    $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rules);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen prijslijsten: ' . $e->getMessage()]);
}
