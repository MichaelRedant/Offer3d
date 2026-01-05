<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$data = json_decode(file_get_contents('php://input'), true);
$invoiceId = isset($data['id']) ? (int) $data['id'] : 0;

if ($invoiceId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Factuur ID ontbreekt.']);
    exit;
}

try {
    ensureInvoiceTables($pdo);

    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?")->execute([$invoiceId]);
    $deleted = $pdo->prepare("DELETE FROM invoices WHERE id = ?")->execute([$invoiceId]);
    $pdo->commit();

    if (!$deleted) {
        throw new RuntimeException('Factuur kon niet verwijderd worden.');
    }

    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij verwijderen factuur: ' . $e->getMessage()]);
}
