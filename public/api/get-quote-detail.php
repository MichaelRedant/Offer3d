<?php
// /api/get-quote-detail.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';

// 🧑 Simuleer ingelogde gebruiker
$userId = 1;

// ✅ Haal ID uit querystring
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig offerte ID.']);
    exit;
}

try {
    // 1️⃣ Haal offertegegevens + klantinfo op
    $stmt = $pdo->prepare("
        SELECT 
            q.*, 
            c.naam AS klant_naam, 
            c.bedrijf AS klant_bedrijf, 
            c.email AS klant_email, 
            c.btw_nummer, 
            c.adres, 
            c.telefoon
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        WHERE q.id = ? AND q.user_id = ?
    ");
    $stmt->execute([$id, $userId]);
    $offerte = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$offerte) {
        http_response_code(404);
        echo json_encode(['error' => 'Offerte niet gevonden.']);
        exit;
    }

    // 2️⃣ Printitems ophalen + materiaal info
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
    $stmt2->execute([$id]);
    $items = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // 3️⃣ Combineer
    echo json_encode([
        'offerte' => $offerte,
        'items' => $items
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen offerte: ' . $e->getMessage()]);
}
