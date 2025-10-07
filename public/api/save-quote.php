<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

$user_id = 1; // Simulatie

$data = json_decode(file_get_contents("php://input"), true);

if (
    !$data || 
    empty($data['client_id']) ||
    empty($data['items']) ||
    empty($data['summary']) ||
    empty($data['form'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Onvolledige gegevens bij offerte.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $form = $data['form'];
    $summary = $data['summary'];

    // 🧾 1. Quotes-insert
    $stmt = $pdo->prepare("
        INSERT INTO quotes (
            user_id, client_id, datum,
            standaard_winstmarge_perc, gebruik_geen_marge, gebruik_item_marges,
            vaste_startkost, vervoerskost, korting_perc, btw_perc, elektriciteitskost_per_kwh,
            totaal_netto, totaal_btw, totaal_bruto
        ) VALUES (
            :user_id, :client_id, :datum,
            :winst, :geen_marge, :item_marges,
            :startkost, :vervoerskost, :korting, :btw, :elek,
            :netto, :btw_bedrag, :bruto
        )
    ");

    $stmt->execute([
        ':user_id' => $user_id,
        ':client_id' => $data['client_id'],
        ':datum' => $form['offertedatum'] ?? date('Y-m-d'),
        ':winst' => floatval($form['globaleWinstmarge']),
        ':geen_marge' => !empty($form['gebruikGeenMarge']) ? 1 : 0,
        ':item_marges' => !empty($form['gebruikIndividueleMarges']) ? 1 : 0,
        ':startkost' => floatval($form['vasteStartkost']),
        ':vervoerskost' => floatval($form['vervoerskost']),
        ':korting' => floatval($form['korting']),
        ':btw' => floatval($form['btw']),
        ':elek' => floatval($form['elektriciteitsprijs']),
        ':netto' => floatval($summary['totaalNetto']),
        ':btw_bedrag' => floatval($summary['btw']),
        ':bruto' => floatval($summary['totaalBruto']),
    ]);

    $quote_id = $pdo->lastInsertId();

    // 🧩 2. Quote Items
    $stmtItem = $pdo->prepare("
        INSERT INTO quote_items (
            quote_id, naam, aantal, printtijd_seconden, gewicht_g, materiaal_id,
            supportmateriaal, nozzle_slijtagekost, post_processing_kost,
            assemblage_uur, scan_kost, modellering_uur, modelleringssoftware_id,
            gebruik_custom_uurtarief, custom_uurtarief, override_marge,
            custom_winstmarge_perc, manuele_toeslag, model_link,
            verkoopprijs_per_stuk, subtotaal
        ) VALUES (
            :quote_id, :naam, :aantal, :seconden, :gewicht, :materiaal_id,
            :support, :nozzle, :postproc, :assemblage, :scan, :modellering,
            :software_id, :custom_uurtarief_gebruik, :custom_uurtarief,
            :override_marge, :custom_marge, :toeslag, :model_link, :verkoop, :subtotaal
        )
    ");

    foreach ($data['items'] as $item) {
        $printtijdSeconden =
            intval($item['hours'] ?? 0) * 3600 +
            intval($item['minutes'] ?? 0) * 60 +
            intval($item['seconds'] ?? 0);

        $stmtItem->execute([
            ':quote_id' => $quote_id,
            ':naam' => $item['name'],
            ':aantal' => intval($item['aantal']),
            ':seconden' => $printtijdSeconden,
            ':gewicht' => floatval($item['weight']),
            ':materiaal_id' => isset($item['materiaal_id']) ? intval($item['materiaal_id']) : null,
            ':support' => !empty($item['supportmateriaal']) ? 1 : 0,
            ':nozzle' => floatval($item['nozzle_slijtagekost'] ?? 0),
            ':postproc' => floatval($item['post_processing_kost'] ?? 0),
            ':assemblage' => floatval($item['assemblage_uur'] ?? 0),
            ':scan' => floatval($item['scan_kost'] ?? 0),
            ':modellering' => floatval($item['modellering_uur'] ?? 0),
            ':software_id' => isset($item['modelleringssoftware_id']) ? intval($item['modelleringssoftware_id']) : null,
            ':custom_uurtarief_gebruik' => !empty($item['gebruik_custom_uurtarief']) ? 1 : 0,
            ':custom_uurtarief' => floatval($item['custom_uurtarief'] ?? 0),
            ':override_marge' => !empty($item['override_marge']) ? 1 : 0,
            ':custom_marge' => floatval($item['custom_winstmarge_perc'] ?? 0),
            ':toeslag' => floatval($item['manuele_toeslag'] ?? 0),
            ':model_link' => $item['model_link'] ?? null,
            ':verkoop' => floatval($item['verkoopprijs_per_stuk'] ?? 0),
            ':subtotaal' => floatval($item['subtotaal'] ?? 0),
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'quote_id' => $quote_id], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan offerte: ' . $e->getMessage()]);
}
