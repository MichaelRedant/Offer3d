<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$userId = 1; // Gesimuleerde ingelogde gebruiker
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (!$data || !isset($data['id']) || (!isset($data['items']) && !isset($data['custom_items']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige input of ontbrekende gegevens (items of custom_items vereist).']);
    exit;
}

try {
    ensureQuoteTaxColumns($pdo);
    ensureQuoteCustomItemsTable($pdo);
    ensureQuoteConditionColumns($pdo);
    ensureQuoteNumberColumn($pdo);
    ensureQuoteItemsColumns($pdo);

    $pdo->beginTransaction();

    // ✅ 1. Update de offerte zelf
    $stmt = $pdo->prepare("
        UPDATE quotes SET
            client_id = ?,
            datum = ?,
            status = ?,
            status_updated_at = NOW(),
            standaard_winstmarge_perc = ?,
            gebruik_geen_marge = ?,
            gebruik_item_marges = ?,
            vaste_startkost = ?,
            vervoerskost = ?,
            korting_perc = ?,
            btw_perc = ?,
            elektriciteitskost_per_kwh = ?,
            totaal_netto = ?,
            totaal_btw = ?,
            totaal_bruto = ?,
            opmerkingen = ?,
            vat_exempt = ?,
            vat_exempt_reason = ?,
            validity_days = ?,
            delivery_terms = ?,
            payment_terms = ?,
            delivery_type = ?,
            quote_number = ?
        WHERE id = ? AND user_id = ?
    ");

    $stmt->execute([
        intval($data['client_id']),
        $data['datum'],
        $data['status'] ?? 'draft',
        floatval($data['standaard_winstmarge_perc']),
        intval(!empty($data['gebruik_geen_marge'])),
        intval(!empty($data['gebruik_item_marges'])),
        floatval($data['vaste_startkost']),
        floatval($data['vervoerskost']),
        floatval($data['korting_perc']),
        floatval($data['btw_perc']),
        floatval($data['elektriciteitskost_per_kwh']),
        floatval($data['totaal_netto'] ?? 0),
        floatval($data['totaal_btw'] ?? 0),
        floatval($data['totaal_bruto'] ?? 0),
        $data['opmerkingen'] ?? '',
        intval(!empty($data['vat_exempt'])),
        $data['vat_exempt_reason'] ?? null,
        intval($data['validity_days'] ?? 30),
        $data['delivery_terms'] ?? null,
        $data['payment_terms'] ?? null,
        $data['delivery_type'] ?? 'afhaling',
        $data['quote_number'] ?? $data['offertenummer'] ?? null,
        intval($data['id']),
        $userId
    ]);

    $quoteId = intval($data['id']);

    // ✅ 2. Verwijder oude quote_items
    $pdo->prepare("DELETE FROM quote_items WHERE quote_id = ?")->execute([$quoteId]);
    $pdo->prepare("DELETE FROM quote_custom_items WHERE quote_id = ?")->execute([$quoteId]);

    // ✅ 3. Insert nieuwe quote_items
    $stmtItem = $pdo->prepare("
        INSERT INTO quote_items (
            quote_id, naam, aantal, printtijd_seconden, gewicht_g, materiaal_id,
            supportmateriaal, nozzle_slijtagekost, post_processing_kost,
            assemblage_uur, scan_kost, modellering_uur, modelleringssoftware_id,
            gebruik_custom_uurtarief, custom_uurtarief, override_marge,
            custom_winstmarge_perc, manuele_toeslag, model_link,
            verkoopprijs_per_stuk, subtotaal
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    if (!empty($data['items']) && is_array($data['items'])) {
        foreach ($data['items'] as $item) {
            $printtijd = 
                intval($item['hours'] ?? 0) * 3600 +
                intval($item['minutes'] ?? 0) * 60 +
                intval($item['seconds'] ?? 0);

            $stmtItem->execute([
                $quoteId,
                $item['name'] ?? '',
                intval($item['aantal']),
                $printtijd,
                floatval($item['weight']),
                intval($item['materiaal_id'] ?? 0),
                intval(!empty($item['supportmateriaal'])),
                floatval($item['nozzle_slijtagekost'] ?? 0),
                floatval($item['post_processing_kost'] ?? 0),
                floatval($item['assemblage_uur'] ?? 0),
                floatval($item['scan_kost'] ?? 0),
                floatval($item['modellering_uur'] ?? 0),
                intval($item['modelleringssoftware_id'] ?? null),
                intval(!empty($item['gebruik_custom_uurtarief'])),
                floatval($item['custom_uurtarief'] ?? 0),
                intval(!empty($item['override_marge'])),
                floatval($item['custom_winstmarge_perc'] ?? 0),
                floatval($item['manuele_toeslag'] ?? 0),
                $item['model_link'] ?? null,
                floatval($item['verkoopprijs_per_stuk'] ?? 0),
                floatval($item['subtotaal'] ?? 0)
            ]);
        }
    }

    // ✅ 4. Insert custom items
    if (!empty($data['custom_items']) && is_array($data['custom_items'])) {
        $stmtCustom = $pdo->prepare("
            INSERT INTO quote_custom_items (
                quote_id, title, description, quantity, unit,
                cost_amount, price_amount, margin_percent, vat_percent,
                is_optional, is_selected, group_ref
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($data['custom_items'] as $custom) {
            $stmtCustom->execute([
                $quoteId,
                $custom['title'] ?? '',
                $custom['description'] ?? null,
                floatval($custom['quantity'] ?? 1),
                $custom['unit'] ?? 'stuk',
                floatval($custom['cost_amount'] ?? 0),
                floatval($custom['price_amount'] ?? 0),
                floatval($custom['margin_percent'] ?? 0),
                floatval($custom['vat_percent'] ?? 0),
                !empty($custom['is_optional']) ? 1 : 0,
                array_key_exists('is_selected', $custom) ? (!empty($custom['is_selected']) ? 1 : 0) : 1,
                $custom['group_ref'] ?? null,
            ]);
        }
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'quote_id' => $quoteId]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij updaten offerte: ' . $e->getMessage(), 'data' => $data, 'raw' => $rawInput]);
}
