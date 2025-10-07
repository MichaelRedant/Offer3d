<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';

// 🔐 Simulatie van ingelogde gebruiker
$userId = 1;

// ✅ ID ophalen en valideren
$quoteId = isset($_GET['id']) ? intval($_GET['id']) : null;

if (!$quoteId) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen offerte ID opgegeven.']);
    exit;
}

try {
    // 1️⃣ Haal algemene offertegegevens + klant
    $stmt = $pdo->prepare("
        SELECT 
            q.*, 
            c.naam AS klant_naam, c.email AS klant_email, 
            c.bedrijf AS klant_bedrijf, c.btw_nummer, c.adres, c.telefoon
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ? AND q.user_id = ?
    ");
    $stmt->execute([$quoteId, $userId]);
    $quote = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$quote) {
        http_response_code(404);
        echo json_encode(['error' => 'Offerte niet gevonden.']);
        exit;
    }

    // 2️⃣ Haal gekoppelde items op
    $stmt2 = $pdo->prepare("
        SELECT 
            qi.*, 
            m.naam AS materiaal_naam, 
            m.kleur AS materiaal_kleur,
            m.type AS materiaal_type,
            m.prijs_per_kg AS materiaal_prijs
        FROM quote_items qi
        LEFT JOIN materials m ON qi.materiaal_id = m.id
        WHERE qi.quote_id = ?
    ");
    $stmt2->execute([$quoteId]);
    $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // 3️⃣ Combineer alles
    $quote['items'] = $items;

    echo json_encode($quote, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen offerte: ' . $e->getMessage()]);
}
