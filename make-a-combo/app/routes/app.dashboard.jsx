import { useState } from 'react';
import { useNavigate, useLoaderData, Link } from '@remix-run/react';
import { json } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';
import { BASE_PHP_URL, sendToPhp } from '../utils/api-helpers';
import { EnableThemeButton } from '../components/EnableThemeButton';

import {
  Page,
  Card,
  TextField,
  Button,
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Badge,
  List,
  Divider,
} from '@shopify/polaris';
import { SearchIcon, HomeIcon } from '@shopify/polaris-icons';

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

      // 2. Read settings_data.json to check if app embed block is enabled
      const assetRes = await admin.rest.get({
        path: `themes/${themeId}/assets`,
        query: { 'asset[key]': 'config/settings_data.json' },
      });

      if (assetRes.ok) {
        const assetBody = await assetRes.json();
        const assetValue = assetBody.asset?.value;
        if (assetValue) {
          const settingsData = JSON.parse(assetValue);
          const blocks = settingsData.current?.blocks || {};

          // Debug: log all block types so we can verify the exact match string
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
              type.includes('combo_global') ||
              type.includes('combo-global')
            );
          });

          if (matchedKey) {
            isEnabled = blocks[matchedKey].disabled !== true;
          } else {
            isEnabled = false; // block not added to theme
          }
        }
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

  return json({ layoutFiles, shopName, isEnabled });
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
  const { shopName, isEnabled } = useLoaderData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [appStatus, setAppStatus] = useState(isEnabled);

  const layoutDesigns = layoutMetadata;

  const openModal = (layout) => {
    setSelectedLayout(layout);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedLayout(null);
  };

  const handleCustomize = () => {
    if (selectedLayout) {
      setIsNavigating(true);
      // Navigate immediately without closing modal first (faster redirect)
      navigate(`/app/customize?layout=${selectedLayout.blockName}`);
    }
  };

  const filteredLayouts = layoutDesigns.filter(
    (layout) =>
      layout.title.toLowerCase().includes(search.toLowerCase()) ||
      layout.description.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* 2. Search Bar with Create Button */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <div style={{ flex: 1, maxWidth: '700px' }}>
              <TextField
                placeholder="Search for layouts..."
                value={search}
                onChange={setSearch}
                prefix={<Icon source={SearchIcon} />}
                clearButton
                onClearButtonClick={() => setSearch('')}
                autoComplete="off"
              />
            </div>
            <Link
              to="/app/customize"
              prefetch="intent"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary" size="large">
                Customize the default layout
              </Button>
            </Link>
          </InlineStack>
        </Card>

        {/* 3. Layout Design Preview Cards */}
        <BlockStack gap="400">
          <Text variant="headingLg" as="h2">
            Choose Your Layout Design
          </Text>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredLayouts.map((layout) => (
              <Card key={layout.id} padding="0">
                <div
                  onClick={() => openModal(layout)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow =
                      '0 8px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div style={{ position: 'relative' }}>
                    <img
                      src={layout.img}
                      alt={layout.title}
                      onError={(e) => {
                        e.target.src = layout.fallbackImg;
                      }}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                      }}
                    >
                      <Badge tone={layout.badgeTone}>{layout.badge}</Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3" fontWeight="semibold">
                        {layout.title}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        {layout.description}
                      </Text>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Button
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(layout);
                            }}
                          >
                            Details
                          </Button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Link
                            to={`/app/customize?layout=${layout.blockName}`}
                            prefetch="intent"
                            style={{ textDecoration: 'none' }}
                          >
                            <Button variant="primary" fullWidth>
                              Customize
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </BlockStack>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredLayouts.length === 0 && (
            <Card>
              <BlockStack gap="200" inlineAlign="center">
                <Text variant="headingMd" tone="subdued">
                  No layouts found
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Try adjusting your search terms
                </Text>
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </BlockStack>

      {/* Modal with Layout Details */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={selectedLayout?.title || ''}
        primaryAction={{
          content: 'Customize This Layout',
          onAction: handleCustomize,
          loading: isNavigating,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: closeModal,
          },
        ]}
      >
        {selectedLayout && (
          <Modal.Section>
            <BlockStack gap="500">
              {/* Featured Layout Card */}
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <Card padding="0">
                  <div style={{ position: 'relative' }}>
                    <img
                      src={selectedLayout.img}
                      alt={selectedLayout.title}
                      onError={(e) => {
                        e.target.src = selectedLayout.fallbackImg;
                      }}
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                      }}
                    >
                      <Badge tone={selectedLayout.badgeTone}>
                        {selectedLayout.badge}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3" fontWeight="semibold">
                        {selectedLayout.title}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        {selectedLayout.description}
                      </Text>
                    </BlockStack>
                  </div>
                </Card>
              </div>

              <Divider />

              {/* Description & Features */}
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  About This Layout
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  {selectedLayout.description}
                </Text>

                <Text variant="headingMd" as="h3">
                  Key Features
                </Text>
                <List type="bullet">
                  {selectedLayout.features.map((feature, index) => (
                    <List.Item key={index}>{feature}</List.Item>
                  ))}
                </List>
              </BlockStack>

              <Divider />

              {/* Best For */}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">
                  Best For
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="info">Recommended</Badge>
                  <Text variant="bodyMd">{selectedLayout.bestFor}</Text>
                </InlineStack>
              </BlockStack>

              {/* CTA Section */}
              <Card background="bg-surface-secondary">
                <BlockStack gap="300">
                  <Text variant="headingSm" as="h4">
                    Ready to get started?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Click "Customize This Layout" to personalize colors,
                    content, and settings to match your brand.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </Page>
  );
}
