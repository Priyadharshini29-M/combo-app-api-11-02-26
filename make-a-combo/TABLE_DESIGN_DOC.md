# Table Design Specification: Unified Dashboard

This document defines the architecture and UI layout for the master dashboard table. It integrates shop metadata, template configurations, discount logic, and real-time activity tracking.

## 1. Data Schema Architecture

### A. Shop & Activity Metadata (The "Data" Object)
This table/object captures the core operational state of the app for each merchant interaction.

| Field | Database Mapping | Description |
| :--- | :--- | :--- |
| `shop_id` | `VARCHAR` | Primary Shopify domain (e.g., `combo-reinstall.myshopify.com`). |
| `store_name` | `VARCHAR` | The display name of the shop (e.g., `combo_reinstall`). |
| `status` | `ENUM` | Current app state: `enabled` or `disabled`. |
| `app_plan` | `VARCHAR` | Subscription level: `Free`, `Basic`, `Pro`, `Expert`. |
| `theme_name` | `VARCHAR` | The active theme where the app is rendered (e.g., `test-data`). |
| `timestamp` | `DATETIME` | Recorded in IST format (e.g., `12/02/2026, 02:10:58 pm`). |
| `source` | `VARCHAR` | Event trigger (e.g., `dashboard_load`, `api_webhook`). |

### B. Template Input Fields (Visual Design)
Stored as a nested object specifically for the combo layout builder.

| Field | Description |
| :--- | :--- |
| `template_id` | Unique ID for the design layout. |
| `layout_mode` | Which template is used (1, 2, 3, or 4). |
| `config_json` | Stores colors, padding, fonts, and banner settings. |

### C. Discount Engine Inputs (Logic)
Stored to link price reductions to specific templates.

| Field | Description |
| :--- | :--- |
| `code` | The Shopify discount coupon (e.g., `SAVE15`). |
| `type` | `percentage` or `fixed_amount`. |
| `value` | The numerical value (e.g., `15.00`). |

---

## 2. Premium UI Table Layout

Instead of a standard spreadsheet look, the dashboard uses an "Information-Dense Card" approach.

### Table Header
| Store & Status | App Metrics | Design Info | Discount Logic | Activity Log |
| :--- | :--- | :--- | :--- | :--- |

### Row Row Components:
1.  **Store & Status**: 
    -   Primary Label: `combo_reinstall`
    -   Secondary Label: `combo-reinstall.myshopify.com`
    -   Indicator: Neon Glow Toggle for `status: enabled`
2.  **App Metrics**:
    -   Pill: `Plan: Free`
    -   Label: `Theme: test-data`
3.  **Design Info**:
    -   Thumbnail of the active Layout Mode.
    -   Label: `Template #ID`
4.  **Discount Logic**:
    -   Badge: `code: SAVE15`
    -   Label: `15% Off (Percentage)`
5.  **Activity Log**:
    -   Label: `Source: dashboard_load`
    -   Timestamp: `12/02/2026, 02:10:58 pm`

---

## 3. Implementation Checklist

- [ ] **API Endpoint**: Create `/api/dashboard-sync` to fetch this unified object.
- [ ] **State Management**: Implement a `useCombinedData` hook in React to merge `shop`, `template`, and `discount` states.
- [ ] **Logging Logic**: Ensure every `dashboard_load` sends a POST request to update the `timestamp` and `source` fields in the database.
- [ ] **Styling**: Apply `glassmorphism` CSS to the table rows for a premium "WOW" factor.
