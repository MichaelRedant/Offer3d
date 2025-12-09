<?php
// Debug info inschakelen
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// JSON input ophalen
$data = json_decode(file_get_contents("php://input"), true);

// Validatie
if (
    !$data || empty($data['naam']) ||
    !isset($data['prijs_per_kg']) || !is_numeric($data['prijs_per_kg'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige of onvolledige input.']);
    exit;
}

// Waarden ophalen en standaardiseren
$naam = trim($data['naam']);
$type = $data['type'] ?? '';
$kleur = $data['kleur'] ?? '';
$prijs = (float) $data['prijs_per_kg'];
$moet_drogen = !empty($data['moet_drogen']) ? 1 : 0;
$supportmateriaal = !empty($data['supportmateriaal']) ? 1 : 0;
$manufacturer_id = isset($data['manufacturer_id']) ? (int) $data['manufacturer_id'] : null;
$stock = isset($data['stock_rollen']) ? (int) $data['stock_rollen'] : 0;
$marge = isset($data['winstmarge_perc']) ? (float) $data['winstmarge_perc'] : 0;
$batch_code = $data['batch_code'] ?? null;
$vervaldatum = $data['vervaldatum'] ?? null;
$droger_status = $data['droger_status'] ?? 'nvt';

try {
    $stmt = $pdo->prepare("
        INSERT INTO materials 
        (naam, type, kleur, prijs_per_kg, moet_drogen, supportmateriaal, manufacturer_id, stock_rollen, winstmarge_perc, batch_code, vervaldatum, droger_status)
        VALUES (:naam, :type, :kleur, :prijs, :moet_drogen, :supportmateriaal, :manufacturer_id, :stock, :marge, :batch_code, :vervaldatum, :droger_status)
    ");

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
        ':batch_code' => $batch_code,
        ':vervaldatum' => $vervaldatum,
        ':droger_status' => $droger_status,
    ]);

    $id = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'material' => [
            'id' => (int) $id,
            'naam' => $naam,
            'type' => $type,
            'kleur' => $kleur,
            'prijs_per_kg' => $prijs,
            'moet_drogen' => (bool) $moet_drogen,
            'supportmateriaal' => (bool) $supportmateriaal,
            'manufacturer_id' => $manufacturer_id,
            'stock_rollen' => $stock,
            'winstmarge_perc' => $marge
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan materiaal: ' . $e->getMessage()]);
}
