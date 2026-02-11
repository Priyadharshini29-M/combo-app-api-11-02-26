import { json } from "@remix-run/node";
import { useEffect, useState } from 'react';
import { useFetcher, useLoaderData } from '@remix-run/react';
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Avatar,
  Icon,
  Badge,
} from '@shopify/polaris';
import { ProductIcon } from '@shopify/polaris-icons';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const shopName = shop.replace('.myshopify.com', '');

  const rawAppUrl = process.env.SHOPIFY_APP_URL || "";
  const APP_URL = rawAppUrl.replace(/\/$/, "");
  const SCRIPT_URL = `${APP_URL}/combo-builder-loader.js`;

  try {
    const getScriptTags = await admin.graphql(`
      query {
        scriptTags(first: 50) {
          nodes {
            id
            src
          }
        }
      }
    `);
    const scriptTagsJson = await getScriptTags.json();
    const scriptNodes = scriptTagsJson.data?.scriptTags?.nodes || [];

    // Protocol-agnostic URL check (fixes http vs https mismatch)
    const normalizedTarget = SCRIPT_URL.replace(/^https?:/, "");
    const isEnabled = scriptNodes.some(s => s.src.replace(/^https?:/, "") === normalizedTarget);

    return json({ isEnabled, shopName });
  } catch (error) {
    return json({ isEnabled: false, error: error.message, shopName });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ['Red', 'Orange', 'Yellow', 'Green'][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    }
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: '100.00' }],
      },
    }
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const { isEnabled: initialEnabled, shopName } = useLoaderData();
  const fetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const shopify = useAppBridge();

  const [appEnabled, setAppEnabled] = useState(initialEnabled);

  // Synchronize state with fetcher results
  useEffect(() => {
    if (toggleFetcher.data?.success) {
      setAppEnabled(toggleFetcher.data.status === "enabled");
      shopify.toast.show(`App ${toggleFetcher.data.status === "enabled" ? "Enabled" : "Disabled"} successfully!`);
    } else if (toggleFetcher.data?.error) {
      shopify.toast.show(`Error: ${toggleFetcher.data.error}`, { isError: true });
      // Revert optimistic update on error
      setAppEnabled(initialEnabled);
    }
  }, [toggleFetcher.data, shopify, initialEnabled]);

  const handleToggle = () => {
    const nextState = !appEnabled;
    // Immediate UI feedback (Optimistic Update)
    setAppEnabled(nextState);

    toggleFetcher.submit(
      { enabled: nextState },
      { method: "POST", action: "/api/toggle-app", encType: "application/json" }
    );
  };
  const isLoading =
    ['loading', 'submitting'].includes(fetcher.state) &&
    fetcher.formMethod === 'POST';
  const productId = fetcher.data?.product?.id.replace(
    'gid://shopify/Product/',
    ''
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show('Product created');
    }
  }, [productId, shopify]);
  const generateProduct = () => fetcher.submit({}, { method: 'POST' });

  return (
    <Page
      title="Combo Builder"
      titleMetadata={
        <div style={{ width: 40 }}>
          <Icon source={ProductIcon} tone="base" />
        </div>
      }
    >
      <TitleBar
        title="Combo Builder"
        subtitle="Build and manage your combo offers"
      >
        <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      App Visibility Status
                    </Text>
                    <Badge tone={appEnabled ? "success" : "critical"}>
                      {appEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    {appEnabled
                      ? "The app is currently active and injecting the Combo Builder script into your storefront."
                      : "Enable the app to inject the Combo Builder script into your storefront."
                    }
                    {" "}When enabled, merchant data is automatically synced to your dashboard and external webhook.
                  </Text>
                  <Box paddingBlockStart="200">
                    <InlineStack gap="300">
                      <Button
                        variant="primary"
                        tone={appEnabled ? "critical" : "success"}
                        onClick={handleToggle}
                        loading={toggleFetcher.state !== "idle"}
                      >
                        {appEnabled ? "Disable App" : "Enable App"}
                      </Button>
                      <Button
                        url={`https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`}
                        external
                        target="_top"
                      >
                        Enable in Theme Editor
                      </Button>
                    </InlineStack>
                  </Box>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Getting Started
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This embedded app template uses{' '}
                    <Link
                      url="https://shopify.dev/docs/apps/tools/app-bridge"
                      target="_blank"
                      removeUnderline
                    >
                      App Bridge
                    </Link>{' '}
                    interface examples like an{' '}
                    <Link url="/app/additional" removeUnderline>
                      additional page in the app nav
                    </Link>
                    , as well as an{' '}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql"
                      target="_blank"
                      removeUnderline
                    >
                      Admin GraphQL
                    </Link>{' '}
                    mutation demo, to provide a starting point for app
                    development.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Get started with products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Generate a product with GraphQL and get the JSON output for
                    that product. Learn more about the{' '}
                    <Link
                      url="https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate"
                      target="_blank"
                      removeUnderline
                    >
                      productCreate
                    </Link>{' '}
                    mutation in our API references.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button loading={isLoading} onClick={generateProduct}>
                    Generate a product
                  </Button>
                  {fetcher.data?.product && (
                    <Button
                      url={`shopify:admin/products/${productId}`}
                      target="_blank"
                      variant="plain"
                    >
                      View product
                    </Button>
                  )}
                </InlineStack>
                {fetcher.data?.product && (
                  <>
                    <Text as="h3" variant="headingMd">
                      {' '}
                      productCreate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="#000"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="#000"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0, color: '#fff' }}>
                        <code>
                          {JSON.stringify(fetcher.data.product, null, 2)}
                        </code>
                      </pre>
                    </Box>
                    <Text as="h3" variant="headingMd">
                      {' '}
                      productVariantsBulkUpdate mutation
                    </Text>
                    <Box
                      padding="400"
                      background="#000"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="#000"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0, color: '#fff' }}>
                        <code>
                          {JSON.stringify(fetcher.data.variant, null, 2)}
                        </code>
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {', '}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List>
                    <List.Item>
                      Build an{' '}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                        removeUnderline
                      >
                        {' '}
                        example app
                      </Link>{' '}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{' '}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                        removeUnderline
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
