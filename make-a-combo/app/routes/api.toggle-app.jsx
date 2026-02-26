import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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
    console.error(`[Toggle API] Direct PHP Error (${endpoint}):`, error.message);
    throw error;
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { enabled } = body;
  const rawAppUrl = process.env.SHOPIFY_APP_URL || "";
  const APP_URL = rawAppUrl.replace(/\/$/, ""); // Normalize: remove trailing slash

  // Helper for IST Time
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

  try {
    if (enabled) {
      console.log(`[Toggle API] 🟢 Enabling app for ${shop}`);

      // 1. Metafield Management ONLY (No ScriptTags)
      // Theme App Extensions rely on metafields to find the script URL.
      console.log(`[Toggle API] 📌 Syncing Metafield app_url: ${APP_URL}`);
      try {
        const shopIdQuery = await admin.graphql(`query { shop { id } }`);
        const shopIdJson = await shopIdQuery.json();
        const shopId = shopIdJson.data?.shop?.id;

        if (shopId) {
          await admin.graphql(
            `#graphql
              mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  metafields { id key value }
                  userErrors { field message }
                }
              }
            `,
            {
              variables: {
                metafields: [
                  {
                    namespace: "make_a_combo",
                    key: "app_url",
                    type: "single_line_text_field",
                    value: APP_URL,
                    ownerId: shopId,
                  },
                ],
              },
            }
          );
        }
      } catch (mfErr) {
        console.error(`[Toggle API] ⚠️ Metafield Sync Failed: ${mfErr.message}`);
      }

      // Fetch Shop Data for Webhook
      const shopQuery = `
        query {
          shop { id name createdAt myshopifyDomain plan { displayName } }
          themes(first: 50) { nodes { name role } }
          currentAppInstallation { activeSubscriptions { name status } }
        }
      `;
      const shopRes = await admin.graphql(shopQuery);
      const shopDataJson = await shopRes.json();
      const shopData = shopDataJson.data?.shop || {};
      const numericShopId = shopData.id ? shopData.id.split('/').pop() : null;
      const themes = shopDataJson.data?.themes?.nodes || [];
      const subscriptions = shopDataJson.data?.currentAppInstallation?.activeSubscriptions || [];

      const activeTheme = themes.find((t) => t.role === "MAIN") || themes[0];
      const appPlan = subscriptions.length > 0 ? subscriptions[0].name : "Free";

      const payload = {
        shop_id: numericShopId || shopData.myshopifyDomain || shop,
        domain: shopData.myshopifyDomain,
        store_name: shopData.name,
        status: "enabled",
        app_plan: appPlan,
        shopify_plan: shopData.plan?.displayName || "N/A",
        theme_name: activeTheme?.name || "N/A",
        updated_at: formatToIST(),
        source: "manual_toggle"
      };



      // Sync to MySQL (Direct)
      try {
        const dbResult = await syncToPhp({
          event: "shop_sync",
          resource: "shop",
          shop: shop,
          data: payload
        }, "shop.php");
        console.log("[Toggle API] ✅ MySQL Shop Sync Result (Enabled):", dbResult);
      } catch (dbErr) {
        console.error("[Toggle API] MySQL Shop Sync Error (Enabled):", dbErr.message);
      }

      return json({ success: true, status: "enabled", data: payload });

    } else {
      console.log(`[Toggle API] 🔴 Disabling app for ${shop}`);

      // 1. Metafield Management - CLEAR app_url
      // This effectively kills the script injection in combo-global.liquid
      try {
        const shopIdQuery = await admin.graphql(`query { shop { id } }`);
        const shopIdJson = await shopIdQuery.json();
        const shopId = shopIdJson.data?.shop?.id;
        const numericShopId = shopId ? shopId.split('/').pop() : null;

        if (shopId) {
          await admin.graphql(
            `#graphql
              mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  metafields { id key value }
                  userErrors { field message }
                }
              }`,
            {
              variables: {
                metafields: [
                  {
                    namespace: "make_a_combo",
                    key: "app_url",
                    type: "single_line_text_field",
                    value: "DISABLED", // Explicit disabled value
                    ownerId: shopId,
                  },
                ],
              },
            }
          );
        }
      } catch (mfErr) {
        console.error(`[Toggle API] ⚠️ Metafield Clear Failed: ${mfErr.message}`);
      }

      const payload = {
        shop_id: numericShopId || shop,
        status: "disabled",
        updated_at: formatToIST(),
        source: "manual_toggle"
      };



      // Sync to MySQL (Direct)
      try {
        const dbResult = await syncToPhp({
          event: "shop_sync",
          resource: "shop",
          shop: shop,
          data: payload
        }, "shop.php");
        console.log("[Toggle API] ✅ MySQL Shop Sync Result (Disabled):", dbResult);
      } catch (dbErr) {
        console.error("[Toggle API] MySQL Shop Sync Error (Disabled):", dbErr.message);
      }

      return json({ success: true, status: "disabled", data: payload });
    }
  } catch (error) {
    console.error("[Toggle API] ❌ Critical Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export const loader = () => json({ message: "Use POST to toggle app" });
