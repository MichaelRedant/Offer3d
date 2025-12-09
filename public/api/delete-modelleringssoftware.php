<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';


$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig ID opgegeven.']);
    exit;
}

try {
    // Check of deze software nog gebruikt wordt in offertes
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM quote_items WHERE modelleringssoftware_id = ?");
    $stmtCheck->execute([$id]);
    if ($stmtCheck->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Deze software wordt nog gebruikt in offertes.']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM modelleringssoftware WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Kan niet verwijderen: deze software is nog gekoppeld. Ontkoppel eerst.']);
        exit;
    }
    http_response_code(500);
    echo json_encode(['error' => 'Verwijderen mislukt: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Verwijderen mislukt: ' . $e->getMessage()]);
}
