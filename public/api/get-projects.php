<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$userId = 1; // gesimuleerde user

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : null;

try {
    ensureProjectTables($pdo);
    ensureClientExtendedColumns($pdo);

    $sql = "
        SELECT 
            p.*,
            c.naam AS klant_naam,
            c.bedrijf AS klant_bedrijf,
            q.quote_number,
            q.id AS quote_ref
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN quotes q ON p.quote_id = q.id
        WHERE p.user_id = :uid
    ";
    $params = [':uid' => $userId];

    if ($statusFilter && $statusFilter !== 'all') {
        $sql .= " AND p.status = :status";
        $params[':status'] = $statusFilter;
    }

    $sql .= " ORDER BY p.updated_at DESC, p.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($projects ?? [], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen projecten: ' . $e->getMessage()]);
}
