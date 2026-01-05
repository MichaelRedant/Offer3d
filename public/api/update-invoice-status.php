<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$data = json_decode(file_get_contents('php://input'), true);
$invoiceId = isset($data['id']) ? (int)$data['id'] : 0;
$status = isset($data['status']) ? strtolower(trim((string)$data['status'])) : '';

$allowed = ['draft', 'ready', 'sent', 'delivered', 'accepted', 'paid', 'failed', 'cancelled'];
if ($invoiceId <= 0 || !in_array($status, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige input.']);
    exit;
}

try {
    ensureInvoiceTables($pdo);
    $stmt = $pdo->prepare("UPDATE invoices SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$status, $invoiceId]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Factuur niet gevonden.']);
        exit;
    }

    echo json_encode(['success' => true, 'status' => $status]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij bijwerken status: ' . $e->getMessage()]);
}
