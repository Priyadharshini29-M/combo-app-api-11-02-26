<?php
/**
 * Discount Data Receiver - MySQL Database Handler
 * Receives discount data from Shopify app and stores it in MySQL
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
$logFile = __DIR__ . '/discount_sync.log';

function logMessage($message)
{
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // Handle GET request to fetch discounts
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $shop = $_GET['shop'] ?? null;
        if (!$shop) {
            throw new Exception('Shop parameter missing');
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

        // Fetch discounts for the shop via JOIN
        // Note: Disounts are tied to templates, templates are tied to shops
        $sql = "SELECT d.* FROM discounts d 
                JOIN templates t ON d.template_id = t.id 
                JOIN shops s ON t.shop_id = s.id 
                WHERE s.shop_id = :shop";

        $stmt = $pdo->prepare($sql);
        $stmt->execute(['shop' => $shop]);
        $discounts = $stmt->fetchAll();

        // Parse JSON settings for each discount
        $formattedDiscounts = [];
        foreach ($discounts as $row) {
            $settings = json_decode($row['settings'], true);
            // Ensure ID is at top level for frontend
            $settings['id'] = $row['id'];
            $settings['template_id'] = $row['template_id'];
            $formattedDiscounts[] = $settings;
        }

        echo json_encode(['success' => true, 'discounts' => $formattedDiscounts]);
        exit();
    }

    // Get the incoming data (for POST requests)
    $rawInput = file_get_contents('php://input');
    logMessage("Raw Input: " . $rawInput);

    $input = json_decode($rawInput, true);

    if (!$input || !isset($input['event']) || !isset($input['data'])) {
        throw new Exception('Invalid payload structure');
    }

    $event = $input['event']; // create, update, delete
    $discountData = $input['data'];

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
        // Validate required fields for creation
        $requiredFields = ['title', 'code', 'type', 'value'];
        foreach ($requiredFields as $field) {
            if (!isset($discountData[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }

        // Generate UUID for new discount
        $discountId = sprintf(
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

        // Get template_id if provided
        $templateId = $discountData['template_id'] ?? null;

        // If no template_id provided, we try to find the most recent template for this shop
        if (!$templateId && isset($input['shop'])) {
            $tStmt = $pdo->prepare("SELECT t.id FROM templates t JOIN shops s ON t.shop_id = s.id WHERE s.shop_id = :shop ORDER BY t.created_at DESC LIMIT 1");
            $tStmt->execute(['shop' => $input['shop']]);
            $tRow = $tStmt->fetch();
            if ($tRow) {
                $templateId = $tRow['id'];
            }
        }

        // If STILL no templateId, we might have a problem due to NOT NULL constraint
        if (!$templateId) {
            logMessage("Warning: No template_id found for discount. This may fail if db constraint is NOT NULL.");
            // We'll proceed and let PDO catch it if it's a hard constraint
        }

        // Prepare settings JSON - Generic to capture all fields from frontend
        $settings = array_merge([
            'status' => 'active',
            'created' => date('M d, Y'),
            'usage' => '0 / Unlimited',
            'shop' => $input['shop'] ?? null
        ], $discountData);

        // Ensure ID and Template ID are handled correctly
        $settings['id'] = $discountId;
        $settings['template_id'] = $templateId;

        // Insert new discount
        $sql = "INSERT INTO discounts (id, template_id, settings, created_at)
                VALUES (:id, :template_id, :settings, CURRENT_TIMESTAMP)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $discountId,
            'template_id' => $templateId,
            'settings' => json_encode($settings)
        ]);

        logMessage("New discount created: " . $discountData['code'] . " tied to template: " . ($templateId ?? 'None'));

        $response = [
            'success' => true,
            'action' => 'created',
            'discount_id' => $discountId,
            'code' => $discountData['code'],
            'message' => 'Discount saved successfully'
        ];

    } elseif ($event === 'update') {
        // Find discount by code or shopifyId or internal ID
        $internalId = $discountData['id'] ?? null;
        $code = $discountData['code'] ?? null;
        $shopifyId = $discountData['shopifyId'] ?? null;

        if (!$internalId && !$code && !$shopifyId) {
            throw new Exception('No identifier provided for update');
        }

        // Find the discount
        $findSql = "SELECT id, settings FROM discounts WHERE id = :id OR JSON_EXTRACT(settings, '$.code') = :code OR JSON_EXTRACT(settings, '$.shopifyId') = :shopifyId LIMIT 1";
        $findStmt = $pdo->prepare($findSql);
        $findStmt->execute([
            'id' => $internalId ?? '',
            'code' => $code ?? '',
            'shopifyId' => $shopifyId ?? ''
        ]);

        $existingDiscount = $findStmt->fetch();

        if (!$existingDiscount) {
            throw new Exception('Discount not found for update');
        }

        // Merge existing settings with new data
        $existingSettings = json_decode($existingDiscount['settings'], true);
        $updatedSettings = array_merge($existingSettings, $discountData);

        // Update discount
        $sql = "UPDATE discounts 
                SET settings = :settings, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'settings' => json_encode($updatedSettings),
            'id' => $existingDiscount['id']
        ]);

        logMessage("Discount updated: " . ($code ?? $existingDiscount['id']));

        $response = [
            'success' => true,
            'action' => 'updated',
            'discount_id' => $existingDiscount['id'],
            'message' => 'Discount updated successfully'
        ];

    } elseif ($event === 'delete') {
        $discountId = $discountData['id'] ?? null;

        if (!$discountId) {
            throw new Exception('No discount ID provided for deletion');
        }

        // Delete discount
        $sql = "DELETE FROM discounts WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $discountId]);

        logMessage("Discount deleted: ID " . $discountId);

        $response = [
            'success' => true,
            'action' => 'deleted',
            'discount_id' => $discountId,
            'message' => 'Discount deleted successfully'
        ];

    } else {
        throw new Exception("Unknown event type: $event");
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
