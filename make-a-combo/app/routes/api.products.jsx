import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');
  const handles = url.searchParams.get('handles') || handle;

  try {
    if (handles) {
      const handleList = handles.split(',').filter((h) => h.trim() !== '');
      const results = {};

      for (const h of handleList) {
        const response = await admin.graphql(
          `#graphql
          query getCollectionProducts($handle: String!) {
            collectionByHandle(handle: $handle) {
              handle
              title
              products(first: 50) {
                nodes {
                  id
                  title
                  handle
                  vendor
                  totalInventory
                  descriptionHtml
                  images(first: 2) {
                    nodes {
                      url
                    }
                  }
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
                      inventoryQuantity
                      image {
                        url
                      }
                    }
                  }
                }
              }
            }
          }`,
          { variables: { handle: h } }
        );

        const responseJson = await response.json();
        if (responseJson.data?.collectionByHandle) {
          const col = responseJson.data.collectionByHandle;
          const formatted = (col.products?.nodes || []).map((p) => ({
            id: p.id,
            title: p.title,
            handle: p.handle,
            vendor: p.vendor,
            descriptionHtml: p.descriptionHtml,
            secondImageSrc: p.images?.nodes?.length > 1 ? p.images.nodes[1].url : null,
            totalInventory: p.totalInventory,
            available: Number(p.totalInventory || 0) > 0,
            image: p.featuredMedia?.preview?.image
              ? { src: p.featuredMedia.preview.image.url }
              : null,
            variants: (p.variants?.nodes || []).map((v) => ({
              id: v.id,
              title: v.title,
              price: v.price,
              inventoryQuantity: v.inventoryQuantity,
              available: Number(v.inventoryQuantity || 0) > 0,
              image: v.image ? { src: v.image.url } : null,
            })),
          }));

          if (handleList.length === 1 && !url.searchParams.get('handles')) {
            return json(formatted);
          }
          results[h] = formatted;
        }
      }
      return json(results);
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
              totalInventory
              descriptionHtml
              images(first: 2) {
                nodes {
                  url
                }
              }
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
                  inventoryQuantity
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
      let products = [];
      if (responseJson.data?.products?.nodes) {
        products = responseJson.data.products.nodes;
      }

      const formattedProducts = products.map((p) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        descriptionHtml: p.descriptionHtml,
        secondImageSrc: p.images?.nodes?.length > 1 ? p.images.nodes[1].url : null,
        totalInventory: p.totalInventory,
        available: Number(p.totalInventory || 0) > 0,
        image: p.featuredMedia?.preview?.image
          ? { src: p.featuredMedia.preview.image.url }
          : null,
        variants: (p.variants?.nodes || []).map((v) => ({
          id: v.id,
          title: v.title,
          price: v.price,
          inventoryQuantity: v.inventoryQuantity,
          available: Number(v.inventoryQuantity || 0) > 0,
          image: v.image ? { src: v.image.url } : null,
        })),
      }));

      return json(formattedProducts);
    }
  } catch (error) {
    console.error('Error in api.products loader:', error);
    return json({ error: 'Failed to fetch products' }, { status: 500 });
  }
};

export const action = loader;
