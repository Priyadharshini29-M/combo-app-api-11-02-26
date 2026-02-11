# App Status Toggle - Testing Guide

## What Was Implemented

### 1. **Dashboard UI** (`app/routes/app.dashboard.jsx`)
   - ✅ Added "App Status Control" section
   - ✅ Enable/Disable toggle buttons
   - ✅ Real-time status badge (Green = Enabled, Red = Disabled)
   - ✅ Success/Error message display
   - ✅ Webhook endpoint information display
   - ✅ Loading states during API calls

### 2. **API Integration** (`app/routes/api.toggle-app.jsx`)
   - ✅ Already configured to send data to PHP webhook
   - ✅ Sends comprehensive shop data on enable
   - ✅ Sends minimal data on disable
   - ✅ Uses IST timezone for timestamps

### 3. **Webhook Helper** (`app/utils/api-helpers.js`)
   - ✅ Updated to use your ngrok URL: `https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php`
   - ✅ Centralized webhook function
   - ✅ Error handling and logging

## How It Works

### When User Clicks "Enable App":

1. **Frontend** sends POST to `/api/toggle-app` with `{ enabled: true }`
2. **Backend** (`api.toggle-app.jsx`):
   - Creates/verifies ScriptTag
   - Sets metafield `app_url`
   - Fetches comprehensive shop data
   - Sends to PHP webhook
3. **PHP Webhook** receives:

```json
{
  "event": "app_enabled",
  "resource": "store_config",
  "shop": "combo-reinstall.myshopify.com",
  "data": {
    "id": "gid://shopify/Shop/...",
    "shop_id": "combo-reinstall.myshopify.com",
    "domain": "combo-reinstall.myshopify.com",
    "store_name": "Combo Reinstall",
    "created_at": "11/02/2026, 04:45:30 PM",
    "theme_name": "Dawn",
    "updated_at": "11/02/2026, 04:57:30 PM",
    "installed": "active",
    "status": "enabled",
    "app_plan": "Free",
    "shopify_plan": "Basic"
  }
}
```

### When User Clicks "Disable App":

1. **Frontend** sends POST to `/api/toggle-app` with `{ enabled: false }`
2. **Backend** (`api.toggle-app.jsx`):
   - Deletes ScriptTag
   - Sets metafield to "MISSING"
   - Sends to PHP webhook
3. **PHP Webhook** receives:

```json
{
  "event": "app_disabled",
  "resource": "store_config",
  "shop": "combo-reinstall.myshopify.com",
  "data": {
    "shop_id": "combo-reinstall.myshopify.com",
    "status": "disabled",
    "updated_at": "11/02/2026, 04:58:15 PM"
  }
}
```

## Testing Steps

### 1. Start Your Dev Server
```bash
# Should already be running
shopify app dev --store combo-reinstall.myshopify.com
```

### 2. Open Your Dashboard
Navigate to: `http://localhost:3000/app/dashboard` (or your dev URL)

### 3. Test Enable Button
1. Click "Enable App" button
2. Watch for:
   - ✅ Button shows loading state
   - ✅ Success message appears: "✅ App enabled successfully! Status sent to webhook."
   - ✅ Badge changes to green "Enabled"
   - ✅ "Enable App" button becomes disabled
   - ✅ "Disable App" button becomes active

### 4. Check PHP Webhook Logs
Open: `d:\Digifyce\Make-a-combo\make-a-combo\logs\webhook.log`

You should see:
```
=== Webhook Received at 2026-02-11 16:57:30 ===
Headers: {...}
Body: {"event":"app_enabled","resource":"store_config",...}
```

### 5. Test Disable Button
1. Click "Disable App" button
2. Watch for:
   - ✅ Button shows loading state
   - ✅ Success message appears: "🔴 App disabled successfully! Status sent to webhook."
   - ✅ Badge changes to red "Disabled"
   - ✅ "Disable App" button becomes disabled
   - ✅ "Enable App" button becomes active

### 6. Check PHP Webhook Again
Should see new entry with `"event":"app_disabled"`

## Troubleshooting

### Issue: "Failed to toggle app"
**Solution:** Check browser console for errors. Verify `/api/toggle-app` route is accessible.

### Issue: "Webhook not receiving data"
**Solution:** 
1. Verify ngrok is running: `ngrok http 80` (or your PHP server port)
2. Check ngrok URL matches: `https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php`
3. Test webhook directly:
```bash
curl -X POST https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

### Issue: "Button stays in loading state"
**Solution:** Check server logs for API errors. Ensure Shopify authentication is working.

### Issue: "Double slashes in URL"
**Note:** Your URL has `//make-a-combo/` - this is intentional based on your request. If it causes issues, remove one slash in `api-helpers.js`.

## Monitoring

### Server Logs
Watch your terminal running `shopify app dev` for:
```
[Toggle API] 🟢 Enabling app for combo-reinstall.myshopify.com
[Toggle API] 📝 Creating ScriptTag: ...
[Toggle API] 📌 Syncing Metafield app_url: ...
[PHP API] 📡 Initiating request to: https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php
[PHP API] 📥 Status: 200 OK
[PHP API] ✅ Response JSON: {...}
```

### Browser Console
Open DevTools (F12) and watch Network tab:
- POST to `/api/toggle-app` should return `200 OK`
- Response should have `{ success: true, status: "enabled" }`

## Expected Webhook Payload Structure

### Enable Event
```json
{
  "event": "app_enabled",
  "resource": "store_config",
  "shop": "combo-reinstall.myshopify.com",
  "data": {
    "id": "gid://shopify/Shop/12345",
    "shop_id": "combo-reinstall.myshopify.com",
    "domain": "combo-reinstall.myshopify.com",
    "store_name": "Combo Reinstall",
    "created_at": "11/02/2026, 04:45:30 PM",
    "theme_name": "Dawn",
    "updated_at": "11/02/2026, 04:57:30 PM",
    "installed": "active",
    "status": "enabled",
    "app_plan": "Free",
    "shopify_plan": "Basic"
  }
}
```

### Disable Event
```json
{
  "event": "app_disabled",
  "resource": "store_config",
  "shop": "combo-reinstall.myshopify.com",
  "data": {
    "shop_id": "combo-reinstall.myshopify.com",
    "status": "disabled",
    "updated_at": "11/02/2026, 04:58:15 PM"
  }
}
```

## PHP Webhook Handler

Your `test.php` should handle the data like this:

```php
<?php
// Get the raw POST data
$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

// Log to file
$logFile = 'webhook.log';
$timestamp = date('Y-m-d H:i:s');
$logEntry = "=== Webhook Received at $timestamp ===\n";
$logEntry .= "Event: " . ($data['event'] ?? 'unknown') . "\n";
$logEntry .= "Shop: " . ($data['shop'] ?? 'unknown') . "\n";
$logEntry .= "Status: " . ($data['data']['status'] ?? 'unknown') . "\n";
$logEntry .= "Full Data: " . json_encode($data, JSON_PRETTY_PRINT) . "\n\n";

file_put_contents($logFile, $logEntry, FILE_APPEND);

// Process the data
if ($data['event'] === 'app_enabled') {
    // Handle enable logic
    // e.g., update database, send email, etc.
} elseif ($data['event'] === 'app_disabled') {
    // Handle disable logic
}

// Send response
header('Content-Type: application/json');
echo json_encode(['success' => true, 'received' => true]);
?>
```

## Next Steps

1. ✅ Test the enable/disable buttons
2. ✅ Verify webhook receives data
3. ✅ Check PHP logs
4. ✅ Implement your business logic in PHP
5. ✅ Add database storage if needed
6. ✅ Set up email notifications (optional)
7. ✅ Add analytics tracking (optional)

## Files Modified

- ✅ `app/routes/app.dashboard.jsx` - Added UI and toggle logic
- ✅ `app/utils/api-helpers.js` - Updated webhook URL
- ✅ `app/routes/api.toggle-app.jsx` - Already configured (no changes needed)

## Quick Test Command

Test the webhook directly:
```bash
curl -X POST https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php \
  -H "Content-Type: application/json" \
  -d '{
    "event": "app_enabled",
    "resource": "store_config",
    "shop": "test.myshopify.com",
    "data": {
      "status": "enabled",
      "updated_at": "11/02/2026, 04:57:30 PM"
    }
  }'
```

Expected response:
```json
{"success": true, "received": true}
```
