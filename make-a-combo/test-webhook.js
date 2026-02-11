// Test script to verify webhook connectivity
// Run with: node test-webhook.js

const testWebhook = async () => {
  const webhookUrl = "https://b97f-103-186-151-131.ngrok-free.app//make-a-combo/test.php";
  
  console.log("🧪 Testing Webhook Connection...");
  console.log("📡 URL:", webhookUrl);
  console.log("");

  // Test 1: Enable Event
  console.log("Test 1: Sending ENABLE event...");
  try {
    const enablePayload = {
      event: "app_enabled",
      resource: "store_config",
      shop: "test-shop.myshopify.com",
      data: {
        id: "gid://shopify/Shop/12345",
        shop_id: "test-shop.myshopify.com",
        domain: "test-shop.myshopify.com",
        store_name: "Test Shop",
        created_at: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        theme_name: "Dawn",
        updated_at: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        installed: "active",
        status: "enabled",
        app_plan: "Free",
        shopify_plan: "Basic"
      }
    };

    const response1 = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enablePayload),
    });

    console.log("✅ Status:", response1.status, response1.statusText);
    const result1 = await response1.text();
    console.log("📥 Response:", result1);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
  }

  // Test 2: Disable Event
  console.log("Test 2: Sending DISABLE event...");
  try {
    const disablePayload = {
      event: "app_disabled",
      resource: "store_config",
      shop: "test-shop.myshopify.com",
      data: {
        shop_id: "test-shop.myshopify.com",
        status: "disabled",
        updated_at: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      }
    };

    const response2 = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(disablePayload),
    });

    console.log("✅ Status:", response2.status, response2.statusText);
    const result2 = await response2.text();
    console.log("📥 Response:", result2);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("");
  }

  console.log("✨ Test Complete!");
  console.log("Check your webhook.log file for entries.");
};

testWebhook();
