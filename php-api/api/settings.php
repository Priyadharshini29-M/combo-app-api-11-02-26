<?php

declare(strict_types=1);

require __DIR__ . '/../db.php';

$defaultSettings = [
    'imageRatio' => 'square',
    'columns' => 3,
    'primaryColor' => '#000000',
    'showTitle' => true,
    'showPrice' => true,
];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function validateSettings(array $settings): array
{
    $allowedImageRatio = ['square', 'portrait', 'rectangle'];

    if (!isset($settings['imageRatio']) || !in_array($settings['imageRatio'], $allowedImageRatio, true)) {
        return [false, 'imageRatio must be one of square, portrait, rectangle'];
    }

    if (!isset($settings['columns']) || !is_numeric($settings['columns'])) {
        return [false, 'columns must be numeric'];
    }

    $columns = (int) $settings['columns'];
    if ($columns < 1 || $columns > 6) {
        return [false, 'columns must be between 1 and 6'];
    }

    if (!isset($settings['primaryColor']) || !is_string($settings['primaryColor']) || !preg_match('/^#[A-Fa-f0-9]{6}$/', $settings['primaryColor'])) {
        return [false, 'primaryColor must be a valid 6-digit hex'];
    }

    if (!array_key_exists('showTitle', $settings) || !is_bool($settings['showTitle'])) {
        return [false, 'showTitle must be boolean'];
    }

    if (!array_key_exists('showPrice', $settings) || !is_bool($settings['showPrice'])) {
        return [false, 'showPrice must be boolean'];
    }

    return [true, ''];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $shop = isset($_GET['shop']) ? trim((string) $_GET['shop']) : '';
    if ($shop === '') {
        respond(400, ['success' => false, 'error' => 'shop query parameter is required']);
    }

    $stmt = $pdo->prepare('SELECT settings FROM customization_settings WHERE shop = :shop LIMIT 1');
    $stmt->execute([':shop' => $shop]);
    $row = $stmt->fetch();

    if (!$row) {
        respond(200, [
            'success' => true,
            'shop' => $shop,
            'settings' => $defaultSettings,
            'source' => 'default',
        ]);
    }

    $decoded = json_decode((string) $row['settings'], true);
    if (!is_array($decoded)) {
        respond(500, ['success' => false, 'error' => 'Invalid settings JSON stored in database']);
    }

    respond(200, [
        'success' => true,
        'shop' => $shop,
        'settings' => $decoded,
        'source' => 'database',
    ]);
}

if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || trim($rawBody) === '') {
        respond(400, ['success' => false, 'error' => 'Request body is required']);
    }

    $body = json_decode($rawBody, true);
    if (!is_array($body)) {
        respond(400, ['success' => false, 'error' => 'Invalid JSON']);
    }

    $shop = isset($body['shop']) ? trim((string) $body['shop']) : '';
    $settings = $body['settings'] ?? null;

    if ($shop === '') {
        respond(400, ['success' => false, 'error' => 'shop is required']);
    }

    if (!is_array($settings)) {
        respond(400, ['success' => false, 'error' => 'settings must be an object']);
    }

    [$valid, $validationError] = validateSettings($settings);
    if (!$valid) {
        respond(422, ['success' => false, 'error' => $validationError]);
    }

    $normalized = [
        'imageRatio' => (string) $settings['imageRatio'],
        'columns' => (int) $settings['columns'],
        'primaryColor' => strtoupper((string) $settings['primaryColor']),
        'showTitle' => (bool) $settings['showTitle'],
        'showPrice' => (bool) $settings['showPrice'],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO customization_settings (shop, settings)
         VALUES (:shop, :settings)
         ON DUPLICATE KEY UPDATE settings = :settings'
    );

    $stmt->execute([
        ':shop' => $shop,
        ':settings' => json_encode($normalized, JSON_UNESCAPED_SLASHES),
    ]);

    respond(200, [
        'success' => true,
        'shop' => $shop,
        'settings' => $normalized,
    ]);
}

respond(405, ['success' => false, 'error' => 'Method not allowed']);
