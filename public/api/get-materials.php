<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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

try {
    $hasSpools = tableExists($pdo, 'material_spools');

    if ($hasSpools) {
        $query = "
            SELECT 
                m.*, 
                man.naam AS manufacturer,
                COUNT(s.id) AS spool_count,
                SUM(COALESCE(s.gewicht_netto_gram, 0)) AS totaal_netto_gram,
                SUM(COALESCE(s.gewicht_rest_gram, s.gewicht_netto_gram, 0)) AS totaal_rest_gram,
                SUM(CASE WHEN s.status = 'open' THEN 1 ELSE 0 END) AS open_spools,
                SUM(CASE WHEN s.status = 'sealed' THEN 1 ELSE 0 END) AS sealed_spools
            FROM materials m
            LEFT JOIN manufacturers man ON m.manufacturer_id = man.id
            LEFT JOIN material_spools s ON s.material_id = m.id
            GROUP BY m.id
            ORDER BY m.naam ASC
        ";
    } else {
        $query = "
            SELECT 
                m.*, 
                man.naam AS manufacturer
            FROM materials m
            LEFT JOIN manufacturers man ON m.manufacturer_id = man.id
            ORDER BY m.naam ASC
        ";
    }
    $stmt = $pdo->query($query);

    $materialen = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $spoolCount = $row['spool_count'] ?? null;
        $stockRollen = isset($spoolCount) ? (int) $spoolCount : (int) $row['stock_rollen'];

        $materialen[] = [
            'id' => (int) $row['id'],
            'naam' => $row['naam'],
            'type' => $row['type'],
            'kleur' => $row['kleur'],
            'locatie' => $row['locatie'] ?? null,
            'prijs_per_kg' => (float) $row['prijs_per_kg'],
            'moet_drogen' => (bool) $row['moet_drogen'],
            'manufacturer_id' => isset($row['manufacturer_id']) ? (int) $row['manufacturer_id'] : null,
            'stock_rollen' => $stockRollen,
            'min_stock_gram' => isset($row['min_stock_gram']) ? (int) $row['min_stock_gram'] : null,
            'min_stock_rollen' => isset($row['min_stock_rollen']) ? (int) $row['min_stock_rollen'] : null,
            'winstmarge_perc' => (float) $row['winstmarge_perc'],
            'supportmateriaal' => (bool) $row['supportmateriaal'],
            'batch_code' => $row['batch_code'] ?? null,
            'vervaldatum' => $row['vervaldatum'] ?? null,
            'droger_status' => $row['droger_status'] ?? 'nvt',
            'bestel_url' => $row['bestel_url'] ?? null,
            'spool_count' => isset($spoolCount) ? (int) $spoolCount : null,
            'voorraad_gram_totaal' => isset($row['totaal_netto_gram']) ? (int) $row['totaal_netto_gram'] : null,
            'voorraad_gram_rest' => isset($row['totaal_rest_gram']) ? (int) $row['totaal_rest_gram'] : null,
            'open_spools' => isset($row['open_spools']) ? (int) $row['open_spools'] : null,
            'sealed_spools' => isset($row['sealed_spools']) ? (int) $row['sealed_spools'] : null,
        ];
    }

    echo json_encode($materialen);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen materialen: ' . $e->getMessage()]);
}
