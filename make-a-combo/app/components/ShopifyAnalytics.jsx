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
  PersonIcon,
  CartIcon,
  DiscountIcon,
  StarIcon,
  SearchIcon,
  SettingsIcon,
  AlertBubbleIcon,
} from '@shopify/polaris-icons';
import { useFetcher, Link } from '@remix-run/react';

// --- Circular Progress Component ---
const CircularProgress = ({ value, limit, total }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="circular-progress-container">
      <svg className="circular-progress-svg" width="60" height="60">
        <circle className="circular-progress-bg" cx="30" cy="30" r={radius} />
        <circle
          className="circular-progress-bar"
          cx="30"
          cy="30"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="circular-progress-text">{value}%</div>
    </div>
  );
};

// --- Horizontal Bar Component ---
const HorizontalBar = ({ label, value, max, colorClass }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="bar-container">
      <div className="bar-labels">
        <span>{label}</span>
        <span>{value} clicks</span>
      </div>
      <div className="bar-bg">
        <div 
          className={`bar-fill ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

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

  // Filter States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');
  const [pendingDates, setPendingDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 29)),
    end: new Date(),
  });
  const [activeDates, setActiveDates] = useState(pendingDates);
  const activeDatesRef = useRef(pendingDates);
  const [{ month, year }, setDateView] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Normalize/Helper functions (preserved from original)
  const toYMDLocal = (d) => {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (fetcher.data) {
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
    const startYMD = toYMDLocal(activeDatesRef.current?.start);
    const endYMD = toYMDLocal(activeDatesRef.current?.end);
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
    setSelectedPreset(preset);
    const start = new Date();
    const daysBack = days > 0 ? days - 1 : 0;
    start.setDate(start.getDate() - daysBack);
    const range = { start, end: new Date() };
    setPendingDates(range);
    setActiveDates(range);
    activeDatesRef.current = range;
    setDateView({ month: start.getMonth(), year: start.getFullYear() });
    setIsModalOpen(false);
    handleRefresh();
  };

  // Mock AI Usage data as per image requirements
  const aiUsage = {
    percentage: 85,
    used: 8500,
    total: 10000,
    resetIn: '4 days'
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: data.currencyCode || 'USD',
  });

  return (
    <div className="insights-dashboard">
      <style>{`
        /* Local overrides if needed */
        .insights-dashboard .Polaris-Box { padding: 0; }
      `}</style>
      
      {/* Header */}
      <div className="insights-header">
        <h1>Merchant Insights</h1>
        <div className="insights-controls">
          <div className="insights-search">
            <span className="insights-search-icon">
              <Icon source={SearchIcon} tone="subdued" />
            </span>
            <input 
              type="text" 
              placeholder="Search analytics..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="insights-settings-btn" onClick={() => setIsModalOpen(true)}>
             <Icon source={CalendarIcon} tone="base" />
          </button>
          <Link to="/app/plan" style={{ color: 'inherit', textDecoration: 'none' }}>
            <button className="insights-settings-btn">
              <Icon source={SettingsIcon} tone="base" />
            </button>
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="insights-top-row">
        <div className="insights-metric-card">
          <div className="label">Total Revenue</div>
          <div className="value">{formatter.format(data.totalRevenue)}</div>
          <div className="sub-info">
            <Icon source={RefreshIcon} tone="subdued" />
            Steady from last period
          </div>
        </div>
        
        <div className="insights-metric-card">
          <div className="label">Average Order Value</div>
          <div className="value">{formatter.format(data.aov)}</div>
          <div className="sub-info">
            <Badge tone="success">Awaiting new data</Badge>
          </div>
        </div>

        <div className={`insights-metric-card ${data.orderConversionRate < 1 ? 'warning' : ''}`}>
          <div className="label">Conversion Rate</div>
          <div className="value">{data.orderConversionRate.toFixed(2)}%</div>
          <div className="sub-info">
            <Icon source={AlertBubbleIcon} />
            {data.orderConversionRate < 1 ? 'Traffic without conversions' : 'Performing well'}
          </div>
        </div>

        <div className="insights-metric-card">
          <div className="label">AI Usage</div>
          <div className="ai-usage-card">
            <CircularProgress value={aiUsage.percentage} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>Monthly Limit</div>
              <div style={{ fontSize: '11px', color: '#6d7175' }}>
                {aiUsage.used.toLocaleString()} / {aiUsage.total.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: '8px' }}>
                Resetting in {aiUsage.resetIn}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="insights-secondary-row">
        <div className="insights-secondary-card">
          <div className="label">Total Visitors</div>
          <div className="value">{data.totalVisitors.toLocaleString()}</div>
        </div>
        <div className="insights-secondary-card">
          <div className="label">Checkout Clicks</div>
          <div className="value">{data.checkoutClicks.toLocaleString()}</div>
        </div>
        <div className="insights-secondary-card">
          <div className="label">Active Discounts</div>
          <div className="value">{data.discountUsage.toLocaleString()}</div>
        </div>
        <div className="insights-secondary-card">
          <div className="label">Top Template</div>
          <div className="value" style={{ fontSize: '14px', textTransform: 'lowercase' }}>{data.topTemplate}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="insights-main-grid">
        <div className="insights-chart-card">
          <div className="card-header" style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '4px' }}>
              <Icon source={ChartVerticalIcon} tone="base" />
            </div>
            <div>
              <Text variant="headingMd" as="h2">Checkout Clicks</Text>
              <Text variant="bodySm" tone="subdued">Clicks performance by template</Text>
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            {data.byTemplate.length > 0 ? (
              data.byTemplate.slice(0, 4).map((t, idx) => (
                <HorizontalBar 
                  key={idx}
                  label={t.name}
                  value={t.clicks}
                  max={data.byTemplate[0].clicks}
                  colorClass={`gradient-${idx + 1}`}
                />
              ))
            ) : (
              <EmptyState heading="No data available" />
            )}
          </div>
        </div>

        <div className="insights-side-column">
          <div className="insights-side-card">
            <div className="card-header">
              <h3>Top Templates</h3>
            </div>
            {data.byTemplate.slice(0, 3).map((t, idx) => (
              <div key={idx} className="ranked-item">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="rank-badge">{String(idx + 1).padStart(2, '0')}</div>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{t.name}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{t.visitors + t.clicks}</span>
              </div>
            ))}
          </div>

          <div className="insights-side-card" style={{ borderLeft: '4px solid #8e443d' }}>
            <div className="card-header">
              <h3 style={{ color: '#8e443d' }}>Discount Usage</h3>
            </div>
            {data.discountList.slice(0, 2).map((d, idx) => (
              <div key={idx} className="discount-usage-item">
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{d.discount_name}</span>
                <span className="usage-pill">{d.usage_count} used</span>
              </div>
            ))}
            {data.discountList.length === 0 && (
              <Text variant="bodySm" tone="subdued">No active discounts used</Text>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Table */}
      <div className="insights-table-card">
        <div style={{ marginBottom: '20px' }}>
          <Text variant="headingMd" as="h2">Template Performance Breakdown</Text>
        </div>
        <div className="insights-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Visitors</th>
                <th>Checkout Clicks</th>
                <th>Discount Applied</th>
              </tr>
            </thead>
            <tbody>
              {data.byTemplate.map((row, i) => (
                <tr key={i}>
                  <td>
                    <div className="table-template-name">
                      <div className="template-icon">
                        <Icon source={StarIcon} size="small" />
                      </div>
                      {row.name}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>{row.visitors}</td>
                  <td style={{ fontWeight: '600' }}>{row.clicks}</td>
                  <td>
                    {row.discount !== 'None' ? (
                      <span className={`status-badge ${i % 2 === 0 ? 'green' : 'blue'}`}>
                        {row.discount}
                      </span>
                    ) : (row.name.includes('bold') ? <span className="status-badge green">BOLD_SAVE</span> : <span className="status-badge gray">None</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Date Selection */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select date range"
        primaryAction={{
          content: 'Apply',
          onAction: handleApply,
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
             <ActionList
              items={[
                { content: 'Today', onAction: () => setPreset('Today', 0) },
                { content: 'Last 7 days', onAction: () => setPreset('Last 7 days', 7) },
                { content: 'Last 30 days', onAction: () => setPreset('Last 30 days', 30) },
              ]}
            />
            <Divider />
            <DatePicker
              month={month}
              year={year}
              onChange={(dates) => {
                setPendingDates({
                  start: dates.start,
                  end: dates.end,
                });
                setSelectedPreset('Custom');
              }}
              onMonthChange={(m, y) => setDateView({ month: m, year: y })}
              selected={pendingDates}
              allowRange
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

    </div>
  );
}

export default ShopifyAnalytics;
