import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { sendToPhp } from "../utils/api-helpers";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
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

    try {
        // Use unified helper to avoid ngrok URL mismatches
        const result = await sendToPhp({
            event: "merchant_sync",
            resource: "shop",
            shop: shop,
            data: shopData
        });

        console.log("[Shophandler] ✅ PHP Webhook Response:", result);

        return json({ status: "success", data: result });
    } catch (error) {
        console.error("[Shophandler] ❌ Error forwarding data:", error.message);
        return json({ status: "error", message: error.message }, { status: 500 });
    }
};

export const loader = () => {
    return json({ message: "This is a POST-only route" });
};
