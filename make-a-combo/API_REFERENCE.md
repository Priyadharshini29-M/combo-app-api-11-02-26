# API Reference Guide

This document provides a technical reference for all internal and external APIs used in the **Make-a-combo** app.

---

## 1. Template & Configuration API
Handles all CRUD operations for combo templates.

**Endpoint:** `/api/fake-backend`
**Base Query:** `?resource=templates`

### [GET] Fetch Templates
Retrieve all templates or a specific one.

**Example Response Mapping (with Source JSON):**
```json
{
  "id": 1,
  "shop_id": 5,
  "title": "Summer Breakfast Kit",
  "layout_type": "layout4",
  "source": { 
    "file": "combo_design_four.liquid",
    "published_url": "/pages/breakfast-combo",
    "global_styling": {
      "primary_font": "Inter",
      "border_radius": "12px"
    }
  },
  "is_active": true,
  "created_at": "2026-02-10T15:00:00Z"
}
```

---

### [POST] Create Template (Real-World Example)
This example shows how the "tester_two24" data is split between the `Templates` and `Discounts` (settings) tables to match the relational design.

**Endpoint:** `POST /api/fake-backend`

**Payload:**
```json
{
  "resource": "templates",
  "action": "create",
  "data": {
    "shop_id": 12,
    "title": "tester_two24",
    "layout_type": "layout1",
    "is_active": true,
    "source": { 
      "file": "combo_design_one.liquid",
      "published_url": "/pages/summer-collection",
      "global_styling": {
         "preview_bg_color": "#f5f5dc",
         "preview_text_color": "#222"
      }
    },
    "settings": {
      "product_add_btn_text": "Add",
      "product_add_btn_color": "#000",
      "product_add_btn_text_color": "#fff",
      "product_add_btn_font_size": 14,
      "product_add_btn_font_weight": 600,
      "has_discount_offer": true,
      "selected_discount_id": 5,
      "desktop_columns": 2,
      "mobile_columns": 2,
      "container_padding_top_desktop": 24,
      "container_padding_right_desktop": 24,
      "container_padding_bottom_desktop": 24,
      "container_padding_left_desktop": 24,
      "show_banner": true,
      "banner_height_desktop": 180,
      "max_selections": 3,
      "product_image_height_desktop": 250,
      "collection_title": "summer collection",
      "collection_description": "mens collection"
    }
  }
}
```

---

### [POST] Update Template
Updates an existing configuration.

**Payload:**
```json
{
  "resource": "templates",
  "action": "update",
  "id": 101,
  "data": {
    "active": true,
    "config": { "max_selections": 6 }
  }
}
```

---

## 2. Shopify Publishing API
Interacts with the Shopify Admin API to create storefront pages.

**Endpoint:** `/api/shopify`

### [POST] Publish to Page
Creates or updates a Shopify Online Store page with the app embedded.

**Payload:**
```json
{
  "action": "publish_page",
  "data": {
    "title": "Official Combo Page",
    "handle": "save-on-combos",
    "templateId": 50,
    "config": { ... }
  }
}
```

**What it does:**
1. Sets a `make_a_combo.app_url` metafield on the Shop.
2. Injects an app loader script tag if missing.
3. Creates/Updates a Page containing `<div id="make-a-combo-app">`.

---

## 3. Product & Collection API
Fetches product data for customization previews.

### [GET] Fetch Products
**Endpoint:** `/api/products`

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `handle` | String | No | Fetch products from a specific collection slug. |

---

### [GET] Mock Collections
**Endpoint:** `/api/fake-backend?resource=collections`
Used for local development previews when not connected to a live Shopify store. Returns a fixed list of products (e.g., Loafers, T-Shirts).

---

## 4. Simulation API
Used for testing UI error states.

**Endpoint:** `/api/fake-stores`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `error` | Boolean | If `true`, returns a logic error (400/500 code). |

---

## 5. Security & Authentication
*   **Admin APIs**: Routes starting with `/app` or `/api/shopify` require **Shopify Admin Authentication**.
*   **Public APIs**: `/api/fake-backend` and `/api/products` include `Access-Control-Allow-Origin: *` to support the storefront loader script.
