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

$clientId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($clientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig klant ID.']);
    exit;
}

try {
    $clientStmt = $pdo->prepare("SELECT id, naam, bedrijf, btw_nummer FROM clients WHERE id = ? LIMIT 1");
    $clientStmt->execute([$clientId]);
    $client = $clientStmt->fetch(PDO::FETCH_ASSOC);
    if (!$client) {
        http_response_code(404);
        echo json_encode(['error' => 'Klant niet gevonden.']);
        exit;
    }

    $totalsStmt = $pdo->prepare("SELECT 
        COUNT(*) AS quote_count,
        SUM(totaal_netto) AS total_netto,
        SUM(totaal_btw) AS total_btw,
        SUM(totaal_bruto) AS total_bruto,
        MAX(datum) AS last_quote_date
    FROM quotes WHERE client_id = ?");
    $totalsStmt->execute([$clientId]);
    $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $itemsStmt = $pdo->prepare("SELECT 
        SUM(qi.gewicht_g) AS total_weight_g,
        SUM(qi.aantal) AS total_items
    FROM quote_items qi
    JOIN quotes q ON qi.quote_id = q.id
    WHERE q.client_id = ?");
    $itemsStmt->execute([$clientId]);
    $itemsTotals = $itemsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $recentStmt = $pdo->prepare("SELECT id, datum, totaal_bruto, status FROM quotes WHERE client_id = ? ORDER BY datum DESC LIMIT 10");
    $recentStmt->execute([$clientId]);
    $recent = $recentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    echo json_encode([
        'client' => $client,
        'quote_count' => (int)($totals['quote_count'] ?? 0),
        'total_netto' => (float)($totals['total_netto'] ?? 0),
        'total_btw' => (float)($totals['total_btw'] ?? 0),
        'total_bruto' => (float)($totals['total_bruto'] ?? 0),
        'last_quote_date' => $totals['last_quote_date'] ?? null,
        'total_weight_g' => (float)($itemsTotals['total_weight_g'] ?? 0),
        'total_items' => (int)($itemsTotals['total_items'] ?? 0),
        'recent_quotes' => $recent,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen statistieken: ' . $e->getMessage()]);
}
