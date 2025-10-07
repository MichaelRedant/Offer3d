<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 🔐 Voor nu: geforceerde gebruiker
$user_id = 1;

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !isset($data['naam']) || trim($data['naam']) === '') {
        throw new Exception("Naam van klant is verplicht.");
    }

    if (!isset($data['email']) || trim($data['email']) === '') {
        throw new Exception("E-mailadres is verplicht.");
    }

    $stmt = $pdo->prepare("
        INSERT INTO clients (user_id, naam, email, bedrijf, btw_nummer, adres, telefoon)
        VALUES (:user_id, :naam, :email, :bedrijf, :btw_nummer, :adres, :telefoon)
    ");

    $stmt->execute([
        ':user_id'    => $user_id,
        ':naam'       => trim($data['naam']),
        ':email'      => trim($data['email']),
        ':bedrijf'    => $data['bedrijf'] ?? null,
        ':btw_nummer' => $data['btw_nummer'] ?? null,
        ':adres'      => $data['adres'] ?? null,
        ':telefoon'   => $data['telefoon'] ?? null
    ]);

    echo json_encode([
        'success' => true,
        'client' => [
            'id'          => $pdo->lastInsertId(),
            'user_id'     => $user_id,
            'naam'        => $data['naam'],
            'email'       => $data['email'],
            'bedrijf'     => $data['bedrijf'] ?? null,
            'btw_nummer'  => $data['btw_nummer'] ?? null,
            'adres'       => $data['adres'] ?? null,
            'telefoon'    => $data['telefoon'] ?? null
        ]
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Klant toevoegen mislukt: ' . $e->getMessage()]);
}
