<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents("php://input"), true);
$userId = 1; // ← simulatie, later vervangen door sessie/JWT
$clientId = $data['id'] ?? null;

if (!is_numeric($clientId) || $clientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldig klant-ID.']);
    exit;
}

// ✅ Check of klant nog in gebruik is
$stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM quotes WHERE client_id = ? AND user_id = ?");
$stmtCheck->execute([$clientId, $userId]);
$linkedQuotes = $stmtCheck->fetchColumn();

if ($linkedQuotes > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Deze klant is gelinkt aan bestaande offertes.']);
    exit;
}

// ✅ Verwijder klant
$stmtDelete = $pdo->prepare("DELETE FROM clients WHERE id = ? AND user_id = ?");
$success = $stmtDelete->execute([$clientId, $userId]);

if ($success) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Verwijderen van klant is mislukt.']);
}
