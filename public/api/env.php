<?php

declare(strict_types=1);

// Voorkom dubbel laden (bijv. via opcache of require vanaf verschillende paden)
if (defined('OFFR3D_ENV_LOADED')) {
    return $GLOBALS['__OFFR3D_CONFIG__'] ?? [];
}

/**
 * Laadt eenvoudige KEY=VALUE bestanden (zoals .env.local) zodat lokale ontwikkeling
 * zonder server-level environment vars kan gebeuren. Bestanden die niet bestaan
 * worden genegeerd.
 */
if (!function_exists('loadEnvFile')) {
    function loadEnvFile(string $path): void
    {
        if (!is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ($name === '') {
                continue;
            }

            $valueLength = strlen($value);
            if ($valueLength >= 2) {
                $firstChar = $value[0];
                $lastChar = $value[$valueLength - 1];
                if (
                    ($firstChar === '"' && $lastChar === '"') ||
                    ($firstChar === "'" && $lastChar === "'")
                ) {
                    $value = substr($value, 1, -1);
                }
            }

            if (getenv($name) !== false) {
                continue; // respecteer bestaande servervars
            }

            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

$projectRoot = dirname(__DIR__, 2);
$candidateEnvFiles = [
    $projectRoot . '/.env',
    $projectRoot . '/.env.local',
    $projectRoot . '/.env.server',
];

foreach ($candidateEnvFiles as $file) {
    loadEnvFile($file);
}

$envMap = [
    'DB_HOST' => 'OFFR3D_DB_HOST',
    'DB_NAME' => 'OFFR3D_DB_NAME',
    'DB_USER' => 'OFFR3D_DB_USER',
    'DB_PASS' => 'OFFR3D_DB_PASS',
    // API-key voor alle endpoints (header: Authorization: Bearer <API_KEY>)
    'API_KEY' => 'OFFR3D_API_KEY',
];

// Standaard fallback-configuratie (gebruikersopgegeven waarden)
$defaultConfig = [
    'DB_HOST' => 'localhost',
    'DB_NAME' => 'u132120p127267_offr3d',
    'DB_USER' => 'u132120p127267_offr3d_user',
    'DB_PASS' => 'Heilig26102012!',
    'API_KEY' => 'ditismijnoffr3dkey',
];

$config = [];
$missing = [];

foreach ($envMap as $configKey => $envKey) {
    $value = getenv($envKey);
    if ($value === false) {
        $value = $_ENV[$envKey] ?? $_SERVER[$envKey] ?? null;
    }

    if ($value === null || $value === '') {
        // Gebruik fallback indien beschikbaar
        if (isset($defaultConfig[$configKey])) {
            $config[$configKey] = $defaultConfig[$configKey];
        } else {
            $missing[] = $envKey;
        }
    } else {
        $config[$configKey] = $value;
    }
}

// Markeer als geladen zodat een tweede include niet opnieuw wordt uitgevoerd
define('OFFR3D_ENV_LOADED', true);
$GLOBALS['__OFFR3D_CONFIG__'] = $config;

return $config;
