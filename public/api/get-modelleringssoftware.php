<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');
require_once __DIR__ . '/db.php';


try {
    $stmt = $mysqli->prepare("
        SELECT id, naam, kostprijs_per_jaar, gebruikersaantal, opmerking
        FROM modelleringssoftware
        ORDER BY naam ASC
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    $softwareList = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode($softwareList);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen softwarelijst: ' . $e->getMessage()]);
}
