import fs from "fs";
import path from "path";

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
export async function sendToPhp(payload) {
    // CENTRALIZED PHP WEBHOOK URL
    const phpUrl = "https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php";
    
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
        // If it's a network error, maybe the ngrok URL is wrong or expired
        if (error.message.includes("fetch")) {
            console.error("[PHP API] 💡 Tip: Verify that your ngrok URL is active and matches the one in utils/api-helpers.js");
        }
        throw error;
    }
}
