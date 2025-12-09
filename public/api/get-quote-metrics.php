<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

$userId = 1;

try {
    // Per status
    $statusStmt = $pdo->prepare("
        SELECT status, COUNT(*) AS cnt, SUM(totaal_bruto) AS totaal_bruto
        FROM quotes
        WHERE user_id = ?
        GROUP BY status
    ");
    $statusStmt->execute([$userId]);
    $statusRows = $statusStmt->fetchAll(PDO::FETCH_ASSOC);
    $statusCounts = [];
    $acceptedTotal = 0;
    foreach ($statusRows as $row) {
        $statusCounts[$row['status'] ?? 'onbekend'] = [
            'count' => (int) $row['cnt'],
            'totaal_bruto' => (float) ($row['totaal_bruto'] ?? 0),
        ];
        if (($row['status'] ?? '') === 'geaccepteerd') {
            $acceptedTotal = (float) ($row['totaal_bruto'] ?? 0);
        }
    }

    // Hitrate
    $totalQuotesStmt = $pdo->prepare("SELECT COUNT(*) FROM quotes WHERE user_id = ?");
    $totalQuotesStmt->execute([$userId]);
    $totalQuotes = (int) $totalQuotesStmt->fetchColumn();
    $acceptedCount = $statusCounts['geaccepteerd']['count'] ?? 0;
    $hitrate = $totalQuotes > 0 ? round(($acceptedCount / $totalQuotes) * 100, 1) : 0.0;

    // Gemiddelde doorlooptijd (van datum naar status_updated_at bij geaccepteerd)
    $leadStmt = $pdo->prepare("
        SELECT AVG(DATEDIFF(COALESCE(status_updated_at, NOW()), datum)) AS avg_days
        FROM quotes
        WHERE user_id = ? AND status = 'geaccepteerd' AND status_updated_at IS NOT NULL
    ");
    $leadStmt->execute([$userId]);
    $avgLead = (float) ($leadStmt->fetchColumn() ?? 0);

    // Omzet per klant (top 5)
    $clientStmt = $pdo->prepare("
        SELECT c.naam AS klant, SUM(q.totaal_bruto) AS omzet, COUNT(*) AS cnt
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.user_id = ?
        GROUP BY q.client_id
        ORDER BY omzet DESC
        LIMIT 5
    ");
    $clientStmt->execute([$userId]);
    $omzetPerKlant = $clientStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status_counts' => $statusCounts,
        'hitrate' => $hitrate,
        'avg_lead_time_days' => $avgLead,
        'accepted_revenue' => $acceptedTotal,
        'omzet_per_klant' => $omzetPerKlant,
        'total_quotes' => $totalQuotes,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen metrics: ' . $e->getMessage()]);
}
