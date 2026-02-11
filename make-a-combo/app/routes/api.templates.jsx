import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getDb, saveDb, sendToPhp } from "../utils/api-helpers";

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

    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const db = getDb();
    let templates = db.templates || [];

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

    const { action: actionType, id, data } = body;
    let result = null;
    let message = "";

    try {
        /* ===== CREATE ===== */
        if (actionType === "create") {
            if (!data?.config?.layout) {
                throw new Error("Invalid configuration: Missing Layout");
            }

            const newTemplate = {
                id: Math.max(...templates.map(t => t.id), 0) + 1,
                ...data,
                shop,
                active: false,
                createdAt: new Date().toISOString(),
            };

            console.log("[Templates API] ✨ Creating template:", {
                id: newTemplate.id,
                title: newTemplate.title,
                shop
            });

            templates.unshift(newTemplate);
            db.templates = templates;
            saveDb(db);

            console.log("[Templates API] ✅ Template saved to fake_db.json");

            result = newTemplate;
            message = "Template created successfully";

            console.log("[Templates API] 📤 Calling PHP webhook...");
            await sendToPhp({
                event: "create",
                resource: "templates",
                shop,
                data: newTemplate,
            });
        }

        /* ===== UPDATE ===== */
        else if (actionType === "update") {
            const index = templates.findIndex(t => String(t.id) === String(id));
            if (index === -1) throw new Error("Template not found");

            console.log("[Templates API] 🔄 Updating template:", { id, title: templates[index].title });

            templates[index] = { ...templates[index], ...data };
            db.templates = templates;
            saveDb(db);

            result = templates[index];
            message = "Template updated successfully";

            console.log("[Templates API] 📤 Calling PHP webhook for update...");
            await sendToPhp({
                event: "update",
                resource: "templates",
                shop,
                data: result,
            });
        }

        /* ===== DELETE ===== */
        else if (actionType === "delete") {
            console.log("[Templates API] 🗑️ Deleting template:", { id });

            db.templates = templates.filter(t => String(t.id) !== String(id));
            saveDb(db);

            message = "Template deleted successfully";

            console.log("[Templates API] 📤 Calling PHP webhook for delete...");
            await sendToPhp({
                event: "delete",
                resource: "templates",
                shop,
                id,
            });
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
