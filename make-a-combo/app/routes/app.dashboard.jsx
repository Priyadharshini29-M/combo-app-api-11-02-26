import { useState, useEffect } from "react";
import { useNavigate, useLoaderData, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import fs from "fs";
import path from "path";
import { authenticate } from "../shopify.server";
import { formatToIST } from "../utils/api-helpers";

const BASE_PHP_URL = "https://61fb-103-130-204-117.ngrok-free.app/make-a-combo";

/**
 * Direct function to sync data to PHP without using helpers
 */
const syncToPhp = async (payload, endpoint = "shop.php") => {
  const url = `${BASE_PHP_URL}/${endpoint}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error(`[Dashboard UI] Direct PHP Error (${endpoint}):`, error.message);
    throw error;
  }
};

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
  console.log("--------------------------------------------------");
  console.log(`[Dashboard Loader] 📥 Incoming request: ${new Date().toISOString()}`);

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopName = shop.replace('.myshopify.com', '');
  const EXTENSION_UUID = "9be6ff79-377e-fec3-de20-e5290c5b53fd07498442";

  let isEnabled = false;
  let appPlan = "Free";
  let activeThemeName = "N/A";
  let themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`;

  try {
    // 1. Fetch Shop Info, Themes, and Metafield in one go
    const shopQuery = `
      query {
        shop {
          id
          name
          myshopifyDomain
          plan { displayName }
          metafield(namespace: "make_a_combo", key: "app_url") { value }
        }
        themes(first: 5, roles: [MAIN]) {
          nodes { id name role }
        }
        currentAppInstallation {
          activeSubscriptions { name status }
        }
      }
    `;
    const response = await admin.graphql(shopQuery);
    const result = await response.json();

    if (result.errors) {
      console.error("[Dashboard Loader] GraphQL Errors:", result.errors);
    }

    const data = result.data || {};
    const shopInfo = data.shop || {};
    const themes = data.themes?.nodes || [];
    const subscriptions = data.currentAppInstallation?.activeSubscriptions || [];
    const appUrlMetafied = shopInfo.metafield?.value;

    appPlan = subscriptions.length > 0 ? subscriptions[0].name : "Free";
    const activeTheme = themes[0];

    if (activeTheme) {
      activeThemeName = activeTheme.name;
    }

    // 2. Status Detection Logic
    isEnabled = false;
    let debugLog = `[${new Date().toISOString()}] Starting Theme Inspection\n`;

    if (appUrlMetafied && appUrlMetafied !== "DISABLED" && appUrlMetafied !== "MISSING") {
      isEnabled = true;
      debugLog += "Metafield: Active.\n";
    }

    if (activeTheme) {
      try {
        const themeId = activeTheme.id.split('/').pop();
        debugLog += `Theme: ${activeTheme.name} (${themeId})\n`;

        const response = await admin.rest.get({
          path: `themes/${themeId}/assets`,
          query: { "asset[key]": "config/settings_data.json" }
        });

        if (response.ok) {
          const body = await response.json();
          const assetValue = body.asset?.value;
          if (assetValue) {
            const settingsData = JSON.parse(assetValue);
            const current = settingsData.current || {};
            const blocks = current.blocks || {};
            const blockKeys = Object.keys(blocks);

            debugLog += `Current Keys: ${Object.keys(current).join(', ')}\n`;
            debugLog += `Total Blocks: ${blockKeys.length}\n`;

            blockKeys.forEach(k => {
              const b = blocks[k];
              debugLog += `Block [${k}] Type: ${b.type} Disabled: ${b.disabled}\n`;
            });

            const matchedKey = blockKeys.find(key => {
              const type = blocks[key].type || "";
              return type.includes(EXTENSION_UUID) || type.includes("combo-global");
            });

            if (matchedKey) {
              isEnabled = blocks[matchedKey].disabled !== true;
              debugLog += `🎯 Match: ${matchedKey} | Final Result: ${isEnabled}\n`;
            } else {
              debugLog += `⚠️ No block matched UUID ${EXTENSION_UUID}\n`;
            }
          } else {
            debugLog += `❌ Body.asset.value missing.\n`;
          }
        } else {
          debugLog += `❌ REST failed: ${response.status}\n`;
        }
      } catch (e) {
        debugLog += `❌ Error: ${e.message}\n`;
      }
    }

    debugLog += `Final Result: ${isEnabled}\n`;
    try { fs.writeFileSync('D:\\Digifyce\\Make-a-combo\\make-a-combo\\THEME_DEBUG.log', debugLog); } catch (e) { }

    // 3. Status Reporting
    const dashboardShopData = {
      shop_id: shopInfo.myshopifyDomain || shop,
      store_name: shopInfo.name,
      status: isEnabled ? "enabled" : "disabled",
      app_plan: appPlan,
      theme_name: activeThemeName,
      timestamp: formatToIST(),
      source: "dashboard_load"
    };



    // Save to shop.php (MySQL Sync - Direct)
    try {
      const dbResult = await syncToPhp({
        event: "shop_sync",
        resource: "shop",
        shop: shop,
        data: dashboardShopData
      }, "shop.php");
      console.log("[Dashboard] ✅ MySQL Shop Sync Result:", dbResult);
    } catch (dbErr) {
      console.error("[Dashboard] MySQL Shop Sync Error:", dbErr.message);
    }

  } catch (err) {
    console.error("[Dashboard Status] ❌ Fatal Error:", err.message);
  }

  // 5. Read Layout Files
  const blocksDir = path.join(process.cwd(), "extensions", "combo-templates", "blocks");
  let layoutFiles = [];
  try {
    if (fs.existsSync(blocksDir)) {
      layoutFiles = fs.readdirSync(blocksDir).filter((f) => f.endsWith(".liquid"));
    }
  } catch (e) {
    console.error("Error reading blocks directory:", e);
  }

  return json({ layoutFiles, shopName, isEnabled });
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

import { EnableThemeButton } from "../components/EnableThemeButton";

// ... inside Dashboard component ...
export default function Dashboard() {
  const { layoutFiles, shopName, isEnabled } = useLoaderData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [appStatus, setAppStatus] = useState(isEnabled);

  // Auto-initialize Backend Metafields on load
  useEffect(() => {
    console.log("[Dashboard] 🛠️ Ensuring App Configuration...");
    fetch("/api/toggle-app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true })
    }).catch(e => console.error("Auto-config failed", e));
  }, []);

  useEffect(() => {
    setAppStatus(isEnabled);
  }, [isEnabled]);


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


        {/* App Status Section */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="start">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">
                  {appStatus ? "✅ App Status: Active" : "🚀 Enable App in Your Theme"}
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  {appStatus
                    ? "The app is active and visible on your storefront."
                    : "To display combo pages, you must enable the app in the Theme Editor."}
                </Text>
              </BlockStack>
              <Badge tone={appStatus ? "success" : "attention"}>
                {appStatus ? "Active" : "Action Required"}
              </Badge>
            </InlineStack>

            <Divider />

            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">
                {appStatus ? "How to Disable:" : "How to Enable:"}
              </Text>
              <List type="number">
                <List.Item>Click the button below to open the Theme Editor.</List.Item>
                <List.Item>In "App Embeds", toggle "Make-a-combo" <strong>{appStatus ? "OFF" : "ON"}</strong>.</List.Item>
                <List.Item>Click "Save".</List.Item>
              </List>
            </BlockStack>

            <InlineStack align="center" gap="400">
              <EnableThemeButton
                shopName={shopName}
                children={appStatus ? "Disable App in Theme Editor" : "Enable App in Theme Editor"}
              />
            </InlineStack>

            <Card background="bg-surface-secondary">
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  💡 Note
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  If you change the setting in the Theme Editor, please refresh this dashboard to see the updated status.
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
