import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");

  try {
    let products = [];

    if (handle) {
      // Fetch products by collection handle
      const response = await admin.graphql(
        `#graphql
        query getCollectionProducts($handle: String!) {
          collectionByHandle(handle: $handle) {
            products(first: 50) {
              nodes {
                id
                title
                handle
                featuredMedia {
                  preview {
                    image {
                      url
                    }
                  }
                }
                variants(first: 10) {
                  nodes {
                    id
                    title
                    price
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }`,
        { variables: { handle } }
      );

      const responseJson = await response.json();
      if (responseJson.data?.collectionByHandle?.products?.nodes) {
        products = responseJson.data.collectionByHandle.products.nodes;
      }
    } else {
      // Fallback: Fetch any products (first 50)
      const response = await admin.graphql(
        `#graphql
        query getProducts {
          products(first: 50) {
            nodes {
              id
              title
              handle
              featuredMedia {
                preview {
                  image {
                    url
                  }
                }
              }
              variants(first: 10) {
                nodes {
                  id
                  title
                  price
                  image {
                    url
                  }
                }
              }
            }
          }
        }`
      );

      const responseJson = await response.json();
      if (responseJson.data?.products?.nodes) {
        products = responseJson.data.products.nodes;
      }
    }

    // Format for frontend
    const formattedProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      image: p.featuredMedia?.preview?.image ? { src: p.featuredMedia.preview.image.url } : null,
      variants: (p.variants?.nodes || []).map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        image: v.image ? { src: v.image.url } : null,
      })),
    }));

    return json(formattedProducts);
  } catch (error) {
    console.error("Error in api.products loader:", error);
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
};

export const action = loader;
