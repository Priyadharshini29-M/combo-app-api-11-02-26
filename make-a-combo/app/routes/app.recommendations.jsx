import { useState, useCallback } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Divider,
  Banner,
  Thumbnail,
  EmptyState,
  Modal,
  TextField,
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';

/* ── Loader ── */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const [settings, rules] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { shop } }),
    prisma.productRecommendation.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return json({
    shop,
    enabled: settings?.recommendation_popup_enabled ?? false,
    rules,
  });
};

/* ── Action (handled by useFetcher → api.product-recommendations) ── */

export default function RecommendationsPage() {
  const { enabled, rules, shop } = useLoaderData();
  const fetcher = useFetcher();
  const app = useAppBridge();

  const [showAddModal, setShowAddModal] = useState(false);
  const [triggerProduct, setTriggerProduct] = useState(null);
  const [recommendedProduct, setRecommendedProduct] = useState(null);
  const [popupTitle, setPopupTitle] = useState('You might also like');
  const [ctaText, setCtaText] = useState('Add to Combo');
  const [dismissText, setDismissText] = useState('No thanks');
  const [addError, setAddError] = useState('');

  const isEnabled =
    fetcher.data?.enabled !== undefined ? fetcher.data.enabled : enabled;

  const handleToggle = useCallback(() => {
    fetcher.submit(
      { intent: 'toggle', enabled: String(!isEnabled) },
      { method: 'POST', action: '/api/product-recommendations' }
    );
  }, [fetcher, isEnabled]);

  const handleDelete = useCallback(
    (id) => {
      if (!confirm('Delete this recommendation rule?')) return;
      fetcher.submit(
        { intent: 'delete', id: String(id) },
        { method: 'POST', action: '/api/product-recommendations' }
      );
    },
    [fetcher]
  );

  const pickProduct = useCallback(
    async (setter) => {
      const selected = await app.resourcePicker({ type: 'product', multiple: false });
      if (!selected || !selected.selection?.length) return;
      const p = selected.selection[0];
      const numericId = String(p.id).replace('gid://shopify/Product/', '');
      setter({
        id: numericId,
        gid: p.id,
        title: p.title,
        handle: p.handle,
        image: p.images?.[0]?.originalSrc || p.featuredImage?.originalSrc || '',
      });
    },
    [app]
  );

  const handleAddRule = useCallback(() => {
    setAddError('');
    if (!triggerProduct || !recommendedProduct) {
      setAddError('Please select both a trigger product and a recommended product.');
      return;
    }
    if (triggerProduct.id === recommendedProduct.id) {
      setAddError('Trigger and recommended product must be different.');
      return;
    }
    fetcher.submit(
      {
        intent: 'create',
        triggerProductId: triggerProduct.id,
        triggerProductTitle: triggerProduct.title,
        triggerProductHandle: triggerProduct.handle,
        triggerProductImage: triggerProduct.image,
        recommendedProductId: recommendedProduct.id,
        recommendedProductTitle: recommendedProduct.title,
        recommendedProductHandle: recommendedProduct.handle,
        recommendedProductImage: recommendedProduct.image,
        popupTitle,
        ctaText,
        dismissText,
      },
      { method: 'POST', action: '/api/product-recommendations' }
    );
    setShowAddModal(false);
    setTriggerProduct(null);
    setRecommendedProduct(null);
    setPopupTitle('You might also like');
    setCtaText('Add to Combo');
    setDismissText('No thanks');
  }, [fetcher, triggerProduct, recommendedProduct, popupTitle, ctaText, dismissText]);

  const isSaving = fetcher.state !== 'idle';

  return (
    <Page
      title="Product Recommendations"
      subtitle="Show a popup recommending another product when a customer selects one in the combo builder."
      primaryAction={{
        content: 'Add Recommendation Rule',
        onAction: () => setShowAddModal(true),
        disabled: isSaving,
      }}
    >
      <BlockStack gap="500">
        {/* Global toggle card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text variant="headingMd" as="h2">
                  Recommendation Popup
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  When enabled, customers who add a trigger product to the combo builder
                  will see a popup suggesting the paired product.
                </Text>
              </BlockStack>
              <InlineStack gap="300" blockAlign="center">
                <Badge tone={isEnabled ? 'success' : 'critical'}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button
                  variant={isEnabled ? 'secondary' : 'primary'}
                  onClick={handleToggle}
                  loading={isSaving}
                >
                  {isEnabled ? 'Disable' : 'Enable'}
                </Button>
              </InlineStack>
            </InlineStack>

            {!isEnabled && (
              <Banner tone="warning">
                The recommendation popup is currently <strong>disabled</strong>.
                Enable it above for the popup to appear on the storefront.
              </Banner>
            )}
          </BlockStack>
        </Card>

        {/* Rules list */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Recommendation Rules ({rules.length})
            </Text>
            <Text variant="bodyMd" tone="subdued">
              When a customer selects the <strong>trigger product</strong>, a popup
              recommends the <strong>paired product</strong>.
            </Text>

            {rules.length === 0 ? (
              <EmptyState
                heading="No recommendation rules yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Click <strong>Add Recommendation Rule</strong> to set up your first
                  product recommendation.
                </p>
              </EmptyState>
            ) : (
              <BlockStack gap="300">
                {rules.map((rule, idx) => (
                  <div key={rule.id}>
                    {idx > 0 && <Divider />}
                    <div style={{ padding: '12px 0' }}>
                      <InlineStack align="space-between" blockAlign="center" wrap={false}>
                        {/* Trigger → Recommended */}
                        <InlineStack gap="400" blockAlign="center" wrap={false}>
                          {/* Trigger product */}
                          <BlockStack gap="100" inlineAlign="center">
                            <Thumbnail
                              source={rule.triggerProductImage || 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png'}
                              alt={rule.triggerProductTitle}
                              size="small"
                            />
                            <Text variant="bodySm" alignment="center" breakWord>
                              {rule.triggerProductTitle}
                            </Text>
                            <Badge tone="info" size="small">Trigger</Badge>
                          </BlockStack>

                          {/* Arrow */}
                          <Text variant="headingLg" tone="subdued">→</Text>

                          {/* Recommended product */}
                          <BlockStack gap="100" inlineAlign="center">
                            <Thumbnail
                              source={rule.recommendedProductImage || 'https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png'}
                              alt={rule.recommendedProductTitle}
                              size="small"
                            />
                            <Text variant="bodySm" alignment="center" breakWord>
                              {rule.recommendedProductTitle}
                            </Text>
                            <Badge tone="success" size="small">Recommended</Badge>
                          </BlockStack>
                        </InlineStack>

                        {/* Rule meta + actions */}
                        <BlockStack gap="200" inlineAlign="end">
                          <Badge tone={rule.active ? 'success' : 'critical'}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Text variant="bodySm" tone="subdued">
                            Popup: "{rule.popupTitle}"
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            CTA: "{rule.ctaText}"
                          </Text>
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => handleDelete(rule.id)}
                            disabled={isSaving}
                          >
                            Delete
                          </Button>
                        </BlockStack>
                      </InlineStack>
                    </div>
                  </div>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {/* How it works */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">How It Works</Text>
            <BlockStack gap="200">
              <Text variant="bodyMd">
                1. <strong>Enable</strong> the popup above.
              </Text>
              <Text variant="bodyMd">
                2. <strong>Add rules</strong> — pair a trigger product with a recommended product.
              </Text>
              <Text variant="bodyMd">
                3. On the <strong>storefront</strong>, when a customer clicks "Add" on the trigger product, a popup appears showing the recommended product with an option to add it to their combo.
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>

      {/* Add Rule Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Recommendation Rule"
        primaryAction={{
          content: 'Save Rule',
          onAction: handleAddRule,
          disabled: isSaving,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setShowAddModal(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {addError && (
              <Banner tone="critical">{addError}</Banner>
            )}

            {/* Trigger product picker */}
            <BlockStack gap="200">
              <Text variant="headingMd">Trigger Product</Text>
              <Text variant="bodyMd" tone="subdued">
                The product that, when added, triggers the recommendation popup.
              </Text>
              {triggerProduct ? (
                <InlineStack gap="300" blockAlign="center">
                  {triggerProduct.image && (
                    <Thumbnail source={triggerProduct.image} alt={triggerProduct.title} size="small" />
                  )}
                  <Text variant="bodyMd">{triggerProduct.title}</Text>
                  <Button variant="plain" onClick={() => setTriggerProduct(null)}>
                    Change
                  </Button>
                </InlineStack>
              ) : (
                <Button onClick={() => pickProduct(setTriggerProduct)}>
                  Select Trigger Product
                </Button>
              )}
            </BlockStack>

            <Divider />

            {/* Recommended product picker */}
            <BlockStack gap="200">
              <Text variant="headingMd">Recommended Product</Text>
              <Text variant="bodyMd" tone="subdued">
                The product shown in the popup as a recommendation.
              </Text>
              {recommendedProduct ? (
                <InlineStack gap="300" blockAlign="center">
                  {recommendedProduct.image && (
                    <Thumbnail source={recommendedProduct.image} alt={recommendedProduct.title} size="small" />
                  )}
                  <Text variant="bodyMd">{recommendedProduct.title}</Text>
                  <Button variant="plain" onClick={() => setRecommendedProduct(null)}>
                    Change
                  </Button>
                </InlineStack>
              ) : (
                <Button onClick={() => pickProduct(setRecommendedProduct)}>
                  Select Recommended Product
                </Button>
              )}
            </BlockStack>

            <Divider />

            {/* Popup text customization */}
            <BlockStack gap="300">
              <Text variant="headingMd">Popup Text</Text>
              <TextField
                label="Popup Title"
                value={popupTitle}
                onChange={setPopupTitle}
                placeholder="You might also like"
                autoComplete="off"
              />
              <TextField
                label="Add to Combo Button Text"
                value={ctaText}
                onChange={setCtaText}
                placeholder="Add to Combo"
                autoComplete="off"
              />
              <TextField
                label="Dismiss Button Text"
                value={dismissText}
                onChange={setDismissText}
                placeholder="No thanks"
                autoComplete="off"
              />
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
