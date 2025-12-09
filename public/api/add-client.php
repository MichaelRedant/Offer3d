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

    $naam = isset($data['naam']) ? trim((string)$data['naam']) : '';
    if ($naam === '') {
        throw new Exception("Naam van klant is verplicht.");
    }

    $email = isset($data['email']) ? trim((string)$data['email']) : '';
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Ongeldig e-mailadres.");
    }

    $normalize = static function ($value) {
        if (!isset($value)) {
            return null;
        }
        $trimmed = trim((string)$value);
        return $trimmed === '' ? null : $trimmed;
    };

    $stmt = $pdo->prepare("
        INSERT INTO clients (user_id, naam, email, bedrijf, btw_nummer, adres, telefoon)
        VALUES (:user_id, :naam, :email, :bedrijf, :btw_nummer, :adres, :telefoon)
    ");

    $payload = [
        ':user_id'    => $user_id,
        ':naam'       => $naam,
        ':email'      => $email,
        ':bedrijf'    => $normalize($data['bedrijf'] ?? null),
        ':btw_nummer' => $normalize($data['btw_nummer'] ?? null),
        ':adres'      => $normalize($data['adres'] ?? null),
        ':telefoon'   => $normalize($data['telefoon'] ?? null)
    ];

    $stmt->execute($payload);

    echo json_encode([
        'success' => true,
        'client' => [
            'id'          => $pdo->lastInsertId(),
            'user_id'     => $user_id,
            'naam'        => $naam,
            'email'       => $email,
            'bedrijf'     => $payload[':bedrijf'],
            'btw_nummer'  => $payload[':btw_nummer'],
            'adres'       => $payload[':adres'],
            'telefoon'    => $payload[':telefoon']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Klant toevoegen mislukt: ' . $e->getMessage()]);
}
