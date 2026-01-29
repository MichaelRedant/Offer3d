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

$userId = 1; // gesimuleerd
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || empty($data['naam'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Projectnaam is verplicht.']);
    exit;
}

try {
    ensureProjectTables($pdo);
    ensureProjectSubtasksTable($pdo);
    ensureProjectAttachmentsTable($pdo);
    ensureProjectActivityTable($pdo);

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO projects (
            user_id, client_id, quote_id, naam, status, prioriteit, deadline, locatie, tags, notities, progress_percent, status_history
        ) VALUES (
            :user_id, :client_id, :quote_id, :naam, :status, :prioriteit, :deadline, :locatie, :tags, :notities, :progress_percent, :status_history
        )
    ");

    $stmt->execute([
        ':user_id' => $userId,
        ':client_id' => !empty($data['client_id']) ? intval($data['client_id']) : null,
        ':quote_id' => !empty($data['quote_id']) ? intval($data['quote_id']) : null,
        ':naam' => $data['naam'],
        ':status' => $data['status'] ?? 'intake',
        ':prioriteit' => $data['prioriteit'] ?? 'normaal',
        ':deadline' => !empty($data['deadline']) ? $data['deadline'] : null,
        ':locatie' => $data['locatie'] ?? null,
        ':tags' => $data['tags'] ?? null,
        ':notities' => $data['notities'] ?? null,
        ':progress_percent' => isset($data['progress_percent']) ? floatval($data['progress_percent']) : 0,
        ':status_history' => null,
    ]);

    $projectId = $pdo->lastInsertId();

    if (!empty($data['materials']) && is_array($data['materials'])) {
        $stmtMat = $pdo->prepare("
            INSERT INTO project_materials (project_id, material_id, spool_id, quantity_grams, notes)
            VALUES (:project_id, :material_id, :spool_id, :qty, :notes)
        ");
        foreach ($data['materials'] as $mat) {
            $stmtMat->execute([
                ':project_id' => $projectId,
                ':material_id' => !empty($mat['material_id']) ? intval($mat['material_id']) : null,
                ':spool_id' => !empty($mat['spool_id']) ? intval($mat['spool_id']) : null,
                ':qty' => floatval($mat['quantity_grams'] ?? 0),
                ':notes' => $mat['notes'] ?? null,
            ]);
        }
    }

    if (!empty($data['tasks']) && is_array($data['tasks'])) {
        $stmtTask = $pdo->prepare("
            INSERT INTO project_tasks (project_id, title, status, owner, due_date, notes, sort_order)
            VALUES (:project_id, :title, :status, :owner, :due_date, :notes, :sort_order)
        ");
        foreach ($data['tasks'] as $task) {
            $stmtTask->execute([
                ':project_id' => $projectId,
                ':title' => $task['title'] ?? '',
                ':status' => $task['status'] ?? 'open',
                ':owner' => $task['owner'] ?? null,
                ':due_date' => !empty($task['due_date']) ? $task['due_date'] : null,
                ':notes' => $task['notes'] ?? null,
                ':sort_order' => isset($task['sort_order']) ? intval($task['sort_order']) : 0,
            ]);
            $taskId = $pdo->lastInsertId();
            if (!empty($task['subtasks']) && is_array($task['subtasks'])) {
                $stmtSub = $pdo->prepare("
                    INSERT INTO project_task_subtasks (task_id, title, status, sort_order)
                    VALUES (:task_id, :title, :status, :sort_order)
                ");
                foreach ($task['subtasks'] as $idxSub => $sub) {
                    $stmtSub->execute([
                        ':task_id' => $taskId,
                        ':title' => $sub['title'] ?? '',
                        ':status' => $sub['status'] ?? 'open',
                        ':sort_order' => isset($sub['sort_order']) ? intval($sub['sort_order']) : $idxSub,
                    ]);
                }
            }
        }
    }

    if (!empty($data['attachments']) && is_array($data['attachments'])) {
        $stmtAtt = $pdo->prepare("
            INSERT INTO project_attachments (project_id, title, url, attachment_type)
            VALUES (:project_id, :title, :url, :type)
        ");
        foreach ($data['attachments'] as $att) {
            if (empty($att['title']) || empty($att['url'])) {
                continue;
            }
            $stmtAtt->execute([
                ':project_id' => $projectId,
                ':title' => $att['title'],
                ':url' => $att['url'],
                ':type' => $att['attachment_type'] ?? 'link',
            ]);
        }
    }

    // Log activiteit
    logProjectActivity($pdo, (int)$projectId, $userId, 'created', 'Project aangemaakt');

    $pdo->commit();
    echo json_encode(['success' => true, 'project_id' => $projectId], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij opslaan project: ' . $e->getMessage()]);
}
