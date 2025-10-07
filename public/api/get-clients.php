<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simuleer ingelogde gebruiker
$user_id = 1;

try {
    $stmt = $pdo->prepare("SELECT * FROM clients WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($clients, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout: ' . $e->getMessage()]);
}
