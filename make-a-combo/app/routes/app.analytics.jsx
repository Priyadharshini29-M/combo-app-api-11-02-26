import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { getAnalytics, getShopifyDiscounts } from '../utils/api-helpers';
import { ShopifyAnalytics } from '../components/ShopifyAnalytics';
import { Page, BlockStack } from '@shopify/polaris';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const end = endParam || new Date().toISOString().split('T')[0];
  const start = startParam || new Date(new Date().setDate(new Date().getDate() - 30))
    .toISOString()
    .split('T')[0];

  const [analyticsData, shopifyDiscounts] = await Promise.all([
    getAnalytics(shop, start, end, null, admin).then(d => d || {
      totalVisitors: 0,
      totalClicks: 0,
      checkoutClicks: 0,
      discountUsage: 0,
      discountList: [],
      topTemplate: 'None',
      byTemplate: [],
      chartData: [],
      totalRevenue: 0,
      totalOrders: 0,
      aov: 0,
      orderConversionRate: 0,
    }),
    getShopifyDiscounts(admin),
  ]);

  const appliedDiscounts = (shopifyDiscounts || [])
    .filter(d => d.usedCount > 0 && d.status === 'active')
    .map(d => ({
      discount_name: d.code || d.title,
      usage_count: d.usedCount
    }))
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  analyticsData.discountList = appliedDiscounts;
  if (shopifyDiscounts && shopifyDiscounts.length > 0) {
    analyticsData.discountUsage = shopifyDiscounts.filter(d => d.status === 'active').length;
  } else {
    analyticsData.discountList = [];
  }

  return json({ analyticsData });
};

export default function AnalyticsPage() {
  const { analyticsData } = useLoaderData();

  return (
    <Page fullWidth>
      <ShopifyAnalytics initialData={analyticsData} />
    </Page>
  );
}
