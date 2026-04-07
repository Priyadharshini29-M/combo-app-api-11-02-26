import { authenticate } from '../shopify.server';
import { json } from '@remix-run/node';

const mapProducts = (nodes = []) =>
  nodes.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    descriptionHtml: p.descriptionHtml,
    secondImageSrc: p.images?.nodes?.length > 1 ? p.images.nodes[1].url : null,
    totalInventory: p.totalInventory,
    available:
      p.availableForSale === true ||
      Number(p.totalInventory || 0) > 0 ||
      (p.variants?.nodes || []).some(
        (v) =>
          v.availableForSale === true || Number(v.inventoryQuantity || 0) > 0
      ),
    image: p.featuredMedia?.preview?.image
      ? { src: p.featuredMedia.preview.image.url }
      : null,
    variants: (p.variants?.nodes || []).map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price,
      inventoryQuantity: v.inventoryQuantity,
      available:
        v.availableForSale === true || Number(v.inventoryQuantity || 0) > 0,
      image: v.image ? { src: v.image.url } : null,
    })),
  }));

const collectionProductsFragment = `
  handle
  title
  products(first: 50) {
    nodes {
      id
      title
      handle
      vendor
      availableForSale
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
          availableForSale
          inventoryQuantity
          image {
            url
          }
        }
      }
    }
  }
`;

const resolveCollectionProducts = async (admin, rawIdentifier) => {
  const identifier = String(rawIdentifier || '').trim();
  if (!identifier) return [];

  const asGid =
    identifier.startsWith('gid://shopify/Collection/')
      ? identifier
      : /^\d+$/.test(identifier)
        ? `gid://shopify/Collection/${identifier}`
        : null;

  if (asGid) {
    const byIdRes = await admin.graphql(
      `#graphql
      query getCollectionById($id: ID!) {
        collection(id: $id) {
          ${collectionProductsFragment}
        }
      }`,
      { variables: { id: asGid } }
    );

    const byIdJson = await byIdRes.json();
    const byIdCollection = byIdJson.data?.collection;
    if (byIdCollection) return mapProducts(byIdCollection.products?.nodes || []);
  }

  const normalizedHandle = identifier
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const handlesToTry = [identifier, normalizedHandle].filter(Boolean);

  for (const handle of handlesToTry) {
    const byHandleRes = await admin.graphql(
      `#graphql
      query getCollectionProducts($handle: String!) {
        collectionByHandle(handle: $handle) {
          ${collectionProductsFragment}
        }
      }`,
      { variables: { handle } }
    );
    const byHandleJson = await byHandleRes.json();
    const byHandleCollection = byHandleJson.data?.collectionByHandle;
    if (byHandleCollection) {
      return mapProducts(byHandleCollection.products?.nodes || []);
    }
  }

  const byTitleRes = await admin.graphql(
    `#graphql
    query findCollectionByTitle($query: String!) {
      collections(first: 1, query: $query) {
        nodes {
          ${collectionProductsFragment}
        }
      }
    }`,
    { variables: { query: `title:"${identifier.replace(/"/g, '\\"')}"` } }
  );
  const byTitleJson = await byTitleRes.json();
  const byTitleCollection = byTitleJson.data?.collections?.nodes?.[0];
  if (byTitleCollection) {
    return mapProducts(byTitleCollection.products?.nodes || []);
  }

  return [];
};

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
        const formatted = await resolveCollectionProducts(admin, h);
        if (handleList.length === 1 && !url.searchParams.get('handles')) {
          return json(formatted);
        }
        results[h] = formatted;
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
              availableForSale
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
                  availableForSale
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
        available:
          p.availableForSale === true ||
          Number(p.totalInventory || 0) > 0 ||
          (p.variants?.nodes || []).some(
            (v) =>
              v.availableForSale === true ||
              Number(v.inventoryQuantity || 0) > 0
          ),
        image: p.featuredMedia?.preview?.image
          ? { src: p.featuredMedia.preview.image.url }
          : null,
        variants: (p.variants?.nodes || []).map((v) => ({
          id: v.id,
          title: v.title,
          price: v.price,
          inventoryQuantity: v.inventoryQuantity,
          available:
            v.availableForSale === true ||
            Number(v.inventoryQuantity || 0) > 0,
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
