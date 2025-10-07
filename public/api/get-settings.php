<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            id INT PRIMARY KEY,
            standaard_winstmarge_perc DECIMAL(6,2) NOT NULL DEFAULT 25.00,
            elektriciteitsprijs DECIMAL(10,4) NOT NULL DEFAULT 0.22,
            vaste_startkost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            vervoerskost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00,
            btw DECIMAL(6,2) NOT NULL DEFAULT 21.00,
            korting_perc DECIMAL(6,2) NOT NULL DEFAULT 0.00
        )
    ");

    $columnCheck = $pdo->query("SHOW COLUMNS FROM settings LIKE 'modellerings_tarief_per_uur'");
    if ($columnCheck && !$columnCheck->fetch()) {
        $pdo->exec("ALTER TABLE settings ADD COLUMN modellerings_tarief_per_uur DECIMAL(10,2) NOT NULL DEFAULT 40.00");
        $pdo->exec("UPDATE settings SET modellerings_tarief_per_uur = 40.00 WHERE modellerings_tarief_per_uur IS NULL");
    }

    $stmt = $pdo->prepare("SELECT * FROM settings WHERE id = 1");
    $stmt->execute();
    $row = $stmt->fetch();

    if ($row) {
        echo json_encode([
            'standaardWinstmarge' => (float) $row['standaard_winstmarge_perc'],
            'elektriciteitsprijs'   => (float) $row['elektriciteitsprijs'],
            'vasteStartkost'        => (float) $row['vaste_startkost'],
            'vervoerskost'          => (float) $row['vervoerskost'],
            'modelleringsTarief'    => isset($row['modellerings_tarief_per_uur'])
                ? (float) $row['modellerings_tarief_per_uur']
                : 40.0,
            'btw'                   => (float) $row['btw'],
            'korting'               => (float) $row['korting_perc']
        ], JSON_UNESCAPED_UNICODE);
    } else {
        $defaults = [
            'standaardWinstmarge' => 25,
            'elektriciteitsprijs' => 0.22,
            'vasteStartkost'      => 10,
            'vervoerskost'        => 15,
            'modelleringsTarief'  => 40,
            'btw'                 => 21,
            'korting'             => 0
        ];

        $pdo->prepare("
            INSERT INTO settings (
                id,
                standaard_winstmarge_perc,
                elektriciteitsprijs,
                vaste_startkost,
                vervoerskost,
                modellerings_tarief_per_uur,
                btw,
                korting_perc
            ) VALUES (
                1, :winst, :elek, :start, :vervoer, :model, :btw, :korting
            )
        ")->execute([
            ':winst' => $defaults['standaardWinstmarge'],
            ':elek' => $defaults['elektriciteitsprijs'],
            ':start' => $defaults['vasteStartkost'],
            ':vervoer' => $defaults['vervoerskost'],
            ':model' => $defaults['modelleringsTarief'],
            ':btw' => $defaults['btw'],
            ':korting' => $defaults['korting'],
        ]);

        echo json_encode($defaults, JSON_UNESCAPED_UNICODE);
    }

} catch (PDOException $e) {
    file_put_contents(__DIR__ . '/debug.log', 'DB ERROR (get-settings): ' . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen instellingen']);
    exit;
}
