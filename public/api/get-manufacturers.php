<?php
// Toon fouten (enkel voor debugging)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verbind met de database
require_once __DIR__ . '/db.php';

try {
    $query = "
        SELECT m.id, m.naam, m.land, m.website, COUNT(ma.id) AS materiaal_count
        FROM manufacturers m
        LEFT JOIN materials ma ON ma.manufacturer_id = m.id
        GROUP BY m.id
        ORDER BY m.naam ASC
    ";

    $stmt = $pdo->query($query);  // Gebruik $pdo i.p.v. $conn
    $manufacturers = $stmt->fetchAll();

    echo json_encode($manufacturers);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen van fabrikanten: ' . $e->getMessage()]);
}
