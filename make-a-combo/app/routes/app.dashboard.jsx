import { useState } from 'react';
import { useLoaderData, Link } from '@remix-run/react';
import { json } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';
import { getVisitors, getClicks, transformAnalytics, BASE_PHP_URL, sendToPhp, getAnalytics, getShopifyDiscounts } from '../utils/api-helpers';
import { EnableThemeButton } from '../components/EnableThemeButton';
import { ShopifyAnalytics } from '../components/ShopifyAnalytics';

import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Badge,
  List,
  Divider,
} from '@shopify/polaris';
import { HomeIcon } from '@shopify/polaris-icons';

const EXTENSION_UUID = '9be6ff79-377e-fec3-de20-e5290c5b53fd07498442';

// Loader: check real Shopify theme embed status → save to DB → return result
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopName = shop.replace('.myshopify.com', '');

  let isEnabled = false;

  try {
    // 1. Get shop info + active theme via GraphQL
    const shopRes = await admin.graphql(`
      query {
        shop { name myshopifyDomain primaryDomain { host } plan { displayName } }
        themes(first: 5, roles: [MAIN]) {
          nodes { id name role }
        }
        currentAppInstallation {
          activeSubscriptions { name status }
        }
      }
    `);
    const shopJson = await shopRes.json();
    const shopInfo = shopJson.data?.shop || {};
    const activeTheme = shopJson.data?.themes?.nodes?.[0];
    const subscriptions =
      shopJson.data?.currentAppInstallation?.activeSubscriptions || [];
    const appPlan = subscriptions.length > 0 ? subscriptions[0].name : 'Free';

    if (activeTheme) {
      const themeId = activeTheme.id.split('/').pop();

      // 2. Read settings_data.json via direct Shopify REST call using session access token
      try {
        const assetUrl = `https://${shop}/admin/api/2025-01/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`;
        const assetRes = await fetch(assetUrl, {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (assetRes.ok) {
          const assetBody = await assetRes.json();
          const assetValue = assetBody.asset?.value;

          if (assetValue) {
            const settingsData = JSON.parse(assetValue);
            const blocks = settingsData.current?.blocks || {};

            console.log(
              '[Dashboard] All theme blocks:',
              Object.entries(blocks).map(([k, b]) => ({
                key: k,
                type: b.type,
                disabled: b.disabled,
              }))
            );

            const matchedKey = Object.keys(blocks).find((key) => {
              const type = blocks[key].type || '';
              return (
                type.includes(EXTENSION_UUID) ||
                type.includes('combo_builder') ||
                type.includes('combo_global') ||
                type.includes('combo-global')
              );
            });

            if (matchedKey) {
              isEnabled = blocks[matchedKey].disabled !== true;
              console.log(`[Dashboard] Matched block "${matchedKey}", disabled=${blocks[matchedKey].disabled}, isEnabled=${isEnabled}`);
            } else {
              isEnabled = false;
              console.log('[Dashboard] No matching block found in theme. Block types present:', Object.values(blocks).map(b => b.type));
            }
          }
        } else {
          console.error('[Dashboard] Asset fetch failed:', assetRes.status, await assetRes.text());
        }
      } catch (assetErr) {
        console.error('[Dashboard] Asset fetch error:', assetErr.message);
      }
    }

    console.log(
      `[Dashboard] Shopify embed status for ${shop}: ${isEnabled ? 'enabled' : 'disabled'}`
    );

    // 3. Save detected status to DB with full shop data (prevent field wipe)
    await sendToPhp(
      {
        event: 'shop_sync',
        resource: 'shop',
        shop: shop,
        data: {
          shop_id: shop,
          name: shopInfo.name || shop,
          status: isEnabled ? 'enabled' : 'disabled',
          app_plan: appPlan,
          theme_name: activeTheme?.name || null,
          primary_domain: shopInfo.primaryDomain?.host || null,
          last_source: 'dashboard_load',
        },
      },
      'shop.php'
    );

    console.log(
      `[Dashboard] DB updated with status: ${isEnabled ? 'enabled' : 'disabled'}`
    );
  } catch (err) {
    console.error('[Dashboard] Status check/DB update error:', err.message);

    // Fallback: read last known status from DB
    try {
      const res = await fetch(`${BASE_PHP_URL}/shop.php?shopdomain=${shop}`);
      const dbData = await res.json();
      if (dbData.status === 'success' && dbData.data) {
        isEnabled = dbData.data.status === 'enabled';
      }
      console.log(`[Dashboard] Fallback DB status: ${dbData.data?.status}`);
    } catch (dbErr) {
      console.error('[Dashboard] Fallback DB fetch error:', dbErr.message);
    }
  }

  // Read layout files
  const blocksDir = path.join(
    process.cwd(),
    'extensions',
    'combo-templates',
    'blocks'
  );
  let layoutFiles = [];
  try {
    if (fs.existsSync(blocksDir)) {
      layoutFiles = fs
        .readdirSync(blocksDir)
        .filter((f) => f.endsWith('.liquid'));
    }
  } catch (e) {
    console.error('Error reading blocks directory:', e);
  }

  // 4. Fetch Real Analytics from visitors.php and clicks.php (with dynamic date support)
  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const end = endParam || new Date().toISOString().split('T')[0];
  const start = startParam || new Date(new Date().setDate(new Date().getDate() - 30))
    .toISOString()
    .split('T')[0];

  console.log(`[Dashboard] Fetching analytics for ${shop} (${start} to ${end})`);
  
  const [analyticsData, shopifyDiscounts] = await Promise.all([
    getAnalytics(shop, start, end).then(d => d || {
      totalVisitors: 0,
      totalClicks: 0,
      checkoutClicks: 0,
      discountUsage: 0,
      discountList: [],
      topTemplate: 'None',
      byTemplate: [],
      chartData: [],
    }),
    getShopifyDiscounts(admin),
  ]);

  if (shopifyDiscounts.length > 0) {
    analyticsData.discountList = shopifyDiscounts;
    analyticsData.discountUsage = shopifyDiscounts.filter(d => d.status === 'active').length;
  }

  return json({ layoutFiles, shopName, isEnabled, analyticsData });
};

// Layout designs metadata
const layoutMetadata = [
  {
    id: 1,
    title: 'The Guided Architect',
    description:
      'A conversion-focused multi-step builder with progress tracking and tiered discount logic.',
    img: '/combo-design-one-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Guided+Architect',
    badge: 'Core',
    badgeTone: 'success',
    blockName: 'combo_main',
    features: [
      'Visual progress tracking',
      'Tiered discount engine',
      'Step-by-step selection flow',
      'Sticky summary footer',
      'Ideal for complex kits',
    ],
    bestFor: 'Complex bundles and high-value kits',
  },
  {
    id: 2,
    title: 'The Velocity Stream',
    description:
      'An immersive, motion-driven experience featuring an auto-scrolling carousel for maximum engagement.',
    img: '/combo-design-two-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Motion+Slider',
    badge: 'Trending',
    badgeTone: 'success',
    blockName: 'combo_design_two',
    features: [
      'Smooth auto-scroll motion',
      'Touch-optimized swiping',
      'Dynamic navigation cues',
      'Infinite loop storytelling',
      'Visual-first discovery',
    ],
    bestFor: 'Visual storytelling and featured promotions',
  },
  {
    id: 3,
    title: 'The Editorial Split',
    description:
      'A premium, sophisticated layout that pairs high-impact imagery with detailed product storytelling.',
    img: '/combo-design-four-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Editorial+Split',
    badge: 'Premium',
    badgeTone: 'success',
    blockName: 'combo_design_four',
    features: [
      'Luxe split-screen design',
      'Detail-rich narratives',
      'High-contrast callouts',
      'Dark mode elegance',
      'Psychology-driven flow',
    ],
    bestFor: 'Luxury items and high-impact product stories',
  },
];

// ... inside Dashboard component ...
export default function Dashboard() {
  const { shopName, isEnabled, analyticsData } = useLoaderData();
  const [appStatus, setAppStatus] = useState(isEnabled);

  return (
    <Page
      title="Make-a-Combo Dashboard"
      titleMetadata={
        <div style={{ width: 40 }}>
          <Icon source={HomeIcon} tone="base" />
        </div>
      }
    >
      <BlockStack gap="600">
        {/* 1. How to Use Section */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">
              How to Use This App
            </Text>
            <Text variant="bodyMd" tone="subdued">
              Follow these simple steps to create stunning combo pages for your
              store
            </Text>
            <div
              style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src="https://placehold.co/1200x250/000000/ffffff?text=Step+1:+Browse+Layouts+%E2%86%92+Step+2:+Select+%E2%86%92+Step+3:+Customize+%E2%86%92+Step+4:+Publish"
                alt="How to use guide"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          </BlockStack>
        </Card>

        {/* App Status Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">
                  {appStatus
                    ? '✅ App Status: Active'
                    : '🚀 Enable App in Your Theme'}
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  {appStatus
                    ? 'The app is active and visible on your storefront.'
                    : 'To display combo pages, you must enable the app in the Theme Editor.'}
                </Text>
              </BlockStack>
              <Badge tone={appStatus ? 'success' : 'attention'}>
                {appStatus ? 'Active' : 'Action Required'}
              </Badge>
            </InlineStack>

            <Divider />

            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">
                {appStatus ? 'How to Disable:' : 'How to Enable:'}
              </Text>
              <List type="number">
                <List.Item>
                  Click the button below to open the Theme Editor.
                </List.Item>
                <List.Item>
                  In "App Embeds", toggle "Make-a-combo"{' '}
                  <strong>{appStatus ? 'OFF' : 'ON'}</strong>.
                </List.Item>
                <List.Item>Click "Save".</List.Item>
              </List>
            </BlockStack>

            <InlineStack align="center" gap="400">
              <EnableThemeButton
                shopName={shopName}
                onToggle={setAppStatus}
                children={
                  appStatus
                    ? 'Disable App in Theme Editor'
                    : 'Enable App in Theme Editor'
                }
              />
            </InlineStack>

            <Card background="bg-surface-secondary">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  💡 Note
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  If you change the setting in the Theme Editor, please refresh
                  this dashboard to see the updated status.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Card>

        {/* Plan Status Section */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">
                Current Plan: <Badge tone="info">Starter (Free)</Badge>
              </Text>
              <Text variant="bodyMd" tone="subdued">
                You are currently on the Starter plan. Upgrade to Professional
                to unlock unlimited combo pages and premium templates.
              </Text>
            </BlockStack>
            <Link
              to="/app/plan"
              prefetch="intent"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary">Upgrade Plan</Button>
            </Link>
          </InlineStack>
        </Card>

        {/* 2. Quick Action — Go to Customize */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <BlockStack gap="100">
              <Text variant="headingMd" as="h3">
                Ready to build your combo page?
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Head to the Customize module to choose a layout and start
                personalising your bundle experience.
              </Text>
            </BlockStack>
            <Link
              to="/app/customize"
              prefetch="intent"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary" size="large">
                Customize Template
              </Button>
            </Link>
          </InlineStack>
        </Card>

        {/* --- Shopify Analytics Extension Section --- */}
        <ShopifyAnalytics initialData={analyticsData} />
      </BlockStack>
    </Page>
  );
}
