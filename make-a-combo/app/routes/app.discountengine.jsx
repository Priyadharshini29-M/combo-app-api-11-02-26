import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';
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
  MenuHorizontalIcon,
} from '@shopify/polaris-icons';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';
import { getDb, sendToPhp } from '../utils/api-helpers';

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const db = await getDb(shop);
  const remoteDiscounts = db.discounts || [];
  console.log(
    `[Loader] 📥 Fetched ${remoteDiscounts.length} discounts from PHP backend for shop: ${shop}`
  );
  const localDiscounts = [];

  try {
    // Fetch discounts from Shopify Admin
    let shopifyDiscounts = [];
    try {
      const shopifyResponse = await admin.graphql(`
        #graphql
        query {
          discountNodes(first: 100, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                discount {
                  __typename
                  ... on DiscountCodeBasic {
                    title
                    status
                    createdAt
                    usageLimit
                    codes(first: 1) { edges { node { code asyncUsageCount } } }
                  }
                  ... on DiscountAutomaticBasic {
                    title
                    status
                    createdAt
                  }
                  ... on DiscountCodeBxgy {
                    title
                    status
                    createdAt
                    usageLimit
                    codes(first: 1) { edges { node { code asyncUsageCount } } }
                  }
                  ... on DiscountAutomaticBxgy {
                    title
                    status
                    createdAt
                  }
                  ... on DiscountCodeFreeShipping {
                    title
                    status
                    createdAt
                    usageLimit
                    codes(first: 1) { edges { node { code asyncUsageCount } } }
                  }
                  ... on DiscountAutomaticFreeShipping {
                    title
                    status
                    createdAt
                  }
                }
              }
            }
          }
        }
      `);

      const shopifyData = await shopifyResponse.json();
      console.log(
        `[Loader] 🛒 Shopify Raw Response Keys:`,
        Object.keys(shopifyData.data || {})
      );

      if (shopifyData.errors) {
        console.error(
          'Shopify GraphQL Errors:',
          JSON.stringify(shopifyData.errors, null, 2)
        );
      }
      if (shopifyData.data?.discountNodes?.edges) {
        console.log(
          `[Loader] 📦 Shopify edges found: ${shopifyData.data.discountNodes.edges.length}`
        );
        shopifyDiscounts = shopifyData.data.discountNodes.edges
          .filter((edge) => edge?.node?.discount) // Safety filter
          .map(({ node }) => {
            const d = node.discount;
            const codeNode = d.codes?.edges?.[0]?.node;
            const code = codeNode?.code || '';
            const usedCount = codeNode?.asyncUsageCount ?? 0;
            const usageLimit = d.usageLimit ?? null;
            const usage = `${usedCount} / ${usageLimit !== null ? usageLimit : 'Unlimited'}`;
            // Keep raw usedCount so we can sum it accurately later
            const usedCountRaw = usedCount;

            let type = 'amount_off_products';
            const typeName = d.__typename || '';

            if (typeName.includes('Bxgy')) {
              type = 'buy_x_get_y';
            } else if (typeName.includes('FreeShipping')) {
              type = 'free_shipping';
            } else if (typeName.includes('Basic')) {
              type = 'amount_off_products';
            }

            return {
              id: node.id,
              shopifyId: node.id,
              title: d.title || 'Untitled Discount',
              code,
              type,
              status:
                d.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
              usage,
              usedCount: usedCountRaw,
              created: new Date(d.createdAt || Date.now()).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              ),
              method: typeName.includes('Automatic') ? 'auto' : 'code',
            };
          })
          .filter((d) => d.method === 'code');
      }
    } catch (e) {
      console.error(
        '[Loader] ❌ Failed to fetch discounts from Shopify:',
        e.message
      );
    }

    // Merge strategy: Combine shopify, remote, and local, de-dupe.
    let combined = [...shopifyDiscounts];

    // Merge remote PHP DB discounts with normalization
    remoteDiscounts.forEach((rem) => {
      // PHP backend stores discount data nested inside settings (and sometimes settings.settings).
      // Unwrap all levels to get the actual flat discount fields.
      const s1 = rem.settings && typeof rem.settings === 'object' ? rem.settings : {};
      const s2 = s1.settings && typeof s1.settings === 'object' ? s1.settings : {};
      // Merge: deepest settings wins, then s1, then top-level rem
      const flat = { ...rem, ...s1, ...s2 };

      const normalizedRemote = {
        id: flat.id || rem.id,
        appId: flat.id || rem.id,
        shopifyId: flat.shopifyId || rem.discount_id || null,
        title: flat.title || flat.discount_title || 'Untitled',
        code: flat.code || flat.discount_code || '',
        type: flat.type || 'amount_off_products',
        value: flat.value || '0',
        valueType: flat.valueType || 'percentage',
        status: flat.status || 'active',
        usage: flat.usage || '0 / Unlimited',
        created: flat.created || flat.created_at || new Date().toLocaleDateString(),
        method: flat.method || (flat.code ? 'code' : 'auto'),
      };

      const exists = combined.some((shop) => {
        const remoteShopifyId = String(normalizedRemote.shopifyId || '')
          .split('/')
          .pop();
        const shopShopifyId = String(shop.shopifyId || '')
          .split('/')
          .pop();

        return (
          (shopShopifyId &&
            remoteShopifyId &&
            shopShopifyId === remoteShopifyId) ||
          (shop.title === normalizedRemote.title &&
            (shop.code || '') === (normalizedRemote.code || ''))
        );
      });

      if (!exists) {
        combined.push(normalizedRemote);
      } else {
        const match = combined.find((shop) => {
          const remoteShopifyId = String(normalizedRemote.shopifyId || '')
            .split('/')
            .pop();
          const shopShopifyId = String(shop.shopifyId || '')
            .split('/')
            .pop();
          return (
            (shopShopifyId &&
              remoteShopifyId &&
              shopShopifyId === remoteShopifyId) ||
            (shop.title === normalizedRemote.title &&
              (shop.code || '') === (normalizedRemote.code || ''))
          );
        });
        if (match) {
          match.appId = normalizedRemote.id;
          match.value = normalizedRemote.value || match.value;
          match.valueType = normalizedRemote.valueType || match.valueType;
          if (normalizedRemote.type) match.type = normalizedRemote.type;
        }
      }
    });

    // Sort by id / creation time
    combined.sort(
      (a, b) => new Date(b.created || 0) - new Date(a.created || 0)
    );

    // Build set of discount codes that were created by this app (from PHP backend)
    const appCreatedCodes = new Set(
      remoteDiscounts.map((rem) => {
        const s1 = rem.settings && typeof rem.settings === 'object' ? rem.settings : {};
        const s2 = s1.settings && typeof s1.settings === 'object' ? s1.settings : {};
        const flat = { ...rem, ...s1, ...s2 };
        return (flat.code || flat.discount_code || '').trim().toLowerCase();
      }).filter(Boolean)
    );

    // Sum usedCount only for Shopify discounts whose code matches an app-created discount
    const totalUsage = shopifyDiscounts
      .filter((d) => appCreatedCodes.has((d.code || '').trim().toLowerCase()))
      .reduce((sum, d) => sum + (d.usedCount || 0), 0);

    console.log(`[Loader] App codes from PHP: ${[...appCreatedCodes].join(', ')}`);
    console.log(`[Loader] Total usage computed: ${totalUsage}`);

    return json({ discounts: combined.filter((d) => d.method === 'code'), totalUsage });
  } catch (error) {
    console.error('Failed to fetch discounts from PHP:', error);
    // Normalize raw PHP records before returning fallback
    const fallback = remoteDiscounts.map((rem) => {
      const s1 = rem.settings && typeof rem.settings === 'object' ? rem.settings : {};
      const s2 = s1.settings && typeof s1.settings === 'object' ? s1.settings : {};
      const flat = { ...rem, ...s1, ...s2 };
      return {
        id: flat.id || rem.id,
        shopifyId: flat.shopifyId || rem.discount_id || null,
        title: flat.title || 'Untitled',
        code: flat.code || '',
        type: flat.type || 'amount_off_products',
        status: flat.status || 'active',
        usage: flat.usage || '0 / Unlimited',
        created: flat.created || flat.created_at || new Date().toLocaleDateString(),
        method: flat.method || 'code',
      };
    });
    return json({ discounts: fallback });
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
  const db = await getDb(shop);
  const discounts = db.discounts || [];
  let formData;
  const contentType = request.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    const jsonBody = await request.json();
    // Flatten the structure: allow access to top-level keys and keys inside 'data' property if it exists
    const flattened = { ...jsonBody, ...(jsonBody.data || {}) };
    formData = {
      get: (key) => (flattened[key] !== undefined ? flattened[key] : null),
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
      const selectedSegments = formData.get('selectedSegments')
        ? typeof formData.get('selectedSegments') === 'string'
          ? JSON.parse(formData.get('selectedSegments'))
          : formData.get('selectedSegments')
        : [];
      const selectedCustomers = formData.get('selectedCustomers')
        ? typeof formData.get('selectedCustomers') === 'string'
          ? JSON.parse(formData.get('selectedCustomers'))
          : formData.get('selectedCustomers')
        : [];

      // Only use real Shopify GIDs — filter out any mock/placeholder IDs.
      // If no valid GIDs remain, fall back to { all: true } so Shopify never
      // receives a blank or invalid customerSelection.
      const isGid = (id) => typeof id === 'string' && id.startsWith('gid://');
      const validSegmentIds = selectedSegments.map((s) => s.id).filter(isGid);
      const validCustomerIds = selectedCustomers.map((c) => c.id).filter(isGid);

      let customerSelection = { all: true };
      if (eligibility === 'segments' && validSegmentIds.length > 0) {
        customerSelection = {
          customerSegments: { add: validSegmentIds },
        };
      } else if (eligibility === 'customers' && validCustomerIds.length > 0) {
        customerSelection = {
          customers: { add: validCustomerIds },
        };
      }

      const valueType = formData.get('valueType') || 'percentage';

      // --- Shopify GraphQL Logic ---
      let shopifyDiscountId = null;

      // --- Parse shared fields used by all Shopify mutations ---
      const minReqType = formData.get('minRequirementType');
      const minReqValue = formData.get('minRequirementValue');
      const combinationsRaw = formData.get('combinations');
      const combinations =
        (typeof combinationsRaw === 'string'
          ? JSON.parse(combinationsRaw)
          : combinationsRaw) || {};

      let minimumRequirement = null;
      if (minReqType === 'amount' && minReqValue) {
        minimumRequirement = {
          subtotal: {
            greaterThanOrEqualToSubtotal: parseFloat(minReqValue),
          },
        };
      } else if (minReqType === 'quantity' && minReqValue) {
        minimumRequirement = {
          quantity: { greaterThanOrEqualToQuantity: String(minReqValue) },
        };
      }

      const combinesWith = {
        orderDiscounts: combinations.order || false,
        productDiscounts: combinations.product || false,
        shippingDiscounts: combinations.shipping || false,
      };

      const startsAt = formData.get('startDate')
        ? new Date(formData.get('startDate')).toISOString()
        : new Date().toISOString();
      const endsAtRaw = formData.get('endDate');
      const endsAt =
        endsAtRaw && endsAtRaw !== 'No end date'
          ? new Date(endsAtRaw).toISOString()
          : null;

      const usageLimit = formData.get('maxUsage')
        ? parseInt(formData.get('maxUsage'))
        : null;
      const appliesOncePerCustomer =
        String(formData.get('oncePerCustomer')) === 'true';

      // Shopify creation for amount_off_products and amount_off_order
      if (
        [
          'percentage',
          'fixed',
          'amount',
          'amount_off_products',
          'amount_off_order',
        ].includes(type)
      ) {
        try {
          const isPercentage = valueType === 'percentage';
          const discountValue = parseFloat(value || 0) || 0;

          // Parse appliesTo data
          const appliesTo = formData.get('appliesTo') || 'all_products';
          const selectedProductsRaw = formData.get('selectedProducts');
          const selectedCollectionsRaw = formData.get('selectedCollections');
          const selectedProducts = selectedProductsRaw
            ? typeof selectedProductsRaw === 'string'
              ? JSON.parse(selectedProductsRaw)
              : selectedProductsRaw
            : [];
          const selectedCollections = selectedCollectionsRaw
            ? typeof selectedCollectionsRaw === 'string'
              ? JSON.parse(selectedCollectionsRaw)
              : selectedCollectionsRaw
            : [];

          // Build items object based on appliesTo selection
          let itemsConfig = { all: true };
          if (appliesTo === 'specific_collections' && selectedCollections.length > 0) {
            itemsConfig = {
              collections: { add: selectedCollections.map((c) => c.id || c.value) },
            };
          } else if (appliesTo === 'specific_products' && selectedProducts.length > 0) {
            itemsConfig = {
              products: { productsToAdd: selectedProducts.map((p) => p.id || p.value) },
            };
          }

          const customerGetsValue = isPercentage
            ? { percentage: discountValue / 100 }
            : {
                discountAmount: {
                  // Shopify requires amount as a String (Decimal scalar)
                  amount: String(discountValue),
                  appliesOnEachItem:
                    type !== 'amount_off_order' && appliesTo !== 'all_products',
                },
              };

          // Both amount_off_products and amount_off_order use discountCodeBasicCreate.
          // For order-level discounts, omit 'items' from customerGets (applies to entire order).
          const mutation = `#graphql
            mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
              discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                codeDiscountNode { id }
                userErrors { field message }
              }
            }`;

          const sharedInput = {
            title,
            code,
            startsAt,
            ...(endsAt ? { endsAt } : {}),
            customerSelection,
            combinesWith,
            ...(minimumRequirement ? { minimumRequirement } : {}),
            ...(usageLimit ? { usageLimit } : {}),
            appliesOncePerCustomer,
          };

          const variables = {
            basicCodeDiscount: {
              ...sharedInput,
              customerGets: {
                value: customerGetsValue,
                // items is required by Shopify for discountCodeBasicCreate.
                // For amount_off_order, use { all: true } (applies to entire order).
                // For amount_off_products, use the specific itemsConfig.
                items: type === 'amount_off_order' ? { all: true } : itemsConfig,
              },
            },
          };

          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();

          const resultKey = 'discountCodeBasicCreate';

          const userErrors = responseJson.data?.[resultKey]?.userErrors || [];

          if (userErrors.length > 0) {
            console.error(
              '❌ Shopify Discount Creation Errors:',
              JSON.stringify(userErrors, null, 2)
            );
            return json(
              {
                error: `Shopify Error: ${userErrors.map((e) => e.message).join(', ')}`,
              },
              { status: 400 }
            );
          } else if (responseJson.data?.[resultKey]?.codeDiscountNode) {
            shopifyDiscountId = responseJson.data[resultKey].codeDiscountNode.id;
            console.log('✅ Created in Shopify:', shopifyDiscountId);
          }
        } catch (err) {
          console.error(
            '❌ Failed to create discount in Shopify (Network/System):',
            err
          );
          return json(
            { error: 'Failed to sync with Shopify: ' + err.message },
            { status: 500 }
          );
        }
      } else if (type === 'free_shipping') {
        try {
          const mutation = `#graphql
            mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
              discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
                codeDiscountNode { id }
                userErrors { field message }
              }
            }`;

          const variables = {
            freeShippingCodeDiscount: {
              title,
              code,
              startsAt,
              ...(endsAt ? { endsAt } : {}),
              customerSelection,
              combinesWith,
              ...(minimumRequirement ? { minimumRequirement } : {}),
              ...(usageLimit ? { usageLimit } : {}),
              appliesOncePerCustomer,
              destination: { all: true },
            },
          };

          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();
          const userErrors =
            responseJson.data?.discountCodeFreeShippingCreate?.userErrors || [];

          if (userErrors.length > 0) {
            console.error('❌ Shopify Free Shipping Errors:', userErrors);
            return json(
              { error: `Shopify Error: ${userErrors.map((e) => e.message).join(', ')}` },
              { status: 400 }
            );
          } else if (responseJson.data?.discountCodeFreeShippingCreate?.codeDiscountNode) {
            shopifyDiscountId =
              responseJson.data.discountCodeFreeShippingCreate.codeDiscountNode.id;
            console.log('✅ Free shipping discount created in Shopify:', shopifyDiscountId);
          }
        } catch (err) {
          console.error('❌ Failed to create free shipping discount:', err);
          return json(
            { error: 'Failed to sync with Shopify: ' + err.message },
            { status: 500 }
          );
        }
      } else if (type === 'buy_x_get_y') {
        console.log(
          '[Discount Engine] Processing Buy X Get Y discount creation...'
        );
        try {
          const buyQuantityStr = String(formData.get('buyQuantity'));
          const getQuantityInt = parseInt(formData.get('getQuantity'));

          // Parse Buy items — Shopify REQUIRES specific products or collections for customerBuys
          let customerBuysItems = null;
          try {
            const buyDataRaw = formData.get('buyProduct');
            const buyData =
              typeof buyDataRaw === 'string'
                ? JSON.parse(buyDataRaw)
                : buyDataRaw;
            if (
              buyData &&
              buyData.type === 'product' &&
              buyData.selection?.length > 0
            ) {
              customerBuysItems = {
                products: {
                  productsToAdd: buyData.selection.map((p) => p.id || p.value),
                },
              };
            } else if (
              buyData &&
              buyData.type === 'collection' &&
              buyData.selection?.length > 0
            ) {
              customerBuysItems = {
                collections: {
                  add: buyData.selection.map((c) => c.id || c.value),
                },
              };
            }
          } catch (e) {
            console.error(
              '[Discounts API - BXGY] Error parsing buyProduct:',
              e
            );
          }

          // Parse Get items — 'all: true' is valid for customerGets
          let customerGetsItems = { all: true };
          try {
            const getDataRaw = formData.get('getProduct');
            const getData =
              typeof getDataRaw === 'string'
                ? JSON.parse(getDataRaw)
                : getDataRaw;
            if (
              getData &&
              getData.type === 'product' &&
              getData.selection?.length > 0
            ) {
              customerGetsItems = {
                products: {
                  productsToAdd: getData.selection.map((p) => p.id || p.value),
                },
              };
            } else if (
              getData &&
              getData.type === 'collection' &&
              getData.selection?.length > 0
            ) {
              customerGetsItems = {
                collections: {
                  add: getData.selection.map((c) => c.id || c.value),
                },
              };
            }
          } catch (e) {
            console.error(
              '[Discounts API - BXGY] Error parsing getProduct:',
              e
            );
          }

          if (!customerBuysItems) {
            console.warn(
              '[Discounts API - BXGY] No buy product/collection selected. Shopify ID will be null. Saving locally only.'
            );
          }

          const mutation = `#graphql
              mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
                discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
                  codeDiscountNode { id }
                  userErrors { field message }
                }
              }`;

          const getValueType = formData.get('getValueType') || 'percentage';
          const getValueRaw = parseFloat(formData.get('getValue') || 0) || 0;
          const bxgyEffect =
            getValueType === 'fixed_amount'
              ? { amount: String(getValueRaw) }
              : { percentage: getValueType === 'free' ? 1.0 : getValueRaw / 100 || 0 };

          const bxgyVariables = {
            bxgyCodeDiscount: {
              title,
              code,
              startsAt,
              ...(endsAt ? { endsAt } : {}),
              // customerSelection is deprecated in newer API but still required — keep it
              customerSelection,
              combinesWith,
              ...(minimumRequirement ? { minimumRequirement } : {}),
              ...(usageLimit ? { usageLimit } : {}),
              appliesOncePerCustomer,
              customerBuys: {
                value: { quantity: buyQuantityStr },
                items: customerBuysItems,
              },
              customerGets: {
                value: {
                  discountOnQuantity: {
                    quantity: String(getQuantityInt),
                    effect: bxgyEffect,
                  },
                },
                items: customerGetsItems,
              },
            },
          };

          if (customerBuysItems) {
            console.log(
              '🔍 [BXGY DEBUG] Sending to Shopify:\n' +
                JSON.stringify(bxgyVariables, null, 2)
            );
            try {
              const bxgyResponse = await admin.graphql(mutation, {
                variables: bxgyVariables,
              });
              const bxgyJson = await bxgyResponse.json();
              console.log(
                '[Discounts API - BXGY] Raw Shopify response:',
                JSON.stringify(bxgyJson, null, 2)
              );

              const resultKey = 'discountCodeBxgyCreate';
              const nodeKey = 'codeDiscountNode';
              const userErrors = bxgyJson.data?.[resultKey]?.userErrors || [];

              if (userErrors.length > 0) {
                console.error(
                  '[Discounts API - BXGY] Shopify userErrors:',
                  userErrors
                );
                return json(
                  { error: `Shopify Error: ${userErrors[0].message}` },
                  { status: 400 }
                );
              } else if (bxgyJson.data?.[resultKey]?.[nodeKey]?.id) {
                shopifyDiscountId = bxgyJson.data[resultKey][nodeKey].id;
                console.log(
                  '[Discounts API - BXGY] ✅ Shopify ID stored:',
                  shopifyDiscountId
                );
              } else {
                console.warn(
                  '[Discounts API - BXGY] ⚠️ No discount node returned. Full response:',
                  JSON.stringify(bxgyJson, null, 2)
                );
              }
            } catch (bxgyErr) {
              console.error(
                '[Discounts API - BXGY] Shopify call failed:',
                bxgyErr.message
              );
            }
          }
        } catch (err) {
          console.error('[Discounts API - BXGY] Shopify Creation Failed:', err);
          return json(
            { error: 'Failed to create BXGY discount: ' + err.message },
            { status: 500 }
          );
        }
      }

      const numericIds = discounts
        .map((d) => parseInt(d.id))
        .filter((id) => !isNaN(id));
      const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

      const newDiscount = {
        id: nextId,
        shopifyId: shopifyDiscountId, // Store the real ID
        title,
        description: formData.get('description') || '',
        code,
        type,
        method: 'code',
        value,
        valueType:
          formData.get('valueType') ||
          (type === 'buy_x_get_y'
            ? formData.get('getValueType')
            : 'percentage'),
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
        shop: shop, // Include shop for backend filtering
      };

      discounts.unshift(newDiscount);
      // saveFakeDiscounts(discounts); // Handled by PHP Sync

      console.log(
        `[Combo App Console] Success Notification: Discount '${title}' created.`
      );

      console.log('[Discount Engine] 📤 Synchronizing to PHP...');

      // 2. Save to MySQL via discount.php (Direct)
      try {
        const phpResponse = await sendToPhp(
          {
            event: 'create',
            resource: 'discount',
            shop,
            data: newDiscount,
          },
          'discount.php'
        );

        // Capture the internal assigned ID if available
        if (phpResponse?.data?.id || phpResponse?.id) {
          newDiscount.id = phpResponse.data?.id || phpResponse.id;
        }
      } catch (dbError) {
        console.error('MySQL Sync Error (Create):', dbError.message);
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

      let index = discounts.findIndex(
        (d) =>
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
          method: passedMethod || 'code',
        };
      }

      if (targetDiscount) {
        const isAutomatic = false;
        const shopifyId =
          targetDiscount.shopifyId ||
          (String(id).startsWith('gid://') ? id : null);

        // 1. Update status on Shopify if status is being toggled
        if (shopifyId && status) {
          try {
            const isActivating = status === 'active';
            console.log(
              `[Discount Engine] ${isActivating ? 'Activating' : 'Deactivating'} on Shopify: ${shopifyId}`
            );

            const mutation = isAutomatic
              ? isActivating
                ? `#graphql mutation { discountAutomaticActivate(id: "${shopifyId}") { automaticDiscountNode { id status } userErrors { message } } }`
                : `#graphql mutation { discountAutomaticDeactivate(id: "${shopifyId}") { automaticDiscountNode { id status } userErrors { message } } }`
              : isActivating
                ? `#graphql mutation { discountCodeActivate(id: "${shopifyId}") { codeDiscountNode { id status } userErrors { message } } }`
                : `#graphql mutation { discountCodeDeactivate(id: "${shopifyId}") { codeDiscountNode { id status } userErrors { message } } }`;

            const shopifyResponse = await admin.graphql(mutation);
            const shopifyResult = await shopifyResponse.json();
            console.log(
              '[Discount Engine] Shopify Status Update Result:',
              JSON.stringify(shopifyResult, null, 2)
            );
          } catch (err) {
            console.error('Failed to update status on Shopify:', err.message);
          }
        }

        const updatedDiscount = {
          ...(targetDiscount || {}),
          shop: shop, // Ensure shop is present for backend sync
          title: title || targetDiscount.title,
          description:
            formData.get('description') || targetDiscount.description || '',
          value: value || targetDiscount.value,
          valueType:
            formData.get('valueType') ||
            (type === 'buy_x_get_y'
              ? formData.get('getValueType')
              : targetDiscount.valueType || 'percentage'),
          type: type || targetDiscount.type,
          status: status || targetDiscount.status,
          buyQuantity:
            formData.get('buyQuantity') || targetDiscount.buyQuantity,
          buyProduct: formData.get('buyProduct') || targetDiscount.buyProduct,
          getQuantity:
            formData.get('getQuantity') || targetDiscount.getQuantity,
          getProduct: formData.get('getProduct') || targetDiscount.getProduct,
          minRequirementType:
            formData.get('minRequirementType') ||
            targetDiscount.minRequirementType,
          minRequirementValue:
            formData.get('minRequirementValue') ||
            targetDiscount.minRequirementValue,
          combinations: safeParse(
            formData.get('combinations'),
            targetDiscount.combinations || {}
          ),
          oncePerCustomer:
            formData.get('oncePerCustomer') !== null
              ? safeBool(formData.get('oncePerCustomer'))
              : targetDiscount.oncePerCustomer || false,
          usage:
            (targetDiscount.usage?.split(' / ')[0] || '0') +
            ' / ' +
            (formData.get('maxUsage') ||
              targetDiscount.usage?.split(' / ')[1] ||
              'Unlimited'),
          startDate: formData.get('startDate') || targetDiscount.startDate,
          endDate: formData.get('endDate') || targetDiscount.endDate,
          autoApply: safeBool(formData.get('autoApply')),
          appliesTo:
            formData.get('appliesTo') ||
            targetDiscount.appliesTo ||
            'all_products',
          selectedProducts: safeParse(
            formData.get('selectedProducts'),
            targetDiscount.selectedProducts
          ),
          selectedCollections: safeParse(
            formData.get('selectedCollections'),
            targetDiscount.selectedCollections
          ),
        };

        if (index > -1) {
          discounts[index] = updatedDiscount;
        } else {
          // Add to local DB if it was a Shopify-only discount
          discounts.push(updatedDiscount);
        }

        // Sync to MySQL
        try {
          await sendToPhp(
            {
              event: 'update',
              resource: 'discount',
              shop,
              data: updatedDiscount,
            },
            'discount.php'
          );
        } catch (dbError) {
          console.error('MySQL Sync Error (Update):', dbError.message);
        }

        return json({
          success: true,
          discount: updatedDiscount,
          message: 'Discount updated successfully',
        });
      }

      console.error(
        `[Discount Engine] Error: Discount with ID ${id} not found in local DB or as Shopify GID.`
      );
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
      const targetDiscount = discounts.find(
        (d) =>
          String(d.id) === String(id) ||
          (d.shopifyId && String(d.shopifyId) === String(id))
      );

      // 1. Delete from Shopify if shopifyId exists
      const shopifyId =
        targetDiscount?.shopifyId ||
        (String(id).startsWith('gid://') ? id : null);
      if (shopifyId) {
        try {
          const isAutomatic =
            passedMethod === 'auto' ||
            targetDiscount?.method === 'auto' ||
            targetDiscount?.usage?.includes('Automatic');
          console.log(
            `[Discount Engine] Deleting from Shopify: ${shopifyId} (Mode: ${isAutomatic ? 'Automatic' : 'Code'})`
          );

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

          const response = await admin.graphql(mutation, {
            variables: { id: shopifyId },
          });
          const respJson = await response.json();
          console.log(
            '[Discount Engine] Shopify Delete Result:',
            JSON.stringify(respJson, null, 2)
          );

          const resultKey = isAutomatic
            ? 'discountAutomaticDelete'
            : 'discountCodeDelete';
          if (respJson.data?.[resultKey]?.userErrors?.length > 0) {
            console.error(
              '[Discount Engine] Shopify Mutation Errors:',
              respJson.data[resultKey].userErrors
            );
          }
        } catch (e) {
          console.error('Failed to delete from Shopify:', e.message);
        }
      }

      const filtered = discounts.filter(
        (d) =>
          String(d.id) !== String(id) &&
          (!d.shopifyId || String(d.shopifyId) !== String(id))
      );

      if (filtered.length < initialLength || shopifyId) {
        console.log(
          `[Combo App Console] Success Notification: Discount deleted.`
        );

        console.log('[Discount Engine] 📤 Synchronizing delete to PHP...');

        // 2. Delete from MySQL via discount.php (Direct)
        try {
          await sendToPhp(
            {
              event: 'delete',
              resource: 'discount',
              shop,
              data: { id: targetDiscount?.id || id, shopifyId: shopifyId },
            },
            'discount.php'
          );
        } catch (err) {
          console.error('MySQL Sync Error (Delete):', err.message);
        }

        return json({
          success: true,
          message: 'Discount deleted successfully',
        });
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
  const { discounts: initialDiscounts, totalUsage: loaderTotalUsage } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
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
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '10px',
            fontWeight: '900',
            letterSpacing: '0.5px',
            marginLeft: isActive ? '10px' : 'auto',
            marginRight: isActive ? 'auto' : '10px',
            zIndex: 1,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            position: 'absolute',
            left: isActive ? 'auto' : '5px',
            right: isActive ? '5px' : 'auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    );
  };

  useEffect(() => {
    // Only update from loader if we are not in the middle of an action
    // and ONLY if initialDiscounts is actually different or non-empty
    if (initialDiscounts && fetcher.state === 'idle') {
      setDiscounts((current) => {
        // If current state has optimistic items, don't overwrite blindly
        if (current.some((d) => d.isOptimistic)) return current;
        return initialDiscounts;
      });
    }
  }, [initialDiscounts, fetcher.state]);

  // Success handling after creation/update
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      shopify.toast.show(fetcher.data.message || 'Success');

      // Update local state immediately if creation/update was successful
      if (fetcher.data.discount) {
        const d = fetcher.data.discount;
        setDiscounts((prev) => {
          const existsIndex = prev.findIndex(
            (item) => String(item.id) === String(d.id)
          );
          if (existsIndex > -1) {
            const updated = [...prev];
            updated[existsIndex] = { ...updated[existsIndex], ...d };
            return updated.filter((item) => item.id !== 'optimistic-new');
          }
          return [d, ...prev.filter((item) => item.id !== 'optimistic-new')];
        });
      } else if (fetcher.formData?.get('intent') === 'delete') {
        const deletedId = fetcher.formData.get('id');
        setDiscounts((prev) =>
          prev.filter(
            (d) =>
              String(d.id) !== String(deletedId) &&
              String(d.shopifyId) !== String(deletedId)
          )
        );
      }

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

  // Validation errors
  const [errors, setErrors] = useState({});

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

    // --- Validation ---
    const newErrors = {};

    if (!dTitle.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!dCode.trim()) {
      newErrors.code = 'Discount code is required';
    }

    if (dType === 'amount_off_products' || dType === 'amount_off_order') {
      if (!dValue || parseFloat(dValue) <= 0) {
        newErrors.value = 'Please enter a valid discount value';
      }
      if (dValueType === 'percentage' && parseFloat(dValue) > 100) {
        newErrors.value = 'Percentage cannot exceed 100';
      }
    }

    if (dType === 'amount_off_products' && appliesTo === 'specific_products' && selectedProducts.length === 0) {
      newErrors.appliesTo = 'Please select at least one product';
    }
    if (dType === 'amount_off_products' && appliesTo === 'specific_collections' && selectedCollections.length === 0) {
      newErrors.appliesTo = 'Please select at least one collection';
    }

    if (dMinRequirementType === 'amount' && (!dMinRequirementValue || parseFloat(dMinRequirementValue) <= 0)) {
      newErrors.minRequirementValue = 'Please enter a minimum purchase amount';
    }
    if (dMinRequirementType === 'quantity' && (!dMinRequirementValue || parseInt(dMinRequirementValue) <= 0)) {
      newErrors.minRequirementValue = 'Please enter a minimum quantity';
    }

    if (dType === 'buy_x_get_y') {
      if (!dBuyQuantity || parseInt(dBuyQuantity) <= 0) {
        newErrors.buyQuantity = 'Please enter buy quantity';
      }
      if (!dGetQuantity || parseInt(dGetQuantity) <= 0) {
        newErrors.getQuantity = 'Please enter get quantity';
      }
      if (dBuyProductSelection.length === 0) {
        newErrors.buyProduct = 'Please select at least one buy product or collection';
      }
      if (dGetProductSelection.length === 0) {
        newErrors.getProduct = 'Please select at least one get product or collection';
      }
      if (dGetValueType !== 'free' && (!dGetValue || parseFloat(dGetValue) <= 0)) {
        newErrors.getValue = 'Please enter a discount value';
      }
      if (dGetValueType === 'percentage' && parseFloat(dGetValue) > 100) {
        newErrors.getValue = 'Percentage cannot exceed 100';
      }
    }

    if (dEligibility === 'segments' && dSelectedSegments.length === 0) {
      newErrors.eligibility = 'Please select at least one customer segment';
    }
    if (dEligibility === 'customers' && dSelectedCustomers.length === 0) {
      newErrors.eligibility = 'Please select at least one customer';
    }

    if (dLimitUsage && (!dMaxUsageLimit || parseInt(dMaxUsageLimit) <= 0)) {
      newErrors.maxUsage = 'Please enter a valid usage limit';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      shopify.toast.show('Please fix the errors before saving', { isError: true });
      return;
    }

    setErrors({});

    // Immediately hide form to give fast feedback
    setShowCreateForm(false);
    shopify.toast.show('Creating discount...', { duration: 2000 });

    const payload = {
      title: dTitle,
      code: dCode,
      method: dMethod,
      type: dType,
      value: dType === 'buy_x_get_y' ? dGetValue : dValue,
      valueType: dType === 'buy_x_get_y' ? dGetValueType : dValueType,
      // For BXGY specifically if we want to be explicit
      getValue: dGetValue,
      getValueType: dGetValueType,
      buyQuantity: dBuyQuantity,
      getQuantity: dGetQuantity,
      buyProduct: JSON.stringify({
        type: dBuyProductType,
        selection: dBuyProductSelection,
      }),
      getProduct: JSON.stringify({
        type: dGetProductType,
        selection: dGetProductSelection,
      }),
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
      {
        intent: editingDiscount ? 'update' : 'create',
        id: editingDiscount?.id,
        ...payload,
      },
      { method: 'POST', encType: 'application/json' }
    );
  };

  const resetDiscountForm = (type) => {
    setErrors({});
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
    setErrors({});
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
      fetcher.submit(
        {
          id: discountToDelete.id || discountToDelete.shopifyId,
          method: discountToDelete.method || 'code',
          intent: 'delete',
        },
        { method: 'post' }
      );
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
  const selectCollections = () =>
    selectResources('collection', setSelectedCollections);
  const selectGetProducts = () =>
    selectResources('product', setDGetProductSelection);
  const selectGetCollections = () =>
    selectResources('collection', setDGetProductSelection);
  const selectBuyProducts = () =>
    selectResources('product', setDBuyProductSelection);
  const selectBuyCollections = () =>
    selectResources('collection', setDBuyProductSelection);

  const removeBuyResource = (id) => {
    setDBuyProductSelection(dBuyProductSelection.filter((r) => r.id !== id));
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const removeCollection = (collectionId) => {
    setSelectedCollections(
      selectedCollections.filter((c) => c.id !== collectionId)
    );
  };

  const removeGetResource = (id) => {
    setDGetProductSelection(dGetProductSelection.filter((r) => r.id !== id));
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

  // Optimistic UI for immediate addition to the list
  const displayDiscounts = [...discounts];
  if (
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'create'
  ) {
    const title = fetcher.formData.get('title');
    const code = fetcher.formData.get('code');
    const type = fetcher.formData.get('type');
    const method = fetcher.formData.get('method');

    // Add temporary item to the top
    displayDiscounts.unshift({
      id: 'optimistic-new',
      title: title,
      code: code,
      type: type,
      status: 'active',
      usage: '0 / Unlimited',
      created: 'Just now',
      isOptimistic: true,
    });
  } else if (
    fetcher.state === 'submitting' &&
    fetcher.formData?.get('intent') === 'delete'
  ) {
    const deleteId = String(fetcher.formData.get('id'));
    // Optimistically remove from display
    const deleteIndex = displayDiscounts.findIndex(
      (d) => String(d.id) === deleteId || String(d.shopifyId) === deleteId
    );
    if (deleteIndex > -1) {
      displayDiscounts.splice(deleteIndex, 1);
    }
  }

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      displayDiscounts.map((discount) => ({
        ...discount,
        id: `discount-${discount.id}`,
      }))
    );

  const [filterType, setFilterType] = useState('All Discounts');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleExportCSV = () => {
    const csvContent = [
      ['Discount Name', 'Type', 'Usage', 'Status', 'Date'],
      ...displayDiscounts.map(d => [
        `"${d.title}"`,
        `"${getTypeLabel(d.type)}"`,
        `"${d.usage}"`,
        `"${d.status}"`,
        `"${d.created || ''}"`
      ])
    ].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "discounts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    shopify.toast.show('Exported to CSV');
  };

  const filteredDiscounts = displayDiscounts.filter(d => {
    if (filterType === 'Active') return d.status === 'active';
    if (filterType === 'Inactive') return d.status === 'inactive';
    return true;
  });

  const totalFilteredList = filteredDiscounts.length;
  const totalPages = Math.ceil(totalFilteredList / itemsPerPage) || 1;
  const paginatedDiscounts = filteredDiscounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const SelectDiscountTypeModal = () => (
    <Modal
      open={selectTypeModalOpen}
      onClose={() => setSelectTypeModalOpen(false)}
      title="Select discount type"
      secondaryActions={[
        { content: 'Cancel', onAction: () => setSelectTypeModalOpen(false) },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Option 1: Amount off products */}
          <div
            onClick={() => {
              resetDiscountForm('amount_off_products');
              setSelectTypeModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                background: '#F1F1F1',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={DiscountIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">
                Amount off products
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                Discount specific products or collections of products
              </Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 2: Buy X get Y */}
          <div
            onClick={() => {
              resetDiscountForm('buy_x_get_y');
              setSelectTypeModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                background: '#F1F1F1',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={ProductIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">
                Buy X get Y
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                Discount specific products or collections of products
              </Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 3: Amount off order */}
          <div
            onClick={() => {
              resetDiscountForm('amount_off_order');
              setSelectTypeModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                background: '#F1F1F1',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={CartIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">
                Amount off order
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                Discount the total order amount
              </Text>
            </div>
            <Icon source={ChevronRightIcon} tone="subdued" />
          </div>

          {/* Option 4: Free shipping */}
          <div
            onClick={() => {
              resetDiscountForm('free_shipping');
              setSelectTypeModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div
              style={{
                background: '#F1F1F1',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={DeliveryIcon} tone="base" />
            </div>
            <div style={{ flex: 1 }}>
              <Text variant="bodyMd" fontWeight="bold" as="p">
                Free shipping
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                Offer free shipping on an order
              </Text>
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
      backAction={
        showCreateForm
          ? { content: 'Discounts', onAction: () => setShowCreateForm(false) }
          : undefined
      }
      title={
        showCreateForm
          ? editingDiscount
            ? `Edit ${getTypeLabel(dType)}`
            : getTypeLabel(dType)
          : 'Discounts'
      }
      primaryAction={
        !showCreateForm
          ? {
              content: 'Create discount',
              onAction: () => setSelectTypeModalOpen(true),
            }
          : undefined
      }
    >
      {!showCreateForm ? (
        <div style={{ maxWidth: '1200px', margin: '24px auto', fontFamily: 'inherit', color: '#111' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: '#000' }}>Discount Management</h1>
            <p style={{ fontSize: '15px', color: '#555', margin: 0 }}>Configure and monitor your active promotional rules across Shopify.</p>
          </div>

          {/* Stats Overview */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}
          >
            {/* Card 1: Active Discounts */}
            <div style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '16px', padding: '20px', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <p style={{ fontSize: '13px', color: '#666', fontWeight: '500', margin: '0 0 12px 0' }}>Active Discounts</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#000' }}>{activeDiscounts}</h2>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                  <Icon source={DiscountIcon} tone="base" />
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', margin: '12px 0 0 0' }}>
                {totalDiscounts} total rules overall
              </p>
            </div>

            {/* Card 2: Total Usage */}
            <div style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '16px', padding: '20px', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <p style={{ fontSize: '13px', color: '#666', fontWeight: '500', margin: '0 0 12px 0' }}>Total Usage</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#000' }}>{loaderTotalUsage ?? 0}</h2>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                  <Icon source={CartIcon} tone="base" />
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', margin: '12px 0 0 0' }}>
                Total redemptions tracked
              </p>
            </div>

            {/* Card 3: Shopify Sync */}
            <div style={{ flex: 1, minWidth: '280px', background: '#fff', borderRadius: '16px', padding: '20px', position: 'relative', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <p style={{ fontSize: '13px', color: '#666', fontWeight: '500', margin: '0 0 12px 0' }}>Shopify Sync</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#000' }}>Connected</h2>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => { fetcher.load('/app/discountengine'); shopify.toast.show('Syncing from backend...'); }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3.33333V0.833328L6.66667 4.16666L10 7.49999V4.99999C13.6833 4.99999 16.6667 7.98333 16.6667 11.6667C16.6667 15.35 13.6833 18.3333 10 18.3333C6.31667 18.3333 3.33333 15.35 3.33333 11.6667H1.66667C1.66667 16.2667 5.4 20 10 20C14.6 20 18.3333 16.2667 18.3333 11.6667C18.3333 7.06666 14.6 3.33333 10 3.33333Z" fill="#666"/>
                  </svg>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', margin: '14px 0 0 0' }}>
                Real-time synchronization
              </p>
            </div>
          </div>

          {/* Main Table Container */}
          <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9' }}>
            
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '8px 16px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Filter by:</span>
                <select 
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '600', color: '#000', cursor: 'pointer', outline: 'none' }}
                >
                  <option>All Discounts</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={handleExportCSV} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '30px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#000', cursor: 'pointer', transition: 'all 0.2s' }}>Export CSV</button>
                <button onClick={() => shopify.toast.show('Bulk Actions coming soon.')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '30px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#000', cursor: 'pointer', transition: 'all 0.2s' }}>Bulk Actions</button>
                <button onClick={() => setSelectTypeModalOpen(true)} style={{ background: '#000', border: 'none', borderRadius: '30px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>+ Create Discount</button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '24px', overflowX: 'auto', border: '1px solid #eaeaea', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #eaeaea', background: '#fafafa' }}>Discount Name</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #eaeaea', background: '#fafafa' }}>Type</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #eaeaea', background: '#fafafa' }}>Usage</th>
                    <th className="desktop-only" style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #eaeaea', background: '#fafafa' }}>Status</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '600', color: '#777', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #eaeaea', background: '#fafafa', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDiscounts.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '80px', textAlign: 'center', color: '#888' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div style={{ opacity: 0.5 }}>
                            <Icon source={DiscountIcon} tone="subdued" />
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>No discounts found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDiscounts.map((item, index) => {
                      // Modern minimalist badges
                      let typePillStyle = { background: '#f5f5f5', color: '#444', border: '1px solid #e5e5e5' }; 
                      if (item.type === 'amount_off_products' || item.type === 'amount_off_order') typePillStyle = { background: '#fafafa', color: '#111', border: '1px solid #eaeaea' };
                      if (item.type === 'buy_x_get_y') typePillStyle = { background: '#f0f0f0', color: '#000', border: '1px solid #d4d4d4' };
                      if (item.type === 'free_shipping') typePillStyle = { background: '#fff', color: '#000', border: '1px solid #ccc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };

                      return (
                        <tr 
                          key={item.id} 
                          style={{ opacity: item.isOptimistic ? 0.6 : 1, transition: 'all 0.25s ease', background: '#fff' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)'; e.currentTarget.style.position = 'relative'; e.currentTarget.style.zIndex = 1; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.position = 'static'; e.currentTarget.style.zIndex = 'auto'; }}
                        >
                          <td style={{ padding: '20px 24px', borderBottom: index === paginatedDiscounts.length - 1 ? 'none' : '1px solid #f1f1f1' }}>
                            <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 4px 0', color: '#111', letterSpacing: '-0.2px' }}>{item.title}</p>
                            <p style={{ fontSize: '12px', color: '#888', margin: 0, fontWeight: '400' }}>Created {item.created || 'N/A'}</p>
                          </td>
                          <td style={{ padding: '20px 24px', borderBottom: index === paginatedDiscounts.length - 1 ? 'none' : '1px solid #f1f1f1' }}>
                            <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '24px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', transition: 'all 0.2s', ...typePillStyle }}>
                              {getTypeLabel(item.type)}
                            </span>
                          </td>
                          <td style={{ padding: '20px 24px', borderBottom: index === paginatedDiscounts.length - 1 ? 'none' : '1px solid #f1f1f1' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>{(item.usage || '0').split(' / ')[0]}</span>
                              <span style={{ fontSize: '12px', color: '#999' }}>uses</span>
                            </div>
                          </td>
                          <td className="desktop-only" style={{ padding: '20px 24px', borderBottom: index === paginatedDiscounts.length - 1 ? 'none' : '1px solid #f1f1f1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <StatusToggle
                                status={item.status}
                                onToggle={() => handleToggleStatus(item)}
                                loading={
                                  fetcher.state !== 'idle' &&
                                  fetcher.formData?.get('id') === String(item.id)
                                }
                              />
                            </div>
                          </td>
                          <td style={{ padding: '20px 24px', borderBottom: index === paginatedDiscounts.length - 1 ? 'none' : '1px solid #f1f1f1', textAlign: 'right' }}>
                            <div className="desktop-only">
                              <InlineStack align="end" gap="200" blockAlign="center" wrap={false}>
                                <div 
                                  style={{ cursor: 'pointer', padding: '8px', opacity: 0.6, transition: 'all 0.2s', background: '#f5f5f5', borderRadius: '8px', display: 'flex' }} 
                                  onClick={() => handleEditDiscount(item)}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = '#e5e5e5'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = '#f5f5f5'; }}
                                >
                                  <Icon source={EditIcon} tone="base" />
                                </div>
                                <div 
                                  style={{ cursor: 'pointer', padding: '8px', opacity: 0.6, transition: 'all 0.2s', background: '#fff0f0', borderRadius: '8px', display: 'flex' }} 
                                  onClick={() => handleDeleteDiscount(item)}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = '#fee2e2'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = '#fff0f0'; }}
                                >
                                  <Icon source={DeleteIcon} tone="critical" />
                                </div>
                              </InlineStack>
                            </div>
                            <div className="mobile-only">
                              <Popover
                                active={popoverActive === item.id}
                                activator={
                                  <Button
                                    onClick={() => setPopoverActive(popoverActive === item.id ? null : item.id)}
                                    icon={MenuHorizontalIcon}
                                    variant="tertiary"
                                  />
                                }
                                onClose={() => setPopoverActive(null)}
                              >
                                <ActionList
                                  items={[
                                    {
                                      content: 'Edit',
                                      icon: EditIcon,
                                      onAction: () => { handleEditDiscount(item); setPopoverActive(null); },
                                    },
                                    {
                                      content: item.status === 'active' ? 'Deactivate' : 'Activate',
                                      icon: item.status === 'active' ? PauseCircleIcon : PlayCircleIcon,
                                      onAction: () => { handleToggleStatus(item); setPopoverActive(null); },
                                    },
                                    {
                                      content: 'Delete',
                                      icon: DeleteIcon,
                                      destructive: true,
                                      onAction: () => { handleDeleteDiscount(item); setPopoverActive(null); },
                                    },
                                  ]}
                                />
                              </Popover>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', color: '#64748b' }}>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                Showing {totalFilteredList === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalFilteredList)} of {totalFilteredList} discounts
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPage === 1 ? '#cbd5e1' : '#64748b' }}>&lt;</button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: currentPage === page ? '#0f172a' : 'transparent', 
                      color: currentPage === page ? '#fff' : '#64748b', 
                      border: 'none', fontWeight: '600', cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                    {page}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPage === totalPages ? '#cbd5e1' : '#64748b' }}>&gt;</button>
              </div>
            </div>
          </div>

          {/* Promotional Banner */}
          <div style={{ background: '#111', borderRadius: '32px', padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', position: 'relative', overflow: 'hidden', flexWrap: 'wrap', gap: '32px' }}>
            <div style={{ flex: '1 1 300px', minWidth: '280px', position: 'relative', zIndex: 2 }}>
              <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#fff', margin: '0 0 16px 0', lineHeight: 1.2 }}>Master your margins with Automated Rules</h2>
              <p style={{ fontSize: '15px', color: '#a1a1aa', margin: '0 0 32px 0', lineHeight: 1.6 }}>
                Use advanced logic to trigger discounts exactly when customers are ready to convert. Increase AOV by 24% on average.
              </p>
              <button 
                onClick={() => navigate('/app/customize')}
                style={{ background: '#fff', color: '#000', border: 'none', padding: '14px 28px', borderRadius: '30px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                Explore Templates
              </button>
            </div>
            
            {/* Template Showcase (Collapsed Book Pages) */}
            <div style={{ flex: '1 1 300px', minWidth: '280px', height: '240px', position: 'relative', perspective: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <style>{`
                @media (max-width: 767px) {
                  .desktop-only { display: none !important; }
                }
                @media (min-width: 768px) {
                  .mobile-only { display: none !important; }
                }
                @keyframes float-pages {
                  0%, 100% { transform: translateY(0) rotateX(5deg); }
                  50% { transform: translateY(-10px) rotateX(10deg); }
                }
                .template-page-stack {
                  position: relative;
                  width: 200px;
                  height: 140px;
                  transform-style: preserve-3d;
                  animation: float-pages 6s ease-in-out infinite;
                }
                .template-page {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: #fff;
                  border-radius: 8px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                  border: 1px solid rgba(255,255,255,0.1);
                  overflow: hidden;
                  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .template-img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                /* Collapsed/Stacked effect */
                .template-page:nth-child(1) { transform: translateZ(40px) rotateY(-5deg); z-index: 5; }
                .template-page:nth-child(2) { transform: translateZ(20px) rotateY(-12deg) translateX(-20px); z-index: 4; }
                .template-page:nth-child(3) { transform: translateZ(0px) rotateY(-18deg) translateX(-40px); z-index: 3; }
                .template-page:nth-child(4) { transform: translateZ(-20px) rotateY(-24deg) translateX(-60px); z-index: 2; }
              `}</style>

              <div className="template-page-stack">
                {/* Page 1 (Front) */}
                <div className="template-page">
                  <img src="/combo-design-one-preview.png" alt="Template 1" className="template-img" />
                </div>
                {/* Page 2 */}
                <div className="template-page">
                  <img src="/combo-design-two-preview.png" alt="Template 2" className="template-img" />
                </div>
                {/* Page 3 */}
                <div className="template-page">
                  <img src="/combo-design-four-preview.png" alt="Template 3" className="template-img" />
                </div>
                {/* Page 4 (Back) */}
                <div className="template-page" style={{ background: '#f8fafc' }} />
              </div>

              {/* Restored Conversion Lift Component */}
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                border: '1px solid rgba(255,255,255,0.15)', 
                borderRadius: '16px', 
                width: '160px', 
                height: '80px', 
                position: 'absolute', 
                bottom: '10px', 
                left: '-20px', 
                backdropFilter: 'blur(10px)', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                zIndex: 6,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}>
                <span style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>+15%</span>
                <span style={{ color: '#a1a1aa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Conversion Lift</span>
              </div>
            </div>
            {/* Subtle Gradient Glow */}
            <div style={{ position: 'absolute', top: '50%', right: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 70%)', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}></div>
          </div>
        </div>
      ) : (
        <fetcher.Form method="post" onSubmit={handleMainFormSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '20px',
              alignItems: 'start',
            }}
          >
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
                    <BlockStack gap="400">
                      <TextField
                        label="Title"
                        value={dTitle}
                        onChange={(val) => { setDTitle(val); setErrors((e) => ({ ...e, title: undefined })); }}
                        placeholder="e.g. Summer Sale 2024"
                        autoComplete="off"
                        helpText="For internal use. Customers will see this in their cart."
                        error={errors.title}
                      />

                      <TextField
                        label="Discount code"
                        value={dCode}
                        onChange={(val) => { setDCode(val.toUpperCase()); setErrors((e) => ({ ...e, code: undefined })); }}
                        autoComplete="off"
                        helpText="Customers must enter this code at checkout."
                        error={errors.code}
                        suffix={
                          <Button
                            variant="plain"
                            onClick={() =>
                              setDCode(
                                Math.random()
                                  .toString(36)
                                  .substring(2, 10)
                                  .toUpperCase()
                              )
                            }
                          >
                            Generate random code
                          </Button>
                        }
                      />
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Type Specific Configuration */}
              {(dType === 'amount_off_products' ||
                dType === 'amount_off_order') && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h3">
                      Discount value
                    </Text>

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
                          onChange={(val) => { setDValue(val); setErrors((e) => ({ ...e, value: undefined })); }}
                          suffix={dValueType === 'percentage' ? '%' : '₹'}
                          autoComplete="off"
                          error={errors.value}
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
                                {
                                  label: 'All products',
                                  value: 'all_products',
                                },
                                {
                                  label: 'Specific collections',
                                  value: 'specific_collections',
                                },
                                {
                                  label: 'Specific products',
                                  value: 'specific_products',
                                },
                              ]}
                              value={appliesTo}
                              onChange={setAppliesTo}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Select
                              label="Purchase type"
                              options={[
                                {
                                  label: 'One-time purchase',
                                  value: 'one_time',
                                },
                                {
                                  label: 'Subscription',
                                  value: 'subscription',
                                },
                                { label: 'Both', value: 'both' },
                              ]}
                              value="one_time"
                              onChange={() => {}}
                            />
                          </div>
                        </InlineStack>

                        {appliesTo !== 'all_products' && (
                          <div style={{ marginTop: '20px' }}>
                            <TextField
                              placeholder={
                                appliesTo === 'specific_collections'
                                  ? 'Search collections'
                                  : 'Search products'
                              }
                              error={errors.appliesTo}
                              suffix={
                                <Button
                                  onClick={
                                    appliesTo === 'specific_collections'
                                      ? selectCollections
                                      : selectProducts
                                  }
                                >
                                  Browse
                                </Button>
                              }
                              autoComplete="off"
                            />
                            <div
                              style={{
                                marginTop: '12px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              {(appliesTo === 'specific_collections'
                                ? selectedCollections
                                : selectedProducts
                              ).map((item) => (
                                <Badge
                                  key={item.id}
                                  onRemove={() =>
                                    appliesTo === 'specific_collections'
                                      ? removeCollection(item.id)
                                      : removeProduct(item.id)
                                  }
                                >
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
                    <Text variant="headingSm" as="h3">
                      Minimum purchase requirements
                    </Text>
                    <BlockStack gap="200">
                      <RadioButton
                        label="No minimum requirements"
                        checked={dMinRequirementType === 'none'}
                        onChange={() => setDMinRequirementType('none')}
                      />
                      <RadioButton
                        label="Minimum purchase amount (₹)"
                        checked={dMinRequirementType === 'amount'}
                        onChange={() => setDMinRequirementType('amount')}
                      />
                      {dMinRequirementType === 'amount' && (
                        <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                          <TextField
                            type="number"
                            placeholder="0.00"
                            value={dMinRequirementValue}
                            onChange={(val) => { setDMinRequirementValue(val); setErrors((e) => ({ ...e, minRequirementValue: undefined })); }}
                            autoComplete="off"
                            error={errors.minRequirementValue}
                          />
                        </div>
                      )}
                      <RadioButton
                        label="Minimum quantity of items"
                        checked={dMinRequirementType === 'quantity'}
                        onChange={() => setDMinRequirementType('quantity')}
                      />
                      {dMinRequirementType === 'quantity' && (
                        <div style={{ paddingLeft: '24px', maxWidth: '200px' }}>
                          <TextField
                            type="number"
                            placeholder="0"
                            value={dMinRequirementValue}
                            onChange={(val) => { setDMinRequirementValue(val); setErrors((e) => ({ ...e, minRequirementValue: undefined })); }}
                            autoComplete="off"
                            error={errors.minRequirementValue}
                          />
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
                      <Text variant="headingSm" as="h3">
                        Customer buys
                      </Text>
                      <Box>
                        <Text variant="bodyMd">Any items from</Text>
                        <div style={{ marginTop: '8px' }}>
                          <InlineStack gap="400">
                            <RadioButton
                              label="Specific products"
                              checked={dBuyProductType === 'product'}
                              onChange={() => setDBuyProductType('product')}
                            />
                            <RadioButton
                              label="Specific collections"
                              checked={dBuyProductType === 'collection'}
                              onChange={() => setDBuyProductType('collection')}
                            />
                          </InlineStack>
                        </div>
                      </Box>
                      <InlineStack gap="400" blockAlign="end">
                        <div style={{ width: '100px' }}>
                          <TextField
                            label="Quantity"
                            type="number"
                            value={dBuyQuantity}
                            onChange={(val) => { setDBuyQuantity(val); setErrors((e) => ({ ...e, buyQuantity: undefined })); }}
                            autoComplete="off"
                            error={errors.buyQuantity}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            placeholder={
                              dBuyProductType === 'product'
                                ? 'Search products'
                                : 'Search collections'
                            }
                            suffix={
                              <Button
                                onClick={() =>
                                  dBuyProductType === 'product'
                                    ? selectBuyProducts()
                                    : selectBuyCollections()
                                }
                              >
                                Browse
                              </Button>
                            }
                            autoComplete="off"
                            error={errors.buyProduct}
                          />
                          <div style={{ marginTop: '8px' }}>
                            <InlineStack gap="200" wrap={true}>
                              {dBuyProductSelection.map((item) => (
                                <Badge
                                  key={item.id}
                                  onRemove={() => removeBuyResource(item.id)}
                                >
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
                      <Text variant="headingSm" as="h3">
                        Customer gets
                      </Text>
                      <Text tone="subdued" variant="bodySm">
                        Customers must add the quantity of items specified below
                        to their cart.
                      </Text>
                      <InlineStack gap="400" blockAlign="end">
                        <div style={{ width: '100px' }}>
                          <TextField
                            label="Quantity"
                            type="number"
                            value={dGetQuantity}
                            onChange={(val) => { setDGetQuantity(val); setErrors((e) => ({ ...e, getQuantity: undefined })); }}
                            autoComplete="off"
                            error={errors.getQuantity}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextField
                            placeholder={
                              dGetProductType === 'product'
                                ? 'Search products'
                                : 'Search collections'
                            }
                            suffix={
                              <Button
                                onClick={() =>
                                  dGetProductType === 'product'
                                    ? selectGetProducts()
                                    : selectGetCollections()
                                }
                              >
                                Browse
                              </Button>
                            }
                            autoComplete="off"
                            error={errors.getProduct}
                          />
                          <div style={{ marginTop: '8px' }}>
                            <InlineStack gap="200" wrap={true}>
                              {dGetProductSelection.map((item) => (
                                <Badge
                                  key={item.id}
                                  onRemove={() => removeGetResource(item.id)}
                                >
                                  {item.title}
                                </Badge>
                              ))}
                            </InlineStack>
                          </div>
                        </div>
                      </InlineStack>
                      <Box>
                        <Text variant="headingSm" as="h4">
                          At a discounted value
                        </Text>
                        <div style={{ marginTop: '12px' }}>
                          <InlineStack gap="400">
                            <RadioButton
                              label="Percentage"
                              checked={dGetValueType === 'percentage'}
                              onChange={() => setDGetValueType('percentage')}
                            />
                            <RadioButton
                              label="Amount off each"
                              checked={dGetValueType === 'fixed_amount'}
                              onChange={() => setDGetValueType('fixed_amount')}
                            />
                            <RadioButton
                              label="Free"
                              checked={dGetValueType === 'free'}
                              onChange={() => setDGetValueType('free')}
                            />
                          </InlineStack>
                          {dGetValueType === 'percentage' && (
                            <div
                              style={{ marginTop: '8px', maxWidth: '150px' }}
                            >
                              <TextField
                                type="number"
                                suffix="%"
                                value={dGetValue}
                                onChange={(val) => { setDGetValue(val); setErrors((e) => ({ ...e, getValue: undefined })); }}
                                autoComplete="off"
                                error={errors.getValue}
                              />
                            </div>
                          )}
                          {dGetValueType === 'fixed_amount' && (
                            <div
                              style={{ marginTop: '8px', maxWidth: '150px' }}
                            >
                              <TextField
                                type="number"
                                suffix="₹"
                                value={dGetValue}
                                onChange={(val) => { setDGetValue(val); setErrors((e) => ({ ...e, getValue: undefined })); }}
                                autoComplete="off"
                                error={errors.getValue}
                              />
                            </div>
                          )}
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>

                  {/* Minimum Req for BXGY or others if needed */}
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">
                        Minimum purchase requirements
                      </Text>
                      <BlockStack gap="200">
                        <RadioButton
                          label="No minimum requirements"
                          checked={dMinRequirementType === 'none'}
                          onChange={() => setDMinRequirementType('none')}
                        />
                        <RadioButton
                          label="Minimum purchase amount (₹)"
                          checked={dMinRequirementType === 'amount'}
                          onChange={() => setDMinRequirementType('amount')}
                        />
                        {dMinRequirementType === 'amount' && (
                          <div
                            style={{ paddingLeft: '24px', maxWidth: '200px' }}
                          >
                            <TextField
                              type="number"
                              placeholder="0.00"
                              value={dMinRequirementValue}
                              onChange={setDMinRequirementValue}
                              autoComplete="off"
                            />
                          </div>
                        )}
                        <RadioButton
                          label="Minimum quantity of items"
                          checked={dMinRequirementType === 'quantity'}
                          onChange={() => setDMinRequirementType('quantity')}
                        />
                        {dMinRequirementType === 'quantity' && (
                          <div
                            style={{ paddingLeft: '24px', maxWidth: '200px' }}
                          >
                            <TextField
                              type="number"
                              placeholder="0"
                              value={dMinRequirementValue}
                              onChange={setDMinRequirementValue}
                              autoComplete="off"
                            />
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
                  <Text variant="headingSm" as="h3">
                    Customer eligibility
                  </Text>
                  <BlockStack gap="200">
                    <RadioButton
                      label="All customers"
                      checked={dEligibility === 'all'}
                      onChange={() => setDEligibility('all')}
                    />
                    <RadioButton
                      label="Specific customer segments"
                      checked={dEligibility === 'segments'}
                      onChange={() => setDEligibility('segments')}
                    />
                    {dEligibility === 'segments' && (
                      <Box paddingInlineStart="600">
                        <TextField
                          placeholder="Search segments"
                          suffix={
                            <Button onClick={() => { setSegmentModalOpen(true); setErrors((e) => ({ ...e, eligibility: undefined })); }}>
                              Browse
                            </Button>
                          }
                          autoComplete="off"
                          error={errors.eligibility}
                        />
                        <InlineStack gap="200" wrap={true}>
                          {dSelectedSegments.map((s) => (
                            <Badge
                              key={s.id}
                              onRemove={() =>
                                setDSelectedSegments((prev) =>
                                  prev.filter((x) => x.id !== s.id)
                                )
                              }
                            >
                              {s.title}
                            </Badge>
                          ))}
                        </InlineStack>
                      </Box>
                    )}
                    <RadioButton
                      label="Specific customers"
                      checked={dEligibility === 'customers'}
                      onChange={() => setDEligibility('customers')}
                    />
                    {dEligibility === 'customers' && (
                      <Box paddingInlineStart="600">
                        <TextField
                          placeholder="Search customers"
                          suffix={
                            <Button onClick={() => { setCustomerModalOpen(true); setErrors((e) => ({ ...e, eligibility: undefined })); }}>
                              Browse
                            </Button>
                          }
                          autoComplete="off"
                          error={errors.eligibility}
                        />
                        <InlineStack gap="200" wrap={true}>
                          {dSelectedCustomers.map((c) => (
                            <Badge
                              key={c.id}
                              onRemove={() =>
                                setDSelectedCustomers((prev) =>
                                  prev.filter((x) => x.id !== c.id)
                                )
                              }
                            >
                              {c.title}
                            </Badge>
                          ))}
                        </InlineStack>
                      </Box>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Usage Limits Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">
                    Maximum discount uses
                  </Text>
                  <Checkbox
                    label="Limit number of times this discount can be used in total"
                    checked={dLimitUsage}
                    onChange={setDLimitUsage}
                  />
                  {dLimitUsage && (
                    <TextField
                      type="number"
                      value={dMaxUsageLimit}
                      onChange={(val) => { setDMaxUsageLimit(val); setErrors((e) => ({ ...e, maxUsage: undefined })); }}
                      autoComplete="off"
                      error={errors.maxUsage}
                    />
                  )}
                  <Checkbox
                    label="Limit to one use per customer"
                    checked={dOncePerCustomer}
                    onChange={setDOncePerCustomer}
                  />
                </BlockStack>
              </Card>

              {/* Combinations Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">
                    Combinations
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    This discount can be combined with:
                  </Text>
                  <BlockStack gap="200">
                    <Checkbox
                      label="Product discounts"
                      checked={dCombinations.product}
                      onChange={(val) =>
                        setDCombinations({ ...dCombinations, product: val })
                      }
                    />
                    <Checkbox
                      label="Order discounts"
                      checked={dCombinations.order}
                      onChange={(val) =>
                        setDCombinations({ ...dCombinations, order: val })
                      }
                    />
                    <Checkbox
                      label="Shipping discounts"
                      checked={dCombinations.shipping}
                      onChange={(val) =>
                        setDCombinations({ ...dCombinations, shipping: val })
                      }
                    />
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Active Dates Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">
                    Active dates
                  </Text>
                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Start date"
                        type="date"
                        value={dStartsAt?.split('T')[0] || ''}
                        onChange={(val) =>
                          setDStartsAt(
                            val + 'T' + (dStartsAt?.split('T')[1] || '00:00')
                          )
                        }
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Start time (EST)"
                        type="time"
                        value={dStartsAt?.split('T')[1] || ''}
                        onChange={(val) =>
                          setDStartsAt(
                            (dStartsAt?.split('T')[0] || '') + 'T' + val
                          )
                        }
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                  <Checkbox
                    label="Set end date"
                    checked={dHasEndDate}
                    onChange={setDHasEndDate}
                  />
                  {dHasEndDate && (
                    <InlineStack gap="400">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="End date"
                          type="date"
                          value={dEndsAt ? dEndsAt.split('T')[0] : ''}
                          onChange={(val) =>
                            setDEndsAt(
                              val +
                                'T' +
                                (dEndsAt && dEndsAt.includes('T')
                                  ? dEndsAt.split('T')[1]
                                  : '23:59')
                            )
                          }
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="End time (EST)"
                          type="time"
                          value={
                            dEndsAt && dEndsAt.includes('T')
                              ? dEndsAt.split('T')[1]
                              : ''
                          }
                          onChange={(val) =>
                            setDEndsAt(
                              (dEndsAt && dEndsAt.includes('T')
                                ? dEndsAt.split('T')[0]
                                : '') +
                                'T' +
                                val
                            )
                          }
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>

            {/* Sidebar Summary */}
            <div
              style={{
                position: 'sticky',
                top: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h3">
                    Summary
                  </Text>
                  <Box borderBlockEndWidth="1" paddingBlockEnd="400">
                    <Text variant="headingMd" as="p" tone="success">
                      {dCode || 'No discount code yet'}
                    </Text>
                  </Box>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">
                        Logic Details
                      </Text>
                      <Text variant="bodySm">
                        {dType === 'buy_x_get_y'
                          ? `Buy ${dBuyQuantity || 0} Get ${dGetQuantity || 0} (${dGetValueType === 'free' ? 'Free' : dGetValueType === 'percentage' ? dGetValue + '%' : '₹' + dGetValue})`
                          : `${dValue || 0}${dValueType === 'percentage' ? '%' : '₹'} off ${appliesTo.replace('_', ' ')}`}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">
                        Minimum Requirements
                      </Text>
                      <Text variant="bodySm">
                        {dMinRequirementType === 'none' &&
                          'No minimum requirements'}
                        {dMinRequirementType === 'amount' &&
                          `Spend at least ₹${dMinRequirementValue || 0}`}
                        {dMinRequirementType === 'quantity' &&
                          `Buy at least ${dMinRequirementValue || 0} items`}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">
                        Eligibility
                      </Text>
                      <Text variant="bodySm">
                        {dEligibility === 'all' && 'All customers'}
                        {dEligibility === 'segments' &&
                          `${dSelectedSegments.length} segments`}
                        {dEligibility === 'customers' &&
                          `${dSelectedCustomers.length} customers`}
                      </Text>
                    </BlockStack>

                    <BlockStack gap="100">
                      <Text variant="bodySm" fontWeight="bold">
                        Combinations
                      </Text>
                      <Text variant="bodySm">
                        {[
                          dCombinations.product && 'Product',
                          dCombinations.order && 'Order',
                          dCombinations.shipping && 'Shipping',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'None'}
                      </Text>
                    </BlockStack>
                  </div>

                  <BlockStack gap="200">
                    <Text variant="bodySm" fontWeight="bold" as="p">
                      Status
                    </Text>
                    <Badge tone="attention">Not saved</Badge>
                  </BlockStack>
                </BlockStack>
              </Card>

              <BlockStack gap="200">
                <Button
                  variant="primary"
                  size="large"
                  submit
                  loading={fetcher.state === 'submitting'}
                >
                  Save discount
                </Button>
                <Button size="large" onClick={() => setShowCreateForm(false)}>
                  Discard
                </Button>
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
          loading:
            fetcher.state === 'submitting' &&
            fetcher.formData?.get('intent') === 'delete',
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
            Are you sure you want to delete this discount? This action cannot be
            undone and will also remove it from Shopify.
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={segmentModalOpen}
        onClose={() => setSegmentModalOpen(false)}
        title="Select customer segments"
        primaryAction={{
          content: 'Done',
          onAction: () => setSegmentModalOpen(false),
        }}
      >
        <Modal.Section>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {mockSegments.map((segment) => {
              const isSelected = dSelectedSegments.some(
                (s) => s.id === segment.id
              );
              return (
                <div
                  key={segment.id}
                  onClick={() =>
                    isSelected
                      ? setDSelectedSegments((prev) =>
                          prev.filter((s) => s.id !== segment.id)
                        )
                      : setDSelectedSegments((prev) => [...prev, segment])
                  }
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isSelected ? '#F0F9FF' : '#fff',
                  }}
                >
                  <div style={{ marginRight: '12px' }}>
                    <Checkbox checked={isSelected} onChange={() => {}} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ fontWeight: '500', margin: 0 }}>
                      {segment.title}
                    </p>
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
        primaryAction={{
          content: 'Done',
          onAction: () => setCustomerModalOpen(false),
        }}
      >
        <Modal.Section>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {mockCustomers.map((customer) => {
              const isSelected = dSelectedCustomers.some(
                (c) => c.id === customer.id
              );
              return (
                <div
                  key={customer.id}
                  onClick={() =>
                    isSelected
                      ? setDSelectedCustomers((prev) =>
                          prev.filter((c) => c.id !== customer.id)
                        )
                      : setDSelectedCustomers((prev) => [...prev, customer])
                  }
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isSelected ? '#F0F9FF' : '#fff',
                  }}
                >
                  <div style={{ marginRight: '12px' }}>
                    <Checkbox checked={isSelected} onChange={() => {}} />
                  </div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                    }}
                  >
                    {customer.displayName.charAt(0)}
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <p style={{ fontWeight: '500', margin: 0 }}>
                      {customer.displayName}
                    </p>
                    <p
                      style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}
                    >
                      {customer.email}
                    </p>
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
