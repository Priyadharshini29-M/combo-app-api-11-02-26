# Template Data Sync to MySQL Database

## Overview
This system syncs template configurations from your Shopify app to a MySQL database via the `templates.php` webhook endpoint.

## Architecture

### 1. Data Flow
```
Template UI → api.templates.jsx → sendTemplateData() → templates.php → MySQL Database
```

### 2. Dual Webhook System
- **test.php**: For logging and debugging (existing)
- **templates.php**: For MySQL database storage (new)

## Setup Instructions

### Step 1: Database Table
Ensure the `templates` table exists (from `sql database query.md`):
```sql
CREATE TABLE templates (
    id CHAR(36) NOT NULL PRIMARY KEY,
    shop_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    layout_type VARCHAR(50) DEFAULT 'list',
    source JSON, -- Metadata about source
    product_list JSON, -- List of products
    config JSON, -- Complete layout/UI config
    is_active TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_templates_shop FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);
```

### Step 2: Configure templates.php
Update credentials in `templates.php`:
```php
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';
```

### Step 3: Deploy
Upload `templates.php` to:
```
https://db94-103-186-151-131.ngrok-free.app/make-a-combo/templates.php
```

## Response Formats

### Success (Create)
```json
{
  "success": true,
  "action": "created",
  "template_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Template saved successfully"
}
```

## Logging & Troubleshooting

### Node.js Logs
Watch terminal for `[Template MySQL]` messages.

### PHP Logs
Check `templates_sync.log` on the server for:
- Raw input payload
- Database connection status
- Execution results

## Files Updated
1. `app/utils/api-helpers.js`: Added `sendTemplateData()`
2. `app/routes/api.templates.jsx`: Integrated sync logic
3. `templates.php`: New webhook receiver
