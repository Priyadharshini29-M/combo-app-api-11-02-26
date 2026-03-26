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

/* =========================
   ANALYTICS DATA FETCHING & TRANSFORMATION
   ========================= */

// 1. Fetch Visitors (Flexible schema handling)
export async function getVisitors(shop, start, end) {
  const url = `${BASE_PHP_URL}/visitors.php?shop=${shop}&shop_domain=${shop}&start_date=${start}&end_date=${end}`;
  console.log(`[API] 🕵️ Fetching Visitors: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[API] 📥 Raw Visitors Result: ${text.substring(0, 100)}`);
    const result = JSON.parse(text);
    const data = result.data || result.visitors || (Array.isArray(result) ? result : []);
    return data;
  } catch (e) {
    console.error('[API] ❌ Visitors Fetch Failed:', e.message);
    return [];
  }
}

// 2. Fetch Clicks (Flexible schema handling)
export async function getClicks(shop, start, end) {
  const url = `${BASE_PHP_URL}/clicks.php?shop=${shop}&shop_domain=${shop}&start_date=${start}&end_date=${end}`;
  console.log(`[API] 🕵️ Fetching Clicks: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[API] 📥 Raw Clicks Result: ${text.substring(0, 100)}`);
    const result = JSON.parse(text);
    const data = result.data || result.clicks || (Array.isArray(result) ? result : []);
    return data;
  } catch (e) {
    console.error('[API] ❌ Clicks Fetch Failed:', e.message);
    return [];
  }
}

// 3. Transformation Logic (Joined by Template/Date)
export function transformAnalytics(visitors = [], clicks = []) {
  const summary = {
    totalVisitors: visitors.length,
    totalClicks: clicks.length,
    checkoutClicks: 0,
    topTemplate: 'None',
    byTemplate: [],
    chartData: [],
  };

  const templateStats = {};

  // Process Visitors
  visitors.forEach(v => {
    // Check various common field names for template
    const t = v.template_name || v.template || v.layout || 'Unknown';
    if (!templateStats[t]) templateStats[t] = { name: t, visitors: 0, clicks: 0, checkouts: 0 };
    templateStats[t].visitors++;
  });

  // Process Clicks
  clicks.forEach(c => {
    const t = c.template_name || c.template || c.layout || 'Unknown';
    if (!templateStats[t]) templateStats[t] = { name: t, visitors: 0, clicks: 0, checkouts: 0 };
    templateStats[t].clicks++;
    
    // Check for checkout markers
    const isCheckout = c.action === 'checkout' || c.type === 'checkout' || c.target?.includes('checkout');
    if (isCheckout) {
      templateStats[t].checkouts++;
      summary.checkoutClicks++;
    }
  });

  // Convert map to grouped array + find Top Template
  let topClicks = -1;
  const tableData = Object.values(templateStats).map(s => {
    const rate = s.visitors > 0 ? ((s.clicks / s.visitors) * 100).toFixed(1) : '0.0';
    if (s.clicks > topClicks && s.name !== 'Unknown') {
      topClicks = s.clicks;
      summary.topTemplate = s.name;
    }
    return { ...s, conversionRate: rate + '%' };
  });

  // Daily Chart Data
  const dateMap = {};
  clicks.forEach(c => {
    const d = c.created_at?.split(' ')[0] || c.date || 'Unknown';
    if (d !== 'Unknown') dateMap[d] = (dateMap[d] || 0) + 1;
  });

  summary.chartData = Object.keys(dateMap).sort().map(date => ({
    date: date.substring(5), // Shorten MM-DD
    clicks: dateMap[date],
  }));

  summary.byTemplate = tableData.sort((a,b) => b.clicks - a.clicks);
  return summary;
}

/**
 * Unified Analytics Fetcher (Uses analytics.php)
 */
export async function getAnalytics(shop, start, end) {
  let url = `${BASE_PHP_URL}/analytics.php?shop_domain=${shop}`;
  if (start) url += `&start_date=${start}`;
  if (end) url += `&end_date=${end}`;

  console.log(`[API] 📊 Fetching Unified Analytics: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const rawResponse = await response.json();
    if (!rawResponse.success || !rawResponse.data) {
       console.error(`[API] ❌ Invalid data format:`, rawResponse);
       return null;
    }

    const phpData = rawResponse.data;

    // Normalize template names
    const normalize = (name) =>
      (name || "")
        .toLowerCase()
        .replace(/[-_]/g, " ")
        .trim();

    // Merge duplicate templates
    const templateMap = {};
    (phpData.top_templates || []).forEach((t) => {
      const key = normalize(t.template_name);
      if (!templateMap[key]) {
        templateMap[key] = {
          name: key,
          visitors: 0,
          clicks: 0,
          checkouts: 0,
          discount: t.discount_code || t.discount || 'None',
        };
      }
      templateMap[key].visitors += Number(t.visitors || 0);
      templateMap[key].clicks += Number(t.clicks || 0);
      templateMap[key].checkouts += Number(t.checkouts || 0);
    });

    const byTemplate = Object.values(templateMap).map((t) => {
      const convRate =
        t.visitors > 0
          ? ((t.clicks / t.visitors) * 100).toFixed(1)
          : "0.0";
      return {
        ...t,
        conversionRate: convRate + "%",
      };
    });

    // Top template logic
    let topTemplate = "None";
    if (byTemplate.length > 0) {
      const sorted = [...byTemplate].sort((a, b) => {
        if (b.clicks === a.clicks) return b.visitors - a.visitors;
        return b.clicks - a.clicks;
      });
      topTemplate = sorted[0]?.name || "None";
    }

    // Chart fallback
    const chartData =
      phpData.chart_data && phpData.chart_data.length > 0
        ? phpData.chart_data
        : byTemplate.map((t) => ({
          date: t.name,
          clicks: t.clicks,
        }));

    return {
      totalVisitors: Number(phpData.total_visitors || 0),
      totalClicks: Number(phpData.total_clicks || 0),
      checkoutClicks: Number(phpData.total_checkouts || 0),
      discountUsage: Number(phpData.total_discounts || 0),
      topTemplate: topTemplate,
      byTemplate: byTemplate,
      chartData: chartData,
    };
  } catch (error) {
    console.error("[API] ❌ Error fetching unified analytics:", error);
    return null;
  }
}

