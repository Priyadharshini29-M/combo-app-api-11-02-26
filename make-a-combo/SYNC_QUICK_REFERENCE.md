# MySQL Database Sync - Quick Reference

## 🎯 Overview
Your Shopify app now syncs data to MySQL database via PHP webhooks.

## 📊 Active Endpoints

| Endpoint | Purpose | Database Table |
|----------|---------|----------------|
| `shop.php` | Shop/Store data | `shops` |
| `discount.php` | Discount configurations | `discounts` |
| `test.php` | Logging (existing) | N/A |

**Base URL**: `https://db94-103-186-151-131.ngrok-free.app/make-a-combo/`

## 🗄️ Database Tables

### 1. Shops Table
```sql
shops (
  id, shop_id, store_name, status, 
  app_plan, theme_name, last_source, updated_at
)
```

### 2. Discounts Table
```sql
discounts (
  id, template_id, settings (JSON), 
  created_at, updated_at
)
```

### 3. Templates Table (Pending Implementation)
```sql
templates (
  id, shop_id, title, layout_type, 
  source (JSON), product_list (JSON), 
  config (JSON), is_active, created_at
)
```

## 🔄 Data Flow

```
┌─────────────────┐
│  Shopify App    │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐                  ┌─────────────────┐
│   test.php      │                  │  shop.php       │
│   (Logging)     │                  │  discount.php   │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  MySQL Database │
                                     └─────────────────┘
```

## 📝 Quick Setup Checklist

### For shop.php
- [x] Created `shop.php` webhook receiver
- [x] Updated `api-helpers.js` with `sendShopData()`
- [x] Modified `api.shophandler.jsx` to sync to MySQL
- [ ] Upload `shop.php` to server
- [ ] Configure MySQL credentials in `shop.php`
- [ ] Test shop data sync

### For discount.php
- [x] Created `discount.php` webhook receiver
- [x] Updated `api-helpers.js` with `sendDiscountData()`
- [x] Modified `api.discounts.jsx` to sync to MySQL
- [ ] Upload `discount.php` to server
- [ ] Configure MySQL credentials in `discount.php`
- [ ] Test discount CREATE/UPDATE/DELETE

## 🧪 Testing Commands

### Test Shop Sync
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

### Test Discount Sync
Create a discount through the Discount Engine UI, then check:
- Terminal logs for `[Discount MySQL]` messages
- `discount_sync.log` on server
- MySQL database for new record

## 📍 File Locations

### Node.js Files
```
app/
├── utils/
│   └── api-helpers.js          # sendShopData(), sendDiscountData()
└── routes/
    ├── api.shophandler.jsx     # Shop sync logic
    └── api.discounts.jsx       # Discount sync logic
```

### PHP Files (Deploy to Server)
```
make-a-combo/
├── shop.php                    # Shop webhook receiver
├── discount.php                # Discount webhook receiver
└── test.php                    # Logging webhook (existing)
```

### Documentation
```
├── SHOP_SYNC_DOCUMENTATION.md
├── DISCOUNT_SYNC_DOCUMENTATION.md
├── sql database query.md
└── SYNC_QUICK_REFERENCE.md (this file)
```

## 🔍 Monitoring & Logs

### Node.js Console
```bash
# Watch for these messages:
[Shop MySQL] 💾 Sending shop data to database...
[Discount MySQL] 💾 Sending discount data to database (create)...
[PHP API] 📡 Initiating request to: https://...
[Shophandler] ✅ MySQL Database (shop.php) Response: {...}
[Discounts API] ✅ Discount saved to MySQL database
```

### PHP Logs
```bash
# On server, check:
tail -f shop_sync.log
tail -f discount_sync.log
```

### MySQL Queries
```sql
-- Check recent shops
SELECT * FROM shops ORDER BY updated_at DESC LIMIT 10;

-- Check recent discounts
SELECT id, 
       JSON_EXTRACT(settings, '$.code') as code,
       JSON_EXTRACT(settings, '$.title') as title,
       created_at
FROM discounts 
ORDER BY created_at DESC 
LIMIT 10;
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Connection Failed | Verify ngrok URL is active |
| Database Error | Check MySQL credentials |
| Missing required field | Ensure all form fields are filled |
| Foreign key constraint | Ensure related records exist |

## 🎨 Discount Settings JSON Example

All discount configuration is stored in one JSON column:

```json
{
  "title": "Summer Sale 20% Off",
  "code": "SAVE10WINTER",
  "type": "percentage",
  "value": "10",
  "status": "active",
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
  }
}
```

## 🚀 Next Steps

1. **Deploy PHP files** to your server
2. **Configure database credentials** in both PHP files
3. **Test the integration** using the app
4. **Monitor logs** for any errors
5. **Implement template sync** (optional next phase)

## 📚 Full Documentation

- **Shop Sync**: See `SHOP_SYNC_DOCUMENTATION.md`
- **Discount Sync**: See `DISCOUNT_SYNC_DOCUMENTATION.md`
- **Database Schema**: See `sql database query.md`
