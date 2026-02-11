import { json } from "@remix-run/node";
import fs from "fs";
import path from "path";

export const loader = async ({ request }) => {
    const url = new URL(request.url);
    // Allow toggling generic error or specific success
    const simulateError = url.searchParams.get("error") === "true";

    try {
        const filePath = path.join(process.cwd(), "public", "fake_stores.json");

        if (!fs.existsSync(filePath)) {
            console.error("Fake API: JSON file not found at " + filePath);
            return json({ status: "error", message: "Data file not found" }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileContent);

        if (simulateError) {
            // Return the error scenario from the JSON
            const errorData = jsonData.scenarios.error;
            console.error(`[Combo App Console] Error Notification: ${errorData.message}`);
            return json(errorData, { status: errorData.code || 500 });
        }

        // Return the success scenario
        const successData = jsonData.scenarios.success;
        console.log(`[Combo App Console] Success Notification: ${successData.message}`);
        return json(successData);

    } catch (error) {
        console.error("[Combo App Console] System Error:", error);
        return json({ status: "error", message: "Internal Server Error" }, { status: 500 });
    }
};
