import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Icon,
  Divider,
} from '@shopify/polaris';
import {
  CheckIcon,
  StarFilledIcon,
  CashDollarIcon,
  AppsIcon,
} from '@shopify/polaris-icons';

export default function PlanPage() {
  const plans = [
    {
      title: 'Starter',
      price: 'Free',
      description: 'Perfect for new stores exploring combo deals.',
      features: [
        '1 Active Combo Page',
        'Standard Templates',
        'Basic Discount Logic',
        'Email Support',
        '100 Monthly Views',
      ],
      buttonText: 'Current Plan',
      buttonVariant: 'secondary',
      badge: 'Free Forever',
      badgeTone: 'info',
      icon: AppsIcon,
      premium: false,
    },
    {
      title: 'Professional',
      price: '$19.99/mo',
      description: 'Everything you need to scale your bundle strategy.',
      features: [
        'Unlimited Combo Pages',
        'All Premium Templates',
        'Tiered Discount Engine',
        'Priority Support',
        'Analytics Dashboard',
        "Remove 'Powered by' badge",
        'Custom CSS Access',
      ],
      buttonText: 'Upgrade to Pro',
      buttonVariant: 'primary',
      badge: 'Most Popular',
      badgeTone: 'success',
      icon: StarFilledIcon,
      premium: true,
      highlight: true,
    },
    {
      title: 'Enterprise',
      price: '$49.99/mo',
      description: 'Dedicated resources for high-volume merchants.',
      features: [
        'Unlimited Everything',
        'Custom Feature Development',
        'Dedicated Account Manager',
        'API & Webhook Access',
        'White-label Solution',
        'Advanced Fraud Protection',
        'Onboarding Session',
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'primary',
      badge: 'Tailored',
      badgeTone: 'attention',
      icon: CashDollarIcon,
      premium: true,
    },
  ];

  return (
    <Page
      title="Pricing & Plans"
      subtitle="Choose the perfect plan to boost your store's average order value."
    >
      <BlockStack gap="600">
        <div className="plans-horizontal-container">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`plan-card${plan.highlight ? ' plan-card-highlight' : ''}`}
            >
              <Card
                padding="400"
                background={
                  plan.highlight ? 'bg-surface-secondary' : 'bg-surface'
                }
              >
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{ color: plan.premium ? '#000' : '#000' }}>
                          <Icon source={plan.icon} tone={'base'} />
                        </div>
                        <Text variant="headingLg" as="h3" fontWeight="bold">
                          {plan.title}
                        </Text>
                      </InlineStack>
                      <Badge tone={plan.badgeTone}>{plan.badge}</Badge>
                    </BlockStack>
                    <div style={{ textAlign: 'right' }}>
                      <Text variant="heading2xl" as="p" fontWeight="bold">
                        {plan.price}
                      </Text>
                      {plan.price !== 'Free' && (
                        <Text variant="bodySm" tone="subdued">
                          per month
                        </Text>
                      )}
                    </div>
                  </InlineStack>

                  <Text variant="bodyMd" tone="subdued">
                    {plan.description}
                  </Text>

                  <Divider />

                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      What's included:
                    </Text>
                    {plan.features.map((feature, fIndex) => (
                      <InlineStack key={fIndex} gap="200" blockAlign="center">
                        <div style={{ color: '#000' }}>
                          <Icon source={CheckIcon} tone="base" />
                        </div>
                        <Text variant="bodyMd">{feature}</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>

                  <div style={{ marginTop: '10px' }}>
                    <Button
                      fullWidth
                      size="large"
                      variant={plan.buttonVariant}
                      disabled={plan.title === 'Starter'}
                    >
                      {plan.buttonText}
                    </Button>
                  </div>
                </BlockStack>
              </Card>

              {plan.highlight && (
                <div className="plan-recommended-badge">RECOMMENDED</div>
              )}
            </div>
          ))}
        </div>

        <Card>
          <BlockStack gap="400" align="center">
            <Text variant="headingMd" as="h3" fontWeight="bold">
              Need a custom solution for your enterprise?
            </Text>
            <Text variant="bodyMd" tone="subdued">
              We offer tailored features, white-glove onboarding, and dedicated
              support for high-volume stores processing thousands of combos per
              month.
            </Text>
            <InlineStack align="center">
              <Button variant="plain">Chat with our sales team</Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* FAQ Section */}
        <div style={{ marginTop: '40px' }}>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2" textAlign="center">
              Frequently Asked Questions
            </Text>
            <Layout>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h4">
                      Can I change plans anytime?
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Yes, you can upgrade or downgrade your plan at any time.
                      When upgrading, the new features are available
                      immediately.
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h4">
                      Is there a transaction fee?
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      No, we do not charge any per-transaction fees. You only
                      pay the flat monthly subscription for your chosen plan.
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </div>
      </BlockStack>
    </Page>
  );
}
