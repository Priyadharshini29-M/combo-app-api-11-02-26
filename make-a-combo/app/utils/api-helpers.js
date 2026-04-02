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
export const BASE_PHP_URL =
  'https://darkblue-dotterel-303283.hostingersite.com';

/* =========================
   DATABASE HELPERS (PHP REPLACEMENT)
========================= */
export const getDb = async (shop = null) => {
  console.log(
    `[DB] 💿 Fetching data from PHP backend... Shop: ${shop || 'All'}`
  );
  try {
    // We need to fetch both templates and discounts to maintain the structure expected by the app
    const templatesUrl = `${BASE_PHP_URL}/templates.php${shop ? `?shopdomain=${shop}&shop=${shop}` : ''}`;
    const discountsUrl = `${BASE_PHP_URL}/discount.php${shop ? `?shopdomain=${shop}&shop=${shop}` : ''}`;

    console.log(`[DB] 🔗 Templates URL: ${templatesUrl}`);
    console.log(`[DB] 🔗 Discounts URL: ${discountsUrl}`);

    const [templatesRes, discountsRes] = await Promise.all([
      fetch(templatesUrl)
        .then((res) => res.json())
        .catch((err) => ({ data: [] })),
      fetch(discountsUrl)
        .then(async (res) => {
          const text = await res.text();
          console.log(
            `[DB] 📥 Raw Discounts Response from PHP:`,
            text.substring(0, 500) + (text.length > 500 ? '...' : '')
          );
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error(`[DB] ❌ Failed to parse JSON:`, e.message);
            return { data: [] };
          }
        })
        .catch((err) => {
          console.error(`[DB] ❌ Fetch error:`, err.message);
          return { data: [] };
        }),
    ]);

    return {
      templates: templatesRes.templates || templatesRes.data || [],
      discounts: discountsRes.data || [],
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
  console.log(
    '[DB] ℹ️ saveDb called. Local JSON sync is disabled as we are now using PHP/MySQL.'
  );
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

  return await sendToPhp(payload, 'make-a-combo/templatesdetails.php');
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
    const data =
      result.data || result.visitors || (Array.isArray(result) ? result : []);
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
    const data =
      result.data || result.clicks || (Array.isArray(result) ? result : []);
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
  visitors.forEach((v) => {
    // Check various common field names for template
    const t = v.template_name || v.template || v.layout || 'Unknown';
    if (!templateStats[t])
      templateStats[t] = { name: t, visitors: 0, clicks: 0, checkouts: 0 };
    templateStats[t].visitors++;
  });

  // Process Clicks
  clicks.forEach((c) => {
    const t = c.template_name || c.template || c.layout || 'Unknown';
    if (!templateStats[t])
      templateStats[t] = { name: t, visitors: 0, clicks: 0, checkouts: 0 };
    templateStats[t].clicks++;

    // Check for checkout markers
    const isCheckout =
      c.action === 'checkout' ||
      c.type === 'checkout' ||
      c.target?.includes('checkout');
    if (isCheckout) {
      templateStats[t].checkouts++;
      summary.checkoutClicks++;
    }
  });

  // Convert map to grouped array + find Top Template
  let topClicks = -1;
  const tableData = Object.values(templateStats).map((s) => {
    const rate =
      s.visitors > 0 ? ((s.clicks / s.visitors) * 100).toFixed(1) : '0.0';
    if (s.clicks > topClicks && s.name !== 'Unknown') {
      topClicks = s.clicks;
      summary.topTemplate = s.name;
    }
    return { ...s, conversionRate: rate + '%' };
  });

  // Daily Chart Data
  const dateMap = {};
  clicks.forEach((c) => {
    const d = c.created_at?.split(' ')[0] || c.date || 'Unknown';
    if (d !== 'Unknown') dateMap[d] = (dateMap[d] || 0) + 1;
  });

  summary.chartData = Object.keys(dateMap)
    .sort()
    .map((date) => ({
      date: date.substring(5), // Shorten MM-DD
      clicks: dateMap[date],
    }));

  summary.byTemplate = tableData.sort((a, b) => b.clicks - a.clicks);
  return summary;
}

/**
 * Fetch discount list with real usage counts from Shopify GraphQL.
 * Returns array of { title, code, status, usage, usedCount }.
 */
export async function getShopifyDiscounts(admin) {
  try {
    const res = await admin.graphql(`
      #graphql
      query {
        discountNodes(first: 100, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              discount {
                __typename
                ... on DiscountCodeBasic {
                  title status usageLimit
                  codes(first: 1) { edges { node { code asyncUsageCount } } }
                }
                ... on DiscountCodeBxgy {
                  title status usageLimit
                  codes(first: 1) { edges { node { code asyncUsageCount } } }
                }
                ... on DiscountCodeFreeShipping {
                  title status usageLimit
                  codes(first: 1) { edges { node { code asyncUsageCount } } }
                }
              }
            }
          }
        }
      }
    `);
    const json = await res.json();
    const edges = json.data?.discountNodes?.edges || [];
    return edges
      .filter(({ node }) => node?.discount?.codes)
      .map(({ node }) => {
        const d = node.discount;
        const codeNode = d.codes?.edges?.[0]?.node;
        const usedCount = codeNode?.asyncUsageCount ?? 0;
        const usageLimit = d.usageLimit ?? null;
        return {
          title: d.title || 'Untitled',
          code: codeNode?.code || '',
          status: d.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
          usedCount,
          usage: `${usedCount} / ${usageLimit !== null ? usageLimit : 'Unlimited'}`,
        };
      });
  } catch (e) {
    console.error('[API] ❌ getShopifyDiscounts failed:', e.message);
    return [];
  }
}

/**
 * Fetch orders within a date range from Shopify GraphQL.
 * Returns { ordersCount: number, totalRevenue: number }
 */
export async function getShopifyOrders(admin, start, end) {
  try {
    // Shopify orders query with created_at filter.
    const startTime = start
      ? new Date(start.replace(' ', 'T') + 'Z').toISOString()
      : null;
    const endTime = end
      ? new Date(end.replace(' ', 'T') + 'Z').toISOString()
      : new Date().toISOString();

    let query = `financial_status:paid`;
    if (startTime) query += ` AND created_at:>=${startTime}`;
    if (endTime) query += ` AND created_at:<=${endTime}`;

    const res = await admin.graphql(
      `
      #graphql
      query getOrders($query: String!) {
        shop {
          currencyCode
        }
        orders(first: 100, query: $query) {
          edges {
            node {
              id
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
            }
          }
        }
      }
    `,
      {
        variables: { query },
      }
    );

    const json = await res.json();
    const currencyCode = json.data?.shop?.currencyCode || 'USD';
    const edges = json.data?.orders?.edges || [];

    const ordersCount = edges.length;
    const totalRevenue = edges.reduce(
      (acc, { node }) => acc + parseFloat(node.totalPriceSet.shopMoney.amount),
      0
    );

    return { ordersCount, totalRevenue, currencyCode };
  } catch (e) {
    console.error('[API] ❌ getShopifyOrders failed:', e.message);
    return { ordersCount: 0, totalRevenue: 0, currencyCode: 'USD' };
  }
}

/**
 * Unified Analytics Fetcher (Uses analytics.php)
 */
export async function getAnalytics(shop, start, end, dateRange, admin = null) {
  const url = new URL(`${BASE_PHP_URL}/analytics.php`);
  url.searchParams.set('shop_domain', shop);

  // If explicit start/end are provided, always prefer them over date_range.
  // This ensures timezone-safe datetime boundaries are respected.
  if (start && end) {
    // Allow both YYYY-MM-DD and YYYY-MM-DD HH:mm:ss formats.
    // URLSearchParams will properly encode spaces/colons.
    url.searchParams.set('start_date', start);
    url.searchParams.set('end_date', end);
  } else if (dateRange) {
    url.searchParams.set('date_range', dateRange);
  } else {
    url.searchParams.set('date_range', 'last_30_days');
  }

  console.log(`[API] 📊 Fetching Unified Analytics: ${url.toString()}`);

  try {
    // Fetch analytics, active discounts, and orders in parallel
    const queries = [
      fetch(url.toString()),
      fetch(`${BASE_PHP_URL}/discount.php?shopdomain=${shop}&shop=${shop}`)
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ];

    // Add Shopify orders fetch if admin is provided
    if (admin) {
      queries.push(getShopifyOrders(admin, start, end));
    }

    const [response, discountRes, shopifyOrders] = await Promise.all(queries);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const rawResponse = await response.json();
    if (!rawResponse.success || !rawResponse.data) {
      console.error(`[API] ❌ Invalid data format:`, rawResponse);
      return null;
    }

    const phpData = rawResponse.data;

    // Normalize and count active discounts from discount.php
    const rawDiscounts = discountRes.data || [];
    const normalizedDiscounts = rawDiscounts.map((d) => {
      const s1 = d.settings && typeof d.settings === 'object' ? d.settings : {};
      const s2 =
        s1.settings && typeof s1.settings === 'object' ? s1.settings : {};
      const flat = { ...d, ...s1, ...s2 };
      return {
        title: flat.title || flat.discount_title || 'Untitled',
        code: flat.code || flat.discount_code || '',
        status: flat.status || 'active',
        usage: flat.usage || '0 / Unlimited',
        value: flat.value || '0',
        valueType: flat.valueType || 'percentage',
      };
    });
    const activeDiscountCount = normalizedDiscounts.filter(
      (d) => d.status === 'active'
    ).length;
    console.log(
      `[API] 🏷️ Active discounts for ${shop}: ${activeDiscountCount}`
    );

    // Normalize template names
    const normalize = (name) =>
      (name || '').toLowerCase().replace(/[-_]/g, ' ').trim();

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
        t.visitors > 0 ? ((t.clicks / t.visitors) * 100).toFixed(1) : '0.0';
      return {
        ...t,
        conversionRate: convRate + '%',
      };
    });

    // Top template logic:
    // Prefer PHP's own ordering (`top_templates[0]`) so UI/API "top" matches the backend.
    let topTemplate = 'None';
    if (phpData.top_templates && phpData.top_templates.length > 0) {
      topTemplate = normalize(phpData.top_templates[0].template_name);
    } else if (byTemplate.length > 0) {
      // Fallback if PHP doesn't include top_templates.
      const sorted = [...byTemplate].sort((a, b) => {
        if (b.clicks === a.clicks) return b.visitors - a.visitors;
        return b.clicks - a.clicks;
      });
      topTemplate = sorted[0]?.name || 'None';
    }

    // Chart fallback
    const chartData =
      phpData.chart_data && phpData.chart_data.length > 0
        ? phpData.chart_data
        : byTemplate.map((t) => ({
            date: t.name,
            clicks: t.clicks,
          }));

    const totalVisitors = Number(phpData.total_visitors || 0);
    const totalRevenue = shopifyOrders?.totalRevenue || 0;
    const totalOrders = shopifyOrders?.ordersCount || 0;
    const currencyCode = shopifyOrders?.currencyCode || 'USD';

    return {
      totalVisitors,
      totalClicks: Number(phpData.total_clicks || 0),
      checkoutClicks: Number(phpData.total_checkouts || 0),
      discountUsage:
        activeDiscountCount > 0
          ? activeDiscountCount
          : Number(phpData.total_discounts || 0),
      discountList: normalizedDiscounts,
      totalRevenue,
      totalOrders,
      currencyCode,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      orderConversionRate:
        totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0,
      topTemplate: topTemplate,
      byTemplate: byTemplate,
      chartData: chartData,
    };
  } catch (error) {
    console.error('[API] ❌ Error fetching unified analytics:', error);
    return null;
  }
}
