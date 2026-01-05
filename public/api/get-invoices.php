<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

try {
    ensureInvoiceTables($pdo);
    $stmt = $pdo->prepare("SELECT i.*, c.naam AS client_name, c.bedrijf AS client_company FROM invoices i LEFT JOIN clients c ON i.client_id = c.id ORDER BY i.issue_date DESC, i.id DESC");
    $stmt->execute();
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    echo json_encode($invoices, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen facturen: ' . $e->getMessage()]);
}
