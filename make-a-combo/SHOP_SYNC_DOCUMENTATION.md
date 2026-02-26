# Shop Data Sync to MySQL Database

## Overview
This system sends shop data from your Shopify app to a MySQL database via the `shop.php` webhook endpoint.

## Architecture

### 1. Data Flow
```
Dashboard Load / App Toggle / API Call → api-helpers.js (sendShopData) → shop.php → MySQL Database
```

### 2. Dual Webhook System
When shop data is sent, it goes to **two endpoints**:
- **test.php**: For logging and debugging (existing)
- **shop.php**: For MySQL database storage (new)

## Setup Instructions

### Step 1: Configure MySQL Database
1. Create the database and tables using the SQL in `sql database query.md`
2. Update the credentials in `shop.php`:
   ```php
   $host = 'localhost';
   $dbname = 'your_database_name';
   $username = 'your_username';
   $password = 'your_password';
   ```

### Step 2: Deploy shop.php
1. Upload `shop.php` to your server at:
   ```
   https://db94-103-186-151-131.ngrok-free.app/make-a-combo/shop.php
   ```
2. Ensure the file has write permissions for the log file

### Step 3: Test the Integration
Send a test request to your API:
```bash
curl -X POST http://localhost:3000/api/shophandler \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": "test-shop.myshopify.com",
    "store_name": "Test Shop",
    "status": "enabled",
    "app_plan": "Free",
    "theme_name": "Dawn"
  }'
```

## Data Structure

### Incoming Payload to shop.php
```json
{
  "event": "shop_sync",
  "resource": "shop",
  "data": {
    "shop_id": "combo-reinstall.myshopify.com",
    "store_name": "combo_reinstall",
    "status": "enabled",
    "app_plan": "Free",
    "theme_name": "test-data",
    "last_source": "app_load_sync",
    "updated_at": "12/02/2026, 04:31:44 pm"
  }
}
```

### MySQL Table Structure
```sql
CREATE TABLE shops (
    id CHAR(36) NOT NULL PRIMARY KEY,
    shop_id VARCHAR(255) NOT NULL UNIQUE,
    store_name VARCHAR(255) NOT NULL,
    status ENUM('enabled', 'disabled') NOT NULL DEFAULT 'enabled',
    app_plan VARCHAR(50) DEFAULT 'Free',
    theme_name VARCHAR(255),
    last_source VARCHAR(100),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP
);
```

## Response Format

### Success Response (New Shop)
```json
{
  "success": true,
  "action": "created",
  "shop_id": "combo-reinstall.myshopify.com",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Shop data saved successfully"
}
```

### Success Response (Existing Shop)
```json
{
  "success": true,
  "action": "updated",
  "shop_id": "combo-reinstall.myshopify.com",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Shop data updated successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Database error",
  "message": "Connection failed: Access denied"
}
```

## Logging

### Application Logs (Node.js)
Check your terminal for:
```
[Shop MySQL] 💾 Sending shop data to database...
[PHP API] 📡 Initiating request to: https://db94-103-186-151-131.ngrok-free.app/make-a-combo/shop.php
[Shophandler] ✅ MySQL Database (shop.php) Response: {...}
```

### PHP Logs
Check `shop_sync.log` in the same directory as `shop.php`:
```
[2026-02-12 16:31:44] Raw Input: {"event":"shop_sync","resource":"shop","data":{...}}
[2026-02-12 16:31:44] Database connection established
[2026-02-12 16:31:44] Shop updated: combo-reinstall.myshopify.com
```

## Troubleshooting

### Issue: "Connection Failed"
- Verify ngrok URL is active: `https://db94-103-186-151-131.ngrok-free.app`
- Check if `shop.php` is accessible via browser
- Ensure CORS headers are properly set

### Issue: "Database Error"
- Verify MySQL credentials in `shop.php`
- Check if the `shops` table exists
- Ensure database user has INSERT/UPDATE permissions

### Issue: "Missing required field"
- Check the payload structure in Node.js logs
- Ensure all required fields are being sent from the app

## Files Modified

1. **app/utils/api-helpers.js**
   - Added `sendShopData()` function
   - Updated `sendToPhp()` to support multiple endpoints

2. **app/routes/api.shophandler.jsx**
   - Now sends data to both `test.php` and `shop.php`
   - Returns combined response from both endpoints

3. **shop.php** (NEW)
   - Receives shop data
   - Handles INSERT/UPDATE logic
   - Logs all operations

## Next Steps

To extend this system for Templates and Discounts:
1. Create `template.php` and `discount.php` endpoints
2. Add `sendTemplateData()` and `sendDiscountData()` functions
3. Update respective API routes to call these functions
