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

$userId = 1; // Gesimuleerde ingelogde gebruiker
$data = json_decode(file_get_contents("php://input"), true);

$allowedStatuses = ['draft', 'review', 'verstuurd', 'geaccepteerd', 'afgewezen'];

$quoteId = isset($data['id']) ? intval($data['id']) : 0;
$status = isset($data['status']) ? strtolower(trim($data['status'])) : '';
$message = isset($data['message']) ? trim($data['message']) : null;

if ($quoteId <= 0 || !in_array($status, $allowedStatuses, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige input.']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE quotes SET status = ?, status_updated_at = NOW() WHERE id = ? AND user_id = ?");
    $stmt->execute([$status, $quoteId, $userId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Offerte niet gevonden.']);
        exit;
    }

    // Log event (vereist quote_events tabel)
    try {
        $evt = $pdo->prepare("INSERT INTO quote_events (quote_id, status, message) VALUES (?, ?, ?)");
        $evt->execute([$quoteId, $status, $message]);
    } catch (PDOException $e) {
        // Niet fataal; log verder niet
    }

    echo json_encode(['success' => true, 'status' => $status]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij bijwerken status: ' . $e->getMessage()]);
}
