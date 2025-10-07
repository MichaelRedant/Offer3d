<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $query = "
  SELECT 
    m.*, 
    man.naam AS manufacturer
  FROM materials m
  LEFT JOIN manufacturers man ON m.manufacturer_id = man.id
  ORDER BY m.naam ASC
";
    $stmt = $pdo->query($query);  // ✅ Gebruik PDO, niet $conn

    $materialen = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $materialen[] = [
            'id' => (int) $row['id'],
            'naam' => $row['naam'],
            'type' => $row['type'],
            'kleur' => $row['kleur'],
            'prijs_per_kg' => (float) $row['prijs_per_kg'],
            'moet_drogen' => (bool) $row['moet_drogen'],
            'manufacturer_id' => isset($row['manufacturer_id']) ? (int) $row['manufacturer_id'] : null,
            'stock_rollen' => (int) $row['stock_rollen'],
            'winstmarge_perc' => (float) $row['winstmarge_perc'],
            'supportmateriaal' => (bool) $row['supportmateriaal']
        ];
    }

    echo json_encode($materialen);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen materialen: ' . $e->getMessage()]);
}
