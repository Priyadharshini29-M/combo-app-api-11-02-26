# Discount Data Saved to discount.php - Complete Field List

## Overview
All discount fields are now properly saved to `https://db94-103-186-151-131.ngrok-free.app/make-a-combo/discount.php` in the MySQL database.

## Complete Data Structure

### Payload Sent to discount.php

```json
{
  "event": "create",
  "resource": "discount",
  "data": {
    // ===== BASIC FIELDS =====
    "id": 22,
    "title": "Summer Sale 20% Off",
    "code": "SAVE10WINTER",
    "type": "percentage",
    "value": "10",
    "status": "active",
    "shopifyId": "gid://shopify/DiscountCodeNode/1487907324090",
    
    // ===== SCHEDULE FIELDS =====
    "startsAt": "2026-02-12T16:00:00Z",
    "endsAt": "2026-08-31T23:59:59Z",
    
    // ===== APPLIES TO FIELDS (NEW) ⭐ =====
    "appliesTo": "specific_collections",
    "selectedProducts": [
      {
        "id": "gid://shopify/Product/123456789",
        "title": "Premium T-Shirt",
        "images": [
          {
            "originalSrc": "https://cdn.shopify.com/...",
            "altText": "Premium T-Shirt"
          }
        ]
      }
    ],
    "selectedCollections": [
      {
        "id": "gid://shopify/Collection/987654321",
        "title": "Summer Collection",
        "image": {
          "originalSrc": "https://cdn.shopify.com/...",
          "altText": "Summer Collection"
        }
      },
      {
        "id": "gid://shopify/Collection/987654322",
        "title": "Beach Wear",
        "image": {
          "originalSrc": "https://cdn.shopify.com/...",
          "altText": "Beach Wear"
        }
      }
    ],
    
    // ===== ELIGIBILITY FIELDS =====
    "eligibility": "all",
    
    // ===== MINIMUM REQUIREMENTS =====
    "minRequirementType": "amount",
    "minRequirementValue": "500",
    
    // ===== USAGE LIMITS =====
    "maxUsage": "100",
    "oncePerCustomer": true,
    
    // ===== COMBINATIONS =====
    "combinations": {
      "product": false,
      "order": true,
      "shipping": false
    },
    
    // ===== BUY X GET Y FIELDS =====
    "buyQuantity": "2",
    "getQuantity": "1",
    "getProduct": "gid://shopify/Product/111222333",
    "autoApply": false,
    
    // ===== METADATA =====
    "created": "Feb 12, 2026",
    "usage": "0 / 100"
  }
}
```

### MySQL Storage Format

All fields are stored in the `settings` JSON column:

```sql
INSERT INTO discounts (id, template_id, settings, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  NULL,
  '{
    "title": "Summer Sale 20% Off",
    "code": "SAVE10WINTER",
    "type": "percentage",
    "value": "10",
    "status": "active",
    "shopifyId": "gid://shopify/DiscountCodeNode/1487907324090",
    "startsAt": "2026-02-12T16:00:00Z",
    "endsAt": "2026-08-31T23:59:59Z",
    "appliesTo": "specific_collections",
    "selectedProducts": [],
    "selectedCollections": [
      {
        "id": "gid://shopify/Collection/987654321",
        "title": "Summer Collection",
        "image": {...}
      }
    ],
    "eligibility": "all",
    "minimumRequirements": {
      "type": "amount",
      "value": "500"
    },
    "usageLimits": {
      "totalLimit": "100",
      "oncePerCustomer": true
    },
    "combinations": {
      "product": false,
      "order": true,
      "shipping": false
    },
    "buyQuantity": null,
    "getQuantity": null,
    "getProduct": null,
    "autoApply": false,
    "created": "Feb 12, 2026",
    "usage": "0 / 100"
  }',
  CURRENT_TIMESTAMP
);
```

## Field Breakdown

### 1. Basic Fields
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `title` | string | "Summer Sale 20% Off" | ✅ Yes |
| `code` | string | "SAVE10WINTER" | ✅ Yes |
| `type` | string | "percentage", "amount", "buyxgety" | ✅ Yes |
| `value` | string | "10", "20" | ✅ Yes |
| `status` | string | "active", "inactive" | No (default: "active") |
| `shopifyId` | string | "gid://shopify/..." | No |

### 2. Schedule Fields
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `startsAt` | ISO datetime | "2026-02-12T16:00:00Z" | No |
| `endsAt` | ISO datetime | "2026-08-31T23:59:59Z" | No |

### 3. Applies To Fields ⭐ NEW
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `appliesTo` | string | "all_products", "specific_collections", "specific_products" | No (default: "all_products") |
| `selectedProducts` | array | `[{id, title, images}]` | No (default: []) |
| `selectedCollections` | array | `[{id, title, image}]` | No (default: []) |

### 4. Eligibility Fields
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `eligibility` | string | "all", "segments", "customers" | No (default: "all") |

### 5. Minimum Requirements
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `minRequirementType` | string | "none", "amount", "quantity" | No (default: "none") |
| `minRequirementValue` | string/number | "500", "5" | No (default: 0) |

### 6. Usage Limits
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `maxUsage` | string/number | "100", null | No |
| `oncePerCustomer` | boolean | true, false | No (default: false) |

### 7. Combinations
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `combinations` | object | `{product: false, order: true, shipping: false}` | No |

### 8. Buy X Get Y Fields
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `buyQuantity` | string/number | "2" | No |
| `getQuantity` | string/number | "1" | No |
| `getProduct` | string | "gid://shopify/Product/123" | No |
| `autoApply` | boolean | true, false | No (default: false) |

### 9. Metadata
| Field | Type | Example | Required |
|-------|------|---------|----------|
| `created` | string | "Feb 12, 2026" | No (auto-generated) |
| `usage` | string | "0 / 100" | No (default: "0 / Unlimited") |

## Example Scenarios

### Scenario 1: All Products Discount
```json
{
  "title": "Sitewide Sale",
  "code": "SAVE20",
  "type": "percentage",
  "value": "20",
  "appliesTo": "all_products",
  "selectedProducts": [],
  "selectedCollections": []
}
```

### Scenario 2: Collection-Specific Discount
```json
{
  "title": "Summer Collection Sale",
  "code": "SUMMER30",
  "type": "percentage",
  "value": "30",
  "appliesTo": "specific_collections",
  "selectedProducts": [],
  "selectedCollections": [
    {
      "id": "gid://shopify/Collection/456",
      "title": "Summer Collection"
    },
    {
      "id": "gid://shopify/Collection/789",
      "title": "Beach Wear"
    }
  ]
}
```

### Scenario 3: Product-Specific Discount with Minimum Purchase
```json
{
  "title": "Featured Products Discount",
  "code": "FEATURED15",
  "type": "amount",
  "value": "15",
  "appliesTo": "specific_products",
  "selectedProducts": [
    {
      "id": "gid://shopify/Product/123",
      "title": "Premium T-Shirt"
    },
    {
      "id": "gid://shopify/Product/456",
      "title": "Designer Mug"
    }
  ],
  "selectedCollections": [],
  "minRequirementType": "amount",
  "minRequirementValue": "500",
  "maxUsage": "50",
  "oncePerCustomer": true
}
```

### Scenario 4: Buy X Get Y Discount
```json
{
  "title": "Buy 2 Get 1 Free",
  "code": "BOGO",
  "type": "buyxgety",
  "buyQuantity": "2",
  "getQuantity": "1",
  "getProduct": "gid://shopify/Product/789",
  "appliesTo": "all_products"
}
```

## Querying Saved Data from MySQL

### Get all discounts with their applies-to settings
```sql
SELECT 
  id,
  JSON_EXTRACT(settings, '$.code') as code,
  JSON_EXTRACT(settings, '$.title') as title,
  JSON_EXTRACT(settings, '$.appliesTo') as applies_to,
  JSON_EXTRACT(settings, '$.selectedProducts') as products,
  JSON_EXTRACT(settings, '$.selectedCollections') as collections,
  created_at
FROM discounts;
```

### Get collection-specific discounts
```sql
SELECT * FROM discounts 
WHERE JSON_EXTRACT(settings, '$.appliesTo') = 'specific_collections';
```

### Get product-specific discounts
```sql
SELECT * FROM discounts 
WHERE JSON_EXTRACT(settings, '$.appliesTo') = 'specific_products';
```

### Get discounts for a specific collection
```sql
SELECT * FROM discounts 
WHERE JSON_CONTAINS(
  JSON_EXTRACT(settings, '$.selectedCollections'),
  JSON_OBJECT('id', 'gid://shopify/Collection/456')
);
```

### Get all discount fields
```sql
SELECT 
  id,
  JSON_EXTRACT(settings, '$.code') as code,
  JSON_EXTRACT(settings, '$.title') as title,
  JSON_EXTRACT(settings, '$.type') as type,
  JSON_EXTRACT(settings, '$.value') as value,
  JSON_EXTRACT(settings, '$.appliesTo') as applies_to,
  JSON_EXTRACT(settings, '$.eligibility') as eligibility,
  JSON_EXTRACT(settings, '$.minimumRequirements') as min_requirements,
  JSON_EXTRACT(settings, '$.usageLimits') as usage_limits,
  JSON_EXTRACT(settings, '$.combinations') as combinations,
  created_at,
  updated_at
FROM discounts
ORDER BY created_at DESC;
```

## Data Flow Verification

### 1. Frontend (Discount Engine)
```javascript
// User creates discount with:
- Title, Code, Type, Value
- Applies To: Specific Collections
- Selected Collections: [Summer Collection, Beach Wear]
- Minimum Purchase: ₹500
- Max Usage: 100
- Once Per Customer: Yes
```

### 2. Form Submission
```javascript
// Hidden fields send:
<input type="hidden" name="appliesTo" value="specific_collections" />
<input type="hidden" name="selectedCollections" value='[{...}]' />
```

### 3. Server Action (app.discountengine.jsx)
```javascript
const newDiscount = {
  appliesTo: formData.get('appliesTo'),
  selectedCollections: JSON.parse(formData.get('selectedCollections')),
  // ... all other fields
};
```

### 4. API Call (api.discounts.jsx)
```javascript
await sendDiscountData(newDiscount, "create");
```

### 5. PHP Webhook (discount.php)
```php
$settings = [
  'appliesTo' => $discountData['appliesTo'] ?? 'all_products',
  'selectedCollections' => $discountData['selectedCollections'] ?? [],
  // ... all other fields
];
```

### 6. MySQL Database
```sql
INSERT INTO discounts (id, template_id, settings, created_at)
VALUES (..., JSON with all fields, ...);
```

## Verification Steps

1. **Create a discount** in the Discount Engine
2. **Check terminal logs** for:
   ```
   [Discount MySQL] 💾 Sending discount data to database (create)...
   [Discounts API] ✅ Discount saved to MySQL database
   ```
3. **Check discount_sync.log** on server:
   ```
   [2026-02-12 17:14:08] Raw Input: {"event":"create","resource":"discount","data":{...}}
   [2026-02-12 17:14:08] New discount created: SAVE10WINTER
   ```
4. **Query MySQL database**:
   ```sql
   SELECT * FROM discounts ORDER BY created_at DESC LIMIT 1;
   ```

## Summary

✅ **ALL fields are now saved to discount.php including:**
- Basic fields (title, code, type, value)
- Schedule fields (startsAt, endsAt)
- **NEW: Applies To fields (appliesTo, selectedProducts, selectedCollections)** ⭐
- Eligibility fields
- Minimum requirements
- Usage limits
- Combinations
- Buy X Get Y fields
- Metadata

**Total Fields Saved: 20+ fields**

Every field from the Discount Engine form is properly captured and stored in the MySQL database via discount.php! 🎉
