import { useState } from "react";
import { useNavigate, useLoaderData, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import fs from "fs";
import path from "path";
import { authenticate } from "../shopify.server";
import { sendToPhp } from "../utils/api-helpers";

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
} from "@shopify/polaris";
import { SearchIcon, HomeIcon } from "@shopify/polaris-icons";

// Loader to fetch liquid files from the extensions directory and shop info
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopName = shop.replace('.myshopify.com', '');

  // 1. Check App Status (ScriptTag Check)
  const rawAppUrl = process.env.SHOPIFY_APP_URL || "";
  const APP_URL = rawAppUrl.replace(/\/$/, "");
  const SCRIPT_URL = `${APP_URL}/combo-builder-loader.js`;

  let isEnabled = false;
  try {
    // Fetch comprehensive shop data and script tags in one go
    const shopQuery = `
      query {
        shop {
          id
          name
          createdAt
          myshopifyDomain
          plan { displayName }
        }
        scriptTags(first: 50) {
          nodes { id src }
        }
        themes(first: 50) {
          nodes { name role }
        }
        currentAppInstallation {
          activeSubscriptions { name status }
        }
      }
    `;
    const response = await admin.graphql(shopQuery);
    const result = await response.json();

    const shopInfo = result.data?.shop || {};
    const scriptTags = result.data?.scriptTags?.nodes || [];
    const themes = result.data?.themes?.nodes || [];
    const subscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];

    isEnabled = scriptTags.some(s => s.src === SCRIPT_URL);
    const activeTheme = themes.find(t => t.role === "MAIN") || themes[0];
    const appPlan = subscriptions.length > 0 ? subscriptions[0].name : "Free";

    // 2. Immediately Log Status and Data to PHP
    console.log(`[Dashboard Loader] 📡 Auto-syncing status for ${shop}: ${isEnabled ? 'Enabled' : 'Disabled'}`);

    await sendToPhp({
      event: isEnabled ? "app_status_active" : "app_status_inactive",
      resource: "store_status_check",
      shop: shop,
      data: {
        shop_id: shopInfo.myshopifyDomain || shop,
        domain: shopInfo.myshopifyDomain,
        store_name: shopInfo.name,
        status: isEnabled ? "enabled" : "disabled",
        app_plan: appPlan,
        shopify_plan: shopInfo.plan?.displayName || "N/A",
        theme_name: activeTheme?.name || "N/A",
        updated_at: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        source: "dashboard_load"
      }
    });

  } catch (err) {
    console.error("[Dashboard Loader] ❌ Status check failed:", err.message);
  }

  const blocksDir = path.join(
    process.cwd(),
    "extensions",
    "combo-templates",
    "blocks",
  );
  let files = [];
  try {
    if (fs.existsSync(blocksDir)) {
      files = fs.readdirSync(blocksDir).filter((f) => f.endsWith(".liquid"));
    }
  } catch (e) {
    console.error("Error reading blocks directory:", e);
  }
  return json({ layoutFiles: files, shopName, initialEnabled: isEnabled });
};

// Layout designs metadata
const layoutMetadata = [
  {
    id: 1,
    title: "The Guided Architect",
    description: "A conversion-focused multi-step builder with progress tracking and tiered discount logic.",
    img: "/combo-design-one-preview.png",
    fallbackImg: "https://placehold.co/400x300/000000/ffffff?text=Guided+Architect",
    badge: "Core",
    badgeTone: "success",
    blockName: "combo_main",
    features: [
      "Visual progress tracking",
      "Tiered discount engine",
      "Step-by-step selection flow",
      "Sticky summary footer",
      "Ideal for complex kits",
    ],
    bestFor: "Complex bundles and high-value kits",
  },
  {
    id: 2,
    title: "The Velocity Stream",
    description: "An immersive, motion-driven experience featuring an auto-scrolling carousel for maximum engagement.",
    img: "/combo-design-two-preview.png",
    fallbackImg: "https://placehold.co/400x300/000000/ffffff?text=Motion+Slider",
    badge: "Trending",
    badgeTone: "success",
    blockName: "combo_design_two",
    features: [
      "Smooth auto-scroll motion",
      "Touch-optimized swiping",
      "Dynamic navigation cues",
      "Infinite loop storytelling",
      "Visual-first discovery",
    ],
    bestFor: "Visual storytelling and featured promotions",
  },
  {
    id: 3,
    title: "The Editorial Split",
    description: "A premium, sophisticated layout that pairs high-impact imagery with detailed product storytelling.",
    img: "/combo-design-four-preview.png",
    fallbackImg: "https://placehold.co/400x300/000000/ffffff?text=Editorial+Split",
    badge: "Premium",
    badgeTone: "success",
    blockName: "combo_design_four",
    features: [
      "Luxe split-screen design",
      "Detail-rich narratives",
      "High-contrast callouts",
      "Dark mode elegance",
      "Psychology-driven flow",
    ],
    bestFor: "Luxury items and high-impact product stories",
  },

];

export default function Dashboard() {
  const { layoutFiles, shopName, initialEnabled } = useLoaderData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);


  const layoutDesigns = layoutFiles
    .map((filename, index) => {
      const blockName = filename.replace(".liquid", "");
      return layoutMetadata.find((m) => m.blockName === blockName);
    })
    .filter(Boolean); // Only show core 4 layouts

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
      layout.description.toLowerCase().includes(search.toLowerCase()),
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
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <img
                src="https://placehold.co/1200x250/000000/ffffff?text=Step+1:+Browse+Layouts+%E2%86%92+Step+2:+Select+%E2%86%92+Step+3:+Customize+%E2%86%92+Step+4:+Publish"
                alt="How to use guide"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          </BlockStack>
        </Card>


        {/* Enable App in Theme Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">
                  🚀 Enable App in Your Theme
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  To display combo pages on your storefront, you need to enable the app extension in your active theme.
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

            {/* Visual Guide */}
            <div
              style={{
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                border: "2px dashed #e0e0e0",
              }}
            >
              <img
                src="https://placehold.co/1200x400/1a1a1a/ffffff?text=Theme+Editor+%E2%86%92+App+Embeds+%E2%86%92+Toggle+Make-a-combo+ON+%E2%86%92+Save"
                alt="Visual guide for enabling app in theme"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>

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
                  After enabling the app, you can add combo blocks to any page using the theme editor's "Add section" or "Add block" options.
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
                You are currently on the Starter plan. Upgrade to Professional to unlock unlimited combo pages and premium templates.
              </Text>
            </BlockStack>
            <Link to="/app/plan" prefetch="intent" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Upgrade Plan</Button>
            </Link>
          </InlineStack>
        </Card>

        {/* 2. Search Bar with Create Button */}
        <Card>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <div style={{ flex: 1, maxWidth: "700px" }}>
              <TextField
                placeholder="Search for layouts..."
                value={search}
                onChange={setSearch}
                prefix={<Icon source={SearchIcon} />}
                clearButton
                onClearButtonClick={() => setSearch("")}
                autoComplete="off"
              />
            </div>
            <Link to="/app/customize" prefetch="intent" style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="large"
              >
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {filteredLayouts.map((layout) => (
              <Card key={layout.id} padding="0">
                <div
                  onClick={() => openModal(layout)}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Image */}
                  <div style={{ position: "relative" }}>
                    <img
                      src={layout.img}
                      alt={layout.title}
                      onError={(e) => {
                        e.target.src = layout.fallbackImg;
                      }}
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                      }}
                    >
                      <Badge tone={layout.badgeTone}>{layout.badge}</Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "20px" }}>
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h3" fontWeight="semibold">
                        {layout.title}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        {layout.description}
                      </Text>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Button fullWidth onClick={(e) => { e.stopPropagation(); openModal(layout); }}>Details</Button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Link to={`/app/customize?layout=${layout.blockName}`} prefetch="intent" style={{ textDecoration: 'none' }}>
                            <Button variant="primary" fullWidth>Customize</Button>
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
        title={selectedLayout?.title || ""}
        primaryAction={{
          content: "Customize This Layout",
          onAction: handleCustomize,
          loading: isNavigating,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closeModal,
          },
        ]}
      >
        {selectedLayout && (
          <Modal.Section>
            <BlockStack gap="500">
              {/* Featured Layout Card */}
              <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                <Card padding="0">
                  <div style={{ position: "relative" }}>
                    <img
                      src={selectedLayout.img}
                      alt={selectedLayout.title}
                      onError={(e) => {
                        e.target.src = selectedLayout.fallbackImg;
                      }}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                      }}
                    >
                      <Badge tone={selectedLayout.badgeTone}>
                        {selectedLayout.badge}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ padding: "20px" }}>
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
