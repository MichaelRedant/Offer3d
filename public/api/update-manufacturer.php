<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (
    !$data || empty($data['id']) || empty($data['naam'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'ID en naam zijn verplicht.']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        UPDATE manufacturers 
        SET naam = :naam, land = :land, website = :website 
        WHERE id = :id
    ");
    $stmt->execute([
        ':naam' => $data['naam'],
        ':land' => $data['land'] ?? null,
        ':website' => $data['website'] ?? null,
        ':id' => (int) $data['id'],
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij updaten fabrikant: ' . $e->getMessage()]);
}
