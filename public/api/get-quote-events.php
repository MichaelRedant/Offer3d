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

$quoteId = isset($_GET['quote_id']) ? (int) $_GET['quote_id'] : 0;
$limit = isset($_GET['limit']) ? max(1, min(100, (int) $_GET['limit'])) : 50;

if ($quoteId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldig offerte ID.']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, quote_id, status, message, created_at
        FROM quote_events
        WHERE quote_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
    ");
    $stmt->bindValue(1, $quoteId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($events);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen events: ' . $e->getMessage()]);
}
