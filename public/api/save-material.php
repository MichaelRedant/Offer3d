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

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE :column");
    $stmt->execute([':column' => $column]);
    return $stmt->fetchColumn() !== false;
}

// Zorg dat benodigde kolommen bestaan
try {
    if (!columnExists($pdo, 'materials', 'bestel_url')) {
        $pdo->exec("ALTER TABLE materials ADD COLUMN bestel_url VARCHAR(255) NULL AFTER droger_status");
    }
    if (!columnExists($pdo, 'materials', 'min_stock_gram')) {
        $pdo->exec("ALTER TABLE materials ADD COLUMN min_stock_gram INT NULL DEFAULT NULL AFTER stock_rollen");
    }
    if (!columnExists($pdo, 'materials', 'min_stock_rollen')) {
        $pdo->exec("ALTER TABLE materials ADD COLUMN min_stock_rollen INT NULL DEFAULT NULL AFTER min_stock_gram");
    }
    if (!columnExists($pdo, 'materials', 'locatie')) {
        $pdo->exec("ALTER TABLE materials ADD COLUMN locatie VARCHAR(120) NULL DEFAULT NULL AFTER kleur");
    }
} catch (Exception $e) {
    // Niet fataal voor backward compatibility; doorgaan zonder kolom
}

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
$locatie = isset($data['locatie']) ? trim($data['locatie']) : null;
$prijs = (float) $data['prijs_per_kg'];
$moet_drogen = !empty($data['moet_drogen']) ? 1 : 0;
$supportmateriaal = !empty($data['supportmateriaal']) ? 1 : 0;
$manufacturer_id = isset($data['manufacturer_id']) ? (int) $data['manufacturer_id'] : null;
$stock = isset($data['stock_rollen']) ? (int) $data['stock_rollen'] : 0;
$min_stock_gram = isset($data['min_stock_gram']) ? (int) $data['min_stock_gram'] : null;
$min_stock_rollen = isset($data['min_stock_rollen']) ? (int) $data['min_stock_rollen'] : null;
$marge = isset($data['winstmarge_perc']) ? (float) $data['winstmarge_perc'] : 0;
$batch_code = $data['batch_code'] ?? null;
$vervaldatum = $data['vervaldatum'] ?? null;
$droger_status = $data['droger_status'] ?? 'nvt';
$bestel_url = isset($data['bestel_url']) ? trim($data['bestel_url']) : null;

try {
    $stmt = $pdo->prepare("
        INSERT INTO materials 
        (naam, type, kleur, locatie, prijs_per_kg, moet_drogen, supportmateriaal, manufacturer_id, stock_rollen, min_stock_gram, min_stock_rollen, winstmarge_perc, batch_code, vervaldatum, droger_status, bestel_url)
        VALUES (:naam, :type, :kleur, :locatie, :prijs, :moet_drogen, :supportmateriaal, :manufacturer_id, :stock, :min_stock_gram, :min_stock_rollen, :marge, :batch_code, :vervaldatum, :droger_status, :bestel_url)
    ");

    $stmt->execute([
        ':naam' => $naam,
        ':type' => $type,
        ':kleur' => $kleur,
        ':locatie' => $locatie ?: null,
        ':prijs' => $prijs,
        ':moet_drogen' => $moet_drogen,
        ':supportmateriaal' => $supportmateriaal,
        ':manufacturer_id' => $manufacturer_id,
        ':stock' => $stock,
        ':min_stock_gram' => $min_stock_gram !== null ? $min_stock_gram : null,
        ':min_stock_rollen' => $min_stock_rollen !== null ? $min_stock_rollen : null,
        ':marge' => $marge,
        ':batch_code' => $batch_code,
        ':vervaldatum' => $vervaldatum,
        ':droger_status' => $droger_status,
        ':bestel_url' => $bestel_url ?: null,
    ]);

    $id = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'material' => [
            'id' => (int) $id,
            'naam' => $naam,
            'type' => $type,
            'kleur' => $kleur,
            'locatie' => $locatie,
            'prijs_per_kg' => $prijs,
            'moet_drogen' => (bool) $moet_drogen,
            'supportmateriaal' => (bool) $supportmateriaal,
            'manufacturer_id' => $manufacturer_id,
            'stock_rollen' => $stock,
            'min_stock_gram' => $min_stock_gram,
            'min_stock_rollen' => $min_stock_rollen,
            'winstmarge_perc' => $marge,
            'bestel_url' => $bestel_url,
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan materiaal: ' . $e->getMessage()]);
}
