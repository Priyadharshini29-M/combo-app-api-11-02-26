/**
 * QUICK REFERENCE: Enable App in Theme Button
 * 
 * Copy and paste this code snippet anywhere you need the button
 */

// ============================================
// OPTION 1: Simple Button (Recommended)
// ============================================
import { Button } from "@shopify/polaris";

// In your loader:
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopName = session.shop.replace('.myshopify.com', '');
  return json({ shopName });
};

// In your component:
<Button
  variant="primary"
  size="large"
  url={`https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`}
  external
  target="_top"
>
  Enable App in Theme
</Button>


// ============================================
// OPTION 2: Full Card Section (Copy-Paste Ready)
// ============================================
<Card>
  <BlockStack gap="400">
    <InlineStack align="space-between" blockAlign="start">
      <BlockStack gap="200">
        <Text variant="headingLg" as="h2">
          🚀 Enable App in Your Theme
        </Text>
        <Text variant="bodyMd" tone="subdued">
          To display combo pages on your storefront, enable the app extension in your active theme.
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
          After enabling, add combo blocks to any page using the theme editor's "Add section" or "Add block" options.
        </Text>
      </BlockStack>
    </Card>
  </BlockStack>
</Card>


// ============================================
// OPTION 3: Reusable Component
// ============================================
import { EnableThemeButton } from "~/components/EnableThemeButton";

<EnableThemeButton 
  shopName={shopName}
  variant="primary"
  size="large"
/>


// ============================================
// THE URL FORMAT
// ============================================
// https://admin.shopify.com/store/{shop-name}/themes/current/editor?context=apps
//
// {shop-name} = Your shop without .myshopify.com (e.g., "my-store")
// ?context=apps = Opens directly to App embeds section
