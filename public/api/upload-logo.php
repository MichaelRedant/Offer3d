<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Zorg dat de upload-map bestaat
$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if (empty($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen logo ontvangen of uploadfout.']);
    exit;
}

$file = $_FILES['logo'];
$allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
if (!in_array($file['type'], $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Alleen PNG, JPG of SVG toegestaan.']);
    exit;
}

if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Bestand is te groot (max 2MB).']);
    exit;
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$safeName = 'quote-logo.' . strtolower($ext);
$target = $uploadDir . '/' . $safeName;

if (!move_uploaded_file($file['tmp_name'], $target)) {
    http_response_code(500);
    echo json_encode(['error' => 'Opslaan van logo is mislukt.']);
    exit;
}

$publicPath = "/offr3d/uploads/{$safeName}";
echo json_encode(['success' => true, 'url' => $publicPath]);
$maxSize = 2 * 1024 * 1024; // 2MB
