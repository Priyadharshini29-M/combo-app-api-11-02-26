import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getDb, saveDb, sendToPhp } from "../utils/api-helpers";

/* =========================
   DISCOUNTS API
   Handles: GET, CREATE, UPDATE, DELETE
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
    const shop = url.searchParams.get("shop");
    const db = getDb();
    const discounts = db.discounts || [];

    let responseData = {};
    let status = 200;

    try {
        // Get single discount by ID
        if (id) {
            const discount = discounts.find(d => String(d.id) === String(id));
            if (discount) {
                responseData = { success: true, data: discount };
            } else {
                responseData = { success: false, error: "Discount not found" };
                status = 404;
            }
        }
        // Get all discounts (optionally filtered by shop)
        else {
            const filtered = shop
                ? discounts.filter(d => d.shop === shop)
                : discounts;

            responseData = {
                success: true,
                message: "Discounts fetched successfully",
                data: filtered
            };
        }
    } catch (error) {
        console.error("[Discounts API] Loader Error:", error);
        responseData = { success: false, error: error.message };
        status = 500;
    }

    return json(responseData, {
        status,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    });
};

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
    const db = getDb();

    let body = {};
    try {
        body = await request.json();
    } catch (e) {
        console.error("[Discounts API] Body parse error:", e);
    }

    const { action: actionType, id, data } = body;
    let discounts = db.discounts || [];
    let result = null;
    let message = "";

    try {
        /* ========= CREATE ========= */
        if (actionType === "create") {
            let shopifyDiscountId = null;

            // Prepare Shopify GraphQL Mutation
            if (data && ['percentage', 'fixed', 'amount'].includes(data.type) && (!data.conditions || data.conditions === 'all_products')) {
                try {
                    const isPercentage = data.type === 'percentage';
                    const discountValue = parseFloat(data.value);
                    const mutation = `#graphql
                        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
                            discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                                codeDiscountNode {
                                    id
                                    codeDiscount {
                                        ... on DiscountCodeBasic {
                                            title
                                            codes(first: 1) {
                                                nodes {
                                                    code
                                                }
                                            }
                                        }
                                    }
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `;

                    let minimumRequirement = null;
                    if (data.minRequirementType === 'amount' && data.minRequirementValue) {
                        minimumRequirement = { subtotal: { greaterThanOrEqualToSubtotal: parseFloat(data.minRequirementValue) } };
                    } else if (data.minRequirementType === 'quantity' && data.minRequirementValue) {
                        minimumRequirement = { quantity: { greaterThanOrEqualToQuantity: parseInt(data.minRequirementValue) } };
                    }

                    const combinations = data.combinations || {};

                    const variables = {
                        basicCodeDiscount: {
                            title: data.title,
                            code: data.code,
                            startsAt: new Date().toISOString(),
                            endsAt: data.endDate ? new Date(data.endDate).toISOString() : null,
                            customerGets: {
                                value: isPercentage
                                    ? { percentage: discountValue / 100 }
                                    : { discountAmount: { amount: discountValue, appliesOnEachItem: false } },
                                items: {
                                    all: true
                                }
                            },
                            customerSelection: {
                                all: true
                            },
                            usageLimit: data.maxUsage ? parseInt(data.maxUsage) : null,
                            appliesOncePerCustomer: data.oncePerCustomer === true,
                            minimumRequirement: minimumRequirement,
                            combinesWith: {
                                orderDiscounts: combinations.order || false,
                                productDiscounts: combinations.product || false,
                                shippingDiscounts: combinations.shipping || false
                            }
                        }
                    };

                    const response = await admin.graphql(mutation, { variables });
                    const responseJson = await response.json();

                    if (responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
                        console.error("[Discounts API] Shopify Creation Errors:", responseJson.data.discountCodeBasicCreate.userErrors);
                        // We continue so we don't break the local flow, but ideally return error
                    } else if (responseJson.data?.discountCodeBasicCreate?.codeDiscountNode) {
                        shopifyDiscountId = responseJson.data.discountCodeBasicCreate.codeDiscountNode.id;
                    }
                } catch (err) {
                    console.error("[Discounts API] Shopify Creation Failed:", err);
                }
            }

            const newDiscount = {
                id: Math.max(...discounts.map(d => d.id), 0) + 1,
                shopifyId: shopifyDiscountId,
                ...data, // includes utility fields: eligibility, minRequirement*, combinations, etc.
                shop,
                usage: "0 / " + (data.maxUsage || "Unlimited"),
                created: new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }),
                createdAt: new Date().toISOString(),
            };

            discounts.unshift(newDiscount);
            db.discounts = discounts;
            saveDb(db);

            result = newDiscount;
            message = "Discount created successfully";

            await sendToPhp({
                event: "create",
                resource: "discounts",
                shop,
                data: newDiscount,
            });
        }

        /* ========= UPDATE ========= */
        else if (actionType === "update") {
            const index = discounts.findIndex(d => String(d.id) === String(id));
            if (index === -1) throw new Error("Discount not found");

            discounts[index] = { ...discounts[index], ...data };
            db.discounts = discounts;
            saveDb(db);

            result = discounts[index];
            message = "Discount updated successfully";

            await sendToPhp({
                event: "update",
                resource: "discounts",
                shop,
                data: result,
            });
        }

        /* ========= DELETE ========= */
        else if (actionType === "delete") {
            db.discounts = discounts.filter(d => String(d.id) !== String(id));
            saveDb(db);

            message = "Discount deleted successfully";

            await sendToPhp({
                event: "delete",
                resource: "discounts",
                shop,
                id,
            });
        }

        return json(
            { success: true, message, data: result },
            { headers: { "Access-Control-Allow-Origin": "*" } }
        );

    } catch (error) {
        console.error("[Discounts API] Error:", error);
        return json(
            { success: false, error: error.message },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
        );
    }
};
