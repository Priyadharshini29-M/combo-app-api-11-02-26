import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { getDb, sendToPhp } from '../utils/api-helpers';

/* =========================
   TEMPLATES API
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
  const id = url.searchParams.get('id');
  const handle = url.searchParams.get('handle');
  const shop = url.searchParams.get('shop');

  const db = await getDb(shop);
  const templates = db.templates || [];

  let responseData = {};
  let status = 200;

  try {
    /* ===== GET BY ID ===== */
    if (id) {
      const template = templates.find((t) => String(t.id) === String(id));
      if (!template) {
        status = 404;
        responseData = { success: false, error: 'Template not found' };
      } else {
        responseData = { success: true, data: template };
      }
    } else if (handle) {
      /* ===== GET BY HANDLE ===== */
      // Storefront requests: only match active templates
      const activeTemplates = templates.filter((t) => t.active);
      const template = activeTemplates.find((t) => {
        const configHandle = (t.config?.collection_title || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-');

        const titleHandle = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const searchHandle = handle.toLowerCase();

        return (
          String(t.id) === searchHandle ||
          configHandle === searchHandle ||
          titleHandle === searchHandle ||
          t.title.toLowerCase() === searchHandle ||
          searchHandle.includes(t.title.toLowerCase()) ||
          t.title.toLowerCase().includes(searchHandle)
        );
      });

      if (!template) {
        status = 404;
        responseData = {
          success: false,
          error: 'No template matches this handle',
        };
      } else {
        responseData = { success: true, data: template };
      }
    } else {
      /* ===== GET ALL ===== */
      responseData = {
        success: true,
        message: 'Templates fetched successfully',
        data: shop ? templates.filter((t) => t.shop === shop) : templates,
      };
    }
  } catch (error) {
    console.error('[Templates API] Loader Error:', error);
    status = 500;
    responseData = { success: false, error: error.message };
  }

  return json(responseData, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
};

/* =========================
   ACTION
========================= */

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
    console.error('[Templates API] ⚠️ Failed to fetch Shop ID:', err.message);
  }

  // Helper to fetch collection ID by title
  const fetchCollectionIdByTitle = async (title) => {
    if (!title || title === 'Create Your Combo') return null;
    const query = `
            query CollectionId($query: String!) {
                collections(first: 1, query: $query) {
                    nodes {
                        id
                    }
                }
            }
        `;
    try {
      const response = await admin.graphql(query, {
        variables: { query: `title:"${title}"` },
      });
      const json = await response.json();

      if (json.errors) {
        console.error(
          '[Templates API] ❌ GraphQL Errors (fetchCollectionIdByTitle):',
          JSON.stringify(json.errors, null, 2)
        );
        return null;
      }

      const collectionId = json.data?.collections?.nodes?.[0]?.id || null;
      const numericId = collectionId ? collectionId.split('/').pop() : null;
      console.log(
        `[Templates API] 🔍 fetchCollectionIdByTitle result for "${title}":`,
        numericId
      );
      return numericId; // Return numeric ID for database compatibility
    } catch (error) {
      console.error(
        '[Templates API] ❌ Exception in fetchCollectionIdByTitle:',
        error
      );
      return null;
    }
  };

  // Helper to fetch collection ID by handle
  const fetchCollectionIdByHandle = async (handle) => {
    if (!handle) return null;
    const query = `#graphql
            query CollectionByHandle($handle: String!) {
              collectionByHandle(handle: $handle) {
                id
              }
            }
        `;
    try {
      const response = await admin.graphql(query, { variables: { handle } });
      const responseJson = await response.json();
      const collectionId = responseJson.data?.collectionByHandle?.id || null;
      const numericId = collectionId ? collectionId.split('/').pop() : null;
      return numericId;
    } catch (e) {
      return null;
    }
  };

  // Helper to fetch collection products
  const fetchCollectionProducts = async (collectionId) => {
    if (!collectionId) return [];

    // Ensure GID format
    const gid = collectionId.startsWith('gid://')
      ? collectionId
      : `gid://shopify/Collection/${collectionId}`;

    const query = `#graphql
            query ProductsInCollection($id: ID!, $first: Int!) {
              collection(id: $id) {
                id
                title
                handle
                products(first: $first) {
                  nodes {
                    id
                    title
                    handle
                    status
                    featuredMedia {
                      preview {
                        image {
                          url
                        }
                      }
                    }
                    variants(first: 50) {
                      nodes {
                        id
                        title
                        price
                        availableForSale
                        image { url }
                        selectedOptions { name value }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
        `;

    try {
      const response = await admin.graphql(query, {
        variables: { id: gid, first: 50 },
      });
      const json = await response.json();

      if (json.errors) {
        console.error(
          '[Templates API] ❌ GraphQL Errors (fetchCollectionProducts):',
          JSON.stringify(json.errors, null, 2)
        );
        return [];
      }

      if (!json.data?.collection) {
        console.warn(`[Templates API] ⚠️ Collection not found for GID: ${gid}`);
        return [];
      }

      const products = json.data.collection.products?.nodes || [];
      console.log(
        `[Templates API] 📦 Fetched ${products.length} products for collection ${json.data.collection.title} (${gid})`
      );

      return products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        price: p.variants?.nodes?.[0]?.price || '0.00',
        image: p.featuredMedia?.preview?.image?.url || '',
        variants: (p.variants?.nodes || []).map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          available: v.availableForSale,
          image: v.image?.url || null,
          options: v.selectedOptions,
        })),
      }));
    } catch (error) {
      console.error(
        '[Templates API] ❌ Exception in fetchCollectionProducts:',
        error
      );
      return [];
    }
  };

  const db = await getDb(shop);
  let templates = db.templates || [];
  const discounts = db.discounts || [];

  // Handle both FormData and JSON
  let body = {};
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const formData = await request.formData();
      const bodyStr = formData.get('body');
      if (bodyStr) {
        body = JSON.parse(bodyStr);
      }
    } else {
      // Try JSON as fallback
      body = await request.json();
    }

    console.log('[Templates API] Received request:', {
      contentType,
      action: body.action,
      resource: body.resource,
    });
  } catch (e) {
    console.error('[Templates API] Body parse error:', e);
    return json(
      { success: false, error: 'Invalid request body' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const { action: actionType, id, data, publishParams } = body;
  let result = null;
  let message = '';

  try {
    /* ===== CREATE ===== */
    if (actionType === 'create') {
      if (!data?.config?.layout) {
        throw new Error('Invalid configuration: Missing Layout');
      }

      // 1. Resolve Collection ID if missing
      if (!data.config?.collection_id) {
        console.log(
          `[Templates API] 🔍 Attempting auto-resolution of Collection ID...`
        );

        // Fallback 1: Use collection_title if valid
        if (
          data.config?.collection_title &&
          data.config.collection_title !== 'Create Your Combo'
        ) {
          const resolvedId = await fetchCollectionIdByTitle(
            data.config.collection_title
          );
          if (resolvedId) data.config.collection_id = resolvedId;
        }

        // Fallback 2: Check common layout handles if ID still missing
        if (!data.config?.collection_id) {
          const firstHandle =
            data.config?.step_1_collection ||
            data.config?.col_1 ||
            data.config?.collection_handle;
          if (firstHandle) {
            const resolvedId = await fetchCollectionIdByHandle(firstHandle);
            if (resolvedId) data.config.collection_id = resolvedId;
          }
        }
      }

      // 2. Fetch products from all step collections
      let productList = data.product_list || [];
      const stepHandles = [];
      for (let i = 1; i <= 10; i++) {
        const handle = data.config?.[`step_${i}_collection`];
        if (!handle) break;
        stepHandles.push({ step: i, handle, limit: parseInt(data.config?.[`step_${i}_limit`]) || null });
      }

      if (stepHandles.length > 0) {
        const allProducts = [];
        for (const { step, handle, limit } of stepHandles) {
          console.log(`[Templates API] 📦 Fetching products for step ${step} collection: ${handle}`);
          const collectionId = await fetchCollectionIdByHandle(handle);
          if (collectionId) {
            const products = await fetchCollectionProducts(collectionId);
            products.forEach(p => allProducts.push({ ...p, step, collection_handle: handle, step_limit: limit }));
          }
        }
        if (allProducts.length > 0) productList = allProducts;
      } else if (data.config?.collection_id) {
        console.log(`[Templates API] 📦 Fetching products for collection: ${data.config.collection_id}`);
        const collectionProducts = await fetchCollectionProducts(data.config.collection_id);
        if (collectionProducts.length > 0) productList = collectionProducts;
      }

      // Resolve Discount if ID provided
      let discountId =
        data.discount_id || data.config?.selected_discount_id || null;
      let discountCode = null;

      if (discountId) {
        const discount = discounts.find(
          (d) => String(d.id) === String(discountId)
        );
        if (discount) {
          discountId = discount.id;
          discountCode = discount.code;
        } else {
          // Keep the ID even if not found locally, but code will be null
          // This handles cases where ID exists in frontend/config but maybe not synced yet?
          // Or simply to respect the input.
        }
      }

      // 3. Handle Automatic Page Creation/Linking
      let pageUrl = data.page_url || (publishParams?.handle ? publishParams.handle : null);
      let pageId = data.page_id || null;

      if (publishParams) {
        console.log('[Templates API] 📄 Handling Shopify Page operation (Create):', publishParams.publishType);
        if (publishParams.publishType === 'new') {
          let pageData;
          try {
            const pageResponse = await admin.graphql(
              `#graphql
              mutation pageCreate($page: PageCreateInput!) {
                pageCreate(page: $page) {
                  page { id handle }
                  userErrors { field message }
                }
              }`,
              {
                variables: {
                  page: {
                    title: publishParams.title || data.title,
                    handle: publishParams.handle,
                  },
                },
              }
            );
            pageData = await pageResponse.json();
          } catch (err) {
            console.error('[Templates API] ❌ pageCreate threw (Create):', err.message);
            return json(
              { success: false, error: `Page creation request failed: ${err.message}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }

          console.log('[Templates API] pageCreate raw response:', JSON.stringify(pageData));

          if (pageData.errors) {
            const errMsg = pageData.errors.map(e => e.message).join(', ');
            return json(
              { success: false, error: `Shopify page creation failed: ${errMsg}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }
          if (pageData.data?.pageCreate?.page) {
            pageUrl = pageData.data.pageCreate.page.handle;
            pageId = pageData.data.pageCreate.page.id;
            console.log(`[Templates API] ✅ Page created: ${pageUrl} (${pageId})`);
          } else {
            const userErrors = pageData.data?.pageCreate?.userErrors || [];
            console.warn('[Templates API] ⚠️ pageCreate userErrors:', JSON.stringify(userErrors));
            const handleTaken = userErrors.some(e => e.field?.includes('handle') || e.message?.toLowerCase().includes('handle'));
            if (handleTaken) {
              return json(
                { success: false, error: `The page handle "${publishParams.handle}" is already taken. Switch to "Use Existing Page" and select it from the list.`, pageHandleConflict: true },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
            if (userErrors.length > 0) {
              const errMsg = userErrors.map(e => e.message).join(', ');
              return json(
                { success: false, error: `Failed to create page: ${errMsg}` },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
            return json(
              { success: false, error: 'Shopify returned no page and no errors. Check API scopes (write_content required).' },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }
        } else if (publishParams.publishType === 'existing' && publishParams.selectedPageId) {
          let pageData;
          try {
            const pageResponse = await admin.graphql(
              `#graphql
              mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
                pageUpdate(id: $id, page: $page) {
                  page { id handle }
                  userErrors { field message }
                }
              }`,
              {
                variables: {
                  id: publishParams.selectedPageId,
                  page: {},
                },
              }
            );
            pageData = await pageResponse.json();
          } catch (err) {
            console.error('[Templates API] ❌ pageUpdate threw (Create flow):', err.message);
            return json(
              { success: false, error: `Page link request failed: ${err.message}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }

          console.log('[Templates API] pageUpdate raw response:', JSON.stringify(pageData));

          if (pageData.errors) {
            return json(
              { success: false, error: `Shopify page link failed: ${pageData.errors.map(e => e.message).join(', ')}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          } else if (pageData.data?.pageUpdate?.page) {
            pageUrl = pageData.data.pageUpdate.page.handle;
            pageId = pageData.data.pageUpdate.page.id;
            console.log(`[Templates API] ✅ Page linked: ${pageUrl}`);
          } else {
            const userErrors = pageData.data?.pageUpdate?.userErrors || [];
            if (userErrors.length > 0) {
              return json(
                { success: false, error: `Failed to link page: ${userErrors.map(e => e.message).join(', ')}` },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
          }
        }
      }

      // Prepare the final template for local storage
      const newTemplate = {
        id: Math.max(...templates.map((t) => t.id), 0) + 1,
        ...data,
        discount_id: discountId,
        discount_code: discountCode,
        product_list: productList,
        shop,
        active: data.active || false,
        createdAt: new Date().toISOString(),
        page_url: pageUrl,
        page_id: pageId,
      };

      console.log('[Templates API] ✨ Creating template:', {
        id: newTemplate.id,
        title: newTemplate.title,
        shop,
        productsCount: productList.length,
        page_url: pageUrl,
      });

      console.log('[Templates API] ✅ Template prepared, syncing to PHP...');

      result = newTemplate;
      message = 'Template created successfully';

      // Prepare the payload for MySQL (matching documentation schema)
      const syncPayload = {
        event: 'create',
        resource: 'templates',
        shop: shop, // Domain for reference
        data: {
          id: String(newTemplate.id),
          shop_id: shop, // Use domain directly to prevent PHP rejection
          shop: shop, // Explicitly add shop domain inside data for templates.php validation
          title: newTemplate.title,
          layout_type: data.config?.layout || 'layout1',
          source: {
            collection_id: data.config?.collection_id,
            resolved: true,
          },
          products: productList, // Use 'products' key for templates.php
          product_list: productList, // Keep 'product_list' for DB consistency
          config: data.config,
          active: data.active || false, // Use 'active' key for templates.php
          is_active: data.active ? 1 : 0,
          discount_code: newTemplate.discount_code,
          discount_id: newTemplate.discount_id,
          page_url: newTemplate.page_url,
          page_id: newTemplate.page_id,
        },
      };

      console.log('[Templates API] 📤 Synchronizing data to PHP...');

      try {
        const dbResult = await sendToPhp(syncPayload, 'templates.php');
        console.log('[Templates API] ✅ MySQL Save Result:', dbResult);
      } catch (dbError) {
        console.error('[Templates API] ❌ MySQL save failed:', dbError.message);
      }
    } else if (actionType === 'update') {
      /* ===== UPDATE ===== */
      const index = templates.findIndex((t) => String(t.id) === String(id));
      if (index === -1) throw new Error('Template not found');

      console.log('[Templates API] 🔄 Updating template:', {
        id,
        title: templates[index].title,
      });

      // 1. Resolve Collection ID if missing
      if (!data.config?.collection_id) {
        if (
          data.config?.collection_title &&
          data.config.collection_title !== 'Create Your Combo'
        ) {
          const resolvedId = await fetchCollectionIdByTitle(
            data.config.collection_title
          );
          if (resolvedId) {
            if (!data.config) data.config = {};
            data.config.collection_id = resolvedId;
          }
        }

        if (!data.config?.collection_id) {
          const firstHandle =
            data.config?.step_1_collection ||
            data.config?.col_1 ||
            data.config?.collection_handle;
          if (firstHandle) {
            const resolvedId = await fetchCollectionIdByHandle(firstHandle);
            if (resolvedId) {
              if (!data.config) data.config = {};
              data.config.collection_id = resolvedId;
            }
          }
        }
      }

      let productList =
        data.product_list || templates[index].product_list || [];

      // Resolve Discount if ID provided or existing
      let discountId = data.discount_id || data.config?.selected_discount_id;

      // If not provided in data, fall back to existing template value
      if (discountId === undefined) {
        discountId = templates[index].discount_id;
      }

      let discountCode = templates[index].discount_code;

      if (discountId) {
        const discount = discounts.find(
          (d) => String(d.id) === String(discountId)
        );
        if (discount) {
          discountId = discount.id;
          discountCode = discount.code;
        } else {
          // If provided ID is explicitly new but not found, code becomes null
          if (data.discount_id || data.config?.selected_discount_id) {
            discountCode = null;
          }
        }
      } else {
        discountCode = null;
        discountId = null; // Ensure ID is null if cleared
      }

      // Fetch products from all step collections (Update)
      const stepHandlesUpd = [];
      for (let i = 1; i <= 10; i++) {
        const handle = data.config?.[`step_${i}_collection`];
        if (!handle) break;
        stepHandlesUpd.push({ step: i, handle, limit: parseInt(data.config?.[`step_${i}_limit`]) || null });
      }

      if (stepHandlesUpd.length > 0) {
        const allProducts = [];
        for (const { step, handle, limit } of stepHandlesUpd) {
          console.log(`[Templates API] 📦 Fetching products for step ${step} collection (Update): ${handle}`);
          const collectionId = await fetchCollectionIdByHandle(handle);
          if (collectionId) {
            const products = await fetchCollectionProducts(collectionId);
            products.forEach(p => allProducts.push({ ...p, step, collection_handle: handle, step_limit: limit }));
          }
        }
        if (allProducts.length > 0) productList = allProducts;
      } else if (data.config?.collection_id) {
        console.log(`[Templates API] 📦 Fetching products for collection (Update): ${data.config.collection_id}`);
        const collectionProducts = await fetchCollectionProducts(data.config.collection_id);
        if (collectionProducts.length > 0) productList = collectionProducts;
      }

      // 3. Handle Automatic Page Creation/Linking (Update)
      // Use publishParams.handle as fallback (same as CREATE path) so page_url is never lost
      let pageUrl = data.page_url || templates[index].page_url || (publishParams?.handle || null);
      let pageId = data.page_id || templates[index].page_id || null;

      if (publishParams) {
        console.log('[Templates API] 📄 Handling Shopify Page operation (Update):', publishParams.publishType);
        if (publishParams.publishType === 'new') {
          let pageData;
          try {
            const pageResponse = await admin.graphql(
              `#graphql
              mutation pageCreate($page: PageCreateInput!) {
                pageCreate(page: $page) {
                  page { id handle }
                  userErrors { field message }
                }
              }`,
              {
                variables: {
                  page: {
                    title: publishParams.title || data.title || templates[index].title,
                    handle: publishParams.handle,
                  },
                },
              }
            );
            pageData = await pageResponse.json();
          } catch (err) {
            console.error('[Templates API] ❌ pageCreate threw (Update):', err.message);
            return json(
              { success: false, error: `Page creation request failed: ${err.message}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }

          console.log('[Templates API] pageCreate (update flow) raw response:', JSON.stringify(pageData));

          if (pageData.errors) {
            const errMsg = pageData.errors.map(e => e.message).join(', ');
            return json(
              { success: false, error: `Shopify page creation failed: ${errMsg}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }
          if (pageData.data?.pageCreate?.page) {
            pageUrl = pageData.data.pageCreate.page.handle;
            pageId = pageData.data.pageCreate.page.id;
            console.log(`[Templates API] ✅ Page created (Update flow): ${pageUrl} (${pageId})`);
          } else {
            const userErrors = pageData.data?.pageCreate?.userErrors || [];
            console.warn('[Templates API] ⚠️ pageCreate userErrors (update flow):', JSON.stringify(userErrors));
            const handleTaken = userErrors.some(e => e.field?.includes('handle') || e.message?.toLowerCase().includes('handle'));
            if (handleTaken) {
              return json(
                { success: false, error: `The page handle "${publishParams.handle}" is already taken. Switch to "Use Existing Page" and select it from the list.`, pageHandleConflict: true },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
            if (userErrors.length > 0) {
              const errMsg = userErrors.map(e => e.message).join(', ');
              return json(
                { success: false, error: `Failed to create page: ${errMsg}` },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
            // No page and no errors — unexpected, surface it
            return json(
              { success: false, error: 'Shopify returned no page and no errors. Check API scopes (write_content required).' },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }
        } else if (publishParams.publishType === 'existing' && publishParams.selectedPageId) {
          let pageData;
          try {
            const pageResponse = await admin.graphql(
              `#graphql
              mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
                pageUpdate(id: $id, page: $page) {
                  page { id handle }
                  userErrors { field message }
                }
              }`,
              {
                variables: {
                  id: publishParams.selectedPageId,
                  page: {},
                },
              }
            );
            pageData = await pageResponse.json();
          } catch (err) {
            console.error('[Templates API] ❌ pageUpdate threw (Update):', err.message);
            return json(
              { success: false, error: `Page link request failed: ${err.message}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          }

          console.log('[Templates API] pageUpdate (update flow) raw response:', JSON.stringify(pageData));

          if (pageData.errors) {
            return json(
              { success: false, error: `Shopify page link failed: ${pageData.errors.map(e => e.message).join(', ')}` },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
          } else if (pageData.data?.pageUpdate?.page) {
            pageUrl = pageData.data.pageUpdate.page.handle;
            pageId = pageData.data.pageUpdate.page.id;
            console.log(`[Templates API] ✅ Page linked (Update flow): ${pageUrl}`);
          } else {
            const userErrors = pageData.data?.pageUpdate?.userErrors || [];
            if (userErrors.length > 0) {
              return json(
                { success: false, error: `Failed to link page: ${userErrors.map(e => e.message).join(', ')}` },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
              );
            }
          }
        }
      }

      result = {
        ...templates[index],
        ...data,
        product_list: productList,
        discount_id: discountId,
        discount_code: discountCode,
        page_url: pageUrl,
        page_id: pageId,
      };
      message = 'Template updated successfully';

      // Prepare the payload for MySQL Update
      const syncPayload = {
        event: 'update',
        resource: 'templates',
        shop: shop, // Domain for reference
        data: {
          id: String(result.id),
          shop_id: shop, // Use domain directly to prevent PHP rejection
          shop: shop, // Added for templates.php validation
          title: result.title,
          layout_type: result.config?.layout || 'layout1',
          source: {
            collection_id: result.config?.collection_id,
            updated: true,
          },
          products: productList, // For PHP
          product_list: productList, // For DB
          config: result.config,
          active: result.active || false, // For PHP
          is_active: result.active ? 1 : 0,
          discount_code: result.discount_code,
          discount_id: result.discount_id,
          page_url: result.page_url,
          page_id: result.page_id,
        },
      };

      console.log('[Templates API] 📤 Synchronizing update to PHP...');

      try {
        const dbResult = await sendToPhp(syncPayload, 'templates.php');
        console.log('[Templates API] ✅ MySQL Update Result:', dbResult);
      } catch (dbError) {
        console.error(
          '[Templates API] ❌ MySQL update failed:',
          dbError.message
        );
      }
    } else if (actionType === 'delete') {
      /* ===== DELETE ===== */
      console.log('[Templates API] 🗑️ Deleting template:', { id });

      message = 'Template deleted successfully';

      console.log('[Templates API] 📤 Synchronizing delete to PHP...');

      // 2. Delete from MySQL via templates.php (Directly)
      try {
        const dbResult = await sendToPhp(
          {
            event: 'delete',
            resource: 'templates',
            shop: shop, // Use domain
            id,
          },
          'templates.php'
        );
        console.log('[Templates API] ✅ MySQL Delete Result:', dbResult);
      } catch (dbError) {
        console.error(
          '[Templates API] ❌ MySQL delete failed:',
          dbError.message
        );
      }
    }

    return json(
      { success: true, message, data: result },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('[Templates API] Error:', error);
    return json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
};
