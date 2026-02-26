# Discount Data Sync to MySQL Database

## Overview
This system sends discount data from your Shopify app to a MySQL database via the `discount.php` webhook endpoint. It handles CREATE, UPDATE, and DELETE operations.

## Architecture

### 1. Data Flow
```
Discount Engine → api.discounts.jsx → sendDiscountData() → discount.php → MySQL Database
```

### 2. Dual Webhook System
When discount operations occur, data goes to **two endpoints**:
- **test.php**: For logging and debugging (existing)
- **discount.php**: For MySQL database storage (new)

## Setup Instructions

### Step 1: Ensure Database Table Exists
The `discounts` table should already be created from `sql database query.md`:
```sql
CREATE TABLE discounts (
    id CHAR(36) NOT NULL PRIMARY KEY,
    template_id CHAR(36) NOT NULL UNIQUE,
    settings JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_discounts_template
        FOREIGN KEY (template_id)
        REFERENCES templates(id)
        ON DELETE CASCADE
);
```

### Step 2: Configure discount.php
1. Update the database credentials in `discount.php`:
   ```php
   $host = 'localhost';
   $dbname = 'your_database_name';
   $username = 'your_username';
   $password = 'your_password';
   ```

### Step 3: Deploy discount.php
Upload `discount.php` to your server at:
```
https://db94-103-186-151-131.ngrok-free.app/make-a-combo/discount.php
```

### Step 4: Test the Integration
Create a discount in your app's Discount Engine and check the logs.

## Data Structure

### CREATE Event Payload
```json
{
  "event": "create",
  "resource": "discount",
  "data": {
    "id": 22,
    "shopifyId": "gid://shopify/DiscountCodeNode/1487907324090",
    "title": "Summer Sale 20% Off",
    "code": "SAVE10WINTER",
    "type": "percentage",
    "value": "10",
    "status": "active",
    "startsAt": "2026-02-12T16:00:00Z",
    "endsAt": null,
    "eligibility": "all",
    "minRequirementType": "none",
    "minRequirementValue": "0",
    "maxUsage": null,
    "oncePerCustomer": false,
    "combinations": {
      "product": false,
      "order": false,
      "shipping": false
    },
    "created": "Feb 12, 2026",
    "usage": "0 / Unlimited"
  }
}
```

### UPDATE Event Payload
```json
{
  "event": "update",
  "resource": "discount",
  "data": {
    "code": "SAVE10WINTER",
    "value": "15",
    "status": "active"
  }
}
```

### DELETE Event Payload
```json
{
  "event": "delete",
  "resource": "discount",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## MySQL Storage Format

### Settings JSON Structure
All discount configuration is stored in the `settings` JSONB column:

```json
{
  "title": "Summer Sale 20% Off",
  "code": "SAVE10WINTER",
  "type": "percentage",
  "value": "10",
  "status": "active",
  "shopifyId": "gid://shopify/DiscountCodeNode/1487907324090",
  "startsAt": "2026-02-12T16:00:00Z",
  "endsAt": null,
  "eligibility": "all",
  "minimumRequirements": {
    "type": "none",
    "value": 0
  },
  "usageLimits": {
    "totalLimit": null,
    "oncePerCustomer": false
  },
  "combinations": {
    "product": false,
    "order": false,
    "shipping": false
  },
  "created": "Feb 12, 2026",
  "usage": "0 / Unlimited"
}
```

## Response Formats

### Success Response (CREATE)
```json
{
  "success": true,
  "action": "created",
  "discount_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "SAVE10WINTER",
  "message": "Discount saved successfully"
}
```

### Success Response (UPDATE)
```json
{
  "success": true,
  "action": "updated",
  "discount_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Discount updated successfully"
}
```

### Success Response (DELETE)
```json
{
  "success": true,
  "action": "deleted",
  "discount_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Discount deleted successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Database error",
  "message": "Missing required field: code"
}
```

## Logging

### Application Logs (Node.js)
Check your terminal for:
```
[Discount MySQL] 💾 Sending discount data to database (create)...
[PHP API] 📡 Initiating request to: https://db94-103-186-151-131.ngrok-free.app/make-a-combo/discount.php
[Discounts API] ✅ Discount saved to MySQL database
```

### PHP Logs
Check `discount_sync.log` in the same directory as `discount.php`:
```
[2026-02-12 16:52:41] Raw Input: {"event":"create","resource":"discount","data":{...}}
[2026-02-12 16:52:41] Database connection established
[2026-02-12 16:52:41] Event Type: create
[2026-02-12 16:52:41] New discount created: SAVE10WINTER
```

## Querying Discounts from MySQL

### Get all discounts
```sql
SELECT id, 
       JSON_EXTRACT(settings, '$.code') as code,
       JSON_EXTRACT(settings, '$.title') as title,
       JSON_EXTRACT(settings, '$.value') as value,
       JSON_EXTRACT(settings, '$.type') as type,
       created_at
FROM discounts;
```

### Get active discounts
```sql
SELECT * FROM discounts 
WHERE JSON_EXTRACT(settings, '$.status') = 'active';
```

### Get discounts by code
```sql
SELECT * FROM discounts 
WHERE JSON_EXTRACT(settings, '$.code') = 'SAVE10WINTER';
```

### Get percentage discounts
```sql
SELECT * FROM discounts 
WHERE JSON_EXTRACT(settings, '$.type') = 'percentage';
```

## Troubleshooting

### Issue: "Missing required field"
- Ensure all required fields are present in the discount form
- Check the payload in Node.js logs
- Required fields: `title`, `code`, `type`, `value`

### Issue: "Discount not found for update"
- Verify the discount exists in the database
- Check if the code or shopifyId matches
- Review the `discount_sync.log` file

### Issue: "Database Error"
- Verify MySQL credentials in `discount.php`
- Ensure the `discounts` table exists
- Check database user permissions

### Issue: "Foreign key constraint fails"
- If using `template_id`, ensure the template exists in the `templates` table
- Or modify the schema to allow NULL for `template_id`

## Files Modified

1. **app/utils/api-helpers.js**
   - Added `sendDiscountData()` function

2. **app/routes/api.discounts.jsx**
   - Updated CREATE action to send to discount.php
   - Updated UPDATE action to send to discount.php
   - Updated DELETE action to send to discount.php
   - All operations now sync to MySQL database

3. **discount.php** (NEW)
   - Receives discount data
   - Handles CREATE, UPDATE, DELETE operations
   - Stores all configuration in JSONB format
   - Logs all operations

## Error Handling

The system is designed to be resilient:
- If MySQL sync fails, the operation still succeeds in the local database
- Errors are logged but don't break the user experience
- All MySQL errors are caught and logged separately

## Next Steps

To extend this system for Templates:
1. Create `template.php` endpoint
2. Add `sendTemplateData()` function
3. Update template API routes to call this function
