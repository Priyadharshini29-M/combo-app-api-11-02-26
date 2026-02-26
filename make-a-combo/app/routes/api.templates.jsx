import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getDb, saveDb } from "../utils/api-helpers";
const BASE_PHP_URL = "https://61fb-103-130-204-117.ngrok-free.app/make-a-combo";

/**
 * Direct function to sync data to PHP without using helpers
 */
const syncToPhp = async (payload, endpoint = "templates.php") => {
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
        console.error(`[Templates API] Direct PHP Error (${endpoint}):`, error.message);
        throw error;
    }
};

/* =========================
   TEMPLATES API
========================= */

export const loader = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const handle = url.searchParams.get("handle");
    const shop = url.searchParams.get("shop");

    const db = getDb();
    const templates = db.templates || [];

    let responseData = {};
    let status = 200;

    try {
        /* ===== GET BY ID ===== */
        if (id) {
            const template = templates.find(t => String(t.id) === String(id));
            if (!template) {
                status = 404;
                responseData = { success: false, error: "Template not found" };
            } else {
                responseData = { success: true, data: template };
            }
        }

        /* ===== GET BY HANDLE ===== */
        else if (handle) {
            const template = templates.find(t => {
                const configHandle = (t.config?.collection_title || "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-");

                const titleHandle = t.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-");

                const searchHandle = handle.toLowerCase();

                return (
                    String(t.id) === searchHandle ||
                    configHandle === searchHandle ||
                    titleHandle === searchHandle ||
                    t.title.toLowerCase() === searchHandle ||
                    searchHandle.includes(t.title.toLowerCase()) ||
                    t.title.toLowerCase().includes(searchHandle)
                );
            });

            if (!template) {
                status = 404;
                responseData = { success: false, error: "No template matches this handle" };
            } else {
                responseData = { success: true, data: template };
            }
        }

        /* ===== GET ALL ===== */
        else {
            responseData = {
                success: true,
                message: "Templates fetched successfully",
                data: shop ? templates.filter(t => t.shop === shop) : templates,
            };
        }
    } catch (error) {
        console.error("[Templates API] Loader Error:", error);
        status = 500;
        responseData = { success: false, error: error.message };
    }

    return json(responseData, {
        status,
        headers: { "Access-Control-Allow-Origin": "*" },
    });
};

/* =========================
   ACTION
========================= */

export const action = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    let numericShopId = null;
    try {
        const shopIdQuery = await admin.graphql(`query { shop { id } }`);
        const shopIdJson = await shopIdQuery.json();
        const shopGid = shopIdJson.data?.shop?.id;
        numericShopId = shopGid ? shopGid.split('/').pop() : null;
    } catch (err) {
        console.error("[Templates API] ⚠️ Failed to fetch Shop ID:", err.message);
    }

    // Helper to fetch collection ID by title
    const fetchCollectionIdByTitle = async (title) => {
        if (!title || title === "Create Your Combo") return null;
        const query = `
            query CollectionId($query: String!) {
                collections(first: 1, query: $query) {
                    nodes {
                        id
                    }
                }
            }
        `;
        try {
            const response = await admin.graphql(query, {
                variables: { query: `title:"${title}"` }
            });
            const json = await response.json();

            if (json.errors) {
                console.error("[Templates API] ❌ GraphQL Errors (fetchCollectionIdByTitle):", JSON.stringify(json.errors, null, 2));
                return null;
            }

            const collectionId = json.data?.collections?.nodes?.[0]?.id || null;
            const numericId = collectionId ? collectionId.split('/').pop() : null;
            console.log(`[Templates API] 🔍 fetchCollectionIdByTitle result for "${title}":`, numericId);
            return numericId; // Return numeric ID for database compatibility
        } catch (error) {
            console.error("[Templates API] ❌ Exception in fetchCollectionIdByTitle:", error);
            return null;
        }
    };

    // Helper to fetch collection ID by handle
    const fetchCollectionIdByHandle = async (handle) => {
        if (!handle) return null;
        const query = `#graphql
            query CollectionByHandle($handle: String!) {
              collectionByHandle(handle: $handle) {
                id
              }
            }
        `;
        try {
            const response = await admin.graphql(query, { variables: { handle } });
            const responseJson = await response.json();
            const collectionId = responseJson.data?.collectionByHandle?.id || null;
            const numericId = collectionId ? collectionId.split('/').pop() : null;
            return numericId;
        } catch (e) {
            return null;
        }
    };


    // Helper to fetch collection products
    const fetchCollectionProducts = async (collectionId) => {
        if (!collectionId) return [];

        // Ensure GID format
        const gid = collectionId.startsWith("gid://")
            ? collectionId
            : `gid://shopify/Collection/${collectionId}`;

        const query = `#graphql
            query ProductsInCollection($id: ID!, $first: Int!) {
              collection(id: $id) {
                id
                title
                handle
                products(first: $first) {
                  nodes {
                    id
                    title
                    handle
                    status
                    featuredMedia {
                      preview {
                        image {
                          url
                        }
                      }
                    }
                    variants(first: 1) {
                      nodes {
                        price
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
        `;

        try {
            const response = await admin.graphql(query, {
                variables: { id: gid, first: 50 }
            });
            const json = await response.json();

            if (json.errors) {
                console.error("[Templates API] ❌ GraphQL Errors (fetchCollectionProducts):", JSON.stringify(json.errors, null, 2));
                return [];
            }

            if (!json.data?.collection) {
                console.warn(`[Templates API] ⚠️ Collection not found for GID: ${gid}`);
                return [];
            }

            const products = json.data.collection.products?.nodes || [];
            console.log(`[Templates API] 📦 Fetched ${products.length} products for collection ${json.data.collection.title} (${gid})`);

            return products.map(p => ({
                id: p.id,
                title: p.title,
                handle: p.handle,
                status: p.status,
                price: p.variants?.nodes?.[0]?.price || "0.00",
                image: p.featuredMedia?.preview?.image?.url || ""
            }));
        } catch (error) {
            console.error("[Templates API] ❌ Exception in fetchCollectionProducts:", error);
            return [];
        }
    };

    const db = getDb();
    let templates = db.templates || [];
    const discounts = db.discounts || [];

    // Handle both FormData and JSON
    let body = {};
    try {
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            body = await request.json();
        } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await request.formData();
            const bodyStr = formData.get("body");
            if (bodyStr) {
                body = JSON.parse(bodyStr);
            }
        } else {
            // Try JSON as fallback
            body = await request.json();
        }

        console.log("[Templates API] Received request:", {
            contentType,
            action: body.action,
            resource: body.resource
        });
    } catch (e) {
        console.error("[Templates API] Body parse error:", e);
        return json(
            { success: false, error: "Invalid request body" },
            { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
    }

    const { action: actionType, id, data, publishParams } = body;
    let result = null;
    let message = "";

    try {
        /* ===== CREATE ===== */
        if (actionType === "create") {
            if (!data?.config?.layout) {
                throw new Error("Invalid configuration: Missing Layout");
            }

            // 1. Resolve Collection ID if missing
            if (!data.config?.collection_id) {
                console.log(`[Templates API] 🔍 Attempting auto-resolution of Collection ID...`);

                // Fallback 1: Use collection_title if valid
                if (data.config?.collection_title && data.config.collection_title !== "Create Your Combo") {
                    const resolvedId = await fetchCollectionIdByTitle(data.config.collection_title);
                    if (resolvedId) data.config.collection_id = resolvedId;
                }

                // Fallback 2: Check common layout handles if ID still missing
                if (!data.config?.collection_id) {
                    const firstHandle = data.config?.step_1_collection || data.config?.col_1 || data.config?.collection_handle;
                    if (firstHandle) {
                        const resolvedId = await fetchCollectionIdByHandle(firstHandle);
                        if (resolvedId) data.config.collection_id = resolvedId;
                    }
                }
            }

            // 2. Fetch products if collection_id exists (or was just resolved)
            let productList = data.product_list || [];
            if (data.config?.collection_id) {
                console.log(`[Templates API] 📦 Fetching products for collection: ${data.config.collection_id}`);
                const collectionProducts = await fetchCollectionProducts(data.config.collection_id);
                if (collectionProducts.length > 0) {
                    productList = collectionProducts;
                }
            }

            // Resolve Discount if ID provided
            let discountId = data.discount_id || data.config?.selected_discount_id || null;
            let discountCode = null;

            if (discountId) {
                const discount = discounts.find(d => String(d.id) === String(discountId));
                if (discount) {
                    discountId = discount.id;
                    discountCode = discount.code;
                } else {
                    // Keep the ID even if not found locally, but code will be null
                    // This handles cases where ID exists in frontend/config but maybe not synced yet? 
                    // Or simply to respect the input.
                }
            }

            // Prepare the final template for local storage
            const newTemplate = {
                id: Math.max(...templates.map(t => t.id), 0) + 1,
                ...data,
                discount_id: discountId,
                discount_code: discountCode,
                product_list: productList,
                shop,
                active: data.active || false,
                createdAt: new Date().toISOString(),
            };

            console.log("[Templates API] ✨ Creating template:", {
                id: newTemplate.id,
                title: newTemplate.title,
                shop,
                productsCount: productList.length
            });

            templates.unshift(newTemplate);
            db.templates = templates;
            saveDb(db);

            console.log("[Templates API] ✅ Template saved to fake_db.json");

            result = newTemplate;
            message = "Template created successfully";

            // Prepare the payload for MySQL (matching documentation schema)
            const syncPayload = {
                event: "create",
                resource: "templates",
                shop: shop, // Domain for reference
                data: {
                    id: String(newTemplate.id),
                    shop_id: numericShopId || shop, // Original numeric ID or domain
                    shop: shop, // Explicitly add shop domain inside data for templates.php validation
                    title: newTemplate.title,
                    layout_type: data.config?.layout || "layout1",
                    source: {
                        collection_id: data.config?.collection_id,
                        resolved: true
                    },
                    products: productList, // Use 'products' key for templates.php
                    product_list: productList, // Keep 'product_list' for DB consistency
                    config: data.config,
                    active: data.active || false, // Use 'active' key for templates.php
                    is_active: data.active ? 1 : 0,
                    discount_code: newTemplate.discount_code,
                    discount_id: newTemplate.discount_id,
                    page_url: data.page_url || (publishParams?.handle ? publishParams.handle : null)
                }
            };

            console.log("[Templates API] 📤 Synchronizing data to PHP...");

            try {
                const dbResult = await syncToPhp(syncPayload, "templates.php");
                console.log("[Templates API] ✅ MySQL Save Result:", dbResult);
            } catch (dbError) {
                console.error("[Templates API] ❌ MySQL save failed:", dbError.message);
            }
        }

        /* ===== UPDATE ===== */
        else if (actionType === "update") {
            const index = templates.findIndex(t => String(t.id) === String(id));
            if (index === -1) throw new Error("Template not found");

            console.log("[Templates API] 🔄 Updating template:", { id, title: templates[index].title });

            // 1. Resolve Collection ID if missing
            if (!data.config?.collection_id) {
                if (data.config?.collection_title && data.config.collection_title !== "Create Your Combo") {
                    const resolvedId = await fetchCollectionIdByTitle(data.config.collection_title);
                    if (resolvedId) {
                        if (!data.config) data.config = {};
                        data.config.collection_id = resolvedId;
                    }
                }

                if (!data.config?.collection_id) {
                    const firstHandle = data.config?.step_1_collection || data.config?.col_1 || data.config?.collection_handle;
                    if (firstHandle) {
                        const resolvedId = await fetchCollectionIdByHandle(firstHandle);
                        if (resolvedId) {
                            if (!data.config) data.config = {};
                            data.config.collection_id = resolvedId;
                        }
                    }
                }
            }

            let productList = data.product_list || templates[index].product_list || [];

            // Resolve Discount if ID provided or existing
            let discountId = data.discount_id || data.config?.selected_discount_id;

            // If not provided in data, fall back to existing template value
            if (discountId === undefined) {
                discountId = templates[index].discount_id;
            }

            let discountCode = templates[index].discount_code;

            if (discountId) {
                const discount = discounts.find(d => String(d.id) === String(discountId));
                if (discount) {
                    discountId = discount.id;
                    discountCode = discount.code;
                } else {
                    // If provided ID is explicitly new but not found, code becomes null
                    if (data.discount_id || data.config?.selected_discount_id) {
                        discountCode = null;
                    }
                }
            } else {
                discountCode = null;
                discountId = null; // Ensure ID is null if cleared
            }

            // If collection ID present, update products
            if (data.config?.collection_id) {
                console.log(`[Templates API] 📦 Fetching products for collection (Update): ${data.config.collection_id}`);
                const collectionProducts = await fetchCollectionProducts(data.config.collection_id);
                if (collectionProducts.length > 0) {
                    productList = collectionProducts;
                }
            }

            templates[index] = {
                ...templates[index],
                ...data,
                product_list: productList,
                discount_id: discountId,
                discount_code: discountCode
            };
            db.templates = templates;
            saveDb(db);

            result = templates[index];
            message = "Template updated successfully";

            // Prepare the payload for MySQL Update
            const syncPayload = {
                event: "update",
                resource: "templates",
                shop: shop, // Domain for reference
                data: {
                    id: String(result.id),
                    shop_id: numericShopId || shop,
                    shop: shop, // Added for templates.php validation
                    title: result.title,
                    layout_type: result.config?.layout || "layout1",
                    source: {
                        collection_id: result.config?.collection_id,
                        updated: true
                    },
                    products: productList, // For PHP
                    product_list: productList, // For DB
                    config: result.config,
                    active: result.active || false, // For PHP
                    is_active: result.active ? 1 : 0,
                    discount_code: result.discount_code,
                    discount_id: result.discount_id,
                    page_url: data.page_url || (publishParams?.handle ? publishParams.handle : result.page_url)
                }
            };

            console.log("[Templates API] 📤 Synchronizing update to PHP...");

            try {
                const dbResult = await syncToPhp(syncPayload, "templates.php");
                console.log("[Templates API] ✅ MySQL Update Result:", dbResult);
            } catch (dbError) {
                console.error("[Templates API] ❌ MySQL update failed:", dbError.message);
            }
        }

        /* ===== DELETE ===== */
        else if (actionType === "delete") {
            console.log("[Templates API] 🗑️ Deleting template:", { id });

            db.templates = templates.filter(t => String(t.id) !== String(id));
            saveDb(db);

            message = "Template deleted successfully";

            console.log("[Templates API] 📤 Synchronizing delete to PHP...");



            // 2. Delete from MySQL via templates.php (Directly)
            try {
                const dbResult = await syncToPhp({
                    event: "delete",
                    resource: "templates",
                    shop: shop, // Use domain
                    id,
                }, "templates.php");
                console.log("[Templates API] ✅ MySQL Delete Result:", dbResult);
            } catch (dbError) {
                console.error("[Templates API] ❌ MySQL delete failed:", dbError.message);
            }
        }

        return json(
            { success: true, message, data: result },
            { headers: { "Access-Control-Allow-Origin": "*" } }
        );
    } catch (error) {
        console.error("[Templates API] Error:", error);
        return json(
            { success: false, error: error.message },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
        );
    }
};
