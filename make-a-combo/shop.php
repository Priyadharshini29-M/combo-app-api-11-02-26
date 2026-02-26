<?php
/**
 * Shop Data Receiver - MySQL Database Handler
 * Receives shop data from Shopify app and stores it in MySQL
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
$logFile = __DIR__ . '/shop_sync.log';

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

    if (!$input || !isset($input['data'])) {
        throw new Exception('Invalid payload structure');
    }

    $shopData = $input['data'];

    // Validate required fields
    $requiredFields = ['shop_id', 'store_name', 'status'];
    foreach ($requiredFields as $field) {
        if (!isset($shopData[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

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

    // Generate UUID for new shops
    $shopId = $shopData['id'] ?? null;

    if (!$shopId) {
        // Generate UUID v4
        $shopId = sprintf(
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
    }

    // Prepare data for insertion/update
    $data = [
        'id' => $shopId,
        'shop_id' => $shopData['shop_id'],
        'store_name' => $shopData['store_name'],
        'status' => $shopData['status'],
        'app_plan' => $shopData['app_plan'] ?? 'Free',
        'theme_name' => $shopData['theme_name'] ?? null,
        'last_source' => $shopData['last_source'] ?? 'api',
    ];

    // Check if shop already exists
    $checkStmt = $pdo->prepare("SELECT id FROM shops WHERE shop_id = :shop_id");
    $checkStmt->execute(['shop_id' => $data['shop_id']]);
    $existingShop = $checkStmt->fetch();

    if ($existingShop) {
        // Update existing shop
        $sql = "UPDATE shops SET 
                store_name = :store_name,
                status = :status,
                app_plan = :app_plan,
                theme_name = :theme_name,
                last_source = :last_source,
                updated_at = CURRENT_TIMESTAMP
                WHERE shop_id = :shop_id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'store_name' => $data['store_name'],
            'status' => $data['status'],
            'app_plan' => $data['app_plan'],
            'theme_name' => $data['theme_name'],
            'last_source' => $data['last_source'],
            'shop_id' => $data['shop_id']
        ]);

        logMessage("Shop updated: " . $data['shop_id']);

        $response = [
            'success' => true,
            'action' => 'updated',
            'shop_id' => $data['shop_id'],
            'id' => $existingShop['id'],
            'message' => 'Shop data updated successfully'
        ];
    } else {
        // Insert new shop
        $sql = "INSERT INTO shops (id, shop_id, store_name, status, app_plan, theme_name, last_source, updated_at)
                VALUES (:id, :shop_id, :store_name, :status, :app_plan, :theme_name, :last_source, CURRENT_TIMESTAMP)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($data);

        logMessage("New shop created: " . $data['shop_id']);

        $response = [
            'success' => true,
            'action' => 'created',
            'shop_id' => $data['shop_id'],
            'id' => $data['id'],
            'message' => 'Shop data saved successfully'
        ];
    }

    http_response_code(200);
    echo json_encode($response);

} catch (PDOException $e) {
    logMessage("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error',
        'message' => $e->getMessage()
    ]);
} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request',
        'message' => $e->getMessage()
    ]);
}
