<?php
/**
 * Template Data Receiver - MySQL Database Handler
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

$logFile = __DIR__ . '/templates_sync.log';
$webhookLogFile = __DIR__ . '/templates_webhook.log';

function logMessage($message)
{
    global $logFile;
    file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n", FILE_APPEND);
}

// Extract numeric ID from Shopify GID string e.g. "gid://shopify/DiscountAutomaticNode/123" → "123"
// Returns null if not a GID or no numeric part found
function extractShopifyId($value)
{
    if (!$value)
        return null;
    if (is_numeric($value))
        return $value;
    if (is_string($value) && strpos($value, 'gid://') === 0) {
        $parts = explode('/', $value);
        $last = end($parts);
        return is_numeric($last) ? $last : null;
    }
    return null;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $rawInput = '';

    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $headers = getallheaders();
        $logEntry = "========================================\n"
            . "DATE: " . date('Y-m-d H:i:s') . "\n"
            . "IP:   " . ($_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN') . "\n"
            . "HEADERS: " . json_encode($headers, JSON_PRETTY_PRINT) . "\n"
            . "BODY: " . $rawInput . "\n"
            . "========================================\n\n";
        file_put_contents($webhookLogFile, $logEntry, FILE_APPEND);
    }

    // ─── GET ────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $shop_identifier = $_GET['shopdomain'] ?? $_GET['shop'] ?? null;
        $handle = $_GET['handle'] ?? null;
        logMessage("GET Request for Shop: " . ($shop_identifier ?? 'NULL') . " | Handle: " . ($handle ?? 'NULL'));

        if (!$shop_identifier) {
            throw new Exception('Missing shop parameter');
        }

        // Map numeric ID → domain if needed
        $targetShop = $shop_identifier;
        if (is_numeric($shop_identifier)) {
            $shopLookup = $pdo->prepare("SELECT shop_id FROM shops WHERE id = ? OR shopify_numeric_id = ? LIMIT 1");
            $shopLookup->execute([$shop_identifier, $shop_identifier]);
            $found = $shopLookup->fetchColumn();
            if ($found)
                $targetShop = $found;
        }

        // Match by shop_domain (string) — NOT by shop_id (INT FK)
        $stmt = $pdo->prepare("SELECT * FROM templates WHERE shop_domain = ? ORDER BY created_at DESC");
        $stmt->execute([$targetShop]);
        $allTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $templates = [];
        foreach ($allTemplates as $t) {
            if (!empty($t['product_list']))
                $t['product_list'] = json_decode($t['product_list'], true);
            if (!empty($t['config']))
                $t['config'] = json_decode($t['config'], true);
            if (!empty($t['source']))
                $t['source'] = json_decode($t['source'], true);

            // Expose properties at top level
            $t['shop'] = $t['shop_domain'];
            $t['active'] = ($t['is_active'] == 1);
            $t['createdAt'] = date('c', strtotime($t['created_at']));
            $t['page_url'] = $t['source']['page_url'] ?? null;
            $t['page_id'] = $t['source']['page_id'] ?? null;

            // If handle provided, filter by page_url
            if ($handle) {
                if ($t['page_url'] === $handle) {
                    $templates[] = $t;
                }
            }
            else {
                $templates[] = $t;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $templates,
            'templates' => $templates
        ]);
        exit();
    }

    // ─── POST ───────────────────────────────────────────────────────────────
    $input = json_decode($rawInput, true);
    logMessage("Raw Input: " . $rawInput);

    if (!$input || !isset($input['event'])) {
        throw new Exception('Invalid payload: missing event');
    }

    $event = $input['event']; // create | update | delete

    // For delete, data may be at root level (no 'data' key sent by Node.js)
    $templateData = $input['data'] ?? null;

    logMessage("Event: $event");

    // ── CREATE ──────────────────────────────────────────────────────────────
    if ($event === 'create') {
        if (!$templateData)
            throw new Exception('Missing data payload');

        $shopDomain = $templateData['shop'] ?? $templateData['shop_domain'] ?? $templateData['shop_id'] ?? null;
        if (!$shopDomain)
            throw new Exception('Missing shop domain');

        $title = $templateData['title'] ?? null;
        if (!$title)
            throw new Exception('Missing title');

        // Lookup the INT shop FK
        $shopLookup = $pdo->prepare("SELECT id FROM shops WHERE shop_id = ? OR primary_domain = ? LIMIT 1");
        $shopLookup->execute([$shopDomain, $shopDomain]);
        $shopFk = $shopLookup->fetchColumn();
        if (!$shopFk)
            throw new Exception("Shop not found: $shopDomain. Sync shop first.");

        // Use Node.js-provided id as external_id so updates/deletes can find it
        $externalId = $templateData['id'] ?? null;
        if (!$externalId) {
            $externalId = sprintf(
                '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );
        }

        $collectionId = $templateData['collection_id']
            ?? $templateData['config']['collection_id']
            ?? null;

        $discountId = extractShopifyId($templateData['discount_id'] ?? null);

        $stmt = $pdo->prepare("
            INSERT INTO templates
                (external_id, shop_id, shop_domain, collection_id, title, layout_type, source, product_list, config, is_active, created_at, discount_id, discount_code)
            VALUES
                (:external_id, :shop_id, :shop_domain, :collection_id, :title, :layout_type, :source, :product_list, :config, :is_active, :created_at, :discount_id, :discount_code)
        ");
        $stmt->execute([
            'external_id' => $externalId,
            'shop_id' => $shopFk,
            'shop_domain' => $shopDomain,
            'collection_id' => $collectionId,
            'title' => $title,
            'layout_type' => $templateData['config']['layout'] ?? $templateData['layout_type'] ?? 'layout1',
            'source' => json_encode([
                'source' => 'app_engine',
                'page_url' => $templateData['page_url'] ?? null,
                'page_id' => $templateData['page_id'] ?? null,
            ]),
            'product_list' => json_encode($templateData['products'] ?? $templateData['product_list'] ?? []),
            'config' => json_encode($templateData['config'] ?? []),
            'is_active' => ($templateData['active'] ?? false) ? 1 : 0,
            'created_at' => date('Y-m-d H:i:s'),
            'discount_id' => $discountId,
            'discount_code' => $templateData['discount_code'] ?? null,
        ]);

        logMessage("Template created: $title (external_id: $externalId)");
        echo json_encode(['success' => true, 'action' => 'created', 'template_id' => $externalId, 'message' => 'Template saved successfully']);
        exit();
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if ($event === 'update') {
        if (!$templateData)
            throw new Exception('Missing data payload');

        $externalId = $templateData['id'] ?? null;
        $shopDomain = $templateData['shop'] ?? $templateData['shop_domain'] ?? '';
        $title = $templateData['title'] ?? '';

        if (!$externalId && !$title)
            throw new Exception('No id or title to identify template');

        $collectionId = $templateData['collection_id']
            ?? $templateData['config']['collection_id']
            ?? null;

        $discountId = extractShopifyId($templateData['discount_id'] ?? null);

        $stmt = $pdo->prepare("
            UPDATE templates SET
                title         = :title,
                layout_type   = :layout_type,
                collection_id = :collection_id,
                source        = :source,
                product_list  = :product_list,
                config        = :config,
                is_active     = :is_active,
                discount_id   = :discount_id,
                discount_code = :discount_code
            WHERE external_id = :external_id
               OR (title = :where_title AND shop_domain = :shop_domain)
        ");
        $stmt->execute([
            'title' => $title,
            'layout_type' => $templateData['config']['layout'] ?? $templateData['layout_type'] ?? 'layout1',
            'collection_id' => $collectionId,
            'source' => json_encode([
                'source' => 'app_engine',
                'page_url' => $templateData['page_url'] ?? $templateData['source']['page_url'] ?? null,
                'page_id' => $templateData['page_id'] ?? $templateData['source']['page_id'] ?? null,
            ]),
            'product_list' => json_encode($templateData['products'] ?? $templateData['product_list'] ?? []),
            'config' => json_encode($templateData['config'] ?? []),
            'is_active' => ($templateData['active'] ?? false) ? 1 : 0,
            'discount_id' => $discountId,
            'discount_code' => $templateData['discount_code'] ?? null,
            'external_id' => $externalId ?? '',
            'where_title' => $title,
            'shop_domain' => $shopDomain,
        ]);

        logMessage("Template updated: $title (external_id: $externalId, rows: " . $stmt->rowCount() . ")");
        echo json_encode(['success' => true, 'action' => 'updated', 'message' => 'Template updated successfully']);
        exit();
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if ($event === 'delete') {
        // Node.js sends id at ROOT level (no 'data' wrapper for delete)
        $externalId = $input['id'] ?? $templateData['id'] ?? null;
        $shopDomain = $input['shop'] ?? $templateData['shop'] ?? '';
        $title = $templateData['title'] ?? '';

        if (!$externalId && !$title)
            throw new Exception('No id or title to delete');

        $stmt = $pdo->prepare("
            DELETE FROM templates
            WHERE external_id = :external_id
               OR (title = :title AND shop_domain = :shop_domain)
        ");
        $stmt->execute([
            'external_id' => $externalId ?? '',
            'title' => $title,
            'shop_domain' => $shopDomain,
        ]);

        logMessage("Template deleted (external_id: $externalId, rows: " . $stmt->rowCount() . ")");
        echo json_encode(['success' => true, 'action' => 'deleted', 'message' => 'Template deleted successfully']);
        exit();
    }

    throw new Exception("Unknown event: $event");

}
catch (PDOException $e) {
    logMessage("DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
