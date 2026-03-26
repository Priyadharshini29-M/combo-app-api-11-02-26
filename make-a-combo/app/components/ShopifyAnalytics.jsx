import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  Button,
  Grid,
  Box,
  Divider,
  Popover,
  TextField,
  DatePicker,
  ActionList,
  IndexTable,
  Badge,
  EmptyState,
} from '@shopify/polaris';
import {
  CalendarIcon,
  RefreshIcon,
  ChartVerticalIcon,
  ProductIcon,
  ChevronDownIcon,
  MenuHorizontalIcon,
  PersonIcon,
  CartIcon,
  DiscountIcon,
  StarIcon,
} from '@shopify/polaris-icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFetcher } from '@remix-run/react';

// --- Dashboard Component ---
export function ShopifyAnalytics({ initialData }) {
  const fetcher = useFetcher();
  const [data, setData] = useState(initialData || { totalVisitors: 0, totalClicks: 0, checkoutClicks: 0, discountUsage: 0, topTemplate: 'None', byTemplate: [], chartData: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [datePopover, setDatePopover] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');
  const [pendingDates, setPendingDates] = useState({ start: new Date(new Date().setDate(new Date().getDate() - 30)), end: new Date() });
  const [activeDates, setActiveDates] = useState(pendingDates);
  const [{ month, year }, setDateView] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

  // Handle Fetcher Updates
  useEffect(() => {
    if (fetcher.data) {
      // If the data comes from /api/analytics, it's the direct analytics object.
      // If it comes from /app/dashboard (initial), it's inside an analyticsData property.
      const analyticsData = fetcher.data.analyticsData || fetcher.data;

      if (analyticsData && typeof analyticsData === 'object' && 'totalVisitors' in analyticsData) {
        setData(analyticsData);
        setIsLoading(false);
      }
    }
  }, [fetcher.data]);

  const handleRefresh = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set('start', activeDates.start.toISOString().split('T')[0]);
    params.set('end', activeDates.end.toISOString().split('T')[0]);
    fetcher.load(`/api/analytics?${params.toString()}`);
  };

  const handleApply = () => {
    setActiveDates(pendingDates);
    setDatePopover(false);
    handleRefresh();
  };

  const setPreset = (preset, days) => {
    setSelectedPreset(preset);
    const start = new Date();
    start.setDate(start.getDate() - days);
    const range = { start, end: new Date() };
    setPendingDates(range);
    setDateView({ month: start.getMonth(), year: start.getFullYear() });
  };

  return (
    <Box paddingBlockStart="1000">
      <Divider />
      <Box paddingBlockStart="800">
        <BlockStack gap="600">

          {/* Header & Controls */}
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              <Icon source={ChartVerticalIcon} tone="base" />
              <Text variant="headingMd" as="h2">App Analytics</Text>
            </InlineStack>
            <InlineStack gap="200">
              <Popover
                active={datePopover}
                activator={<Button icon={CalendarIcon} onClick={() => setDatePopover(!datePopover)} disclosure>{selectedPreset}</Button>}
                onClose={() => setDatePopover(false)}
              >
                <Box width="600px">
                  <InlineStack wrap={false}>
                    <Box width="160px" borderInlineEndWidth="1px" borderColor="border-subdued">
                      <ActionList
                        items={[
                          { content: 'Today', onClick: () => setPreset('Today', 0) },
                          { content: 'Last 7 days', onClick: () => setPreset('Last 7 days', 7) },
                          { content: 'Last 30 days', onClick: () => setPreset('Last 30 days', 30) },
                          { content: 'Custom' },
                        ]}
                      />
                    </Box>
                    <Box padding="400">
                      <BlockStack gap="400">
                        <DatePicker
                          month={month} year={year}
                          onChange={setPendingDates}
                          onMonthChange={(m, y) => setDateView({ month: m, year: y })}
                          selected={pendingDates}
                          multiMonth allowRange
                        />
                        <InlineStack align="end" gap="200">
                          <Button onClick={() => setDatePopover(false)}>Cancel</Button>
                          <Button variant="primary" onClick={handleApply}>Apply</Button>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  </InlineStack>
                </Box>
              </Popover>
              <Button icon={RefreshIcon} onClick={handleRefresh} loading={isLoading} />
            </InlineStack>
          </InlineStack>

          {/* KPI Cards */}
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                    <Icon source={PersonIcon} tone="info" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">Total Visitors</Text>
                    <Text variant="headingLg" as="p">{data.totalVisitors.toLocaleString()}</Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                    <Icon source={CartIcon} tone="success" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">Checkout Clicks</Text>
                    <Text variant="headingLg" as="p">{data.totalClicks.toLocaleString()}</Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                    <Icon source={DiscountIcon} tone="caution" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">Discounts Applied</Text>
                    <Text variant="headingLg" as="p">{data.discountUsage.toLocaleString()}</Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                    <Icon source={StarIcon} tone="magic" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">Top Template</Text>
                    <Text variant="headingMd" as="p" truncate>{data.topTemplate}</Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
          </Grid>

          {/* Chart & Insights Row */}
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, md: 4, lg: 8 }}>
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd">Checkout Clicks</Text>
                  <div style={{ height: '350px', width: '100%', paddingTop: '10px' }}>
                    {data.chartData.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart data={data.chartData} margin={{ bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#6d7175' }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6d7175' }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,128,96,0.05)' }} 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '12px' }} 
                            itemStyle={{ fontWeight: 'bold', color: '#008060' }}
                          />
                          <Bar dataKey="clicks" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#008060" stopOpacity={1} />
                                <stop offset="100%" stopColor="#00a080" stopOpacity={0.8} />
                              </linearGradient>
                            </defs>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState heading="No data for this period" />
                    )}
                  </div>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, md: 2, lg: 4 }}>
              <BlockStack gap="400">
                <Card padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm">Top Templates</Text>
                    {data.byTemplate.length > 0 ? data.byTemplate.slice(0, 3).map((t, idx) => (
                      <InlineStack key={idx} align="space-between">
                        <Text variant="bodySm" fontWeight="medium">{t.name}</Text>
                        <Text variant="bodySm" tone="subdued">{t.clicks} clicks</Text>
                      </InlineStack>
                    )) : <Text variant="bodySm" tone="subdued">No data</Text>}
                  </BlockStack>
                </Card>
                <Card padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm">Discount Usage</Text>
                    <Text variant="bodySm" tone="subdued">0 Active Discounts (Derived from clicks)</Text>
                  </BlockStack>
                </Card>
                <Card padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm">Most Visited Templates</Text>
                    {data.byTemplate.length > 0 ? data.byTemplate.slice(0, 3).sort((a, b) => b.visitors - a.visitors).map((t, idx) => (
                      <InlineStack key={idx} align="space-between">
                        <Text variant="bodySm">{t.name}</Text>
                        <Badge>{t.visitors} visitors</Badge>
                      </InlineStack>
                    )) : <Text variant="bodySm" tone="subdued">No data</Text>}
                  </BlockStack>
                </Card>
              </BlockStack>
            </Grid.Cell>
          </Grid>

          {/* Details Table */}
          <Card padding="0">
            <Box padding="400">
              <Text variant="headingMd">Template Performance Breakdown</Text>
            </Box>
            <Divider />
            <Box borderStyle="solid" borderColor="border-subdued" borderBlockStartWidth="1px" borderBlockEndWidth="1px">
              <IndexTable
                resourceName={{ singular: 'template', plural: 'templates' }}
                itemCount={data.byTemplate.length}
                selectable={false}
                headings={[
                  { title: 'Template Name' },
                  { title: 'Visitors' },
                  { title: 'Checkout Clicks' },
                  { title: 'Discount Applied' },
                ]}
              >
                {data.byTemplate.map((row, i) => (
                  <IndexTable.Row id={String(i)} key={i} position={i}>
                    <IndexTable.Cell>
                      <Text variant="bodyMd" fontWeight="bold">{row.name}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text variant="bodyMd">{row.visitors}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text variant="bodyMd">{row.clicks}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="info">{row.discount || 'None'}</Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Box>
            {data.byTemplate.length === 0 && (
              <Box padding="1000">
                <EmptyState heading="No template data available" />
              </Box>
            )}
          </Card>

        </BlockStack>
      </Box>
    </Box>
  );
}

export default ShopifyAnalytics;
