import { Link, Outlet, useLoaderData, useRouteError, useFetcher } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import globalStyles from "../global.css?url";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: globalStyles },
];

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Unified GraphQL Query for Shop, Themes, and App Subscriptions
  const query = `
    query {
      shop {
        id
        name
        createdAt
        myshopifyDomain
        plan {
          displayName
        }
      }
      themes(first: 50) {
        nodes {
          name
          role
        }
      }
      currentAppInstallation {
        activeSubscriptions {
          name
          status
        }
      }
      scriptTags(first: 50) {
        nodes {
          src
        }
      }
    }
  `;

  let shop = {};
  let themes = [];
  let subscriptions = [];
  let shopInfo = {};

  try {
    const response = await admin.graphql(query);
    const jsonResponse = await response.json();
    const data = jsonResponse.data;

    if (jsonResponse.errors) {
      console.error("GraphQL Errors in loader:", jsonResponse.errors);
    }

    shop = data?.shop || {};
    themes = data?.themes?.nodes || [];
    subscriptions = data?.currentAppInstallation?.activeSubscriptions || [];

    const activeTheme = themes.find((t) => t.role === "MAIN") || themes[0];
    const appPlan = subscriptions.length > 0 ? subscriptions[0].name : "Free";

    // Format Date to IST
    const formatToIST = (dateString = null) => {
      const date = dateString ? new Date(dateString) : new Date();
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    const APP_URL = process.env.SHOPIFY_APP_URL || "";
    const SCRIPT_URL = `${APP_URL}/combo-builder-loader.js`;
    const scriptTags = data?.scriptTags?.nodes || [];
    const isEnabled = !!scriptTags.find(s => s.src === SCRIPT_URL);

    // Proactive Sync: Ensure the App URL metafield is always up to date
    // This solves the issue of stale ngrok URLs in the storefront
    if (APP_URL && shop.id) {
      try {
        await admin.graphql(
          `#graphql
          mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { key value }
            }
          }`,
          {
            variables: {
              metafields: [
                {
                  namespace: "make_a_combo",
                  key: "app_url",
                  value: APP_URL,
                  type: "single_line_text_field",
                  ownerId: shop.id
                }
              ],
            },
          }
        );
      } catch (e) {
        console.error("Auto-sync metafield failed:", e);
      }
    }

    shopInfo = {
      id: shop.id || "N/A",
      shop_id: shop.myshopifyDomain || "N/A",
      created_at: formatToIST(shop.createdAt),
      theme_name: activeTheme?.name || "Access Denied (Theme scope)",
      updated_at: formatToIST(),
      installed: "active",
      status: isEnabled ? "enabled" : "disabled",
      uninstalled: false,
      app_plan: appPlan,
      shopify_plan: shop.plan?.displayName || "N/A"
    };
  } catch (error) {
    console.error("Critical error in loader:", error);
    shopInfo = { error: "Failed to fetch merchant data" };
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "", shopInfo };
};


export default function App() {
  const { apiKey, shopInfo } = useLoaderData();
  const fetcher = useFetcher();
  const lastSyncedStatus = useRef(null);

  useEffect(() => {
    if (shopInfo && fetcher.state === "idle") {
      // Re-sync if it's the first time OR if the status has changed (e.g. after a toggle)
      if (lastSyncedStatus.current !== shopInfo.status) {
        console.log(`📤 [Sync] Status changed to ${shopInfo.status}. Sending to Shophandler...`);
        fetcher.submit(shopInfo, { method: "POST", action: "/api/shophandler" });
        lastSyncedStatus.current = shopInfo.status;
      }
    }
  }, [shopInfo, fetcher]);

  // Log the response from the PHP script
  useEffect(() => {
    if (fetcher.data) {
      console.log("📥 Response from PHP Webhook:", fetcher.data);
    }
  }, [fetcher.data]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <NavMenu>
          <Link to="/app" rel="home" prefetch="intent">
            Home
          </Link>
          <Link to="/app/dashboard" prefetch="intent">
            Dashboard
          </Link>
          <Link to="/app/customize" prefetch="intent">
            Customize Template
          </Link>
          <Link to="/app/templates" prefetch="intent">
            Templates
          </Link>
          <Link to="/app/discountengine" prefetch="intent">
            Discount Engine
          </Link>
          <Link to="/app/plan" prefetch="intent">
            Subscription Plan
          </Link>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
