# Database Documentation & Data Schema

This document outlines the data structure for the **Make-a-combo** app, specifically focusing on how templates and configurations are saved from the UI to the database (currently implemented using `fake_db.json`).

## 1. Overview
The application uses a JSON-based "fake database" for local development and simulation. When a merchant customizes a combo template in the UI, the settings are packaged into a `config` object and sent via a POST request to the backend API.

## 2. Database Tables & Schema

### A. Shops Table
This table tracks the stores that have installed the app.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Primary key. |
| `shop_domain` | String | The `.myshopify.com` domain. |
| `access_token` | String | The session token for the store. |
| `plan_name` | String | The current subscription tier. |
| `status` | String | `active` or `uninstalled`. |

### B. Template Data Structure
Each entry in the `templates` array represents a saved combo builder configuration.

### Base Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Unique identifier for the template. |
| `title` | String | User-defined name for the template. |
| `shop` | String | The Shopify store domain (e.g., `store.myshopify.com`). |
| `source_file` | String | The actual `.liquid` file used (e.g., `combo_design_one.liquid`). |
| `active` | Boolean | Whether the template is currently live on the storefront. |
| `createdAt` | ISO DateTime | When the template was first created. |
| `config` | Object | **The core payload.** Contains all UI customization settings. |

---

## 3. Configuration Schema (`config`)
The `config` object is a flat JSON object containing styling and logic settings.

### A. Layout & General Settings
- `layout`: String (e.g., `layout1`, `layout2`, `layout3`, `layout4`).
- `desktop_columns`: String/Number (Number of products per row on desktop).
- `mobile_columns`: String/Number (Number of products per row on mobile).
- `container_width`: Integer (Max width of the builder in pixels).
- `bg_color`: String (Background hex code).
- `text_color`: String (Default text hex code).

### B. Product & Button Settings
- `product_add_btn_text`: String (Label for the add button).
- `product_add_btn_color`: String (Hex code for button background).
- `product_add_btn_text_color`: String (Hex code for button text).
- `show_quantity_selector`: Boolean (Toggle for +/- quantity inputs).
- `selection_highlight_color`: String (Color used when an item is selected).

### C. Banner & Hero Section
- `show_banner`: Boolean (Toggle visibility).
- `banner_image_url`: String (Desktop image source).
- `banner_image_mobile_url`: String (Mobile image source).
- `banner_height_desktop`: Integer (Height in px).
- `hero_title`: String (Title for layout 3/4 hero area).
- `hero_subtitle`: String (Subtitle for hero area).

### D. Discount & Motivation Logic
- `has_discount_offer`: Boolean (Whether a discount is linked).
- `selected_discount_id`: Integer (ID of the Shopify discount).
- `discount_threshold`: Integer (Items needed to unlock discount).
- `discount_motivation_text`: String (Progress text, e.g., "Add {{remaining}} more items").
- `max_selections`: Integer (Limit of items in a combo).

### E. Preview & Progress Bars
- `show_progress_bar`: Boolean.
- `progress_bar_color`: String (Hex code).
- `show_sticky_preview_bar`: Boolean (Floating bar at bottom).
- `preview_bg_color`: String (Hex code for the preview summary).

---

## 4. Discount Data Structure (Nested JSON)
Discount information is no longer stored in a separate table. Instead, it is stored as a **nested JSON object** within the `config` payload of each template.

### Nested `discount_data` Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `shopify_id` | String | Shopify Discount GID. |
| `code` | String | The actual coupon code (e.g., `SUMMER20`). |
| `value` | Float | The value (percentage or fixed amount). |
| `type` | String | `percentage` or `fixed_amount`. |

### Full Config JSON Example (with Nested Discount)
```json
{
  "id": 50,
  "title": "Summer Breakfast Bundle",
  "config": {
    "layout": "layout2",
    "has_discount_offer": true,
    "discount_data": {
      "shopify_id": "gid://shopify/PriceRule/11223344",
      "code": "SUMMER20",
      "value": 20.0,
      "type": "percentage"
    },
    "max_selections": 5,
    "bg_color": "#ffffff"
  }
}
```

---

## 5. Implementation Workflow

1.  **UI State**: The React customization page (`app.customize.jsx`) maintains a `config` state using the `useState` hook.
2.  **Handling Inputs**: Every input field (Range slider, Color picker, Text field) calls `updateConfig(key, value)`.
3.  **Saving**: When 'Save' is clicked:
    -   The `config` object is stringified.
    -   It is sent via Remix `useFetcher` to the `action` function in the route.
4.  **Database Write**: The backend `action` reads `fake_db.json`, pushes the new template, and writes the file back to disk.

---

## 6. Example Template JSON Payload

```json
{
  "id": 50,
  "title": "Summer Breakfast Bundle",
  "shop": "make-a-combo.myshopify.com",
  "active": true,
  "createdAt": "2026-02-10T04:54:50.270Z",
  "config": {
    "layout": "layout2",
    "product_add_btn_text": "Add to Combo",
    "product_add_btn_color": "#ff4400",
    "max_selections": 5,
    "discount_percentage": 20,
    "show_banner": true,
    "banner_image_url": "https://cdn.shopify.com/image.png",
    "desktop_columns": "3",
    "container_width": 1200,
    "show_progress_bar": true,
    "progress_bar_color": "#000000",
    "sticky_checkout_btn_text": "Buy Now"
  }
}
```
