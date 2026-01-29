<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare("SHOW TABLES LIKE :table");
    $stmt->execute([':table' => $table]);
    return $stmt->fetchColumn() !== false;
}

if (!tableExists($pdo, 'material_spools')) {
    echo json_encode([]);
    exit;
}

try {
    $query = "
        SELECT 
            s.*,
            m.naam AS material_name,
            m.type AS material_type,
            m.kleur AS material_kleur,
            man.naam AS manufacturer
        FROM material_spools s
        LEFT JOIN materials m ON s.material_id = m.id
        LEFT JOIN manufacturers man ON m.manufacturer_id = man.id
        ORDER BY s.id DESC
    ";
    $stmt = $pdo->query($query);

    $spools = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $spools[] = [
            'id' => (int) $row['id'],
            'material_id' => (int) $row['material_id'],
            'label' => $row['label'] ?? '',
            'status' => $row['status'] ?? 'sealed',
            'locatie' => $row['locatie'] ?? null,
            'gewicht_netto_gram' => (int) ($row['gewicht_netto_gram'] ?? 0),
            'gewicht_rest_gram' => isset($row['gewicht_rest_gram']) ? (int) $row['gewicht_rest_gram'] : null,
            'batch_code' => $row['batch_code'] ?? null,
            'aankoop_datum' => $row['aankoop_datum'] ?? null,
            'dried_at' => $row['dried_at'] ?? null,
            'dry_valid_until' => $row['dry_valid_until'] ?? null,
            'purchase_price_eur' => isset($row['purchase_price_eur']) ? (float)$row['purchase_price_eur'] : null,
            'overhead_eur' => isset($row['overhead_eur']) ? (float)$row['overhead_eur'] : null,
            'cost_per_kg' => calculateCostPerKg($row),
            'cost_per_gram' => calculateCostPerGram($row),
            'notities' => $row['notities'] ?? null,
            'material_name' => $row['material_name'] ?? null,
            'material_type' => $row['material_type'] ?? null,
            'material_kleur' => $row['material_kleur'] ?? null,
            'manufacturer' => $row['manufacturer'] ?? null,
        ];
    }

    echo json_encode($spools);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen rolvoorraad: ' . $e->getMessage()]);
}

function calculateCostPerKg(array $row)
{
    $base = null;
    if (isset($row['purchase_price_eur'])) {
        $base = (float)$row['purchase_price_eur'];
        if (isset($row['overhead_eur'])) {
            $base += (float)$row['overhead_eur'];
        }
    }
    $net = isset($row['gewicht_netto_gram']) ? (float)$row['gewicht_netto_gram'] : 0;
    if ($base !== null && $net > 0) {
        return round(($base / ($net / 1000)), 4);
    }
    return null;
}

function calculateCostPerGram(array $row)
{
    $costKg = calculateCostPerKg($row);
    if ($costKg === null) return null;
    return round($costKg / 1000, 6);
}
