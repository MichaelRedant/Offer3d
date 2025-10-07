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

$userId = 1; // Gesimuleerde ingelogde gebruiker

// Inlezen van JSON body
$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige JSON.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 🔹 1. Quote aanmaken
    $stmt = $pdo->prepare("
        INSERT INTO quotes (user_id, client_id, datum, standaard_winstmarge_perc, gebruik_geen_marge, gebruik_item_marges, vaste_startkost, vervoerskost, korting_perc, btw_perc, elektriciteitskost_per_kwh, opmerkingen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $userId,
        $data['client_id'],
        $data['datum'],
        $data['standaard_winstmarge_perc'],
        $data['gebruik_geen_marge'],
        $data['gebruik_item_marges'],
        $data['vaste_startkost'],
        $data['vervoerskost'],
        $data['korting_perc'],
        $data['btw_perc'],
        $data['elektriciteitskost_per_kwh'],
        $data['opmerkingen']
    ]);

    $quoteId = $pdo->lastInsertId();

    // 🔹 2. Quote items toevoegen
    $stmtItem = $pdo->prepare("
        INSERT INTO quote_items (quote_id, naam, aantal, printtijd_seconden, gewicht_g, materiaal_id, supportmateriaal, moet_drogen, nozzle_slijtagekost, post_processing_kost, assemblage_uur, scan_kost, modellering_uur, modelleringssoftware_id, gebruik_custom_uurtarief, custom_uurtarief, override_marge, custom_winstmarge_perc, manuele_toeslag, model_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($data['items'] as $item) {
        $stmtItem->execute([
            $quoteId,
            $item['naam'],
            $item['aantal'],
            $item['printtijd_seconden'],
            $item['gewicht_g'],
            $item['materiaal_id'],
            $item['supportmateriaal'],
            $item['moet_drogen'],
            $item['nozzle_slijtagekost'],
            $item['post_processing_kost'],
            $item['assemblage_uur'],
            $item['scan_kost'],
            $item['modellering_uur'],
            $item['modelleringssoftware_id'],
            $item['gebruik_custom_uurtarief'],
            $item['custom_uurtarief'],
            $item['override_marge'],
            $item['custom_winstmarge_perc'],
            $item['manuele_toeslag'],
            $item['model_link']
        ]);
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'quote_id' => $quoteId]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij aanmaken offerte: ' . $e->getMessage()]);
}
