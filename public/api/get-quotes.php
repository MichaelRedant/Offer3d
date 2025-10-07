<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT q.id, q.datum, q.totaal_bruto, q.totaal_netto, q.totaal_btw, 
               c.naam AS klant_naam, c.bedrijf
        FROM quotes q
        JOIN clients c ON q.client_id = c.id
        ORDER BY q.datum DESC
    ");
    $stmt->execute();
    $quotes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($quotes);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen offertes: ' . $e->getMessage()]);
}
