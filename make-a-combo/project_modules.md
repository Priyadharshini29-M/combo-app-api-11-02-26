# Project Modules Overview

| Module Name | Route | Description | Primary Data Interactions | Key Inputs/UI Elements |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Dashboard** | `/app` or `/app/dashboard` | Central navigation hub and educational resource. | **Read**: Recent/Default Templates<br>**Read**: Stats (summary) | • Search Input<br>• "Customize Default" Button |
| **Visual Customizer** | `/app/customize` | Builder interface for creating/editing combo layouts. | **Write**: `Template` (Create/Update)<br>**Read**: `Discount` (List active) | • `config` (JSON state)<br>• `title` (Template Name)<br>• Device Toggle<br>• Styling Controls |
| **Discount Engine** | `/app/discountengine` | Tool to create and manage Shopify discount codes. | **Write**: Shopify Discount API<br>**Read**: Discount Usage Stats | • `code` (e.g. SUMMER20)<br>• `type` (%, Fixed, BOGO)<br>• `value`<br>• `startsAt`, `endsAt` |
| **Template Management**| `/app/templates` | Library of saved merchant projects (templates). | **Read**: `Template` (List)<br>**Update**: `active` status<br>**Delete**: `Template` | • Search Filter<br>• Active/Inactive Toggle<br>• Delete Action |
| **Component Preview** | `/app/preview` | Headless component for iframe-based previewing. | **Read**: `window.postMessage` events | • `config` object (received via event)<br>• `device` prop |
