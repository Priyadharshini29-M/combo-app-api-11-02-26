# Final Database Architecture: Make-a-combo

This document consolidates the previous table designs with the latest requirements for Shop metadata, Discount logic, and the unified Template structure.

---

## 1. Table: `Shops`
Stores the identity and state of the store, including the "data" object fields from dashboard interactions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / INT | Primary Key | Unique shop identifier. |
| `shop_id` | VARCHAR(255) | Unique, Not Null | The `.myshopify.com` domain (e.g., `combo-reinstall.myshopify.com`). |
| `store_name` | VARCHAR(255) | Not Null | Friendly store name (e.g., `combo_reinstall`). |
| `status` | ENUM | 'enabled', 'disabled'| Current app status. |
| `app_plan` | VARCHAR(50) | Default: 'Free' | Current subscription tier. |
| `theme_name` | VARCHAR(255) | | Active theme (e.g., `test-data`). |
| `last_source` | VARCHAR(100) | | Last event trigger (e.g., `dashboard_load`). |
| `updated_at` | TIMESTAMP | Default: now() | Last state change. |

---

## 2. Table: `Templates`
Stores the visual builder configurations. (Updated to match structural requirements).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / INT | Primary Key | Unique template ID. |
| `shop_id` | UUID / INT | Foreign Key → Shops.id | Owning shop. |
| `title` | String | Not Null | Template name (e.g., "Summer Pack"). |
| `layout_type` | ENUM | Not Null | `layout1`, `layout2`, `layout3`, `layout4`. |
| `source` | JSON | Not Null | Stores the **Liquid file name** and file metadata. |
| `product_list` | TEXT / JSON | Not Null | **List of Shopify Product GIDs** included in this combo. |
| `config` | JSON | Not Null | **Data Input Fields**: Colors, padding, fonts, banner text, etc. |
| `is_active` | Boolean | Default: TRUE | Visibility toggle on storefront. |
| `created_at` | DateTime | Default: now() | Creation timestamp. |

---

## 3. Table: `Discounts`
Stores the logic created via the Discount Engine.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / INT | Primary Key | Unique discount ID. |
| `template_id` | UUID / INT | FK → Templates.id | Link to specific combo template. |
| `code` | VARCHAR(100) | Not Null | The shopify coupon code (e.g., `COMBO20`). |
| `type` | ENUM | Not Null | `percentage`, `fixed_amount`, `bogo`. |
| `value` | DECIMAL(10,2)| Not Null | Discount reduction amount. |
| `starts_at` | DateTime | Not Null | Activation time. |
| `ends_at` | DateTime | | Optional expiration time. |

---

## 4. The Unified "Data" Object Mapping
When a `dashboard_load` event occurs, the following JSON object is processed and mapped to the tables above:

**Source Payload:**
```json
{
    "shop_id": "combo-reinstall.myshopify.com",
    "store_name": "combo_reinstall",
    "status": "enabled",
    "app_plan": "Free",
    "theme_name": "test-data",
    "timestamp": "12/02/2026, 02:10:58 pm",
    "source": "dashboard_load"
}
```

**Mapping Logic:**
1.  **`shop_id` / `store_name` / `status` / `app_plan` / `theme_name`**: Updates the corresponding record in the `Shops` table.
2.  **`timestamp`**: Updates the `updated_at` field (converted to UTC).
3.  **`source`**: Saved to the `last_source` field in `Shops` for audit tracking.

---

## 5. UI Table Representation
The **Premium Dashboard Table** combines these relations into a single row for the merchant:

| Shop Identity | Design Details | Logic | Activity |
| :--- | :--- | :--- | :--- |
| **{store_name}** <br> <small>{shop_id}</small> | **{title}** <br> <small>Mode: {layout_type}</small> | `{code}` <br> <small>{value}% Off</small> | `{source}` <br> <small>{timestamp}</small> |
| `[Enabled]` Status Pill | `[Active]` Toggle | `Free Plan` | `Theme: {theme_name}` |
