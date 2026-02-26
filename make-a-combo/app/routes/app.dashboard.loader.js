
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

    // 2. Primary check: Metafield
    // If the app_url metafield is set and not marked as disabled, the app is 'Configured'
    if (appUrlMetafied && appUrlMetafied !== "DISABLED" && appUrlMetafied !== "MISSING") {
        isEnabled = true;
    }

    // 3. Secondary check: Theme settings (Optional confirmation)
    // We already have isEnabled=true if metafield is there, but we can verify theme too
    if (activeTheme) {
      try {
        const themeId = activeTheme.id.replace('gid://shopify/Theme/', '');
        const assets = await admin.rest.resources.Asset.all({
          session: session,
          theme_id: themeId,
          asset: { key: "config/settings_data.json" },
        });

        if (assets && assets.length > 0 && assets[0].value) {
            const settingsData = JSON.parse(assets[0].value);
            const blocks = settingsData.current?.blocks || {};
            // If the block is explicitly disabled in the theme, we override isEnabled to false
            const appBlockKey = Object.keys(blocks).find(key => {
                const b = blocks[key];
                const type = b.type || "";
                return type.includes(EXTENSION_UUID) || type.includes("make-a-combo") || type.includes("combo-global");
            });
            
            if (appBlockKey && blocks[appBlockKey].disabled === true) {
                console.log("[Dashboard Loader] 🚫 App is explicitly DISABLED in theme settings.");
                isEnabled = false;
            }
        }
      } catch (e) {
         console.warn("[Dashboard Loader] Theme inspection failed, sticking with Metafield status.");
      }
    }

    // 4. Log to PHP
    console.log(`[Dashboard Loader] 📡 Final Status: ${isEnabled ? 'Enabled' : 'Disabled'}`);
    await sendToPhp({
      event: isEnabled ? "app_status_active" : "app_status_inactive",
      resource: "store_status_check",
      shop: shop,
      data: {
        shop_id: shopInfo.myshopifyDomain || shop,
        store_name: shopInfo.name,
        status: isEnabled ? "enabled" : "disabled",
        app_plan: appPlan,
        theme_name: activeThemeName,
        source: "dashboard_load"
      }
    });

  } catch (err) {
    console.error("[Dashboard Loader] ❌ Fatal Error:", err.message);
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
