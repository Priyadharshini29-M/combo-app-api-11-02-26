import { json } from "@remix-run/node";
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
        console.error(`[Shophandler API] Direct PHP Error (${endpoint}):`, error.message);
        throw error;
    }
};

export const action = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    // Support both JSON and FormData
    let shopData = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        shopData = await request.json();
    } else {
        const formData = await request.formData();
        shopData = Object.fromEntries(formData);
    }

    console.log(`[Shophandler] 📥 Data Received for ${shop}:`, JSON.stringify(shopData, null, 2));

    let numericShopId = null;
    try {
        const shopIdQuery = await admin.graphql(`query { shop { id } }`);
        const shopIdJson = await shopIdQuery.json();
        const shopGid = shopIdJson.data?.shop?.id;
        numericShopId = shopGid ? shopGid.split('/').pop() : null;
    } catch (err) {
        console.error("[Shophandler] ⚠️ Failed to fetch Shop ID:", err.message);
    }

    try {
        const status = shopData.status || "disabled";

        // Prepare the shop data payload
        const shopPayload = {
            shop_id: numericShopId || shopData.shop_id || shop,
            store_name: shopData.store_name || shop.replace('.myshopify.com', ''),
            status: status,
            app_plan: shopData.app_plan || "Free",
            theme_name: shopData.theme_name || "N/A",
            last_source: "app_load_sync",
            updated_at: formatToIST()
        };

        let logResult = {};

        // Send to shop.php for MySQL database storage (Direct)
        let dbResult = {};
        try {
            dbResult = await syncToPhp({
                event: "shop_sync",
                resource: "shop",
                shop: shop,
                data: shopPayload
            }, "shop.php");
        } catch (e) { }

        console.log("[Shophandler] ✅ MySQL Database (shop.php) Response:", dbResult);

        return json({
            status: "success",
            data: {
                log: logResult,
                database: dbResult
            }
        });
    } catch (error) {
        console.error("[Shophandler] ❌ Error forwarding data:", error.message);
        return json({ status: "error", message: error.message }, { status: 500 });
    }
};

export const loader = () => {
    return json({ message: "This is a POST-only route" });
};
