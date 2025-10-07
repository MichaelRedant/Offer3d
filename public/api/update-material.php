<?php
// Error logging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// DB connectie
require_once __DIR__ . '/db.php';

// JSON body ophalen
$data = json_decode(file_get_contents("php://input"), true);

// Validatie
if (
    !$data || empty($data['id']) || empty($data['naam']) ||
    !isset($data['prijs_per_kg']) || !is_numeric($data['prijs_per_kg'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige of onvolledige input.']);
    exit;
}

// Data voorbereiden
$id = (int) $data['id'];
$naam = trim($data['naam']);
$type = $data['type'] ?? '';
$kleur = $data['kleur'] ?? '';
$prijs = (float) $data['prijs_per_kg'];
$moet_drogen = !empty($data['moet_drogen']) ? 1 : 0;
$supportmateriaal = !empty($data['supportmateriaal']) ? 1 : 0;
$manufacturer_id = isset($data['manufacturer_id']) ? (int) $data['manufacturer_id'] : null;
$stock = isset($data['stock_rollen']) ? (int) $data['stock_rollen'] : 0;
$marge = isset($data['winstmarge_perc']) ? (float) $data['winstmarge_perc'] : 0;

try {
    $query = "
        UPDATE materials SET 
            naam = :naam,
            type = :type,
            kleur = :kleur,
            prijs_per_kg = :prijs,
            moet_drogen = :moet_drogen,
            supportmateriaal = :supportmateriaal,
            manufacturer_id = :manufacturer_id,
            stock_rollen = :stock,
            winstmarge_perc = :marge
        WHERE id = :id
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([
        ':naam' => $naam,
        ':type' => $type,
        ':kleur' => $kleur,
        ':prijs' => $prijs,
        ':moet_drogen' => $moet_drogen,
        ':supportmateriaal' => $supportmateriaal,
        ':manufacturer_id' => $manufacturer_id,
        ':stock' => $stock,
        ':marge' => $marge,
        ':id' => $id
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij updaten materiaal: ' . $e->getMessage()]);
}
