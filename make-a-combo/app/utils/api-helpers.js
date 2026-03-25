import fs from 'fs';
import path from 'path';

/* =========================
   IST DATE FORMATTER
   ========================= */
export const formatToIST = (dateString = null) => {
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/* =========================
   PHP BACKEND CONFIG
========================= */
export const BASE_PHP_URL = 'https://darkblue-dotterel-303283.hostingersite.com';

/* =========================
   DATABASE HELPERS (PHP REPLACEMENT)
========================= */
export const getDb = async (shop = null) => {
  console.log(`[DB] 💿 Fetching data from PHP backend... Shop: ${shop || 'All'}`);
  try {
    // We need to fetch both templates and discounts to maintain the structure expected by the app
    const templatesUrl = `${BASE_PHP_URL}/templates.php${shop ? `?shopdomain=${shop}&shop=${shop}` : ''}`;
    const discountsUrl = `${BASE_PHP_URL}/discount.php${shop ? `?shopdomain=${shop}&shop=${shop}` : ''}`;

    console.log(`[DB] 🔗 Templates URL: ${templatesUrl}`);
    console.log(`[DB] 🔗 Discounts URL: ${discountsUrl}`);

    const [templatesRes, discountsRes] = await Promise.all([
      fetch(templatesUrl).then(res => res.json()).catch(err => ({ data: [] })),
      fetch(discountsUrl).then(async res => {
        const text = await res.text();
        console.log(`[DB] 📥 Raw Discounts Response from PHP:`, text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error(`[DB] ❌ Failed to parse JSON:`, e.message);
          return { data: [] };
        }
      }).catch(err => {
        console.error(`[DB] ❌ Fetch error:`, err.message);
        return { data: [] };
      })
    ]);

    return {
      templates: templatesRes.templates || templatesRes.data || [],
      discounts: discountsRes.data || []
    };
  } catch (error) {
    console.error('[DB] ❌ Error fetching from PHP backend:', error);
    return { templates: [], discounts: [] };
  }
};

export const saveDb = (data) => {
  // saveDb was used for fake_db.json. 
  // With PHP, updates happen individually via sendToPhp.
  // We'll keep this as a no-op or log it to prevent crashes, 
  // but the app should rely on action functions calling sendToPhp.
  console.log('[DB] ℹ️ saveDb called. Local JSON sync is disabled as we are now using PHP/MySQL.');
};

/* =========================
   SEND DATA TO PHP API
========================= */
export async function sendToPhp(payload, endpoint) {
  if (!endpoint) {
    console.error('[PHP API] ❌ Endpoint required for sendToPhp');
    return;
  }
  const phpUrl = `${BASE_PHP_URL}/${endpoint}`;

  console.log(`[PHP API] 📡 Initiating request to: ${phpUrl}`);
  
  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(phpUrl, fetchOptions);
    const resultText = await response.text();

    console.log(
      `[PHP API] 📥 Status: ${response.status} ${response.statusText}`
    );

    let resultJson;
    try {
      resultJson = JSON.parse(resultText);
    } catch (e) {
      resultJson = { text: resultText };
    }

    return resultJson;
  } catch (error) {
    console.error('[PHP API] ❌ Connection Failed:', error.message);
    throw error;
  }
}

/* =========================
   SEND SHOP DATA TO MySQL
========================= */
export async function sendShopData(shopData, shopDomain = null) {
  console.log('[Shop MySQL] 💾 Sending shop data to database...');

  const payload = {
    event: 'shop_sync',
    resource: 'shop',
    shop: shopDomain || shopData.shop_id || shopData.myshopifyDomain,
    data: shopData,
  };

  return await sendToPhp(payload, 'shop.php');
}

/* =========================
   SEND DISCOUNT DATA TO MySQL
========================= */
export async function sendDiscountData(discountData, action = 'create') {
  console.log(
    `[Discount MySQL] 💾 Sending discount data to database (${action})...`
  );

  const payload = {
    event: action, // create, update, delete
    resource: 'discount',
    data: discountData,
  };

  return await sendToPhp(payload, 'discount.php');
}

/* =========================
   SEND TEMPLATE DATA TO MySQL
========================= */
export async function sendTemplateData(templateData, action = 'create') {
  console.log(
    `[Template MySQL] 💾 Sending template data to database (${action})...`
  );

  const payload = {
    event: action, // create, update, delete
    resource: 'templates',
    data: templateData,
  };

  return await sendToPhp(payload, 'templates.php');
}
