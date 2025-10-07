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

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['naam']) || empty($data['naam'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Naam is verplicht']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO manufacturers (naam, land, website) VALUES (?, ?, ?)");
    $stmt->execute([
        $data['naam'],
        $data['land'] ?? null,
        $data['website'] ?? null
    ]);

    $insertedId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'manufacturer' => [
            'id' => $insertedId,
            'naam' => $data['naam'],
            'land' => $data['land'] ?? '',
            'website' => $data['website'] ?? '',
            'materiaal_count' => 0
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Fout bij toevoegen: ' . $e->getMessage()]);
}
