import fs from "fs";
import path from "path";

/* =========================
   IST DATE FORMATTER
   ========================= */
export const formatToIST = (dateString = null) => {
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

/* =========================
   FAKE DB HELPERS
========================= */
export const getDb = () => {
    try {
        const filePath = path.join(process.cwd(), "public", "fake_db.json");
        if (!fs.existsSync(filePath)) {
            return { templates: [], discounts: [] };
        }
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (error) {
        console.error("Error reading fake DB:", error);
        return { templates: [], discounts: [] };
    }
};

export const saveDb = (data) => {
    try {
        const filePath = path.join(process.cwd(), "public", "fake_db.json");
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing fake DB:", error);
    }
};

/* =========================
   SEND DATA TO PHP API
========================= */
const BASE_PHP_URL = "https://61fb-103-130-204-117.ngrok-free.app/make-a-combo";

export async function sendToPhp(payload, endpoint) {
    if (!endpoint) {
        console.error("[PHP API] ❌ Endpoint required for sendToPhp");
        return;
    }
    const phpUrl = `${BASE_PHP_URL}/${endpoint}`;
    
    console.log(`[PHP API] 📡 Initiating request to: ${phpUrl}`);
    console.log("[PHP API] 📝 Event Type:", payload.event);
    console.log("[PHP API] 🏪 Shop:", payload.shop);
    
    try {
        const fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload),
        };

        const response = await fetch(phpUrl, fetchOptions);
        const resultText = await response.text();
        
        console.log(`[PHP API] 📥 Status: ${response.status} ${response.statusText}`);
        
        let resultJson;
        try {
            resultJson = JSON.parse(resultText);
            console.log("[PHP API] ✅ Response JSON:", resultJson);
        } catch (e) {
            console.log("[PHP API] 📄 Response Text (Non-JSON):", resultText.substring(0, 200));
            resultJson = { text: resultText };
        }

        if (!response.ok) {
            console.error("[PHP API] ❌ HTTP Error detected.");
        }
        
        return resultJson;
    } catch (error) {
        console.error("[PHP API] ❌ Connection Failed:", error.message);
        if (error.message.includes("fetch")) {
            console.error("[PHP API] 💡 Tip: Verify that your ngrok URL is active and matches the one in utils/api-helpers.js");
        }
        throw error;
    }
}

/* =========================
   SEND SHOP DATA TO MySQL
========================= */
export async function sendShopData(shopData, shopDomain = null) {
    console.log("[Shop MySQL] 💾 Sending shop data to database...");
    
    const payload = {
        event: "shop_sync",
        resource: "shop",
        shop: shopDomain || shopData.shop_id || shopData.myshopifyDomain,
        data: shopData
    };
    
    return await sendToPhp(payload, "shop.php");
}

/* =========================
   SEND DISCOUNT DATA TO MySQL
========================= */
export async function sendDiscountData(discountData, action = "create") {
    console.log(`[Discount MySQL] 💾 Sending discount data to database (${action})...`);
    
    const payload = {
        event: action, // create, update, delete
        resource: "discount",
        data: discountData
    };
    
    return await sendToPhp(payload, "discount.php");
}

/* =========================
   SEND TEMPLATE DATA TO MySQL
========================= */
export async function sendTemplateData(templateData, action = "create") {
    console.log(`[Template MySQL] 💾 Sending template data to database (${action})...`);
    
    const payload = {
        event: action, // create, update, delete
        resource: "templates",
        data: templateData
    };
    
    return await sendToPhp(payload, "templates.php");
}
