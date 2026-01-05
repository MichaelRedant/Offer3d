<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simuleer ingelogde gebruiker (enkel jij nu)
$user_id = 1;

try {
    ensureClientExtendedColumns($pdo);

    // Lees JSON-input
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data || !is_array($data)) {
        throw new Exception('Geen geldige JSON ontvangen.');
    }

    // Validatie
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

    // Parameters voorbereiden
    $params = [
        'naam'       => $naam,
        'email'      => $email,
        'bedrijf'    => $normalize($data['bedrijf'] ?? null),
        'btw_nummer' => $normalize($data['btw_nummer'] ?? null),
        'adres'      => $normalize($data['adres'] ?? null),
        'telefoon'   => $normalize($data['telefoon'] ?? null),
        'street'     => $normalize($data['street'] ?? null),
        'postal_code' => $normalize($data['postal_code'] ?? null),
        'city'       => $normalize($data['city'] ?? null),
        'country_code' => $normalize($data['country_code'] ?? 'BE'),
        'peppol_endpoint_id' => $normalize($data['peppol_endpoint_id'] ?? null),
        'peppol_scheme' => $normalize($data['peppol_scheme'] ?? null),
    ];

    // Bepaal of het een INSERT of UPDATE is
    if (!empty($data['id'])) {
        // UPDATE
        $params['id'] = $data['id'];
        $stmt = $pdo->prepare("            UPDATE clients SET                 naam = :naam,                email = :email,                bedrijf = :bedrijf,                btw_nummer = :btw_nummer,                adres = :adres,                telefoon = :telefoon,                street = :street,                postal_code = :postal_code,                city = :city,                country_code = :country_code,                peppol_endpoint_id = :peppol_endpoint_id,                peppol_scheme = :peppol_scheme            WHERE id = :id AND user_id = :user_id        ");
        $params['user_id'] = $user_id;
    } else {
        // INSERT
        $stmt = $pdo->prepare("            INSERT INTO clients                 (user_id, naam, email, bedrijf, btw_nummer, adres, telefoon, street, postal_code, city, country_code, peppol_endpoint_id, peppol_scheme)            VALUES                 (:user_id, :naam, :email, :bedrijf, :btw_nummer, :adres, :telefoon, :street, :postal_code, :city, :country_code, :peppol_endpoint_id, :peppol_scheme)        ");
        $params['user_id'] = $user_id;
    }

    // Query uitvoeren
    $stmt->execute($params);

    // Response terugsturen
    $response = ['success' => true];

    if (empty($data['id'])) {
        $response['id'] = $pdo->lastInsertId();
    }

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan klant: ' . $e->getMessage()]);
}
