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

if (!$data || empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig ID meegegeven.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Ontkoppel materialen die deze fabrikant refereren om FK-conflict te voorkomen
    $unlink = $pdo->prepare("UPDATE materials SET manufacturer_id = NULL WHERE manufacturer_id = :id");
    $unlink->execute([':id' => (int) $data['id']]);

    $stmt = $pdo->prepare("DELETE FROM manufacturers WHERE id = :id");
    $stmt->execute([':id' => (int) $data['id']]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Fabrikant niet gevonden.']);
        exit;
    }

    $pdo->commit();

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Kan niet verwijderen: fabrikant is nog gekoppeld. Ontkoppel eerst.']);
        exit;
    }
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verwijderen fabrikant: ' . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verwijderen fabrikant: ' . $e->getMessage()]);
}
