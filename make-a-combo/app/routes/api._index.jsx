import { json } from "@remix-run/node";
import { getDb } from "../utils/api-helpers";

// This endpoint serves JSON data to the storefront via App Proxy
// URL will be: /apps/combo/templates
export const loader = async ({ request }) => {
    // CORS Headers for storefront access
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");
    const handle = url.searchParams.get("handle");

    try {
        const db = await getDb(shopDomain);
        const templates = db.templates || [];

        // Send back only active templates for this shop
        let shopTemplates = templates.filter(t => t.active && t.shop === shopDomain);

        // Optional: Filter by specific handle if provided
        if (handle) {
            const search = handle.toLowerCase();
            const matched = shopTemplates.find(t => {
                const title = t.title.toLowerCase();
                const configHandle = (t.config?.collection_title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const pageUrl = (t.page_url || t.source?.page_url || '').trim().toLowerCase();
                return pageUrl === search || String(t.id) === search || title === search || configHandle === search;
            });
            // If we found a specific match, prioritize it by making it the first element
            if (matched) {
                shopTemplates = [matched, ...shopTemplates.filter(t => t.id !== matched.id)];
            }
        }

        return json({
            success: true,
            templates: shopTemplates
        }, { headers: corsHeaders });

    } catch (error) {
        console.error("[App Proxy] Error fetching templates:", error);
        return json({
            success: false,
            error: "Failed to fetch templates"
        }, { status: 500, headers: corsHeaders });
    }
};
