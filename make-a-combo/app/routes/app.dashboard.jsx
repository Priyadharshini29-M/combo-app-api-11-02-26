import { useEffect, useState } from 'react';
import {
  useLoaderData,
  Link,
  useFetcher,
  useRevalidator,
} from '@remix-run/react';
import { json } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';
import {
  BASE_PHP_URL,
  sendToPhp,
  getAnalytics,
  getShopifyDiscounts,
} from '../utils/api-helpers';
import { EnableThemeButton } from '../components/EnableThemeButton';
import { readAppEmbedState } from '../utils/app-embed.server';

import {
  Page,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Badge,
} from '@shopify/polaris';
import { HomeIcon } from '@shopify/polaris-icons';

function DashboardLayout({ left, rightTop, rightBottom, steps, cta }) {
  return (
    <BlockStack gap="600">
      <style>{`
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(290px, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        .dashboard-right-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 100%;
        }
        .dashboard-right-top {
          flex: 0 0 auto;
        }
        .dashboard-right-bottom {
          flex: 1 1 auto;
          display: flex;
          min-height: 0;
        }
        .dashboard-steps-grid {
          display: block;
        }
        .dashboard-steps-carousel {
          overflow: hidden;
          width: 100%;
          position: relative;
          padding: 0 44px;
        }
        .dashboard-steps-track {
          display: flex;
          flex-wrap: nowrap;
          gap: 12px;
          transition: transform 220ms ease;
          will-change: transform;
        }
        .dashboard-step-card {
          min-width: 240px;
          flex: 0 0 240px;
        }
        .dashboard-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #c9cccf;
          background: #ffffff;
          color: #1f2937;
          font-size: 20px;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
          z-index: 1;
        }
        .dashboard-arrow:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .dashboard-arrow-left {
          left: 4px;
        }
        .dashboard-arrow-right {
          right: 4px;
        }
        @media (max-width: 900px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .dashboard-steps-carousel {
            padding: 0 36px;
          }
        }
      `}</style>
      <div className="dashboard-main-grid">
        <div>{left}</div>
        <div className="dashboard-right-column">
          <div className="dashboard-right-top">{rightTop}</div>
          <div className="dashboard-right-bottom">{rightBottom}</div>
        </div>
      </div>
      {steps}
      {cta}
    </BlockStack>
  );
}

function VideoCard({ title, subtitle, helperText }) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h3">
          {title}
        </Text>
        <Text variant="bodySm" tone="subdued">
          {subtitle}
        </Text>

        <div
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)',
            backgroundColor: '#111827',
          }}
        >
          <div
            style={{
              aspectRatio: '16 / 9',
              width: '100%',
              backgroundImage:
                'linear-gradient(180deg, rgba(2,6,23,0.22) 0%, rgba(2,6,23,0.64) 100%), url("https://images.unsplash.com/photo-1551281044-8f6d8b47d4d1?auto=format&fit=crop&w=1400&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <button
            type="button"
            aria-label="Play preview"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 58,
              height: 58,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'default',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 0,
                height: 0,
                borderTop: '9px solid transparent',
                borderBottom: '9px solid transparent',
                borderLeft: '14px solid #f8fafc',
                marginLeft: 3,
              }}
            />
          </button>
        </div>

        <Text variant="bodySm" tone="subdued">
          {helperText}
        </Text>
      </BlockStack>
    </Card>
  );
}

function StatusCard({
  appStatus,
  isToggling,
  onToggleClick,
  shopName,
  onThemeToggle,
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h3">
            App Status
          </Text>
          <Badge tone={appStatus ? 'success' : 'attention'}>
            {appStatus ? 'Active' : 'Action Needed'}
          </Badge>
        </InlineStack>

        <Text variant="bodySm" tone="subdued">
          {appStatus
            ? 'App embed is live on your storefront.'
            : 'Enable app embed to publish combo pages to your theme.'}
        </Text>

        <BlockStack gap="200">
          <Button
            variant={appStatus ? 'secondary' : 'primary'}
            tone={appStatus ? 'critical' : 'success'}
            loading={isToggling}
            disabled={isToggling}
            onClick={onToggleClick}
            fullWidth
          >
            {appStatus ? 'Disable in App' : 'Enable in App'}
          </Button>

          <EnableThemeButton
            shopName={shopName}
            onToggle={onThemeToggle}
            children={
              appStatus ? 'Disable in Theme Editor' : 'Enable in Theme Editor'
            }
          />
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

function PlanCard({ fillHeight = false }) {
  return (
    <div style={{ width: '100%', height: fillHeight ? '100%' : 'auto' }}>
      <Card>
        <div
          style={{
            minHeight: 230,
            height: fillHeight ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h3">
              Plan
            </Text>
            <Badge tone="info">Starter</Badge>
          </InlineStack>

          <div style={{ marginTop: 10 }}>
            <Text variant="bodySm" tone="subdued">
              Upgrade to unlock unlimited combo pages and premium templates.
            </Text>
          </div>

          <div style={{ marginTop: 14 }}>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">
                • 1 active combo page
              </Text>
              <Text variant="bodySm" tone="subdued">
                • Basic analytics and reporting
              </Text>
              <Text variant="bodySm" tone="subdued">
                • Standard storefront support
              </Text>
            </BlockStack>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <Link
              to="/app/plan"
              prefetch="intent"
              style={{ textDecoration: 'none', width: '100%' }}
            >
              <Button variant="secondary" fullWidth>
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StepsSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);

  const steps = [
    {
      id: '01',
      title: 'Pick a Layout',
      description:
        'Choose a template that matches your product and offer flow.',
      tone: 'info',
      image:
        'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: '02',
      title: 'Customize',
      description: 'Adjust sections, style, content, and discount settings.',
      tone: 'warning',
      image:
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: '03',
      title: 'Publish',
      description: 'Enable the embed and make your combo page live.',
      tone: 'success',
      image:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: '04',
      title: 'Track Performance',
      description: 'Monitor visitors, clicks, and conversion impact.',
      tone: 'info',
      image:
        'https://images.unsplash.com/photo-1551281044-8f6d8b47d4d1?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: '05',
      title: 'Optimize',
      description: 'Refine design and offers to improve sales outcomes.',
      tone: 'warning',
      image:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
    },
  ];

  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth < 720) {
        setCardsPerView(1);
        return;
      }
      if (window.innerWidth < 1120) {
        setCardsPerView(2);
        return;
      }
      setCardsPerView(3);
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);

    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const maxStartIndex = Math.max(0, steps.length - cardsPerView);

  useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

  const translateX = startIndex * (240 + 12);

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h3">
          Build It This Way
        </Text>

        <div className="dashboard-steps-grid">
          <div className="dashboard-steps-carousel">
            <button
              type="button"
              className="dashboard-arrow dashboard-arrow-left"
              onClick={() => setStartIndex((prev) => Math.max(0, prev - 1))}
              disabled={startIndex === 0}
              aria-label="Previous cards"
            >
              ‹
            </button>

            <button
              type="button"
              className="dashboard-arrow dashboard-arrow-right"
              onClick={() =>
                setStartIndex((prev) => Math.min(maxStartIndex, prev + 1))
              }
              disabled={startIndex >= maxStartIndex}
              aria-label="Next cards"
            >
              ›
            </button>

            <div
              className="dashboard-steps-track"
              style={{ transform: `translateX(-${translateX}px)` }}
            >
              {steps.map((step) => (
                <div key={step.id} className="dashboard-step-card">
                  <Card background="bg-surface-secondary">
                    <BlockStack gap="200">
                      <div
                        style={{
                          width: '100%',
                          height: 96,
                          borderRadius: 10,
                          backgroundImage: `url("${step.image}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <BlockStack gap="100">
                        <Badge tone={step.tone}>{step.id}</Badge>
                        <Text variant="headingSm" as="h4">
                          {step.title}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          {step.description}
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BlockStack>
    </Card>
  );
}

function CTABanner() {
  return (
    <Card>
      <div
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #111827 55%, #052e2b 100%)',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <InlineStack align="space-between" blockAlign="center" wrap>
          <BlockStack gap="100">
            <Text variant="headingMd" as="h3" tone="text-inverse">
              Ready to elevate your store?
            </Text>
            <Text variant="bodyMd" tone="text-inverse-secondary">
              Launch your next combo page in minutes and optimize with
              analytics.
            </Text>
          </BlockStack>

          <Link
            to="/app/customize"
            prefetch="intent"
            style={{ textDecoration: 'none' }}
          >
            <button
              type="button"
              style={{
                backgroundColor: '#ffffff',
                color: '#111111',
                border: '1px solid #ffffff',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              Customize Template
            </button>
          </Link>
        </InlineStack>
      </div>
    </Card>
  );
}

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

    // 2. Read actual App Embed status from active theme asset
    const embedState = await readAppEmbedState({
      admin,
      session,
      blockHints: ['combo_builder', 'combo-builder', 'combo builder'],
    });
    isEnabled = embedState.isEnabled === true;

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
  const start =
    startParam ||
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0];

  console.log(
    `[Dashboard] Fetching analytics for ${shop} (${start} to ${end})`
  );

  const [analyticsData, shopifyDiscounts] = await Promise.all([
    getAnalytics(shop, start, end, null, admin).then(
      (d) =>
        d || {
          totalVisitors: 0,
          totalClicks: 0,
          checkoutClicks: 0,
          discountUsage: 0,
          discountList: [],
          topTemplate: 'None',
          byTemplate: [],
          chartData: [],
          totalRevenue: 0,
          totalOrders: 0,
          aov: 0,
          orderConversionRate: 0,
        }
    ),
    getShopifyDiscounts(admin),
  ]);

  const appliedDiscounts = (shopifyDiscounts || [])
    .filter((d) => d.usedCount > 0 && d.status === 'active')
    .map((d) => ({
      discount_name: d.code || d.title,
      usage_count: d.usedCount,
    }))
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  analyticsData.discountList = appliedDiscounts;
  if (shopifyDiscounts && shopifyDiscounts.length > 0) {
    analyticsData.discountUsage = shopifyDiscounts.filter(
      (d) => d.status === 'active'
    ).length;
  } else {
    analyticsData.discountList = [];
  }

  return json(
    { layoutFiles, shopName, isEnabled, analyticsData },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
};

// ... inside Dashboard component ...
export default function Dashboard() {
  const { shopName, isEnabled } = useLoaderData();
  const toggleFetcher = useFetcher();
  const revalidator = useRevalidator();
  const [appStatus, setAppStatus] = useState(isEnabled);

  useEffect(() => {
    setAppStatus(isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    if (toggleFetcher.data?.success) {
      setAppStatus(toggleFetcher.data.status === 'enabled');
      revalidator.revalidate();
    }
  }, [toggleFetcher.data, revalidator]);

  const isToggling = toggleFetcher.state !== 'idle';

  const handleStatusToggle = () => {
    toggleFetcher.submit(
      { enabled: String(!appStatus) },
      { method: 'POST', action: '/api/toggle-app' }
    );
  };

  return (
    <Page
      title="Make-a-Combo Dashboard"
      titleMetadata={
        <div style={{ width: 40 }}>
          <Icon source={HomeIcon} tone="base" />
        </div>
      }
    >
      <DashboardLayout
        left={
          <VideoCard
            title="Build with Video Guide"
            subtitle="Follow a quick walkthrough to launch your combo setup"
            helperText="Watch the setup flow: select layout, customize content, and publish in minutes."
          />
        }
        rightTop={
          <StatusCard
            key="status"
            appStatus={appStatus}
            isToggling={isToggling}
            onToggleClick={handleStatusToggle}
            shopName={shopName}
            onThemeToggle={setAppStatus}
          />
        }
        rightBottom={<PlanCard key="plan" />}
        steps={<StepsSection />}
        cta={<CTABanner />}
      />
    </Page>
  );
}
