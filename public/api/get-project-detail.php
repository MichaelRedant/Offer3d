<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$userId = 1; // gesimuleerde user

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig project ID.']);
    exit;
}

try {
    ensureProjectTables($pdo);
    ensureProjectActivityTable($pdo);
    ensureProjectSubtasksTable($pdo);
    ensureProjectAttachmentsTable($pdo);
    ensureClientExtendedColumns($pdo);

    $stmt = $pdo->prepare("
        SELECT 
            p.*,
            c.naam AS klant_naam,
            c.bedrijf AS klant_bedrijf,
            c.email AS klant_email,
            q.quote_number,
            q.id AS quote_ref
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN quotes q ON p.quote_id = q.id
        WHERE p.id = ? AND p.user_id = ?
    ");
    $stmt->execute([$id, $userId]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$project) {
        http_response_code(404);
        echo json_encode(['error' => 'Project niet gevonden.']);
        exit;
    }

    $matStmt = $pdo->prepare("
        SELECT pm.*, m.naam AS materiaal_naam, m.kleur AS materiaal_kleur, ms.id AS spool_ref
        FROM project_materials pm
        LEFT JOIN materials m ON pm.material_id = m.id
        LEFT JOIN material_spools ms ON pm.spool_id = ms.id
        WHERE pm.project_id = ?
    ");
    $matStmt->execute([$id]);
    $materials = $matStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $taskStmt = $pdo->prepare("SELECT * FROM project_tasks WHERE project_id = ? ORDER BY sort_order ASC, due_date IS NULL, due_date ASC");
    $taskStmt->execute([$id]);
    $tasks = $taskStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    // Subtasks koppelen
    $subStmt = $pdo->prepare("
        SELECT st.*, t.id AS task_id
        FROM project_task_subtasks st
        INNER JOIN project_tasks t ON st.task_id = t.id
        WHERE t.project_id = ?
        ORDER BY st.sort_order ASC, st.id ASC
    ");
    $subStmt->execute([$id]);
    $subtasks = $subStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    if (!empty($subtasks)) {
        $map = [];
        foreach ($subtasks as $sub) {
            $map[$sub['task_id']][] = $sub;
        }
        $tasks = array_map(function ($task) use ($map) {
            $task['subtasks'] = $map[$task['id']] ?? [];
            return $task;
        }, $tasks);
    }

    $attStmt = $pdo->prepare("SELECT * FROM project_attachments WHERE project_id = ? ORDER BY created_at DESC");
    $attStmt->execute([$id]);
    $attachments = $attStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $activityStmt = $pdo->prepare("SELECT type, message, created_at FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50");
    $activityStmt->execute([$id]);
    $activities = $activityStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    // decode status_history JSON indien aanwezig
    if (!empty($project['status_history'])) {
        $decoded = json_decode($project['status_history'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $project['status_history'] = $decoded;
        }
    }

    echo json_encode([
        'project' => $project,
        'materials' => $materials,
        'tasks' => $tasks,
        'activities' => $activities,
        'attachments' => $attachments,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij ophalen project: ' . $e->getMessage()]);
}
