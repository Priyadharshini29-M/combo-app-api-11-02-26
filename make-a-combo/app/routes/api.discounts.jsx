import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { getDb, sendToPhp, BASE_PHP_URL } from '../utils/api-helpers';

/* =========================
   DISCOUNTS API
   Handles: GET, CREATE, UPDATE, DELETE
========================= */

/* =========================
   DISCOUNTS API
   Handles: GET, CREATE, UPDATE, DELETE
========================= */

export const loader = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get('source');

  // If source is shopify, fetch from Admin API
  if (source === 'shopify') {
    try {
      const { admin } = await authenticate.admin(request);

      const QUERY = `#graphql
              query ListDiscountsWithTargets($first: Int = 10) {
                discountNodes(first: $first) {
                  edges {
                    node {
                      id
                      discount {
                        __typename
                        ... on DiscountCodeBasic {
                          title
                          codes(first: 1) {
                            nodes { code }
                          }
                          customerGets {
                            items {
                              ... on DiscountCollections {
                                collections(first: 10) {
                                  nodes { id }
                                }
                              }
                              ... on DiscountProducts {
                                products(first: 10) {
                                  nodes { id title }
                                }
                              }
                            }
                          }
                        }
                        ... on DiscountCodeBxgy {
                          title
                          codes(first: 1) {
                            nodes { code }
                          }
                          customerGets {
                            items {
                              ... on DiscountCollections {
                                collections(first: 10) {
                                  nodes { id }
                                }
                              }
                              ... on DiscountProducts {
                                products(first: 10) {
                                  nodes { id title }
                                }
                              }
                            }
                          }
                        }
                        }
                      }
                    }
                  }
                }
              }
            `;

      const response = await admin.graphql(QUERY);
      const responseJson = await response.json();

      const simplifiedDiscounts = responseJson.data.discountNodes.edges
        .filter(({ node }) => node.discount && !node.discount.__typename.includes('Automatic'))
        .map(({ node }) => {
          const discount = node.discount;
          const type = discount.__typename;
          const title = discount.title;
          const code = discount.codes?.nodes?.[0]?.code || null;

          let productIds = [];
          let collectionIds = [];
          let productList = [];

          const items = discount.customerGets?.items;

          if (items) {
            if (items.products) {
              productIds = items.products.nodes.map((p) => p.id);
              productList = items.products.nodes.map((p) => ({
                id: p.id,
                title: p.title,
              }));
            }
            if (items.collections) {
              collectionIds = items.collections.nodes.map((c) => c.id);
            }
          }

          return {
            id: node.id,
            title,
            code,
            type,
            collectionIds,
            productIds,
            productList,
          };
        });

      return json(
        {
          success: true,
          source: 'shopify',
          data: simplifiedDiscounts,
        },
        {
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    } catch (error) {
      console.error('[Discounts API] Shopify Fetch Error:', error);
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  const id = url.searchParams.get('id');
  const shop = url.searchParams.get('shop');
  const db = await getDb(shop);
  const discounts = db.discounts || [];

  let responseData = {};
  let status = 200;

  try {
    // Get single discount by ID
    if (id) {
      const discount = discounts.find((d) => String(d.id) === String(id));
      if (discount) {
        responseData = { success: true, data: discount };
      } else {
        responseData = { success: false, error: 'Discount not found' };
        status = 404;
      }
    }
    // Get all discounts (optionally filtered by shop)
    else {
      const filtered = shop
        ? discounts.filter((d) => d.shop === shop)
        : discounts;

      responseData = {
        success: true,
        message: 'Discounts fetched successfully',
        data: filtered,
      };
    }
  } catch (error) {
    console.error('[Discounts API] Loader Error:', error);
    responseData = { success: false, error: error.message };
    status = 500;
  }

  return json(responseData, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const action = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  let numericShopId = null;
  try {
    const shopIdQuery = await admin.graphql(`query { shop { id } }`);
    const shopIdJson = await shopIdQuery.json();
    const shopGid = shopIdJson.data?.shop?.id;
    numericShopId = shopGid ? shopGid.split('/').pop() : null;
  } catch (err) {
    console.error('[Discounts API] ⚠️ Failed to fetch Shop ID:', err.message);
  }
  const db = await getDb(shop);

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    console.error('[Discounts API] Body parse error:', e);
  }

  const { action: actionType, id, data } = body;
  let discounts = db.discounts || [];
  let result = null;
  let message = '';

  try {
    /* ========= CREATE ========= */
    if (actionType === 'create') {
      let shopifyDiscountId = null;

      // Determine Customer Selection (Eligibility) - Shared for all types
      let customerSelection = { all: true };
      try {
        if (data.eligibility === 'segments') {
          const segments =
            typeof data.selectedSegments === 'string'
              ? JSON.parse(data.selectedSegments)
              : data.selectedSegments || [];
          if (segments.length > 0) {
            customerSelection = {
              customerSegments: { add: segments.map((s) => s.id) },
            };
          }
        } else if (data.eligibility === 'customers') {
          const customers =
            typeof data.selectedCustomers === 'string'
              ? JSON.parse(data.selectedCustomers)
              : data.selectedCustomers || [];
          if (customers.length > 0) {
            customerSelection = {
              customers: { add: customers.map((c) => c.id) },
            };
          }
        }
      } catch (err) {
        console.error('[Discounts API] Error parsing customer selection:', err);
      }

      // Prepare Shopify GraphQL Mutation
      // Case 1: Basic Discount (Percentage / Fixed Amount)
      if (
        data &&
        ['percentage', 'fixed', 'amount', 'amount_off_products'].includes(
          data.type
        )
      ) {
        try {
          const isPercentage = data.valueType === 'percentage';
          const discountValue = parseFloat(data.value || 0) || 0;

          // Determine Customer Gets Items (All vs Specific)
          let customerGetsItems = { all: true };
          try {
            if (data.appliesTo === 'specific_products') {
              const products =
                typeof data.selectedProducts === 'string'
                  ? JSON.parse(data.selectedProducts)
                  : data.selectedProducts || [];
              if (products.length > 0) {
                customerGetsItems = {
                  products: {
                    productsToAdd: products.map((p) => p.id || p.value),
                  },
                };
              }
            } else if (data.appliesTo === 'specific_collections') {
              const collections =
                typeof data.selectedCollections === 'string'
                  ? JSON.parse(data.selectedCollections)
                  : data.selectedCollections || [];
              if (collections.length > 0) {
                customerGetsItems = {
                  collections: { add: collections.map((c) => c.id || c.value) },
                };
              }
            }
          } catch (err) {
            console.error(
              '[Discounts API - Basic] Error parsing customer gets items:',
              err
            );
          }

          const mutation = `#graphql
                        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
                            discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                                codeDiscountNode {
                                    id
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `;

          let minimumRequirement = null;
          if (
            data.minRequirementType === 'amount' &&
            data.minRequirementValue
          ) {
            minimumRequirement = {
              subtotal: {
                greaterThanOrEqualToSubtotal: parseFloat(
                  data.minRequirementValue
                ),
              },
            };
          } else if (
            data.minRequirementType === 'quantity' &&
            data.minRequirementValue
          ) {
            minimumRequirement = {
              quantity: {
                greaterThanOrEqualToQuantity: String(data.minRequirementValue),
              },
            };
          }

          const combinations = data.combinations || {};

          const variables = {
            basicCodeDiscount: {
              title: data.title,
              code: data.code,
              startsAt: data.startDate
                ? new Date(data.startDate).toISOString()
                : new Date().toISOString(),
              endsAt:
                data.endDate && data.endDate !== 'No end date'
                  ? new Date(data.endDate).toISOString()
                  : null,
              customerGets: {
                value: isPercentage
                  ? { percentage: discountValue / 100 }
                  : {
                    discountAmount: {
                      amount: discountValue,
                      appliesOnEachItem: data.appliesTo !== 'all_products',
                    },
                  },
                items: customerGetsItems,
              },
              customerSelection: customerSelection,
              usageLimit: data.maxUsage ? parseInt(data.maxUsage) : null,
              appliesOncePerCustomer: data.oncePerCustomer === true,
              minimumRequirement: minimumRequirement,
              combinesWith: {
                orderDiscounts: combinations.order || false,
                productDiscounts: combinations.product || false,
                shippingDiscounts: combinations.shipping || false,
              },
            },
          };

          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();

          if (
            responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0
          ) {
            console.error(
              '[Discounts API - Basic] Shopify Creation Errors:',
              responseJson.data.discountCodeBasicCreate.userErrors
            );
          } else if (
            responseJson.data?.discountCodeBasicCreate?.codeDiscountNode
          ) {
            shopifyDiscountId =
              responseJson.data.discountCodeBasicCreate.codeDiscountNode.id;
          }
        } catch (err) {
          console.error(
            '[Discounts API - Basic] Shopify Creation Failed:',
            err
          );
        }
      }
      // Case 2: Buy X Get Y Discount
      else if (data && data.type === 'buyxgety') {
        try {
          const buyQuantityStr = String(data.buyQuantity);
          const getQuantityStr = String(data.getQuantity);

          // Parse Buy items
          let customerBuysItems = null;
          const buyData =
            typeof data.buyProduct === 'string'
              ? JSON.parse(data.buyProduct)
              : data.buyProduct || {};
          if (buyData.type === 'product' && buyData.selection?.length > 0) {
            customerBuysItems = {
              products: {
                productsToAdd: buyData.selection.map((p) => p.id || p.value),
              },
            };
          } else if (
            buyData.type === 'collection' &&
            buyData.selection?.length > 0
          ) {
            customerBuysItems = {
              collections: {
                add: buyData.selection.map((c) => c.id || c.value),
              },
            };
          }

          // Parse Get items
          let customerGetsItems = null;
          const getData =
            typeof data.getProduct === 'string'
              ? JSON.parse(data.getProduct)
              : data.getProduct || {};
          if (getData.type === 'product' && getData.selection?.length > 0) {
            customerGetsItems = {
              products: {
                productsToAdd: getData.selection.map((p) => p.id || p.value),
              },
            };
          } else if (
            getData.type === 'collection' &&
            getData.selection?.length > 0
          ) {
            customerGetsItems = {
              collections: {
                add: getData.selection.map((c) => c.id || c.value),
              },
            };
          }

          if (customerBuysItems && customerGetsItems) {
            const mutation = `#graphql
                            mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
                                discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
                                    codeDiscountNode {
                                        id
                                    }
                                    userErrors {
                                        field
                                        message
                                    }
                                }
                            }
                        `;

            // Determine effect
            let effect = { percentage: 1.0 }; // Default Free
            if (data.getValueType === 'percentage') {
              const decimalValue = parseFloat(data.getValue || 0) / 100 || 0;
              effect = { percentage: decimalValue };
            } else if (data.getValueType === 'fixed_amount') {
              effect = { amount: String(parseFloat(data.getValue || 0) || 0) };
            }

            const combinations = data.combinations || {};

            const variables = {
              bxgyCodeDiscount: {
                title: data.title,
                code: data.code,
                startsAt: data.startDate
                  ? new Date(data.startDate).toISOString()
                  : new Date().toISOString(),
                endsAt:
                  data.endDate && data.endDate !== 'No end date'
                    ? new Date(data.endDate).toISOString()
                    : null,
                usageLimit: data.maxUsage ? parseInt(data.maxUsage) : null,
                appliesOncePerCustomer: data.oncePerCustomer === true,
                customerSelection: customerSelection,
                customerBuys: {
                  value: { quantity: buyQuantityStr },
                  items: customerBuysItems,
                },
                customerGets: {
                  value: {
                    discountOnQuantity: {
                      quantity: getQuantityStr,
                      effect: effect,
                    },
                  },
                  items: customerGetsItems,
                },
                combinesWith: {
                  orderDiscounts: combinations.order || false,
                  productDiscounts: combinations.product || false,
                  shippingDiscounts: combinations.shipping || false,
                },
              },
            };

            const response = await admin.graphql(mutation, { variables });
            const responseJson = await response.json();

            if (
              responseJson.data?.discountCodeBxgyCreate?.userErrors?.length > 0
            ) {
              console.error(
                '[Discounts API - BXGY] Shopify Creation Errors:',
                responseJson.data.discountCodeBxgyCreate.userErrors
              );
            } else if (
              responseJson.data?.discountCodeBxgyCreate?.codeDiscountNode
            ) {
              shopifyDiscountId =
                responseJson.data.discountCodeBxgyCreate.codeDiscountNode.id;
            }
          }
        } catch (err) {
          console.error('[Discounts API - BXGY] Shopify Creation Failed:', err);
        }
      }

      const newDiscount = {
        shopifyId: shopifyDiscountId,
        ...data,
        shop,
        usage: '0 / ' + (data.maxUsage || 'Unlimited'),
        created: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        createdAt: new Date().toISOString(),
      };

      message = 'Discount created successfully';

      console.log('[Discounts API] 📤 Synchronizing to PHP...');

      try {
        const dbResult = await sendToPhp(
          { event: 'create', resource: 'discount', shop, data: newDiscount },
          'discount.php'
        );
        console.log('[Discounts API] ✅ MySQL Save Result:', dbResult);
        // Use PHP-assigned ID if returned
        newDiscount.id = dbResult?.data?.id || dbResult?.id || newDiscount.id;
      } catch (dbError) {
        console.error('[Discounts API] ❌ MySQL save failed:', dbError.message);
      }

      result = newDiscount;
    } else if (actionType === 'update') {
      /* ========= UPDATE ========= */
      result = { id, ...data, shop };
      message = 'Discount updated successfully';

      console.log('[Discounts API] 📤 Synchronizing update to PHP...');

      try {
        const dbResult = await sendToPhp(
          { event: 'update', resource: 'discount', shop, data: result },
          'discount.php'
        );
        console.log('[Discounts API] ✅ MySQL Update Result:', dbResult);
      } catch (dbError) {
        console.error('[Discounts API] ❌ MySQL update failed:', dbError.message);
      }
    } else if (actionType === 'delete') {
      /* ========= DELETE ========= */
      message = 'Discount deleted successfully';

      console.log('[Discounts API] 📤 Synchronizing delete to PHP...');

      try {
        const dbResult = await sendToPhp(
          { event: 'delete', resource: 'discount', shop, id },
          'discount.php'
        );
        console.log('[Discounts API] ✅ MySQL Delete Result:', dbResult);
      } catch (dbError) {
        console.error('[Discounts API] ❌ MySQL delete failed:', dbError.message);
      }
    }

    return json(
      { success: true, message, data: result },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('[Discounts API] Error:', error);
    return json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
};
