<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig ID meegegeven.']);
    exit;
}

try {
    $stmt = $conn->prepare("DELETE FROM manufacturers WHERE id = ?");
    $stmt->bind_param("i", $data['id']);
    $stmt->execute();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verwijderen fabrikant: ' . $e->getMessage()]);
}
