# Visual Guide Image Specification

## Current Placeholder
Currently using: `https://placehold.co/1200x400/1a1a1a/ffffff?text=Theme+Editor+%E2%86%92+App+Embeds+%E2%86%92+Toggle+Make-a-combo+ON+%E2%86%92+Save`

## Recommended Replacement

### Option 1: Screenshot (Recommended)
Take a screenshot of the actual Shopify theme editor showing:

1. **Left Sidebar** - Highlighted "App embeds" section
2. **Center Panel** - List of app embeds with "Make-a-combo" toggle
3. **Toggle Switch** - Showing the ON state (green)
4. **Save Button** - Highlighted in top right corner

**Dimensions:** 1200x400px or 1600x600px
**Format:** PNG or WebP
**File size:** < 200KB

### Option 2: Annotated Diagram
Create a simplified diagram showing:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Admin          Theme Editor          [Save] ← 4  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Sections    │  App Embeds                                  │
│              │                                              │
│  Blocks      │  ┌────────────────────────────────────────┐ │
│              │  │ Make-a-combo                    [ON] ← 3│ │
│→ App embeds ←│  │ Enable combo builder on your store     │ │
│      ↑       │  └────────────────────────────────────────┘ │
│      1       │                                              │
│              │  ┌────────────────────────────────────────┐ │
│  Settings    │  │ Other App                       [OFF]  │ │
│              │  │ Another app extension                  │ │
│              │  └────────────────────────────────────────┘ │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘

Steps:
1. Click "App embeds" in left sidebar
2. Find "Make-a-combo" in the list
3. Toggle the switch to ON (green)
4. Click "Save" in top right
```

### Option 3: Step-by-Step Images
Create 4 separate images showing each step:

**Image 1:** Arrow pointing to "App embeds" in sidebar
**Image 2:** "Make-a-combo" highlighted in the list
**Image 3:** Toggle switch being turned ON
**Image 4:** Save button highlighted

Combine into a single 1200x400px image with numbered steps.

## Design Specifications

### Colors
- **Background:** #F6F6F7 (Shopify admin gray)
- **Sidebar:** #FFFFFF (white)
- **Toggle ON:** #008060 (Shopify green)
- **Toggle OFF:** #E4E5E7 (gray)
- **Text:** #202223 (dark gray)
- **Accent:** #5C6AC4 (Shopify purple)

### Typography
- **Font:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **Headings:** 16px, weight 600
- **Body:** 14px, weight 400
- **Labels:** 13px, weight 500

### Annotations
- Use numbered circles (1, 2, 3, 4) in Shopify purple (#5C6AC4)
- Add arrows pointing to key elements
- Use white text on colored backgrounds
- Ensure high contrast for readability

## How to Create

### Method 1: Screenshot + Annotation
1. Open your Shopify theme editor
2. Navigate to App embeds section
3. Take a full-screen screenshot
4. Use a tool like:
   - **Figma** - Professional design tool
   - **Canva** - Easy online editor
   - **Photoshop** - Advanced editing
   - **Snagit** - Screenshot annotation tool
5. Add numbered annotations
6. Add arrows pointing to key areas
7. Crop to 1200x400px or 1600x600px
8. Export as PNG or WebP

### Method 2: Design from Scratch
1. Use Figma or similar design tool
2. Create a simplified mockup of the theme editor
3. Add the key elements (sidebar, toggle, save button)
4. Add numbered annotations
5. Export at 2x resolution for retina displays

### Method 3: Use Existing Shopify Documentation
1. Check Shopify's official documentation
2. Look for screenshots of the theme editor
3. Crop and annotate as needed
4. Ensure you have rights to use the image

## File Naming
Save the image as:
- `theme-editor-enable-guide.png`
- `app-embed-instructions.png`
- `enable-app-visual-guide.png`

## Where to Save
Place the image in:
```
/public/theme-editor-enable-guide.png
```

Then update the code to:
```javascript
<img
  src="/theme-editor-enable-guide.png"
  alt="Visual guide for enabling app in theme"
  style={{
    width: "100%",
    height: "auto",
    display: "block",
  }}
/>
```

## Accessibility
- **Alt text:** "Step-by-step visual guide showing how to enable Make-a-combo app in Shopify theme editor"
- **Contrast ratio:** Minimum 4.5:1 for text
- **Text size:** Minimum 14px for readability

## Examples to Reference
Look at these for inspiration:
- Shopify's official app documentation
- Other Shopify app onboarding flows
- SaaS product setup guides
- Tutorial screenshots from apps like:
  - Judge.me
  - Klaviyo
  - Yotpo

## Quick Win
If you don't have time to create a custom image, you can:
1. Use the current placeholder (already implemented)
2. Or use a simple text-based guide instead
3. Or link to a video tutorial

## Video Alternative
Consider creating a short video (15-30 seconds) showing:
1. Opening theme editor
2. Finding app embeds
3. Toggling the app ON
4. Saving changes

Host on YouTube or Vimeo and embed in the dashboard.
