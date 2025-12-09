<?php
// Eenvoudige API-key check voor alle endpoints.
$configPath = __DIR__ . '/env.php';
$apiKey = null;
if (file_exists($configPath)) {
    $cfg = include $configPath;
    $apiKey = $cfg['API_KEY'] ?? null;
}

if ($apiKey) {
    $provided = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION']) && str_starts_with($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ')) {
        $provided = substr($_SERVER['HTTP_AUTHORIZATION'], 7);
    } elseif (!empty($_SERVER['HTTP_X_API_KEY'])) {
        $provided = $_SERVER['HTTP_X_API_KEY'];
    } elseif (!empty($_GET['api_key'])) { // fallback
        $provided = $_GET['api_key'];
    }

    if ($provided !== $apiKey) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

// CSRF/double-submit bescherming voor niet-GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $csrfHeader = $_SERVER['HTTP_X_CSRF'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if ($apiKey && $csrfHeader !== $apiKey) {
        http_response_code(403);
        echo json_encode(['error' => 'CSRF check failed']);
        exit;
    }

    // Eenvoudige rate limit (IP-based) voor muterende requests
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $limit = 120; // requests per window
    $window = 60; // seconden
    $now = time();
    $bucketFile = sys_get_temp_dir() . '/offr3d_rate_' . md5($ip);
    $data = ['count' => 0, 'start' => $now];
    if (file_exists($bucketFile)) {
        $raw = @file_get_contents($bucketFile);
        $parsed = json_decode($raw, true);
        if (is_array($parsed) && isset($parsed['count'], $parsed['start'])) {
            $data = $parsed;
        }
    }
    if (($now - $data['start']) > $window) {
        $data = ['count' => 0, 'start' => $now];
    }
    $data['count']++;
    if ($data['count'] > $limit) {
        http_response_code(429);
        echo json_encode(['error' => 'Too many requests']);
        exit;
    }
    @file_put_contents($bucketFile, json_encode($data));
}
