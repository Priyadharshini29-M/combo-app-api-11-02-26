<?php
/**
 * AI Product Recommendation — called via Shopify app proxy
 * /apps/combo/ai-recommend.php → Hostinger
 */

// ── YOUR OPENAI KEY ──────────────────────────────────────────────────────────
$apiKey = '';   // <-- paste your sk-... key here
// Also tries config.php if key is empty above
if ($apiKey === '' && file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
    if (defined('OPENAI_API_KEY')) $apiKey = OPENAI_API_KEY;
}
// ─────────────────────────────────────────────────────────────────────────────

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('success' => false, 'error' => 'Method not allowed'));
    exit;
}

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(array('success' => false, 'error' => 'OpenAI API key not configured'));
    exit;
}

$raw   = file_get_contents('php://input');
$input = json_decode($raw, true);

$selectedProducts  = isset($input['selectedProducts'])  ? $input['selectedProducts']  : array();
$availableProducts = isset($input['availableProducts'])  ? $input['availableProducts']  : array();
$maxProducts       = isset($input['maxProducts'])  ? (int)$input['maxProducts']  : 5;
$currentCount      = isset($input['currentCount']) ? (int)$input['currentCount'] : 0;

if (empty($availableProducts)) {
    echo json_encode(array('success' => false, 'error' => 'No available products'));
    exit;
}

// Build prompt
$selectedTitles = array();
foreach ($selectedProducts as $p) {
    $selectedTitles[] = isset($p['title']) ? $p['title'] : 'Unknown';
}

$availableList = array();
foreach ($availableProducts as $p) {
    $h = isset($p['handle']) ? $p['handle'] : '';
    $t = isset($p['title'])  ? $p['title']  : '';
    $availableList[] = "handle:$h title:$t";
}

$selectedStr = !empty($selectedTitles) ? implode(', ', $selectedTitles) : 'nothing yet';
$canAdd      = $maxProducts - $currentCount;
$listStr     = implode("\n", $availableList);

$userPrompt = "A customer is building a combo bundle. They have selected: $selectedStr.\n"
    . "They can add $canAdd more item(s). From these available products, pick the single best complementary product:\n$listStr\n\n"
    . "Reply with ONLY the handle of the best product. No explanation.";

$payload = json_encode(array(
    'model'       => 'gpt-4.1-mini',
    'messages'    => array(
        array('role' => 'system', 'content' => 'You are a product recommendation engine. Reply only with a single product handle.'),
        array('role' => 'user',   'content' => $userPrompt),
    ),
    'max_tokens'  => 50,
    'temperature' => 0.4,
));

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey,
));
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if (!$response || $httpCode !== 200) {
    echo json_encode(array('success' => false, 'error' => 'OpenAI error: ' . $curlErr . ' HTTP ' . $httpCode));
    exit;
}

$aiData = json_decode($response, true);
$handle = isset($aiData['choices'][0]['message']['content'])
    ? trim($aiData['choices'][0]['message']['content']) : '';
$handle = preg_replace('/[^a-z0-9\-]/', '', strtolower($handle));

// Find matching product
$recommended = null;
foreach ($availableProducts as $p) {
    if (isset($p['handle']) && $p['handle'] === $handle) {
        $recommended = $p;
        break;
    }
}

// Fallback to first available
if (!$recommended) {
    $recommended = $availableProducts[0];
}

echo json_encode(array('success' => true, 'recommended' => $recommended));
