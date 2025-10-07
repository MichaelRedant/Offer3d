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
$userId = 1; // ← simulatie van ingelogde gebruiker

if (!isset($data['id']) || !is_numeric($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig offerte ID opgegeven.']);
    exit;
}

$quoteId = intval($data['id']);

try {
    // 🛡️ Extra check (optioneel): bestaat deze offerte wel voor deze user?
    $check = $pdo->prepare("SELECT id FROM quotes WHERE id = ? AND user_id = ?");
    $check->execute([$quoteId, $userId]);
    if ($check->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Offerte niet gevonden of geen toegang.']);
        exit;
    }

    $pdo->beginTransaction();

    // 🗑️ 1. Verwijder bijhorende items
    $stmtItems = $pdo->prepare("DELETE FROM quote_items WHERE quote_id = ?");
    $stmtItems->execute([$quoteId]);

    // 🗑️ 2. Verwijder de quote zelf
    $stmtQuote = $pdo->prepare("DELETE FROM quotes WHERE id = ? AND user_id = ?");
    $stmtQuote->execute([$quoteId, $userId]);

    $pdo->commit();

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Verwijderen mislukt: ' . $e->getMessage()]);
}
