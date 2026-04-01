import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Modal,
  useBreakpoints,
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
  const { smUp } = useBreakpoints();
  const [data, setData] = useState(
    initialData || {
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
      currencyCode: 'USD',
    }
  );
  const [isLoading, setIsLoading] = useState(false);

  // Convert a Date object into YYYY-MM-DD in the browser's local timezone.
  // IMPORTANT: Do NOT use toISOString() here, because it converts to UTC and
  // can shift dates backwards (e.g. local 2026-03-26 becomes 2026-03-25).
  const toYMDLocal = (d) => {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Normalize Date objects to local noon so day boundaries/timezones don't
  // accidentally shift the YYYY-MM-DD we send to the API.
  const normalizeToNoon = (d) => {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    const nd = new Date(d);
    nd.setHours(12, 0, 0, 0);
    return nd;
  };

  // Filter States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');
  const [pendingDates, setPendingDates] = useState({
    start: normalizeToNoon(
      new Date(new Date().setDate(new Date().getDate() - 29))
    ),
    end: normalizeToNoon(new Date()),
  });
  const [activeDates, setActiveDates] = useState(pendingDates);
  const activeDatesRef = useRef(pendingDates);
  const ignoreNextDatePickerOnChangeRef = useRef(false);
  const [{ month, year }, setDateView] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  // Handle Fetcher Updates
  useEffect(() => {
    if (fetcher.data) {
      // If the data comes from /api/analytics, it's the direct analytics object.
      // If it comes from /app/dashboard (initial), it's inside an analyticsData property.
      const analyticsData = fetcher.data.analyticsData || fetcher.data;

      if (
        analyticsData &&
        typeof analyticsData === 'object' &&
        'totalVisitors' in analyticsData
      ) {
        setData(analyticsData);
        setIsLoading(false);
      }
    }
  }, [fetcher.data]);

  const handleRefresh = () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    // Always send explicit local-day boundaries to avoid timezone off-by-one issues.
    // Format:
    // - start = YYYY-MM-DD 00:00:00
    // - end   = YYYY-MM-DD 23:59:59
    // Use activeDates as the single source of truth.
    // This avoids preset/state timing mismatches (e.g. "Today" still using
    // a previous preset range, or a custom range collapsing).
    const startDate = activeDatesRef.current?.start;
    const endDate = activeDatesRef.current?.end;

    const startYMD = toYMDLocal(startDate);
    const endYMD = toYMDLocal(endDate);
    if (startYMD) params.set('start', `${startYMD} 00:00:00`);
    if (endYMD) params.set('end', `${endYMD} 23:59:59`);

    fetcher.load(`/api/analytics?${params.toString()}`);
  };

  const handleApply = () => {
    setActiveDates(pendingDates);
    activeDatesRef.current = pendingDates;
    setIsModalOpen(false);
    handleRefresh();
  };

  const setPreset = (preset, days) => {
    ignoreNextDatePickerOnChangeRef.current = true;
    setSelectedPreset(preset);
    const start = new Date();
    // `days` is inclusive (Last 7 days => today + 6 previous days).
    const daysBack = days > 0 ? days - 1 : 0;
    start.setDate(start.getDate() - daysBack);
    const range = {
      start: normalizeToNoon(start),
      end: normalizeToNoon(new Date()),
    };

    setPendingDates(range);
    setActiveDates(range);
    activeDatesRef.current = range;
    setDateView({ month: start.getMonth(), year: start.getFullYear() });

    // Presets apply immediately and close the modal
    handleRefresh();
    setIsModalOpen(false);
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
              <Text variant="headingMd" as="h2">
                App Analytics
              </Text>
            </InlineStack>
            <InlineStack gap="200">
              <Button
                icon={CalendarIcon}
                onClick={() => setIsModalOpen(true)}
                disclosure
              >
                {selectedPreset}
              </Button>

              <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Select date range"
                size="large"
                primaryAction={{
                  content: 'Apply',
                  onAction: handleApply,
                }}
                secondaryActions={[
                  {
                    content: 'Cancel',
                    onAction: () => setIsModalOpen(false),
                  },
                ]}
              >
                <Modal.Section padding="0">
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: smUp ? 'row' : 'column',
                    }}
                  >
                    <Box
                      width={smUp ? '160px' : '100%'}
                      borderInlineEndWidth={smUp ? '1px' : '0'}
                      borderBlockEndWidth={smUp ? '0' : '1px'}
                      borderColor="border-subdued"
                    >
                      <ActionList
                        items={[
                          {
                            content: 'Today',
                            active: selectedPreset === 'Today',
                            onAction: () => setPreset('Today', 0),
                          },
                          {
                            content: 'Last 7 days',
                            active: selectedPreset === 'Last 7 days',
                            onAction: () => setPreset('Last 7 days', 7),
                          },
                          {
                            content: 'Last 30 days',
                            active: selectedPreset === 'Last 30 days',
                            onAction: () => setPreset('Last 30 days', 30),
                          },
                          {
                            content: 'Custom',
                            active: selectedPreset === 'Custom',
                            onAction: () => setSelectedPreset('Custom'),
                          },
                        ]}
                      />
                    </Box>
                    <Box padding="400" width="100%">
                      <BlockStack gap="400">
                        <DatePicker
                          month={month}
                          year={year}
                          onChange={(dates) => {
                            if (ignoreNextDatePickerOnChangeRef.current) {
                              ignoreNextDatePickerOnChangeRef.current = false;
                              return;
                            }
                            const nextRange = {
                              start: normalizeToNoon(dates?.start),
                              end: normalizeToNoon(dates?.end),
                            };
                            setPendingDates(nextRange);
                            const prev = activeDatesRef.current;
                            const updated = {
                              start: nextRange.start ?? prev?.start ?? null,
                              end: nextRange.end ?? prev?.end ?? null,
                            };
                            activeDatesRef.current = updated;
                            setActiveDates(updated);
                            setSelectedPreset('Custom');
                          }}
                          onMonthChange={(m, y) =>
                            setDateView({ month: m, year: y })
                          }
                          selected={pendingDates}
                          multiMonth={smUp}
                          allowRange
                        />
                      </BlockStack>
                    </Box>
                  </div>
                </Modal.Section>
              </Modal>

              <Button
                icon={RefreshIcon}
                onClick={handleRefresh}
                loading={isLoading}
              />
            </InlineStack>
          </InlineStack>

          {/* Performance Overview (Combo Template approach) */}
          <Card padding="500">
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Performance Overview</Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="bodySm" fontWeight="medium" tone="subdued">Total Revenue</Text>
                      <Text variant="headingXl" as="p">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currencyCode || 'USD' }).format(data.totalRevenue)}
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="bodySm" fontWeight="medium" tone="subdued">Average Order Value (AOV)</Text>
                      <Text variant="headingXl" as="p">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currencyCode || 'USD' }).format(data.aov)}
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="bodySm" fontWeight="medium" tone="subdued">Conversion Rate</Text>
                      <Text variant="headingXl" as="p">
                        {data.orderConversionRate.toFixed(2)}%
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>

          {/* KPI Cards */}
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box
                    padding="200"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Icon source={PersonIcon} tone="info" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">
                      Total Visitors
                    </Text>
                    <Text variant="headingLg" as="p">
                      {data.totalVisitors.toLocaleString()}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box
                    padding="200"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Icon source={CartIcon} tone="success" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">
                      Checkout Clicks
                    </Text>
                    <Text variant="headingLg" as="p">
                      {data.totalClicks.toLocaleString()}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box
                    padding="200"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Icon source={DiscountIcon} tone="caution" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">
                      Active Discounts
                    </Text>
                    <Text variant="headingLg" as="p">
                      {data.discountUsage.toLocaleString()}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
              <Card padding="400">
                <InlineStack gap="300" align="start" blockAlign="center">
                  <Box
                    padding="200"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <Icon source={StarIcon} tone="magic" />
                  </Box>
                  <BlockStack gap="100">
                    <Text variant="bodySm" fontWeight="medium" tone="subdued">
                      Top Template
                    </Text>
                    <Text variant="headingMd" as="p" truncate>
                      {data.topTemplate}
                    </Text>
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
                  <div
                    style={{
                      height: '350px',
                      width: '100%',
                      paddingTop: '10px',
                    }}
                  >
                    {data.chartData.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart data={data.chartData} margin={{ bottom: 40 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f0f0f0"
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#6d7175' }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#6d7175' }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(0,128,96,0.05)' }}
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid #eee',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                              padding: '12px',
                            }}
                            itemStyle={{ fontWeight: 'bold', color: '#008060' }}
                          />
                          <Bar
                            dataKey="clicks"
                            fill="url(#barGradient)"
                            radius={[6, 6, 0, 0]}
                            barSize={40}
                          >
                            <defs>
                              <linearGradient
                                id="barGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#008060"
                                  stopOpacity={1}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#00a080"
                                  stopOpacity={0.8}
                                />
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
                    {data.byTemplate.length > 0 ? (
                      data.byTemplate.slice(0, 3).map((t, idx) => (
                        <InlineStack key={idx} align="space-between">
                          <Text variant="bodySm" fontWeight="medium">
                            {t.name}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {t.clicks} clicks
                          </Text>
                        </InlineStack>
                      ))
                    ) : (
                      <Text variant="bodySm" tone="subdued">
                        No data
                      </Text>
                    )}
                  </BlockStack>
                </Card>
                <Card padding="400">
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingSm">Discount Usage</Text>
                      <Badge
                        tone={data.discountUsage > 0 ? 'success' : 'subdued'}
                      >
                        {data.discountUsage} active
                      </Badge>
                    </InlineStack>
                    {(data.discountList || []).length > 0 ? (
                      <BlockStack gap="200">
                        {data.discountList.map((d, idx) => (
                          <Box
                            key={idx}
                            padding="200"
                            background="bg-surface-secondary"
                            borderRadius="200"
                          >
                            <BlockStack gap="100">
                              <InlineStack
                                align="space-between"
                                blockAlign="center"
                              >
                                <Text
                                  variant="bodySm"
                                  fontWeight="bold"
                                  truncate
                                >
                                  {d.discount_name}
                                </Text>
                                <Text variant="bodySm" tone="subdued">
                                  Used: {d.usage_count}
                                </Text>
                              </InlineStack>
                            </BlockStack>
                          </Box>
                        ))}
                      </BlockStack>
                    ) : (
                      <Text variant="bodySm" tone="subdued">
                        There is no discount used
                      </Text>
                    )}
                  </BlockStack>
                </Card>
                <Card padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm">Most Visited Templates</Text>
                    {data.byTemplate.length > 0 ? (
                      data.byTemplate
                        .slice(0, 3)
                        .sort((a, b) => b.visitors - a.visitors)
                        .map((t, idx) => (
                          <InlineStack key={idx} align="space-between">
                            <Text variant="bodySm">{t.name}</Text>
                            <Badge>{t.visitors} visitors</Badge>
                          </InlineStack>
                        ))
                    ) : (
                      <Text variant="bodySm" tone="subdued">
                        No data
                      </Text>
                    )}
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
            <Box
              borderStyle="solid"
              borderColor="border-subdued"
              borderBlockStartWidth="1px"
              borderBlockEndWidth="1px"
            >
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
                      <Text variant="bodyMd" fontWeight="bold">
                        {row.name}
                      </Text>
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
