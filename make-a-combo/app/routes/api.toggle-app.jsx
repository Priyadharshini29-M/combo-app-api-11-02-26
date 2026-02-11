import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { sendToPhp } from "../utils/api-helpers";

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
  const SCRIPT_URL = `${APP_URL}/combo-builder-loader.js`;

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

      // 1. ScriptTag Management
      const getScriptTags = await admin.graphql(`
        query {
          scriptTags(first: 50) {
            nodes {
              id
              src
            }
          }
        }
      `);
      const scriptTagsJson = await getScriptTags.json();
      const scriptNodes = scriptTagsJson.data?.scriptTags?.nodes || [];

      // Protocol-agnostic URL check
      const normalizedTarget = SCRIPT_URL.replace(/^https?:/, "");
      const existing = scriptNodes.find(s => s.src.replace(/^https?:/, "") === normalizedTarget);

      if (!existing) {
        console.log(`[Toggle API] 📝 Creating ScriptTag: ${SCRIPT_URL}`);
        const createRes = await admin.graphql(`
          mutation scriptTagCreate($input: ScriptTagInput!) {
            scriptTagCreate(input: $input) {
              scriptTag {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            input: {
              src: SCRIPT_URL,
              displayScope: "ALL"
            }
          }
        });
        const createJson = await createRes.json();
        if (createJson.data?.scriptTagCreate?.userErrors?.length > 0) {
          console.error("[Toggle API] ❌ ScriptTag Creation Errors:", createJson.data.scriptTagCreate.userErrors);
        }
      }

      // 2. Metafield Management (Ensures Theme Extension can find the App URL)
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
                        }`,
            {
              variables: {
                metafields: [
                  {
                    namespace: "make_a_combo",
                    key: "app_url",
                    value: APP_URL,
                    type: "single_line_text_field",
                    ownerId: shopId
                  }
                ],
              },
            }
          );
        }
      } catch (mfErr) {
        console.error("[Toggle API] ❌ Metafield Sync Failed:", mfErr);
      }

      // 3. Fetch Shop Data for Webhook (Comprehensive Query)
      const shopQuery = `
        query {
          shop {
            id
            name
            createdAt
            myshopifyDomain
            plan { displayName }
          }
          themes(first: 50) {
            nodes { name role }
          }
          currentAppInstallation {
            activeSubscriptions {
              name
              status
            }
          }
        }
      `;
      const shopRes = await admin.graphql(shopQuery);
      const shopDataJson = await shopRes.json();

      const shopInfo = shopDataJson.data?.shop || {};
      const themes = shopDataJson.data?.themes?.nodes || [];
      const subscriptions = shopDataJson.data?.currentAppInstallation?.activeSubscriptions || [];

      const activeTheme = themes.find(t => t.role === "MAIN") || themes[0];
      const appPlan = subscriptions.length > 0 ? subscriptions[0].name : "Free";

      const payload = {
        id: shopInfo.id || "N/A",
        shop_id: shopInfo.myshopifyDomain || shop,
        domain: shopInfo.myshopifyDomain,
        store_name: shopInfo.name,
        created_at: formatToIST(shopInfo.createdAt),
        theme_name: activeTheme?.name || "N/A",
        updated_at: formatToIST(),
        installed: "active",
        status: "enabled",
        app_plan: appPlan,
        shopify_plan: shopInfo.plan?.displayName || "N/A",
        source: "manual_toggle"
      };

      // 3. Send to PHP Webhook
      await sendToPhp({
        event: "app_enabled",
        resource: "store_config",
        shop: shop,
        data: payload
      });

      return json({ success: true, status: "enabled", data: payload });

    } else {
      console.log(`[Toggle API] 🔴 Disabling app for ${shop}`);

      // 1. Remove ScriptTag
      const getScriptTags = await admin.graphql(`
        query {
          scriptTags(first: 50) {
            nodes {
              id
              src
            }
          }
        }
      `);
      const scriptTagsJson = await getScriptTags.json();
      const scriptNodes = scriptTagsJson.data?.scriptTags?.nodes || [];

      // Protocol-agnostic URL check
      const normalizedTarget = SCRIPT_URL.replace(/^https?:/, "");
      const existing = scriptNodes.find(s => s.src.replace(/^https?:/, "") === normalizedTarget);

      if (existing) {
        console.log(`[Toggle API] 🗑️ Deleting ScriptTag: ${existing.id}`);
        await admin.graphql(`
          mutation scriptTagDelete($id: ID!) {
            scriptTagDelete(id: $id) {
              deletedScriptTagId
              userErrors { field message }
            }
          }
        `, { variables: { id: existing.id } });
      }

      // 2. Clear Metafield (Ensures Theme Extension stops injecting)
      console.log(`[Toggle API] 📌 Clearing Metafield app_url for ${shop}`);
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
              }
            }`,
            {
              variables: {
                metafields: [
                  {
                    namespace: "make_a_combo",
                    key: "app_url",
                    value: "MISSING",
                    type: "single_line_text_field",
                    ownerId: shopId
                  }
                ],
              },
            }
          );
        }
      } catch (mfErr) {
        console.error("[Toggle API] ❌ Disable Metafield Error:", mfErr);
      }

      const payload = {
        shop_id: shop,
        status: "disabled",
        updated_at: formatToIST(),
        source: "manual_toggle"
      };

      // 2. Send to PHP Webhook
      await sendToPhp({
        event: "app_disabled",
        resource: "store_config",
        shop: shop,
        data: payload
      });

      return json({ success: true, status: "disabled", data: payload });
    }
  } catch (error) {
    console.error("[Toggle API] ❌ Critical Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export const loader = () => json({ message: "Use POST to toggle app" });
