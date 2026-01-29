<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$data = json_decode(file_get_contents("php://input"), true);
$userId = 1; // gesimuleerde user

if (!isset($data['id']) || !is_numeric($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig project ID opgegeven.']);
    exit;
}

$projectId = intval($data['id']);

try {
    ensureProjectTables($pdo);
    ensureProjectSubtasksTable($pdo);
    ensureProjectAttachmentsTable($pdo);
    ensureProjectActivityTable($pdo);

    // Bestaat het project voor deze user?
    $check = $pdo->prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?");
    $check->execute([$projectId, $userId]);
    if ($check->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Project niet gevonden of geen toegang.']);
        exit;
    }

    $pdo->beginTransaction();

    // Verwijder afhankelijke data
    $pdo->prepare("DELETE FROM project_materials WHERE project_id = ?")->execute([$projectId]);
    $pdo->prepare("DELETE st FROM project_task_subtasks st INNER JOIN project_tasks t ON st.task_id = t.id WHERE t.project_id = ?")->execute([$projectId]);
    $pdo->prepare("DELETE FROM project_tasks WHERE project_id = ?")->execute([$projectId]);
    $pdo->prepare("DELETE FROM project_attachments WHERE project_id = ?")->execute([$projectId]);
    $pdo->prepare("DELETE FROM project_activity WHERE project_id = ?")->execute([$projectId]);

    // Verwijder project
    $pdo->prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")->execute([$projectId, $userId]);

    $pdo->commit();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Verwijderen mislukt: ' . $e->getMessage()]);
}
