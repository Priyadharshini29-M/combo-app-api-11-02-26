<?php
/**
 * Template Data Receiver - MySQL Database Handler
 * Receives template data from Shopify app and stores it in MySQL
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';

// Log file for debugging
$logFile = __DIR__ . '/templates_sync.log';

function logMessage($message)
{
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // Get the incoming data
    $rawInput = file_get_contents('php://input');
    logMessage("Raw Input: " . $rawInput);

    $input = json_decode($rawInput, true);

    if (!$input || !isset($input['event']) || !isset($input['data'])) {
        throw new Exception('Invalid payload structure');
    }

    $event = $input['event']; // create, update, delete
    $templateData = $input['data'];

    // Connect to MySQL
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

    logMessage("Database connection established");
    logMessage("Event Type: $event");

    // Handle different events
    if ($event === 'create') {
        // Validate required fields
        if (!isset($templateData['title']) || !isset($templateData['shop'])) {
            throw new Exception('Missing title or shop');
        }

        // Generate UUID
        $templateUuid = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff)
        );

        // Prepare data for insertion
        $shopId = $templateData['shop'];
        $title = $templateData['title'];
        $layoutType = $templateData['config']['layout'] ?? 'list';
        $isActive = ($templateData['active'] ?? false) ? 1 : 0;

        // JSON fields
        $source = json_encode(['source' => 'app_engine']);
        $productList = json_encode($templateData['products'] ?? []);
        $config = json_encode($templateData['config'] ?? []);

        $sql = "INSERT INTO templates (id, shop_id, title, layout_type, source, product_list, config, is_active, created_at)
                VALUES (:id, :shop_id, :title, :layout_type, :source, :product_list, :config, :is_active, CURRENT_TIMESTAMP)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $templateUuid,
            'shop_id' => $shopId,
            'title' => $title,
            'layout_type' => $layoutType,
            'source' => $source,
            'product_list' => $productList,
            'config' => $config,
            'is_active' => $isActive
        ]);

        logMessage("New template created: " . $title);

        $response = [
            'success' => true,
            'action' => 'created',
            'template_id' => $templateUuid,
            'message' => 'Template saved successfully'
        ];

    } elseif ($event === 'update') {
        $localId = $templateData['id'] ?? null;
        if (!$localId)
            throw new Exception('No local template ID provided');

        // Note: For real production, we'd find by local_id mapping or title+shop
        // Here we find by title and shop as a fallback for simplicity
        $findSql = "SELECT id FROM templates WHERE title = :title AND shop_id = :shop LIMIT 1";
        $findStmt = $pdo->prepare($findSql);
        $findStmt->execute([
            'title' => $templateData['title'],
            'shop' => $templateData['shop']
        ]);
        $existing = $findStmt->fetch();

        if (!$existing) {
            throw new Exception('Template not found for update');
        }

        $sql = "UPDATE templates SET 
                layout_type = :layout_type,
                product_list = :product_list,
                config = :config,
                is_active = :is_active,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'layout_type' => $templateData['config']['layout'] ?? 'list',
            'product_list' => json_encode($templateData['products'] ?? []),
            'config' => json_encode($templateData['config'] ?? []),
            'is_active' => ($templateData['active'] ?? false) ? 1 : 0,
            'id' => $existing['id']
        ]);

        logMessage("Template updated: " . $templateData['title']);

        $response = [
            'success' => true,
            'action' => 'updated',
            'template_id' => $existing['id'],
            'message' => 'Template updated successfully'
        ];

    } elseif ($event === 'delete') {
        // Implement delete logic based on title/shop for now
        $sql = "DELETE FROM templates WHERE title = :title AND shop_id = :shop";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'title' => $templateData['title'] ?? '',
            'shop' => $templateData['shop'] ?? ''
        ]);

        logMessage("Template deleted");

        $response = [
            'success' => true,
            'action' => 'deleted',
            'message' => 'Template deleted successfully'
        ];
    }

    http_response_code(200);
    echo json_encode($response);

} catch (PDOException $e) {
    logMessage("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
