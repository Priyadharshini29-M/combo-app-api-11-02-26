# Enable App in Theme - Implementation Guide

## Overview
This guide explains how to implement the "Enable App in Theme" functionality that redirects merchants to enable your Shopify app extension in their active theme.

## How It Works

When a merchant clicks the button, they are redirected to:
```
https://admin.shopify.com/store/{shop-name}/themes/current/editor?context=apps
```

This URL:
- Opens the Shopify theme editor
- Automatically navigates to the "App embeds" section (`?context=apps`)
- Shows all available app extensions for the merchant to enable

## Implementation Methods

### Method 1: Using the Reusable Component

```javascript
import { EnableThemeButton } from "~/components/EnableThemeButton";

export default function MyPage() {
  const { shopName } = useLoaderData();
  
  return (
    <EnableThemeButton 
      shopName={shopName}
      variant="primary"
      size="large"
    />
  );
}
```

### Method 2: Direct Button Implementation

```javascript
import { Button } from "@shopify/polaris";

export default function MyPage() {
  const { shopName } = useLoaderData();
  
  return (
    <Button
      variant="primary"
      size="large"
      url={`https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`}
      external
      target="_top"
    >
      Enable App in Theme Editor
    </Button>
  );
}
```

### Method 3: Custom Link

```javascript
export default function MyPage() {
  const { shopName } = useLoaderData();
  const themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`;
  
  return (
    <a href={themeEditorUrl} target="_top">
      Enable App in Theme
    </a>
  );
}
```

## Getting the Shop Name

### In Remix Loaders (Server-Side)

```javascript
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop; // e.g., "my-store.myshopify.com"
  const shopName = shop.replace('.myshopify.com', ''); // e.g., "my-store"
  
  return json({ shopName });
};
```

### Using the Helper Function

```javascript
import { getShopName } from "~/components/EnableThemeButton";

const shop = "my-store.myshopify.com";
const shopName = getShopName(shop); // Returns "my-store"
```

## Complete Example (Dashboard Implementation)

```javascript
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  List,
  Divider,
} from "@shopify/polaris";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopName = shop.replace('.myshopify.com', '');
  
  return json({ shopName });
};

export default function Dashboard() {
  const { shopName } = useLoaderData();
  
  return (
    <Page title="Dashboard">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">
                🚀 Enable App in Your Theme
              </Text>
              <Text variant="bodyMd" tone="subdued">
                To display combo pages on your storefront, you need to enable 
                the app extension in your active theme.
              </Text>
            </BlockStack>
            <Badge tone="attention">Action Required</Badge>
          </InlineStack>
          
          <Divider />
          
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Quick Setup Steps:
            </Text>
            <List type="number">
              <List.Item>Click the button below to open your theme editor</List.Item>
              <List.Item>Find "App embeds" in the left sidebar</List.Item>
              <List.Item>Toggle ON "Make-a-combo" to enable the app</List.Item>
              <List.Item>Click "Save" in the top right corner</List.Item>
            </List>
          </BlockStack>

          <InlineStack align="center">
            <Button
              variant="primary"
              size="large"
              url={`https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`}
              external
              target="_top"
            >
              Enable App in Theme Editor
            </Button>
          </InlineStack>

          <Card background="bg-surface-secondary">
            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">
                💡 Pro Tip
              </Text>
              <Text variant="bodyMd" tone="subdued">
                After enabling the app, you can add combo blocks to any page 
                using the theme editor's "Add section" or "Add block" options.
              </Text>
            </BlockStack>
          </Card>
        </BlockStack>
      </Card>
    </Page>
  );
}
```

## URL Parameters Explained

| Parameter | Description |
|-----------|-------------|
| `store/{shop-name}` | The merchant's shop identifier (without .myshopify.com) |
| `themes/current` | Opens the currently active/published theme |
| `editor` | Opens the theme editor interface |
| `?context=apps` | Automatically navigates to the "App embeds" section |

## Alternative URL Variations

### Open Specific Theme by ID
```javascript
const url = `https://admin.shopify.com/store/${shopName}/themes/${themeId}/editor?context=apps`;
```

### Open Theme Customizer (Different from Editor)
```javascript
const url = `https://admin.shopify.com/store/${shopName}/themes/current?context=apps`;
```

### Open App Extensions Settings
```javascript
const url = `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps&activateAppId=${appId}`;
```

## Best Practices

1. **Always use `target="_top"`** - This ensures the link opens in the parent window, not within the embedded app iframe.

2. **Use `external` prop** - This tells Shopify Polaris that the link goes outside the app.

3. **Provide clear instructions** - Always include step-by-step instructions alongside the button.

4. **Add visual guides** - Consider adding screenshots or diagrams showing where to find the toggle.

5. **Badge for urgency** - Use an "Action Required" badge to draw attention.

6. **Pro tips** - Include helpful hints about what merchants can do after enabling.

## Troubleshooting

### Button doesn't redirect
- Ensure `shopName` is correctly extracted (without `.myshopify.com`)
- Check that `target="_top"` is set
- Verify the URL format is correct

### Opens wrong theme
- Use `themes/current` to always open the active theme
- Or fetch the active theme ID from Shopify API and use `themes/{themeId}`

### Merchant can't find the toggle
- Ensure your app extension is properly configured in `shopify.extension.toml`
- Verify the extension is deployed to the store
- Check that the extension name matches what you tell merchants to look for

## Related Files

- `/app/components/EnableThemeButton.jsx` - Reusable button component
- `/app/routes/app.dashboard.jsx` - Dashboard implementation example
- `/extensions/combo-templates/shopify.extension.toml` - Extension configuration

## Additional Resources

- [Shopify Theme App Extensions Documentation](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Shopify Admin URLs](https://shopify.dev/docs/api/app-bridge/previous-versions/actions/navigation)
