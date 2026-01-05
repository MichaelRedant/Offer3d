<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$vatRaw = trim($input['vat_number'] ?? '');
$countryOverride = trim($input['country_code'] ?? '');

if ($vatRaw === '') {
    http_response_code(400);
    echo json_encode(['error' => 'VAT-nummer ontbreekt.']);
    exit;
}

// Split landcode van nummer
$vatSanitized = preg_replace('/[^A-Za-z0-9]/', '', $vatRaw);
$countryCode = '';
$number = $vatSanitized;
if (strlen($vatSanitized) > 2 && ctype_alpha(substr($vatSanitized, 0, 2))) {
    $countryCode = strtoupper(substr($vatSanitized, 0, 2));
    $number = substr($vatSanitized, 2);
}
if ($countryOverride !== '') {
    $countryCode = strtoupper($countryOverride);
}
if ($countryCode === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Landcode kan niet worden afgeleid uit VAT-nummer. Gebruik formaat BE0123456789 of stuur country_code mee.']);
    exit;
}

// Controleer SOAP-extensie
if (!class_exists('SoapClient')) {
    http_response_code(500);
    echo json_encode(['error' => 'SOAP-extensie niet beschikbaar op de server (nodig voor VIES).']);
    exit;
}

try {
    $wsdl = 'https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
    $client = new SoapClient($wsdl, [
        'connection_timeout' => 5,
        'exceptions' => true,
        'cache_wsdl' => WSDL_CACHE_BOTH,
    ]);
    $result = $client->checkVat([
        'countryCode' => $countryCode,
        'vatNumber' => $number,
    ]);

    $valid = !empty($result->valid);
    $response = [
        'valid' => $valid,
        'countryCode' => $result->countryCode ?? $countryCode,
        'vatNumber' => ($result->countryCode ?? $countryCode) . ($result->vatNumber ?? $number),
        'requestDate' => $result->requestDate ?? null,
        'name' => $result->name ?? '',
        'address' => $result->address ?? '',
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
} catch (SoapFault $e) {
    http_response_code(502);
    echo json_encode(['error' => 'VIES lookup mislukt: ' . $e->getMessage()]);
}
