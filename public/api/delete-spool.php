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

if (!$data || empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'ID is verplicht.']);
    exit;
}

$id = (int) $data['id'];

try {
    $stmt = $pdo->prepare("DELETE FROM material_spools WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verwijderen rol: ' . $e->getMessage()]);
}
