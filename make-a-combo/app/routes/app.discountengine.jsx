import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { getDb, saveDb } from "../utils/api-helpers";

const BASE_PHP_URL = "https://61fb-103-130-204-117.ngrok-free.app/make-a-combo";

/**
 * Direct function to sync data to PHP without using helpers
 */
const syncToPhp = async (payload, endpoint = "discount.php") => {
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
    console.error(`[Discount Engine] Direct PHP Error (${endpoint}):`, error.message);
    throw error;
  }
};

import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  Checkbox,
  Modal,
  FormLayout,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Badge,
  EmptyState,
  Divider,
  IndexTable,
  useIndexResourceState,
  Popover,
  ActionList,
  Avatar,
  Icon,
  RadioButton,
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
  ChevronDownIcon,
  DiscountIcon,
  CartIcon,
  ProductIcon,
  DeliveryIcon,
  ChevronRightIcon,
  XIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from '@shopify/polaris-icons';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';

// --- Fake API Helper ---
const FAKE_DB_PATH = path.join(process.cwd(), 'public', 'fake_db.json');

const getFakeDiscounts = () => {
  try {
    if (!fs.existsSync(FAKE_DB_PATH)) return [];
    const db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    return db.discounts || [];
  } catch (err) {
    console.error('Error reading fake DB:', err);
    return [];
  }
};

const saveFakeDiscounts = (discounts) => {
  try {
    let db = { templates: [], discounts: [] };
    if (fs.existsSync(FAKE_DB_PATH)) {
      db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    }
    db.discounts = discounts;
    fs.writeFileSync(FAKE_DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing fake DB:', err);
  }
};

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const localDiscounts = getFakeDiscounts().filter(d => !d.shop || d.shop === shop);

  try {
    const url = `${BASE_PHP_URL}/discount.php?shop=${shop}`;
    const response = await fetch(url);
    const result = await response.json();

    let remoteDiscounts = [];
    if (result.success) {
      remoteDiscounts = result.discounts || result.data || [];
    }

    // Fetch discounts from Shopify Admin
    let shopifyDiscounts = [];
    try {
      const shopifyResponse = await admin.graphql(`
        #graphql
        query {
          discountNodes(first: 50, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                discount {
                  ... on DiscountCodeBasic {
                    title
                    status
                    summary
                    createdAt
                    codes(first: 1) { edges { node { code } } }
                  }
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    summary
                    createdAt
                  }
                  ... on DiscountCodeBxgy {
                    title
                    status
                    summary
                    createdAt
                    codes(first: 1) { edges { node { code } } }
                  }
                  ... on DiscountAutomaticBxgy {
                    title
                    status
                    summary
                    createdAt
                  }
                  ... on DiscountCodeFreeShipping {
                    title
                    status
                    summary
                    createdAt
                    codes(first: 1) { edges { node { code } } }
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    summary
                    createdAt
                  }
                }
              }
            }
          }
        }
      `);

      const shopifyData = await shopifyResponse.json();
      if (shopifyData.data?.discountNodes?.edges) {
        shopifyDiscounts = shopifyData.data.discountNodes.edges.map(({ node }) => {
          const d = node.discount;
          const code = d.codes?.edges?.[0]?.node?.code || '';

          let type = 'amount_off_products';
          if (d.__typename === 'DiscountCodeBxgy' || d.__typename === 'DiscountAutomaticBxgy') {
            type = 'buy_x_get_y';
          } else if (d.__typename === 'DiscountCodeFreeShipping' || d.__typename === 'DiscountAutomaticFreeShipping') {
            type = 'free_shipping';
          }

          return {
            id: node.id,
            shopifyId: node.id,
            title: d.title,
            code: code,
            type: type,
            status: d.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
            usage: d.summary || 'Imported from Shopify',
            created: new Date(d.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            method: d.__typename?.includes('Automatic') ? 'auto' : 'code',
          };
        });
      }
    } catch (e) {
      console.error("Failed to fetch discounts from Shopify Admin API:", e);
    }

    // Merge strategy: Combine shopify, remote, and local, de-dupe.
    let combined = [...shopifyDiscounts];

    // Merge internal DB discounts (remote from PHP)
    remoteDiscounts.forEach(rem => {
      const exists = combined.some(shop =>
        (shop.shopifyId && rem.shopifyId && shop.shopifyId === rem.shopifyId) ||
        (shop.title === rem.title && shop.code === rem.code)
      );
      if (!exists) {
        combined.push(rem);
      } else {
        const match = combined.find(shop =>
          (shop.shopifyId && rem.shopifyId && shop.shopifyId === rem.shopifyId) ||
          (shop.title === rem.title && shop.code === rem.code)
        );
        if (match) {
          match.appId = rem.id;
          match.value = rem.value;
          match.valueType = rem.valueType;
        }
      }
    });

    // Merge local fake DB discounts
    localDiscounts.forEach(local => {
      const exists = combined.some(rem =>
        (rem.shopifyId && local.shopifyId && rem.shopifyId === local.shopifyId) ||
        (rem.title === local.title && rem.code === local.code)
      );
      if (!exists) {
        combined.push(local);
      } else {
        const match = combined.find(rem =>
          (rem.shopifyId && local.shopifyId && rem.shopifyId === local.shopifyId) ||
          (rem.title === local.title && rem.code === local.code)
        );
        if (match && !match.appId) {
          match.appId = local.id;
        }
      }
    });

    // Sort by id / creation time
    combined.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));

    return json({ discounts: combined });
  } catch (error) {
    console.error("Failed to fetch discounts from PHP:", error);
    return json({ discounts: localDiscounts });
  }
};


const safeParse = (val, fallback = []) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
};

const safeBool = (val, fallback = false) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'boolean') return val;
  return String(val) === 'true';
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const method = request.method;
  const discounts = getFakeDiscounts();
  let formData;
  const contentType = request.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    const jsonBody = await request.json();
    // Flatten the structure: allow access to top-level keys and keys inside 'data' property if it exists
    const flattened = { ...jsonBody, ...(jsonBody.data || {}) };
    formData = {
      get: (key) => flattened[key] !== undefined ? flattened[key] : null
    };
  } else {
    formData = await request.formData();
  }

  // Distinguish usage: The component uses fetcher.submit with different intents
  const intent = formData.get('intent') || 'create';

  try {
    if (method === 'POST' && intent === 'create') {
      const title = formData.get('title');
      const code =
        formData.get('code') || `CODE-${Math.floor(Math.random() * 1000)}`;
      const type = formData.get('type');
      const value = formData.get('value');

      // --- Parse Eligibility for Shopify API ---
      const eligibility = formData.get('eligibility') || 'all';
      const selectedSegments = formData.get('selectedSegments') ? (typeof formData.get('selectedSegments') === 'string' ? JSON.parse(formData.get('selectedSegments')) : formData.get('selectedSegments')) : [];
      const selectedCustomers = formData.get('selectedCustomers') ? (typeof formData.get('selectedCustomers') === 'string' ? JSON.parse(formData.get('selectedCustomers')) : formData.get('selectedCustomers')) : [];

      let customerSelection = { all: true };
      if (eligibility === 'segments' && selectedSegments.length > 0) {
        customerSelection = { customerSegments: { add: selectedSegments.map(s => s.id) } };
      } else if (eligibility === 'customers' && selectedCustomers.length > 0) {
        customerSelection = { customers: { add: selectedCustomers.map(c => c.id) } };
      }

      const valueType = formData.get('valueType') || 'percentage';

      // --- Shopify GraphQL Logic ---
      let shopifyDiscountId = null;

      // Only attempt Shopify creation for Basic types (Percentage/Fixed) and All Products for now
      // (Expansion to Buy X Get Y or Specific Products requires real Product IDs)
      if (['percentage', 'fixed', 'amount', 'amount_off_products', 'amount_off_order'].includes(type)) {
        try {
          const isPercentage = valueType === 'percentage';
          const discountValue = parseFloat(value || 0) || 0;

          const discountMethod = formData.get('method') || 'code';
          const mutation = discountMethod === 'auto'
            ? `#graphql
              mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
                discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
                  automaticDiscountNode { id }
                  userErrors { field message }
                }
              }`
            : `#graphql
              mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
                discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                  codeDiscountNode { id }
                  userErrors { field message }
                }
              }`;

          // Parse new fields
          const minReqType = formData.get('minRequirementType');
          const minReqValue = formData.get('minRequirementValue');
          const combinationsRaw = formData.get('combinations');
          const combinations = (typeof combinationsRaw === 'string' ? JSON.parse(combinationsRaw) : combinationsRaw) || {};

          let minimumRequirement = null;
          if (minReqType === 'amount' && minReqValue) {
            minimumRequirement = { subtotal: { greaterThanOrEqualToSubtotal: parseFloat(minReqValue) } };
          } else if (minReqType === 'quantity' && minReqValue) {
            minimumRequirement = { quantity: { greaterThanOrEqualToQuantity: String(minReqValue) } };
          }

          // Parse appliesTo data
          const appliesTo = formData.get('appliesTo') || 'all_products';
          const selectedProducts = formData.get('selectedProducts') ? JSON.parse(formData.get('selectedProducts')) : [];
          const selectedCollections = formData.get('selectedCollections') ? JSON.parse(formData.get('selectedCollections')) : [];

          // Build items object based on appliesTo selection
          let itemsConfig = { all: true }; // default to all products

          if (appliesTo === 'specific_collections' && selectedCollections.length > 0) {
            itemsConfig = {
              collections: {
                add: selectedCollections.map(c => c.id || c.value)
              }
            };
          } else if (appliesTo === 'specific_products' && selectedProducts.length > 0) {
            itemsConfig = {
              products: {
                productsToAdd: selectedProducts.map(p => p.id || p.value)
              }
            };
          }

          const commonConfig = {
            title: title,
            startsAt: formData.get('startDate') ? new Date(formData.get('startDate')).toISOString() : new Date().toISOString(),
            endsAt: (formData.get('endDate') && formData.get('endDate') !== 'No end date') ? new Date(formData.get('endDate')).toISOString() : null,
            customerGets: {
              value: isPercentage
                ? { percentage: discountValue / 100 }
                : { discountAmount: { amount: discountValue, appliesOnEachItem: appliesTo !== 'all_products' } },
              items: itemsConfig
            },
            minimumRequirement: minimumRequirement,
            combinesWith: {
              orderDiscounts: combinations.order || false,
              productDiscounts: combinations.product || false,
              shippingDiscounts: combinations.shipping || false
            }
          };

          const variables = discountMethod === 'auto'
            ? { automaticBasicDiscount: commonConfig }
            : {
              basicCodeDiscount: {
                ...commonConfig,
                code: code,
                customerSelection: customerSelection,
                usageLimit: formData.get('maxUsage') ? parseInt(formData.get('maxUsage')) : null,
                appliesOncePerCustomer: String(formData.get('oncePerCustomer')) === 'true',
              }
            };

          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();

          const resultKey = discountMethod === 'auto' ? 'discountAutomaticBasicCreate' : 'discountCodeBasicCreate';
          const nodeKey = discountMethod === 'auto' ? 'automaticDiscountNode' : 'codeDiscountNode';
          const userErrors = responseJson.data?.[resultKey]?.userErrors || [];

          if (userErrors.length > 0) {
            console.error("❌ Shopify Discount Creation Errors:", JSON.stringify(userErrors, null, 2));
            return json({
              error: `Shopify Error: ${userErrors.map(e => e.message).join(', ')}`
            }, { status: 400 });
          } else if (responseJson.data?.[resultKey]?.[nodeKey]) {
            shopifyDiscountId = responseJson.data[resultKey][nodeKey].id;
            console.log("✅ Created in Shopify:", shopifyDiscountId);
          }
        } catch (err) {
          console.error("❌ Failed to create discount in Shopify (Network/System):", err);
          return json({ error: "Failed to sync with Shopify: " + err.message }, { status: 500 });
        }
      } else if (type === 'buy_x_get_y') {
        console.log("[Discount Engine] Processing Buy X Get Y discount creation...");
        try {
          const buyQuantityStr = String(formData.get('buyQuantity'));
          const getQuantityInt = parseInt(formData.get('getQuantity'));

          // Parse Buy items — Shopify REQUIRES specific products or collections for customerBuys
          let customerBuysItems = null;
          try {
            const buyDataRaw = formData.get('buyProduct');
            const buyData = typeof buyDataRaw === 'string' ? JSON.parse(buyDataRaw) : buyDataRaw;
            if (buyData && buyData.type === 'product' && buyData.selection?.length > 0) {
              customerBuysItems = { products: { productsToAdd: buyData.selection.map(p => p.id || p.value) } };
            } else if (buyData && buyData.type === 'collection' && buyData.selection?.length > 0) {
              customerBuysItems = { collections: { add: buyData.selection.map(c => c.id || c.value) } };
            }
          } catch (e) {
            console.error("[Discounts API - BXGY] Error parsing buyProduct:", e);
          }

          // Parse Get items — 'all: true' is valid for customerGets
          let customerGetsItems = { all: true };
          try {
            const getDataRaw = formData.get('getProduct');
            const getData = typeof getDataRaw === 'string' ? JSON.parse(getDataRaw) : getDataRaw;
            if (getData && getData.type === 'product' && getData.selection?.length > 0) {
              customerGetsItems = { products: { productsToAdd: getData.selection.map(p => p.id || p.value) } };
            } else if (getData && getData.type === 'collection' && getData.selection?.length > 0) {
              customerGetsItems = { collections: { add: getData.selection.map(c => c.id || c.value) } };
            }
          } catch (e) {
            console.error("[Discounts API - BXGY] Error parsing getProduct:", e);
          }

          if (!customerBuysItems) {
            console.warn("[Discounts API - BXGY] No buy product/collection selected. Shopify ID will be null. Saving locally only.");
          }

          const discountMethod = formData.get('method') || 'code';
          const mutation = discountMethod === 'auto'
            ? `#graphql
              mutation discountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
                discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
                  automaticDiscountNode { id }
                  userErrors { field message }
                }
              }`
            : `#graphql
              mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
                discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
                  codeDiscountNode { id }
                  userErrors { field message }
                }
              }`;

          const combinationsRaw = formData.get('combinations');
          const combinations = (typeof combinationsRaw === 'string' ? JSON.parse(combinationsRaw) : combinationsRaw) || {};

          const commonBxgyConfig = {
            title: title,
            startsAt: formData.get('startDate') ? new Date(formData.get('startDate')).toISOString() : new Date().toISOString(),
            endsAt: (formData.get('endDate') && formData.get('endDate') !== 'No end date') ? new Date(formData.get('endDate')).toISOString() : null,
            customerBuys: {
              value: { quantity: buyQuantityStr },
              items: customerBuysItems
            },
            customerGets: {
              value: {
                discountOnQuantity: {
                  quantity: String(getQuantityInt),
                  effect: (formData.get('getValueType') === 'fixed_amount')
                    ? { amount: String(parseFloat(formData.get('getValue') || 0) || 0) }
                    : { percentage: (formData.get('getValueType') === 'free') ? 1.0 : (parseFloat(formData.get('getValue') || 0) / 100) || 0 }
                }
              },
              items: customerGetsItems
            },
            combinesWith: {
              orderDiscounts: combinations.order || false,
              productDiscounts: combinations.product || false,
              shippingDiscounts: combinations.shipping || false
            }
          };

          const bxgyVariables = discountMethod === 'auto'
            ? { automaticBxgyDiscount: commonBxgyConfig }
            : {
              bxgyCodeDiscount: {
                ...commonBxgyConfig,
                code: code,
                customerSelection: customerSelection,
                usageLimit: formData.get('maxUsage') ? parseInt(formData.get('maxUsage')) : null,
                appliesOncePerCustomer: String(formData.get('oncePerCustomer')) === 'true',
              }
            };

          if (customerBuysItems) {
            console.log("🔍 [BXGY DEBUG] Sending to Shopify:\n" + JSON.stringify(bxgyVariables, null, 2));
            try {
              const bxgyResponse = await admin.graphql(mutation, { variables: bxgyVariables });
              const bxgyJson = await bxgyResponse.json();
              console.log("[Discounts API - BXGY] Raw Shopify response:", JSON.stringify(bxgyJson, null, 2));

              const resultKey = discountMethod === 'auto' ? 'discountAutomaticBxgyCreate' : 'discountCodeBxgyCreate';
              const nodeKey = discountMethod === 'auto' ? 'automaticDiscountNode' : 'codeDiscountNode';
              const userErrors = bxgyJson.data?.[resultKey]?.userErrors || [];

              if (userErrors.length > 0) {
                console.error("[Discounts API - BXGY] ❌ Shopify userErrors:", JSON.stringify(userErrors, null, 2));
              } else if (bxgyJson.data?.[resultKey]?.[nodeKey]?.id) {
                shopifyDiscountId = bxgyJson.data[resultKey][nodeKey].id;
                console.log("[Discounts API - BXGY] ✅ Shopify ID stored:", shopifyDiscountId);
              } else {
                console.warn("[Discounts API - BXGY] ⚠️ No discount node returned. Full response:", JSON.stringify(bxgyJson, null, 2));
              }
            } catch (bxgyErr) {
              console.error("[Discounts API - BXGY] Shopify call failed:", bxgyErr.message);
            }
          }
        } catch (err) {
          console.error("[Discounts API - BXGY] Shopify Creation Failed:", err);
          return json({ error: "Failed to create BXGY discount: " + err.message }, { status: 500 });
        }
      }

      const newDiscount = {
        id: Math.max(...discounts.map((d) => d.id), 0) + 1,
        shopifyId: shopifyDiscountId, // Store the real ID
        title,
        description: formData.get('description') || '',
        code,
        type,
        value,
        valueType: formData.get('valueType') || (type === 'buy_x_get_y' ? formData.get('getValueType') : 'percentage'),
        status: 'active',
        usage: '0 / ' + (formData.get('maxUsage') || 'Unlimited'),
        eligibility: formData.get('eligibility'),
        minRequirementType: formData.get('minRequirementType'),
        minRequirementValue: formData.get('minRequirementValue'),
        combinations: safeParse(formData.get('combinations'), {}),
        oncePerCustomer: safeBool(formData.get('oncePerCustomer')),
        // New "Applies To" fields
        appliesTo: formData.get('appliesTo') || 'all_products',
        selectedProducts: safeParse(formData.get('selectedProducts')),
        selectedCollections: safeParse(formData.get('selectedCollections')),
        created: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        buyQuantity: formData.get('buyQuantity'),
        buyProduct: formData.get('buyProduct'),
        getQuantity: formData.get('getQuantity'),
        getProduct: formData.get('getProduct'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        autoApply: safeBool(formData.get('autoApply')),
        selectedSegments: safeParse(formData.get('selectedSegments')),
        selectedCustomers: safeParse(formData.get('selectedCustomers')),
      };

      discounts.unshift(newDiscount);
      saveFakeDiscounts(discounts);

      console.log(
        `[Combo App Console] Success Notification: Discount '${title}' created.`
      );

      console.log("[Discount Engine] 📤 Synchronizing to PHP...");



      // 2. Save to MySQL via discount.php (Direct)
      try {
        const dbResult = await syncToPhp({
          event: "create",
          resource: "discount",
          shop,
          data: newDiscount
        }, "discount.php");
        console.log("[Discount Engine] ✅ MySQL Save Result:", dbResult);
      } catch (err) {
        console.error("MySQL Sync Error (Create):", err.message);
      }

      return json({
        success: true,
        discount: newDiscount,
        message: 'Discount created successfully',
      });
    } else if (method === 'POST' && intent === 'update') {
      const id = formData.get('id');
      const title = formData.get('title');
      const value = formData.get('value');
      const type = formData.get('type');
      const status = formData.get('status');
      const passedMethod = formData.get('method');

      let index = discounts.findIndex((d) =>
        String(d.id) === String(id) ||
        (d.shopifyId && String(d.shopifyId) === String(id))
      );

      let targetDiscount;
      if (index > -1) {
        targetDiscount = discounts[index];
      } else if (String(id).startsWith('gid://')) {
        // It's a Shopify discount not yet in local DB, create a temporary one for processing
        targetDiscount = {
          id: id,
          shopifyId: id,
          title: title || 'Imported Discount',
          status: 'active',
          method: passedMethod || 'code'
        };
      }

      if (targetDiscount) {
        const isAutomatic = passedMethod === 'auto' || targetDiscount.method === 'auto' || (targetDiscount.usage?.includes('Automatic'));
        const shopifyId = targetDiscount.shopifyId || (String(id).startsWith('gid://') ? id : null);

        // 1. Update status on Shopify if status is being toggled
        if (shopifyId && status) {
          try {
            const isActivating = status === 'active';
            console.log(`[Discount Engine] ${isActivating ? 'Activating' : 'Deactivating'} on Shopify: ${shopifyId}`);

            const mutation = isAutomatic
              ? (isActivating
                ? `#graphql mutation { discountAutomaticActivate(id: "${shopifyId}") { automaticDiscountNode { id status } userErrors { message } } }`
                : `#graphql mutation { discountAutomaticDeactivate(id: "${shopifyId}") { automaticDiscountNode { id status } userErrors { message } } }`)
              : (isActivating
                ? `#graphql mutation { discountCodeActivate(id: "${shopifyId}") { codeDiscountNode { id status } userErrors { message } } }`
                : `#graphql mutation { discountCodeDeactivate(id: "${shopifyId}") { codeDiscountNode { id status } userErrors { message } } }`);

            const shopifyResponse = await admin.graphql(mutation);
            const shopifyResult = await shopifyResponse.json();
            console.log("[Discount Engine] Shopify Status Update Result:", JSON.stringify(shopifyResult, null, 2));
          } catch (err) {
            console.error("Failed to update status on Shopify:", err.message);
          }
        }

        const updatedDiscount = {
          ...(targetDiscount || {}),
          title: title || targetDiscount.title,
          description: formData.get('description') || targetDiscount.description || '',
          value: value || targetDiscount.value,
          valueType: formData.get('valueType') || (type === 'buy_x_get_y' ? formData.get('getValueType') : (targetDiscount.valueType || 'percentage')),
          type: type || targetDiscount.type,
          status: status || targetDiscount.status,
          buyQuantity: formData.get('buyQuantity') || targetDiscount.buyQuantity,
          buyProduct: formData.get('buyProduct') || targetDiscount.buyProduct,
          getQuantity: formData.get('getQuantity') || targetDiscount.getQuantity,
          getProduct: formData.get('getProduct') || targetDiscount.getProduct,
          minRequirementType: formData.get('minRequirementType') || targetDiscount.minRequirementType,
          minRequirementValue: formData.get('minRequirementValue') || targetDiscount.minRequirementValue,
          combinations: safeParse(formData.get('combinations'), targetDiscount.combinations || {}),
          oncePerCustomer: formData.get('oncePerCustomer') !== null ? safeBool(formData.get('oncePerCustomer')) : (targetDiscount.oncePerCustomer || false),
          usage: (targetDiscount.usage?.split(' / ')[0] || '0') + ' / ' + (formData.get('maxUsage') || targetDiscount.usage?.split(' / ')[1] || 'Unlimited'),
          startDate: formData.get('startDate') || targetDiscount.startDate,
          endDate: formData.get('endDate') || targetDiscount.endDate,
          autoApply: safeBool(formData.get('autoApply')),
          appliesTo: formData.get('appliesTo') || targetDiscount.appliesTo || 'all_products',
          selectedProducts: safeParse(formData.get('selectedProducts'), targetDiscount.selectedProducts),
          selectedCollections: safeParse(formData.get('selectedCollections'), targetDiscount.selectedCollections),
        };

        if (index > -1) {
          discounts[index] = updatedDiscount;
        } else {
          // Add to local DB if it was a Shopify-only discount
          discounts.push(updatedDiscount);
        }

        saveFakeDiscounts(discounts);

        // 2. Update in PHP Backend
        try {
          await syncToPhp({
            event: "update",
            resource: "discount",
            shop,
            data: updatedDiscount
          }, "discount.php");
        } catch (err) {
          console.error("MySQL Sync Error (Update):", err.message);
        }

        return json({
          success: true,
          discount: updatedDiscount,
          message: 'Discount updated successfully',
        });
      }

      console.error(`[Discount Engine] Error: Discount with ID ${id} not found in local DB or as Shopify GID.`);
      return json({ error: 'Discount not found' }, { status: 404 });
    } else if (
      method === 'DELETE' ||
      (method === 'POST' && intent === 'delete')
    ) {
      // fetcher might use POST for delete
      const id = formData.get('id');
      const passedMethod = formData.get('method'); // 'auto' or 'code'
      const initialLength = discounts.length;

      // Find the discount in local list first to get shopifyId if available
      const targetDiscount = discounts.find((d) =>
        String(d.id) === String(id) ||
        (d.shopifyId && String(d.shopifyId) === String(id))
      );

      // 1. Delete from Shopify if shopifyId exists
      const shopifyId = targetDiscount?.shopifyId || (String(id).startsWith('gid://') ? id : null);
      if (shopifyId) {
        try {
          const isAutomatic = passedMethod === 'auto' || targetDiscount?.method === 'auto' || (targetDiscount?.usage?.includes('Automatic'));
          console.log(`[Discount Engine] Deleting from Shopify: ${shopifyId} (Mode: ${isAutomatic ? 'Automatic' : 'Code'})`);

          const mutation = isAutomatic
            ? `#graphql
              mutation discountAutomaticDelete($id: ID!) {
                discountAutomaticDelete(id: $id) {
                  deletedAutomaticDiscountId
                  userErrors { field message }
                }
              }`
            : `#graphql
              mutation discountCodeDelete($id: ID!) {
                discountCodeDelete(id: $id) {
                  deletedCodeDiscountId
                  userErrors { field message }
                }
              }`;

          const response = await admin.graphql(mutation, { variables: { id: shopifyId } });
          const respJson = await response.json();
          console.log("[Discount Engine] Shopify Delete Result:", JSON.stringify(respJson, null, 2));

          const resultKey = isAutomatic ? 'discountAutomaticDelete' : 'discountCodeDelete';
          if (respJson.data?.[resultKey]?.userErrors?.length > 0) {
            console.error("[Discount Engine] Shopify Mutation Errors:", respJson.data[resultKey].userErrors);
          }
        } catch (e) {
          console.error("Failed to delete from Shopify:", e.message);
        }
      }

      const filtered = discounts.filter((d) =>
        String(d.id) !== String(id) &&
        (!d.shopifyId || String(d.shopifyId) !== String(id))
      );

      if (filtered.length < initialLength || shopifyId) {
        saveFakeDiscounts(filtered);
        console.log(`[Combo App Console] Success Notification: Discount deleted.`);

        console.log("[Discount Engine] 📤 Synchronizing delete to PHP...");

        // 2. Delete from MySQL via discount.php (Direct)
        try {
          await syncToPhp({
            event: "delete",
            resource: "discount",
            shop,
            data: { id: targetDiscount?.id || id, shopifyId: shopifyId }
          }, "discount.php");
        } catch (err) {
          console.error("MySQL Sync Error (Delete):", err.message);
        }

        return json({ success: true, message: 'Discount deleted successfully' });
      }
      return json({ error: 'Discount not found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[Combo App Console] Error Notification: ${error.message}`);
    return json({ error: error.message }, { status: 500 });
  }

  return json({ error: 'Invalid action' });
};

export default function DiscountEngine() {
  // Mocked product list - replace with Shopify API call for real data
  const shopifyProducts = [
    { label: 'T-shirt', value: 'prod_1' },
    { label: 'Mug', value: 'prod_2' },
    { label: 'Hat', value: 'prod_3' },
    { label: 'Bag', value: 'prod_4' },
  ];
  const shopify = useAppBridge();
  const { discounts: initialDiscounts } = useLoaderData();
  const fetcher = useFetcher();
  const [discounts, setDiscounts] = useState(initialDiscounts);

  // Custom Status Toggle UI Component
  const StatusToggle = ({ status, onToggle, loading }) => {
    const isActive = status === 'active';
    return (
      <div
        onClick={!loading ? onToggle : undefined}
        style={{
          width: '94px',
          height: '34px',
          borderRadius: '17px',
          backgroundColor: isActive ? '#28a745' : '#dc3545',
          display: 'flex',
          alignItems: 'center',
          padding: '0 5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          userSelect: 'none',
          opacity: loading ? 0.6 : 1,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <span style={{
          color: '#fff',
          fontSize: '10px',
          fontWeight: '900',
          letterSpacing: '0.5px',
          marginLeft: isActive ? '10px' : 'auto',
          marginRight: isActive ? 'auto' : '10px',
          zIndex: 1,
          fontFamily: 'Inter, sans-serif'
        }}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          position: 'absolute',
          left: isActive ? 'auto' : '5px',
          right: isActive ? '5px' : 'auto',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </div>
    );
  };

  useEffect(() => {
    setDiscounts(initialDiscounts);
  }, [initialDiscounts]);

  // Success handling after creation/update
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      shopify.toast.show(fetcher.data.message || 'Success');
      setShowCreateForm(false);
      setEditingDiscount(null);
      // Reset form states
      setDTitle('');
      setDCode('');
      setDMethod('code');
      setDValue('');
      setDBuyQuantity('');
      setDGetQuantity('');
      setDGetProductSelection([]);
      setDBuyProductSelection([]);
      setDEligibility('all');
      setDSelectedSegments([]);
      setDSelectedCustomers([]);
      setAppliesTo('all_products');
      setSelectedProducts([]);
      setSelectedCollections([]);
    } else if (fetcher.data?.error && fetcher.state === 'idle') {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, fetcher.state, shopify]);

  const [selectTypeModalOpen, setSelectTypeModalOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [popoverActive, setPopoverActive] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState(null);

  // Shopify Code Form state
  const [dTitle, setDTitle] = useState('');
  const [dCode, setDCode] = useState('');
  const [dMethod, setDMethod] = useState('code'); // 'code' or 'auto'
  const [dType, setDType] = useState('amount_off_products'); // amount_off_products, buy_x_get_y, amount_off_order, free_shipping
  const [dValue, setDValue] = useState('');
  const [dBuyQuantity, setDBuyQuantity] = useState('');
  const [dGetQuantity, setDGetQuantity] = useState('');
  const [dGetProduct, setDGetProduct] = useState('');
  // New State for "Get Product" Resource Picker
  const [dGetProductType, setDGetProductType] = useState('product'); // 'product' or 'collection'
  const [dGetProductSelection, setDGetProductSelection] = useState([]);

  // New State for "Buy Product" Resource Picker
  const [dBuyProductType, setDBuyProductType] = useState('product');
  const [dBuyProductSelection, setDBuyProductSelection] = useState([]);


  const [dStartsAt, setDStartsAt] = useState('');
  const [dEndsAt, setDEndsAt] = useState('');
  const [dOncePerCustomer, setDOncePerCustomer] = useState(false);

  // New State for Advanced Options
  const [dEligibility, setDEligibility] = useState('all'); // all, segments, customers
  const [dMinRequirementType, setDMinRequirementType] = useState('none'); // none, amount, quantity
  const [dMinRequirementValue, setDMinRequirementValue] = useState('');
  const [dLimitUsage, setDLimitUsage] = useState(false);
  const [dMaxUsageLimit, setDMaxUsageLimit] = useState('');
  const [dCombinations, setDCombinations] = useState({
    product: false,
    order: false,
    shipping: false,
  });

  // Additional states for Shopify-like experience
  const [dValueType, setDValueType] = useState('percentage'); // percentage, fixed_amount
  const [dHasEndDate, setDHasEndDate] = useState(false);
  const [dGetValueType, setDGetValueType] = useState('percentage'); // percentage, fixed_amount, free
  const [dGetValue, setDGetValue] = useState('');
  const [dSelectedSegments, setDSelectedSegments] = useState([]);
  const [dSelectedCustomers, setDSelectedCustomers] = useState([]);
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // New State for "Applies To" Feature
  const [appliesTo, setAppliesTo] = useState('all_products'); // all_products, specific_collections, specific_products
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);

  // Mock Data for Eligibility
  const mockSegments = [
    { id: 'seg_1', title: 'New subscribers' },
    { id: 'seg_2', title: 'High value customers' },
    { id: 'seg_3', title: 'Abandoned checkout in last 30 days' },
    { id: 'seg_4', title: 'Email subscribers' },
  ];

  const mockCustomers = [
    { id: 'cust_1', displayName: 'John Doe', email: 'john@example.com' },
    { id: 'cust_2', displayName: 'Jane Smith', email: 'jane@example.com' },
    { id: 'cust_3', displayName: 'Bob Johnson', email: 'bob@example.com' },
    { id: 'cust_4', displayName: 'Alice Williams', email: 'alice@example.com' },
  ];

  const handleMainFormSubmit = (event) => {
    event.preventDefault();
    if (!dTitle) {
      shopify.toast.show('Please enter a title', { isError: true });
      return;
    }

    if (dType === 'buy_x_get_y') {
      if (!dBuyQuantity || !dGetQuantity) {
        shopify.toast.show('Please fill quantity fields', { isError: true });
        return;
      }
      if (dBuyProductSelection.length === 0 || dGetProductSelection.length === 0) {
        shopify.toast.show('Please select buy and get products', { isError: true });
        return;
      }
    }

    const payload = {
      title: dTitle,
      code: dMethod === 'auto' ? '' : dCode,
      method: dMethod,
      type: dType,
      value: dType === 'buy_x_get_y' ? dGetValue : dValue,
      valueType: dType === 'buy_x_get_y' ? dGetValueType : dValueType,
      // For BXGY specifically if we want to be explicit
      getValue: dGetValue,
      getValueType: dGetValueType,
      buyQuantity: dBuyQuantity,
      getQuantity: dGetQuantity,
      buyProduct: JSON.stringify({ type: dBuyProductType, selection: dBuyProductSelection }),
      getProduct: JSON.stringify({ type: dGetProductType, selection: dGetProductSelection }),
      minRequirementType: dMinRequirementType,
      minRequirementValue: dMinRequirementValue,
      maxUsage: dLimitUsage ? dMaxUsageLimit : '',
      oncePerCustomer: dOncePerCustomer,
      startDate: dStartsAt,
      endDate: dEndsAt,
      combinations: dCombinations,
      appliesTo: appliesTo,
      selectedProducts: JSON.stringify(selectedProducts),
      selectedCollections: JSON.stringify(selectedCollections),
      active: true,
      // Eligibility Details
      eligibility: dEligibility,
      selectedSegments: JSON.stringify(dSelectedSegments),
      selectedCustomers: JSON.stringify(dSelectedCustomers),
    };

    fetcher.submit(
      { intent: editingDiscount ? 'update' : 'create', id: editingDiscount?.id, ...payload },
      { method: "POST", encType: "application/json" }
    );
  };

  const resetDiscountForm = (type) => {
    setEditingDiscount(null);
    setDType(type);
    setDTitle('');
    setDCode('');
    setDMethod('code');
    setDValue('');
    setDBuyQuantity('');
    setDGetQuantity('');
    setDGetProductType('product');
    setDGetProductSelection([]);
    setDBuyProductType('product');
    setDBuyProductSelection([]);
    setDStartsAt(new Date().toISOString().split('T')[0] + 'T00:00');
    setDEndsAt('');
    setDOncePerCustomer(false);
    setDEligibility('all');
    setDSelectedSegments([]);
    setDSelectedCustomers([]);
    setDMinRequirementType('none');
    setDMinRequirementValue('');
    setDLimitUsage(false);
    setDMaxUsageLimit('');
    setDCombinations({
      product: false,
      order: false,
      shipping: false,
    });
    setAppliesTo('all_products');
    setSelectedProducts([]);
    setSelectedCollections([]);
    setShowCreateForm(true);
  };

  const handleCreateDiscount = () => {
    setSelectTypeModalOpen(true);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setDTitle(discount.title);
    setDCode(discount.code || '');
    setDMethod(discount.method || 'code');
    setDType(discount.type || 'amount_off_products');
    setDValue(discount.value || '');
    setDBuyQuantity(discount.buyQuantity || '');
    setDGetQuantity(discount.getQuantity || '');
    setDStartsAt(discount.startDate || '');
    setDEndsAt(discount.endDate || '');

    setAppliesTo(discount.appliesTo || 'all_products');
    setSelectedProducts(discount.selectedProducts || []);
    setSelectedCollections(discount.selectedCollections || []);
    setDEligibility(discount.eligibility || 'all');
    setDSelectedSegments(discount.selectedSegments || []);
    setDSelectedCustomers(discount.selectedCustomers || []);

    setShowCreateForm(true);
  };

  const handleToggleStatus = (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    fetcher.submit(
      { ...item, status: newStatus, intent: 'update' },
      { method: 'post', encType: 'application/json' }
    );
  };

  const handleDeleteDiscount = (item) => {
    setDiscountToDelete(item);
    setDeleteModalOpen(true);
    setPopoverActive(null);
  };

  const confirmDelete = () => {
    if (discountToDelete) {
      fetcher.submit({
        id: discountToDelete.id || discountToDelete.shopifyId,
        method: discountToDelete.method || 'code',
        intent: 'delete'
      }, { method: 'post' });
      setDeleteModalOpen(false);
      setDiscountToDelete(null);
    }
  };

  const handleDuplicateDiscount = (discount) => {
    const newDiscount = {
      ...discount,
      id: Math.max(...discounts.map((d) => d.id), 0) + 1,
      title: `${discount.title} (Copy)`,
    };
    setDiscounts([...discounts, newDiscount]);
    setPopoverActive(null);
    shopify.toast.show('Discount duplicated');
  };

  // Resource Picker Functions for Products and Collections
  const selectResources = async (type, setter) => {
    try {
      const resources = await shopify.resourcePicker({
        type: type,
        multiple: true,
        action: 'select',
      });

      if (resources && resources.length > 0) {
        setter(resources);
        shopify.toast.show(`${resources.length} ${type}(s) selected`);
      }
    } catch (error) {
      console.error(`${type} selection error:`, error);
    }
  };

  const selectProducts = () => selectResources('product', setSelectedProducts);
  const selectCollections = () => selectResources('collection', setSelectedCollections);
  const selectGetProducts = () => selectResources('product', setDGetProductSelection);
  const selectGetCollections = () => selectResources('collection', setDGetProductSelection);
  const selectBuyProducts = () => selectResources('product', setDBuyProductSelection);
  const selectBuyCollections = () => selectResources('collection', setDBuyProductSelection);

  const removeBuyResource = (id) => {
    setDBuyProductSelection(dBuyProductSelection.filter(r => r.id !== id));
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const removeCollection = (collectionId) => {
    setSelectedCollections(selectedCollections.filter(c => c.id !== collectionId));
  };

  const removeGetResource = (id) => {
    setDGetProductSelection(dGetProductSelection.filter(r => r.id !== id));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'attention', label: 'Inactive' },
      scheduled: { color: 'warning', label: 'Scheduled' },
      expired: { color: 'subdued', label: 'Expired' },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return <Badge tone={config.color}>{config.label}</Badge>;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      percentage: 'Percentage',
      fixed: 'Fixed amount',
      amount_off_products: 'Amount off products',
      buy_x_get_y: 'Buy X get Y',
      amount_off_order: 'Amount off order',
      free_shipping: 'Free shipping',
    };
    return typeMap[type] || type;
  };

  const activeDiscounts = discounts.filter((d) => d.status === 'active').length;
  const totalDiscounts = discounts.length;

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      discounts.map((discount) => ({
        ...discount,
        id: `discount-${discount.id}`,
      }))
    );

  const SelectDiscountTypeModal = () => (
    <Modal
      open={selectTypeModalOpen}
      onClose={() => setSelectTypeModalOpen(false)}
      title="Select discount type"
      secondaryActions={[{ content: 'Cancel', onAction: () => setSelectTypeModalOpen(false) }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Option 1: Amount off products */}
          <div
            onClick={() => { resetDiscountForm('amount_off_products'); setSelectTypeModalOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ background: '#F1F1F1', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon source={DiscountIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">Amount off products</Text>
              <Text variant="bodySm" tone="subdued" as="p">Discount specific products or collections of products</Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 2: Buy X get Y */}
          <div
            onClick={() => { resetDiscountForm('buy_x_get_y'); setSelectTypeModalOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ background: '#F1F1F1', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon source={ProductIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">Buy X get Y</Text>
              <Text variant="bodySm" tone="subdued" as="p">Discount specific products or collections of products</Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 3: Amount off order */}
          <div
            onClick={() => { resetDiscountForm('amount_off_order'); setSelectTypeModalOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ background: '#F1F1F1', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon source={CartIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">Amount off order</Text>
              <Text variant="bodySm" tone="subdued" as="p">Discount the total order amount</Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 4: Free shipping */}
          <div
            onClick={() => { resetDiscountForm('free_shipping'); setSelectTypeModalOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ background: '#F1F1F1', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon source={DeliveryIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">Free shipping</Text>
              <Text variant="bodySm" tone="subdued" as="p">Offer free shipping on an order</Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page
      fullWidth
      backAction={showCreateForm ? { content: 'Discounts', onAction: () => setShowCreateForm(false) } : undefined}
      title={showCreateForm ? (editingDiscount ? 'Edit discount' : 'Create discount') : 'Discounts'}
      primaryAction={!showCreateForm ? {
        content: 'Create discount',
        onAction: () => setSelectTypeModalOpen(true)
      } : undefined}
    >
      {!showCreateForm ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Stats Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">ACTIVE DISCOUNTS</Text>
                <Text variant="headingLg" as="p">{activeDiscounts}</Text>
                <Text variant="bodySm" tone="subdued">out of {totalDiscounts} total</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">TOTAL USAGE</Text>
                <Text variant="headingLg" as="p">
                  {discounts.reduce((sum, d) => sum + (parseInt(d.usage.split(' / ')[0]) || 0), 0)}
                </Text>
                <Text variant="bodySm" tone="subdued">across all discounts</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">SHOPIFY SYNC</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text variant="headingLg" as="p">Connected</Text>
                  <Badge tone="success">Active</Badge>
                </div>
                <Text variant="bodySm" tone="subdued">Real-time synchronization</Text>
              </BlockStack>
            </Card>
          </div>

          {/* Discounts Table */}
          <Card padding="0">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="headingMd" as="h2">Internal Discounts</Text>
              <Button size="slim" onClick={() => setSelectTypeModalOpen(true)}>+ New Discount</Button>
            </div>

            {discounts.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <EmptyState
                  heading="No discounts yet"
                  action={{ content: 'Create discount', onAction: () => setSelectTypeModalOpen(true) }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create your first discount to get started.</p>
                </EmptyState>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>DISCOUNT</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>TYPE</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>USAGE</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>STATUS</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>DATE</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <Text fontWeight="bold" variant="bodyMd">{item.title}</Text>
                          {item.code && <Text variant="bodySm" tone="subdued">{item.code}</Text>}
                        </td>
                        <td style={{ padding: '12px 20px' }}><Badge>{getTypeLabel(item.type)}</Badge></td>
                        <td style={{ padding: '12px 20px' }}><Text variant="bodySm">{item.usage}</Text></td>
                        <td style={{ padding: '12px 20px' }}>
                          <StatusToggle
                            status={item.status}
                            onToggle={() => handleToggleStatus(item)}
                            loading={fetcher.state !== 'idle' && fetcher.formData?.get('id') === String(item.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 20px' }}><Text variant="bodySm">{item.created || 'N/A'}</Text></td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <InlineStack align="center" gap="200">
                            <Button icon={EditIcon} variant="plain" onClick={() => handleEditDiscount(item)} />
                            <Button icon={DeleteIcon} variant="plain" tone="critical" onClick={() => handleDeleteDiscount(item)} />
                          </InlineStack>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <fetcher.Form method="post" onSubmit={handleMainFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <BlockStack gap="400">
              {/* Header Card (Type & Method) */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    {dType === 'amount_off_products' && 'Amount off products'}
                    {dType === 'buy_x_get_y' && 'Buy X get Y'}
                    {dType === 'amount_off_order' && 'Amount off order'}
                    {dType === 'free_shipping' && 'Free shipping'}
                  </Text>

                  <Box>
                    <Text variant="bodyMd" fontWeight="medium">Method</Text>
                    <div style={{ display: 'flex', border: '1px solid #D1D5DB', borderRadius: '8px', overflow: 'hidden', width: 'fit-content', marginTop: '8px', marginBottom: '20px' }}>
                      <button
                        type="button"
                        onClick={() => setDMethod('code')}
                        style={{ padding: '10px 16px', background: dMethod === 'code' ? '#F3F4F6' : '#fff', border: 'none', borderRight: '1px solid #D1D5DB', cursor: 'pointer', fontWeight: dMethod === 'code' ? '600' : '400', fontSize: '13px' }}
                      >
                        Discount code
                      </button>
                      <button
                        type="button"
                        onClick={() => setDMethod('auto')}
                        style={{ padding: '10px 16px', background: dMethod === 'auto' ? '#F3F4F6' : '#fff', border: 'none', cursor: 'pointer', fontWeight: dMethod === 'auto' ? '600' : '400', fontSize: '13px' }}
                      >
                        Automatic discount
                      </button>
                    </div>

                    <BlockStack gap="400">
                      <TextField
                        label="Title"
                        value={dTitle}
                        onChange={setDTitle}
                        placeholder="e.g. Summer Sale 2024"
                        autoComplete="off"
                        helpText="For internal use. Customers will see this in their cart."
                      />

                      {dMethod === 'code' && (
                        <TextField
                          label="Discount code"
                          value={dCode}
                          onChange={(val) => setDCode(val.toUpperCase())}
                          autoComplete="off"
                          helpText="Customers must enter this code at checkout."
                          suffix={
                            <Button variant="plain" onClick={() => setDCode(Math.random().toString(36).substring(2, 10).toUpperCase())}>
                              Generate random code
                            </Button>
                          }
                        />
                      )}
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Type Specific Configuration */}
              {(dType === 'amount_off_products' || dType === 'amount_off_order') && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Discount value</Text>

                    <InlineStack gap="400">
                      <div style={{ flex: 1 }}>
                        <Select
                          label="Value type"
                          options={[
                            { label: 'Percentage', value: 'percentage' },
                            { label: 'Fixed amount', value: 'fixed_amount' },
                          ]}
                          value={dValueType}
                          onChange={setDValueType}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Discount value"
                          type="number"
                          value={dValue}
                          onChange={setDValue}
                          suffix={dValueType === 'percentage' ? '%' : '₹'}
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>

                    {dType === 'amount_off_products' && (
                      <>
                        <InlineStack gap="400">
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Applies to"
                              options={[
                                { label: 'All products', value: 'all_products' },
                                { label: 'Specific collections', value: 'specific_collections' },
                                { label: 'Specific products', value: 'specific_products' },
                              ]}
                              value={appliesTo}
                              onChange={setAppliesTo}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Purchase type"
                              options={[
                                { label: 'One-time purchase', value: 'one_time' },
                                { label: 'Subscription', value: 'subscription' },
                                { label: 'Both', value: 'both' },
                              ]}
                              value="one_time"
                              onChange={() => { }}
                            />
                          </div>
                        </InlineStack>

                        {appliesTo !== 'all_products' && (
                          <div style={{ marginTop: '20px' }}>
                            <TextField
                              placeholder={appliesTo === 'specific_collections' ? 'Search collections' : 'Search products'}
                              suffix={<Button onClick={appliesTo === 'specific_collections' ? selectCollections : selectProducts}>Browse</Button>}
                              autoComplete="off"
                            />
                            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {(appliesTo === 'specific_collections' ? selectedCollections : selectedProducts).map(item => (
                                <Badge key={item.id} onRemove={() => (appliesTo === 'specific_collections' ? removeCollection(item.id) : removeProduct(item.id))}>
                                  {item.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Shared Min Req Card for non-BXGY */}
              {dType !== 'buy_x_get_y' && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">Minimum purchase requirements</Text>
                    <BlockStack gap="200">
                      <RadioButton label="No minimum requirements" checked={dMinRequirementType === 'none'} onChange={() => setDMinRequirementType('none')} />
                      <RadioButton label="Minimum purchase amount (₹)" checked={dMinRequirementType === 'amount'} onChange={() => setDMinRequirementType('amount')} />
                      {dMinRequirementType === 'amount' && (
                        <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                          <TextField type="number" placeholder="0.00" value={dMinRequirementValue} onChange={setDMinRequirementValue} autoComplete="off" />
                        </div>
                      )}
                      <RadioButton label="Minimum quantity of items" checked={dMinRequirementType === 'quantity'} onChange={() => setDMinRequirementType('quantity')} />
                      {dMinRequirementType === 'quantity' && (
                        <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                          <TextField type="number" placeholder="0" value={dMinRequirementValue} onChange={setDMinRequirementValue} autoComplete="off" />
                        </div>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {dType === 'buy_x_get_y' && (
                <>
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">Customer buys</Text>
                      <Box>
                        <Text variant="bodyMd">Any items from</Text>
                        <div style={{ marginTop: '8px' }}>
                          <InlineStack gap="400">
                            <RadioButton label="Specific products" checked={dBuyProductType === 'product'} onChange={() => setDBuyProductType('product')} />
                            <RadioButton label="Specific collections" checked={dBuyProductType === 'collection'} onChange={() => setDBuyProductType('collection')} />
                          </InlineStack>
                        </div>
                      </Box>
                      <InlineStack gap="400" blockAlign="end">
                        <div style={{ width: '100px' }}>
                          <TextField label="Quantity" type="number" value={dBuyQuantity} onChange={setDBuyQuantity} autoComplete="off" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            placeholder={dBuyProductType === 'product' ? 'Search products' : 'Search collections'}
                            suffix={<Button onClick={() => dBuyProductType === 'product' ? selectBuyProducts() : selectBuyCollections()}>Browse</Button>}
                            autoComplete="off"
                          />
                          <div style={{ marginTop: '8px' }}>
                            <InlineStack gap="200" wrap={true}>
                              {dBuyProductSelection.map((item) => (
                                <Badge key={item.id} onRemove={() => removeBuyResource(item.id)}>
                                  {item.title}
                                </Badge>
                              ))}
                            </InlineStack>
                          </div>
                        </div>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">Customer gets</Text>
                      <Text tone="subdued" variant="bodySm">Customers must add the quantity of items specified below to their cart.</Text>
                      <InlineStack gap="400" blockAlign="end">
                        <div style={{ width: '100px' }}>
                          <TextField label="Quantity" type="number" value={dGetQuantity} onChange={setDGetQuantity} autoComplete="off" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            placeholder={dGetProductType === 'product' ? 'Search products' : 'Search collections'}
                            suffix={<Button onClick={() => dGetProductType === 'product' ? selectGetProducts() : selectGetCollections()}>Browse</Button>}
                            autoComplete="off"
                          />
                          <div style={{ marginTop: '8px' }}>
                            <InlineStack gap="200" wrap={true}>
                              {dGetProductSelection.map((item) => (
                                <Badge key={item.id} onRemove={() => removeGetResource(item.id)}>
                                  {item.title}
                                </Badge>
                              ))}
                            </InlineStack>
                          </div>
                        </div>
                      </InlineStack>
                      <Box>
                        <Text variant="headingSm" as="h4">At a discounted value</Text>
                        <div style={{ marginTop: '12px' }}>
                          <InlineStack gap="400">
                            <RadioButton label="Percentage" checked={dGetValueType === 'percentage'} onChange={() => setDGetValueType('percentage')} />
                            <RadioButton label="Amount off each" checked={dGetValueType === 'fixed_amount'} onChange={() => setDGetValueType('fixed_amount')} />
                            <RadioButton label="Free" checked={dGetValueType === 'free'} onChange={() => setDGetValueType('free')} />
                          </InlineStack>
                          {dGetValueType === 'percentage' && <div style={{ marginTop: '8px', maxWidth: '150px' }}><TextField type="number" suffix="%" value={dGetValue} onChange={setDGetValue} autoComplete="off" /></div>}
                          {dGetValueType === 'fixed_amount' && <div style={{ marginTop: '8px', maxWidth: '150px' }}><TextField type="number" suffix="₹" value={dGetValue} onChange={setDGetValue} autoComplete="off" /></div>}
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>

                  {/* Minimum Req for BXGY or others if needed */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">Minimum purchase requirements</Text>
                      <BlockStack gap="200">
                        <RadioButton label="No minimum requirements" checked={dMinRequirementType === 'none'} onChange={() => setDMinRequirementType('none')} />
                        <RadioButton label="Minimum purchase amount (₹)" checked={dMinRequirementType === 'amount'} onChange={() => setDMinRequirementType('amount')} />
                        {dMinRequirementType === 'amount' && (
                          <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                            <TextField type="number" placeholder="0.00" value={dMinRequirementValue} onChange={setDMinRequirementValue} autoComplete="off" />
                          </div>
                        )}
                        <RadioButton label="Minimum quantity of items" checked={dMinRequirementType === 'quantity'} onChange={() => setDMinRequirementType('quantity')} />
                        {dMinRequirementType === 'quantity' && (
                          <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                            <TextField type="number" placeholder="0" value={dMinRequirementValue} onChange={setDMinRequirementValue} autoComplete="off" />
                          </div>
                        )}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </>
              )}

              {/* Eligibility Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Customer eligibility</Text>
                  <BlockStack gap="200">
                    <RadioButton label="All customers" checked={dEligibility === 'all'} onChange={() => setDEligibility('all')} />
                    <RadioButton label="Specific customer segments" checked={dEligibility === 'segments'} onChange={() => setDEligibility('segments')} />
                    {dEligibility === 'segments' && (
                      <Box paddingInlineStart="600">
                        <TextField placeholder="Search segments" suffix={<Button onClick={() => setSegmentModalOpen(true)}>Browse</Button>} autoComplete="off" />
                        <InlineStack gap="200" wrap={true}>{dSelectedSegments.map(s => <Badge key={s.id} onRemove={() => setDSelectedSegments(prev => prev.filter(x => x.id !== s.id))}>{s.title}</Badge>)}</InlineStack>
                      </Box>
                    )}
                    <RadioButton label="Specific customers" checked={dEligibility === 'customers'} onChange={() => setDEligibility('customers')} />
                    {dEligibility === 'customers' && (
                      <Box paddingInlineStart="600">
                        <TextField placeholder="Search customers" suffix={<Button onClick={() => setCustomerModalOpen(true)}>Browse</Button>} autoComplete="off" />
                        <InlineStack gap="200" wrap={true}>{dSelectedCustomers.map(c => <Badge key={c.id} onRemove={() => setDSelectedCustomers(prev => prev.filter(x => x.id !== c.id))}>{c.title}</Badge>)}</InlineStack>
                      </Box>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Usage Limits Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Maximum discount uses</Text>
                  <Checkbox label="Limit number of times this discount can be used in total" checked={dLimitUsage} onChange={setDLimitUsage} />
                  {dLimitUsage && <TextField type="number" value={dMaxUsageLimit} onChange={setDMaxUsageLimit} autoComplete="off" />}
                  <Checkbox label="Limit to one use per customer" checked={dOncePerCustomer} onChange={setDOncePerCustomer} />
                </BlockStack>
              </Card>

              {/* Combinations Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Combinations</Text>
                  <Text variant="bodySm" tone="subdued">This discount can be combined with:</Text>
                  <BlockStack gap="200">
                    <Checkbox label="Product discounts" checked={dCombinations.product} onChange={(val) => setDCombinations({ ...dCombinations, product: val })} />
                    <Checkbox label="Order discounts" checked={dCombinations.order} onChange={(val) => setDCombinations({ ...dCombinations, order: val })} />
                    <Checkbox label="Shipping discounts" checked={dCombinations.shipping} onChange={(val) => setDCombinations({ ...dCombinations, shipping: val })} />
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Active Dates Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Active dates</Text>
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}><TextField label="Start date" type="date" value={dStartsAt.split('T')[0]} onChange={(val) => setDStartsAt(val + 'T' + dStartsAt.split('T')[1])} autoComplete="off" /></div>
                    <div style={{ flex: 1 }}><TextField label="Start time (EST)" type="time" value={dStartsAt.split('T')[1]} onChange={(val) => setDStartsAt(dStartsAt.split('T')[0] + 'T' + val)} autoComplete="off" /></div>
                  </InlineStack>
                  <Checkbox label="Set end date" checked={dHasEndDate} onChange={setDHasEndDate} />
                  {dHasEndDate && (
                    <InlineStack gap="400">
                      <div style={{ flex: 1 }}><TextField label="End date" type="date" value={dEndsAt ? dEndsAt.split('T')[0] : ''} onChange={(val) => setDEndsAt(val + 'T' + (dEndsAt ? dEndsAt.split('T')[1] : '23:59'))} autoComplete="off" /></div>
                      <div style={{ flex: 1 }}><TextField label="End time (EST)" type="time" value={dEndsAt ? dEndsAt.split('T')[1] : ''} onChange={(val) => setDEndsAt((dEndsAt ? dEndsAt.split('T')[0] : '') + 'T' + val)} autoComplete="off" /></div>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>

            {/* Sidebar Summary */}
            <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">Summary</Text>
                  <Box borderBlockEndWidth="1" paddingBlockEnd="400">
                    <Text variant="headingMd" as="p" tone="success">
                      {dMethod === 'auto' ? (dTitle || 'No discount title yet') : (dCode || 'No discount code yet')}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">{dMethod === 'code' ? 'Code' : 'Automatic'}</Text>
                  </Box>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">Logic Details</Text>
                      <Text variant="bodySm">
                        {dType === 'buy_x_get_y' ? (
                          `Buy ${dBuyQuantity || 0} Get ${dGetQuantity || 0} (${dGetValueType === 'free' ? 'Free' : (dGetValueType === 'percentage' ? dGetValue + '%' : '₹' + dGetValue)})`
                        ) : (
                          `${dValue || 0}${dValueType === 'percentage' ? '%' : '₹'} off ${appliesTo.replace('_', ' ')}`
                        )}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">Minimum Requirements</Text>
                      <Text variant="bodySm">
                        {dMinRequirementType === 'none' && 'No minimum requirements'}
                        {dMinRequirementType === 'amount' && `Spend at least ₹${dMinRequirementValue || 0}`}
                        {dMinRequirementType === 'quantity' && `Buy at least ${dMinRequirementValue || 0} items`}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">Eligibility</Text>
                      <Text variant="bodySm">
                        {dEligibility === 'all' && 'All customers'}
                        {dEligibility === 'segments' && `${dSelectedSegments.length} segments`}
                        {dEligibility === 'customers' && `${dSelectedCustomers.length} customers`}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">Combinations</Text>
                      <Text variant="bodySm">
                        {[
                          dCombinations.product && 'Product',
                          dCombinations.order && 'Order',
                          dCombinations.shipping && 'Shipping'
                        ].filter(Boolean).join(', ') || 'None'}
                      </Text>
                    </BlockStack>
                  </div>

                  <BlockStack gap="200">
                    <Text variant="bodySm" fontWeight="bold" as="p">Status</Text>
                    <Badge tone="attention">Not saved</Badge>
                  </BlockStack>
                </BlockStack>
              </Card>

              <BlockStack gap="200">
                <Button variant="primary" size="large" submit loading={fetcher.state === 'submitting'}>Save discount</Button>
                <Button size="large" onClick={() => setShowCreateForm(false)}>Discard</Button>
              </BlockStack>
            </div>
          </div>
        </fetcher.Form>
      )}
      {/* Modals */}
      <SelectDiscountTypeModal />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete discount?"
        primaryAction={{
          content: 'Delete',
          onAction: confirmDelete,
          destructive: true,
          loading: fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'delete'
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete this discount? This action cannot be undone and will also remove it from Shopify.
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={segmentModalOpen}
        onClose={() => setSegmentModalOpen(false)}
        title="Select customer segments"
        primaryAction={{ content: 'Done', onAction: () => setSegmentModalOpen(false) }}
      >
        <Modal.Section>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {mockSegments.map(segment => {
              const isSelected = dSelectedSegments.some(s => s.id === segment.id);
              return (
                <div
                  key={segment.id}
                  onClick={() => isSelected ? setDSelectedSegments(prev => prev.filter(s => s.id !== segment.id)) : setDSelectedSegments(prev => [...prev, segment])}
                  style={{ padding: '12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', cursor: 'pointer', background: isSelected ? '#F0F9FF' : '#fff' }}
                >
                  <div style={{ marginRight: '12px' }}>
                    <Checkbox checked={isSelected} onChange={() => { }} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ fontWeight: '500', margin: 0 }}>{segment.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal.Section>
      </Modal>

      <Modal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Select customers"
        primaryAction={{ content: 'Done', onAction: () => setCustomerModalOpen(false) }}
      >
        <Modal.Section>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {mockCustomers.map(customer => {
              const isSelected = dSelectedCustomers.some(c => c.id === customer.id);
              return (
                <div
                  key={customer.id}
                  onClick={() => isSelected ? setDSelectedCustomers(prev => prev.filter(c => c.id !== customer.id)) : setDSelectedCustomers(prev => [...prev, customer])}
                  style={{ padding: '12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', cursor: 'pointer', background: isSelected ? '#F0F9FF' : '#fff' }}
                >
                  <div style={{ marginRight: '12px' }}>
                    <Checkbox checked={isSelected} onChange={() => { }} />
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                    {customer.displayName.charAt(0)}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ fontWeight: '500', margin: 0 }}>{customer.displayName}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{customer.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
