<?php
date_default_timezone_set('Asia/Kolkata');
// Set headers to allow cross-origin requests if needed
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

// Read the incoming JSON data
$data = file_get_contents("php://input");

// Log the data to a file
$logData = date("Y-m-d H:i:s") . " - Received Webhook:\n" . $data . "\n------------------------\n";
file_put_contents("webhook.log", $logData, FILE_APPEND);

// Return a success response
http_response_code(200);
echo json_encode(["status" => "success", "message" => "Data received"]);
?>