<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function formatDateIcs($date)
{
    $ts = strtotime($date);
    if ($ts === false) {
        return null;
    }
    return gmdate('Ymd', $ts);
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    http_response_code(400);
    echo "Invalid project id";
    exit;
}

$userId = 1; // gesimuleerd

try {
    $stmt = $pdo->prepare("
        SELECT p.*, c.naam AS klant_naam, c.bedrijf AS klant_bedrijf
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = :id AND p.user_id = :uid
    ");
    $stmt->execute([':id' => $id, ':uid' => $userId]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$project) {
        http_response_code(404);
        echo "Project niet gevonden";
        exit;
    }
    if (empty($project['deadline'])) {
        http_response_code(400);
        echo "Geen deadline beschikbaar voor ICS";
        exit;
    }

    $dtStart = formatDateIcs($project['deadline']);
    if (!$dtStart) {
        http_response_code(400);
        echo "Ongeldige deadline";
        exit;
    }
    $now = gmdate('Ymd\THis\Z');
    $uid = "project-" . $project['id'] . "@offr3d";
    $summary = "Project #" . $project['id'] . ": " . ($project['naam'] ?? '');
    $descParts = [];
    if (!empty($project['klant_naam'])) {
        $descParts[] = "Klant: " . $project['klant_naam'] . ($project['klant_bedrijf'] ? " (" . $project['klant_bedrijf'] . ")" : "");
    }
    if (!empty($project['status'])) {
        $descParts[] = "Status: " . $project['status'];
    }
    if (!empty($project['locatie'])) {
        $descParts[] = "Locatie: " . $project['locatie'];
    }
    $description = implode("\\n", $descParts);

    $ics = "BEGIN:VCALENDAR\r\n";
    $ics .= "VERSION:2.0\r\n";
    $ics .= "PRODID:-//Offr3d//Project//NL\r\n";
    $ics .= "BEGIN:VEVENT\r\n";
    $ics .= "UID:$uid\r\n";
    $ics .= "DTSTAMP:$now\r\n";
    $ics .= "DTSTART;VALUE=DATE:$dtStart\r\n";
    $ics .= "DTEND;VALUE=DATE:$dtStart\r\n";
    $ics .= "SUMMARY:" . addcslashes($summary, ",;") . "\r\n";
    if (!empty($description)) {
        $ics .= "DESCRIPTION:" . addcslashes($description, ",;") . "\r\n";
    }
    // Herinnering 24u vooraf
    $ics .= "BEGIN:VALARM\r\n";
    $ics .= "TRIGGER:-PT24H\r\n";
    $ics .= "ACTION:DISPLAY\r\n";
    $ics .= "DESCRIPTION:Reminder voor $summary\r\n";
    $ics .= "END:VALARM\r\n";
    $ics .= "END:VEVENT\r\n";
    $ics .= "END:VCALENDAR\r\n";

    header("Content-Type: text/calendar; charset=utf-8");
    header("Content-Disposition: attachment; filename=\"project-$id.ics\"");
    echo $ics;
} catch (Exception $e) {
    http_response_code(500);
    echo "Fout bij genereren ICS: " . $e->getMessage();
}
