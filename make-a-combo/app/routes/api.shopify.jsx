import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const body = await request.json();
  const { action, data } = body;

  if (action === "publish_page") {
    const { title, handle, config, templateId } = data;
    let appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");

    // Fallback if env var is missing
    if (!appUrl) {
      const host = request.headers.get("host");
      const protocol = host?.includes("localhost") ? "http" : "https";
      appUrl = `${protocol}://${host}`;
    }

    // 1. Ensure Global ScriptTag is installed and App URL is stored in metafields
    const scriptSrc = `${appUrl}/combo-builder-loader.js`;
    try {
      // Get real Shop ID for Metafields
      const shopResponse = await admin.graphql(`query { shop { id } }`);
      const shopData = await shopResponse.json();
      const shopId = shopData.data?.shop?.id;

      console.log("[Combo App] Setting metafield for shop:", shopId, "URL:", appUrl);

      // Update App URL in Metafields so Liquid can use it
      const mfResult = await admin.graphql(
        `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id key value }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            metafields: [
              {
                namespace: "make_a_combo",
                key: "app_url",
                value: appUrl,
                type: "single_line_text_field",
                ownerId: shopId
              }
            ],
          },
        }
      );
      const mfData = await mfResult.json();
      console.log("[Combo App] Metafield Result:", JSON.stringify(mfData, null, 2));

      // Check for existing script tags
      const stResponse = await admin.graphql(
        `#graphql
        query {
          scriptTags(first: 10) {
            nodes {
              id
              src
            }
          }
        }`
      );
      const stData = await stResponse.json();
      const exists = stData.data?.scriptTags?.nodes?.some(st => st.src === scriptSrc);

      if (!exists) {
        await admin.graphql(
          `#graphql
          mutation scriptTagCreate($input: ScriptTagInput!) {
            scriptTagCreate(input: $input) {
              scriptTag { id }
              userErrors { message }
            }
          }`,
          {
            variables: {
              input: {
                src: scriptSrc,
                displayScope: "ALL",
              },
            },
          }
        );
      }
    } catch (e) {
      console.error("ScriptTag Setup Error:", e);
    }

    // 2. Search for existing page by handle or title
    const pagesResponse = await admin.graphql(
      `#graphql
      query getPages($query: String!) {
        pages(first: 10, query: $query) {
          nodes {
            id
            handle
            title
          }
        }
      }`,
      {
        variables: {
          query: `handle:${handle} OR title:${title}`,
        },
      }
    );

    const pagesData = await pagesResponse.json();
    // Prioritize handle match
    let existingPage = pagesData.data.pages.nodes.find((p) => p.handle === handle);
    if (!existingPage) {
      existingPage = pagesData.data.pages.nodes.find((p) => p.title === title);
    }

    // Create the content for the page
    // We use a div that our app can identify.
    const bodyHtml = `<div id="make-a-combo-app" data-template-id="${templateId || ''}" data-app-url="${appUrl}" style="min-height: 600px; display: block; width: 100%;"></div>`;

    if (existingPage) {
      // Update existing page
      const updateResponse = await admin.graphql(
        `#graphql
        mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
          pageUpdate(id: $id, page: $page) {
            page {
              id
              handle
              title
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            id: existingPage.id,
            page: {
              title: title,
              body: bodyHtml
            }
          },
        }
      );
      const updateResult = await updateResponse.json();
      console.log("[Combo App] Page Update Result:", JSON.stringify(updateResult, null, 2));
      return json({ success: true, action: "updated", page: updateResult.data.pageUpdate.page });
    } else {
      // Create new page
      const createResponse = await admin.graphql(
        `#graphql
        mutation pageCreate($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page {
              id
              handle
              title
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            page: {
              title: title,
              handle: handle,
              body: bodyHtml
            }
          },
        }
      );
      const createResult = await createResponse.json();
      console.log("[Combo App] Page Create Result:", JSON.stringify(createResult, null, 2));
      return json({ success: true, action: "created", page: createResult.data.pageCreate.page });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};
