# Functional Specification Document - Make-a-Combo App
**Date:** January 19, 2026  
**Version:** 3.0  
**Status:** Live Document

---

## 1. Module: Admin Dashboard
**Route:** `/app/dashboard` or `/app`

The central hub for navigation, education, and starting new projects.

### 1.1 UI Elements
*   **Header Section:**
    *   **App Logo/Icon:** Visual branding.
    *   **Page Title:** "Make-a-Combo Dashboard".
*   **Educational Card:**
    *   **Heading:** "How to Use This App".
    *   **Step-by-Step Guide:** Text explaining the 4-step process (Browse -> Select -> Customize -> Publish).
    *   **Visual Aid:** A large responsive image demonstrating the workflow.
*   **Search & Action Bar:**
    *   **Search Input:** A text field with a magnifying glass icon to filter layout cards by title or description. Includes a "Clear" (x) button.
    *   **Primary Button:** "Customize the default layout" (Direct shortcut to the builder with default settings).
*   **Layout Gallery (Grid View):**
    *   **Layout Cards (Repeater):**
        *   **Thumbnail Image:** High-quality preview of the layout structure.
        *   **Badge:** Status indicator (e.g., "Popular", "New", "Premium").
        *   **Title:** e.g., "Combo Design One".
        *   **Description:** Short 1-line summary.
        *   **"View Details" Button:** Opens the Details Modal.
*   **Layout Details Modal:**
    *   **Large Preview Image:** Hero image of the selected layout.
    *   **Key Features List:** Bullet points of what makes this layout unique (e.g., "Auto-scroll", "Dark Mode").
    *   **Best For Section:** Recommendation tag (e.g., "High-value bundles").
    *   **Action Button:** "Customize This Layout" (Navigates to `/app/customize?layout=xyz`).
    *   **Close Button:** Standard modal close action.

### 1.2 Functionalities
*   **Layout Filtering:** Typing in the search bar immediately filters the displayed cards Client-side.
*   **Hover Effects:** Cards lift up and cast a shadow on hover to indicate interactivity.
*   **Modal Logic:** Clicking a card opens the modal with data specific to that layout (fetched from metadata object).
*   **Navigation:** All "Customize" actions strictly route to the Builder module, passing the `layout_id` as a URL query parameter.

---

## 2. Module: Visual Customizer (The Builder)
**Route:** `/app/customize`

The core workspace for configuring the appearance and behavior of a combo section.

### 2.1 UI Elements
*   **Top Bar:**
    *   **Back Button:** Standard breadcrumb/back navigation.
    *   **Page Title:** "Customize Template".
    *   **Secondary Action:** "Reset to Default" (Button).
    *   **Primary Action:** "Save Template" (Button).
*   **Save/Publish Modal:**
    *   **Title Input:** Text field to name the template before saving.
    *   **Confirmation Text:** Description of action.
    *   **Save Button:** Commits data to database.
*   **Workspace (Split Layout):**
    *   **Left Panel (Preview Stage):** Creates a "WYSIWYG" environment.
        *   **Device Toggle:** Segmented Control [Desktop | Mobile]. switches the iframe container width (100% vs 375px).
        *   **Preview Container:** A bordered box mimicking a device screen.
        *   **Live Preview Component:** Renders the actual combo widget with current `config` state.
    *   **Right Panel (Settings Sidebar):** Scrollable configuration form.
        *   **Discount Section:**
            *   **Toggle:** [Yes | No] segmented button.
            *   **Select Dropdown:** "Select Active Discount" (populated from Discount Engine).
            *   **Create Button:** "Create Discount" (Trigger for Discount Modal).
        *   **Container Settings:**
            *   **Padding Toggle:** Checkbox "Show Padding Settings".
            *   **Desktop Sliders:** Top/Bottom/Left/Right (px values).
            *   **Mobile Sliders:** Separate controls for mobile break points.
        *   **Typography & Colors:** *Note: Needs detailed implementation*
            *   **Color Pickers:** Background, Button, Text, Price.
            *   **Font Controls:** Size inputs, Weight selects.
        *   **Content Editing:**
            *   **Inputs:** Title, Description, Button Label.
        *   **Layout Options:**
            *   **Section Ordering:** Dropdown to rearrange Banner/Title/Products sequence.

### 2.2 Functionalities
*   **Real-Time Sync:** Every keystroke or slider change updates a React State `config` object which immediately re-renders the Preview component.
*   **Device Simulation:** Changing the device toggle resizes the preview container `div` and forces the internal component to apply its mobile CSS rules (via prop `device="mobile"`).
*   **Discount Integration:**
    *   "Yes/No" toggle conditionally renders the Dropdown or the Create button.
    *   Fetching: On load, fetches active discounts to populate the dropdown.
*   **Persistence:** "Save" button posts the entire `config` JSON string + `title` to the `/app/templates` endpoint.
*   **Reset Logic:** Replaces current `config` state with `DEFAULT_COMBO_CONFIG` constant.

---

## 3. Module: Discount Engine
**Route:** `/app/discountengine`

A comprehensive tool to manage Shopify Discount Codes without leaving the app.

### 3.1 UI Elements
*   **Stats Dashboard (Top Row):**
    *   **Card 1:** "Active Discounts" (Count).
    *   **Card 2:** "Total Usage" (Sum of usage counts).
    *   **Card 3:** "Shopify Codes" (Synced count).
*   **Creation Form (Card):**
    *   **Section Header:** "Create Shopify Discount Code".
    *   **Title Input:** Internal name.
    *   **Code Input:** The actual code (forced Uppercase) e.g., "SUMMER20".
    *   **Type Select:** [Percentage | Fixed Amount | Buy X Get Y].
    *   **Value Input:** (Conditional) % or Amount.
    *   **BOGO Inputs:** (Conditional - Buy X Get Y)
        *   **Buy Qty:** Number.
        *   **Get Qty:** Number.
        *   **Target Product:** Text Input (ID or Name).
    *   **Scheduling Inputs:** Start Date, End Date.
    *   **Usage Limit:** "Limit to one use per customer" Checkbox.
    *   **Action Button:** "Create Discount".
*   **Management List (Index Table) - *Planned*:**
    *   Table displaying existing discounts with Edit/Delete actions (currently partially implemented via stats/form).

### 2.2 Functionalities
*   **Shopify Integration:** Uses `admin.graphql` mutations (`discountCodeBasicCreate`) to push data directly to Shopify's core discount system.
*   **Validation:**
    *   Enforces `Code` uniqueness (via API response handling).
    *   Enforces `Value` > 0.
    *   Requires `Buy Qty` and `Get Qty` for BOGO types.
*   **Error Handling:** Captures GraphQL errors (e.g., "Code already exists") and displays them via Shopify Toast.
*   **Success Feedback:** Clears form and updates local state/lists upon successful creation.

---

## 4. Module: Template Management
**Route:** `/app/templates`

The library of "Saved Projects" that merchants have created.

### 4.1 UI Elements
*   **Top Bar:** "Create Template" button (Links to Dashboard/Customize).
*   **Filter Tabs:** [All | Active | Inactive].
*   **Search Bar:** Filter templates by name.
*   **Data Table (Index Table):**
    *   **Row Item:**
        *   **Thumbnail:** generated from the layout type.
        *   **Title:** Template Name.
        *   **Created Date:** Formatted date string.
        *   **Discount Badge:** Shows attached discount code name (or "-").
        *   **Status Badge:** Green (Active) / Grey (Inactive).
        *   **Actions Group:**
            *   **View:** External link icon.
            *   **Edit:** Pencil icon (navigates to Builder).
            *   **Toggle:** Button to flip Active/Inactive.
            *   **Delete:** Trash icon (Destructive action).

### 4.2 Functionalities
*   **Active Toggle:** Sending a POST request to update the `active` boolean in the database.
*   **Delete Logic:** Sends DELETE request, removes row from UI optimistically or upon success.
*   **Edit Workflow:** clicking "Edit" loads the Builder (`/app/customize`) with the specific `templateId` query param, causing the builder to hydrate from the Database instead of Defaults.
*   **Batch Selection (Polaris):** Allows selecting multiple rows (currently UI only, ready for "Batch Delete").

---

## 5. Module: Component Preview (Internal)
**Route:** `/app/preview`

A specialized "headless" route used inside the Builder's iframe.

### 5.1 UI Elements
*   **Combo Component:** The actual React component that renders the offer.
*   **Wrapper Div:** A container that accepts style props (width/padding) based on the `device` prop.

### 5.2 Functionalities
*   **Message Listener:** `window.addEventListener("message")` listens for `UPDATE_PREVIEW` events from the parent window (Builder).
*   **State Hydration:** When a message is received, it updates its local `config` state, causing an instant re-render without a page reload.
*   **Mock Data:** Uses hardcoded "Snowboard" products for stable visualization (since actual Shopify products might vary per store).

