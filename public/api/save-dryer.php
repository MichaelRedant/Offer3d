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

if (!$data || !isset($data['merk'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Merk is verplicht.']);
    exit;
}

try {
    $stmt = isset($data['id'])
        ? $pdo->prepare("UPDATE dryers SET merk = ?, kostprijs = ?, verbruik_watt = ? WHERE id = ?")
        : $pdo->prepare("INSERT INTO dryers (merk, kostprijs, verbruik_watt) VALUES (?, ?, ?)");

    $params = [
        $data['merk'],
        $data['kostprijs'] ?? 0,
        $data['verbruik_watt'] ?? 0
    ];

    if (isset($data['id'])) {
        $params[] = $data['id'];
    }

    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan: ' . $e->getMessage()]);
}
