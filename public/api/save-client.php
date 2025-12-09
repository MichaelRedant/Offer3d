<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 🔐 Simuleer ingelogde gebruiker (enkel jij nu)
$user_id = 1;

try {
    // ✅ Lees JSON-input
    $data = json_decode(file_get_contents("php://input"), true);

    // ✅ Debug (optioneel, mag verwijderd worden na testen)
    // file_put_contents("debug_client_input.json", json_encode($data, JSON_PRETTY_PRINT));

    // ✅ Validatie
    $naam = isset($data['naam']) ? trim((string)$data['naam']) : '';
    if ($naam === '') {
        throw new Exception('Naam van klant is verplicht.');
    }

    $email = isset($data['email']) ? trim((string)$data['email']) : '';
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Ongeldig e-mailadres.');
    }

    $normalize = static function ($value) {
        if (!isset($value)) {
            return null;
        }
        $trimmed = trim((string)$value);
        return $trimmed === '' ? null : $trimmed;
    };

    // ✅ Parameters voorbereiden
    $params = [
        'naam'       => $naam,
        'email'      => $email,
        'bedrijf'    => $normalize($data['bedrijf'] ?? null),
        'btw_nummer' => $normalize($data['btw_nummer'] ?? null),
        'adres'      => $normalize($data['adres'] ?? null),
        'telefoon'   => $normalize($data['telefoon'] ?? null),
    ];

    // ✅ Bepaal of het een INSERT of UPDATE is
    if (!empty($data['id'])) {
        // 🔁 UPDATE
        $params['id'] = $data['id'];
        $stmt = $pdo->prepare("
            UPDATE clients SET 
                naam = :naam,
                email = :email,
                bedrijf = :bedrijf,
                btw_nummer = :btw_nummer,
                adres = :adres,
                telefoon = :telefoon
            WHERE id = :id AND user_id = :user_id
        ");
        $params['user_id'] = $user_id;
    } else {
        // ➕ INSERT
        $stmt = $pdo->prepare("
            INSERT INTO clients 
                (user_id, naam, email, bedrijf, btw_nummer, adres, telefoon)
            VALUES 
                (:user_id, :naam, :email, :bedrijf, :btw_nummer, :adres, :telefoon)
        ");
        $params['user_id'] = $user_id;
    }

    // ✅ Query uitvoeren
    $stmt->execute($params);

    // ✅ Response terugsturen
    $response = ['success' => true];

    if (empty($data['id'])) {
        $response['id'] = $pdo->lastInsertId();
    }

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan klant: ' . $e->getMessage()]);
}
