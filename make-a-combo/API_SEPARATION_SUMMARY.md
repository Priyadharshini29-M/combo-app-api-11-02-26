# API Separation Summary

## Overview
The discount and template APIs have been successfully separated into dedicated endpoints with proper PHP webhook integration.

## New API Structure

### 1. **Templates API** (`/api/templates`)
**File:** `app/routes/api.templates.jsx`

#### Endpoints:
- **GET** `/api/templates` - Get all templates (optionally filtered by shop)
- **GET** `/api/templates?id={id}` - Get single template by ID
- **GET** `/api/templates?handle={handle}` - Get single template by handle
- **POST** `/api/templates` - Create, Update, or Delete templates

#### Features:
- ✅ Validates template configuration (requires layout)
- ✅ Auto-assigns unique IDs
- ✅ Tracks shop ownership
- ✅ Sets `active: false` by default for new templates
- ✅ Sends data to PHP webhook on all operations (create/update/delete)

---

### 2. **Discounts API** (`/api/discounts`)
**File:** `app/routes/api.discounts.jsx`

#### Endpoints:
- **GET** `/api/discounts` - Get all discounts (optionally filtered by shop)
- **GET** `/api/discounts?id={id}` - Get single discount by ID
- **POST** `/api/discounts` - Create, Update, or Delete discounts

#### Features:
- ✅ Auto-generates usage tracking (`0 / Unlimited`)
- ✅ Formats creation date
- ✅ Tracks shop ownership
- ✅ Sends data to PHP webhook on all operations (create/update/delete)

---

### 3. **Shared Utilities** (`app/utils/api-helpers.js`)
Contains common functions used by both APIs:

```javascript
export const getDb()        // Read from fake_db.json
export const saveDb(data)   // Write to fake_db.json
export const sendToPhp(payload) // Send to PHP webhook
```

**PHP Webhook URL:** `https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php`

---

## Data Flow

### When You Save a Template:

1. **Frontend** (`app.customize.jsx`) → Submits form to `/api/templates`
2. **Templates API** → Validates data
3. **Templates API** → Saves to `public/fake_db.json`
4. **Templates API** → Sends webhook to PHP endpoint
5. **Templates API** → Returns success response
6. **Frontend** → Shows toast notification
7. **Frontend** → Navigates to `/app/templates`
8. **Templates Page** → Loads from `fake_db.json` and displays

### Webhook Payload Example:
```json
{
  "event": "create",
  "resource": "templates",
  "shop": "your-shop.myshopify.com",
  "data": {
    "id": 1,
    "title": "My Template",
    "config": { ... },
    "shop": "your-shop.myshopify.com",
    "active": false,
    "createdAt": "2026-02-11T04:32:36.000Z"
  }
}
```

---

## Updated Files

### Frontend Files:
- ✅ `app/routes/app.customize.jsx` - Now uses `/api/templates`
- ✅ `public/combo-builder-loader.js` - Now uses `/api/templates` and `/api/discounts`

### Backend Files:
- ✅ `app/routes/api.templates.jsx` - **NEW** dedicated templates API
- ✅ `app/routes/api.discounts.jsx` - **NEW** dedicated discounts API
- ✅ `app/utils/api-helpers.js` - **NEW** shared utilities
- ⚠️ `app/routes/api.fake-backend.jsx` - **DEPRECATED** (can be deleted)

### Data Storage:
- 📁 `public/fake_db.json` - Local JSON database (unchanged)

---

## Testing Checklist

### ✅ Templates:
1. Create a new template → Should save to `fake_db.json` AND send to PHP
2. Update a template → Should update `fake_db.json` AND send to PHP
3. Delete a template → Should remove from `fake_db.json` AND send to PHP
4. View templates page → Should display all saved templates

### ✅ Discounts:
1. Create a discount → Should save to `fake_db.json` AND send to PHP
2. Update a discount → Should update `fake_db.json` AND send to PHP
3. Delete a discount → Should remove from `fake_db.json` AND send to PHP

### ✅ Storefront:
1. Template should load on storefront using `/api/templates?handle={handle}`
2. Discounts should load using `/api/discounts`

---

## PHP Webhook Integration

All create, update, and delete operations automatically send data to:
```
https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php
```

The PHP endpoint receives:
- `event`: "create" | "update" | "delete"
- `resource`: "templates" | "discounts"
- `shop`: Shop domain
- `data`: Full object data (for create/update) or `id` (for delete)

---

## Next Steps

1. **Test the flow:**
   - Create a template from the customize page
   - Check if it appears in the templates list
   - Verify the PHP webhook received the data

2. **Monitor logs:**
   - Check browser console for `[Templates API]` or `[Discounts API]` logs
   - Check terminal for `[PHP API] Response:` logs

3. **Optional cleanup:**
   - Delete `app/routes/api.fake-backend.jsx` (no longer needed)
   - Update any remaining references if found

---

## Troubleshooting

### Template not appearing in list?
- Check `public/fake_db.json` - is the template there?
- Check browser console for errors
- Verify the shop domain matches

### PHP webhook not receiving data?
- Check terminal logs for `[PHP API] Error:`
- Verify ngrok URL is correct and active
- Test the PHP endpoint directly with curl

### Data not persisting?
- Ensure `public/fake_db.json` has write permissions
- Check for file system errors in terminal
