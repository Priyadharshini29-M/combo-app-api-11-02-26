<?php
/**
 * Product Recommendation Data Handler - MySQL Database Handler
 */

require_once __DIR__ . '/config.php';

date_default_timezone_set('Asia/Kolkata');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$logFile = __DIR__ . '/recommendations_sync.log';

function recLogMessage($message)
{
    global $logFile;
    file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n", FILE_APPEND);
}

// Auto-create the table if it doesn't exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS shop_recommendations (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            shop_domain VARCHAR(255) NOT NULL,
            enabled     TINYINT(1)  NOT NULL DEFAULT 0,
            rules       LONGTEXT,
            updated_at  DATETIME,
            UNIQUE KEY uq_shop (shop_domain)
        )
    ");
} catch (Exception $e) {
    // Table may already exist — safe to ignore
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    // ─── GET: Storefront fetches via app proxy ──────────────────────────────
    if ($method === 'GET') {
        $shop = $_GET['shopdomain'] ?? $_GET['shop'] ?? null;

        recLogMessage("GET - shop: " . ($shop ?? 'NULL'));

        if (!$shop) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing shop parameter']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT enabled, rules FROM shop_recommendations WHERE shop_domain = ? LIMIT 1");
        $stmt->execute([$shop]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            echo json_encode(['success' => true, 'enabled' => false, 'rules' => []]);
            exit();
        }

        $rules = json_decode($row['rules'] ?? '[]', true);
        if (!is_array($rules)) $rules = [];

        echo json_encode([
            'success' => true,
            'enabled' => (bool)$row['enabled'],
            'rules'   => $rules,
        ]);
        exit();
    }

    // ─── POST: Admin Node.js syncs data ────────────────────────────────────
    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        recLogMessage("POST body: " . $rawInput);

        $input = json_decode($rawInput, true);

        if (!$input) {
            throw new Exception('Invalid JSON payload');
        }

        $event = $input['event'] ?? 'upsert';
        $data  = $input['data'] ?? $input;

        $shop    = $data['shop'] ?? $input['shop'] ?? null;
        $enabled = !empty($data['enabled']) ? 1 : 0;
        $rules   = json_encode(array_values($data['rules'] ?? []));

        if (!$shop) {
            throw new Exception('Missing shop domain');
        }

        recLogMessage("Upsert - shop: $shop | enabled: $enabled");

        $stmt = $pdo->prepare("
            INSERT INTO shop_recommendations (shop_domain, enabled, rules, updated_at)
            VALUES (:shop, :enabled, :rules, NOW())
            ON DUPLICATE KEY UPDATE
                enabled    = VALUES(enabled),
                rules      = VALUES(rules),
                updated_at = NOW()
        ");
        $stmt->execute([
            'shop'    => $shop,
            'enabled' => $enabled,
            'rules'   => $rules,
        ]);

        recLogMessage("Upserted recommendations for shop: $shop");
        echo json_encode(['success' => true, 'action' => 'upserted', 'shop' => $shop]);
        exit();
    }

    throw new Exception("Method not allowed: $method");

} catch (PDOException $e) {
    recLogMessage("DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Exception $e) {
    recLogMessage("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
