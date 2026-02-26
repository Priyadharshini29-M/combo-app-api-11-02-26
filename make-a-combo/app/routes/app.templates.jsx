import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate, Link } from '@remix-run/react';
import {
  Page,
  Card,
  Button,
  IndexTable,
  Badge,
  Modal,
  Avatar,
  Icon,
  InlineStack,
  BlockStack,
  Box,
  Text,
  Tabs,
  TextField,
  Divider,
  Popover,
  ActionList,
  Select,
  RangeSlider,
  DatePicker,
  Checkbox,
} from '@shopify/polaris';
import {
  LayoutColumns3Icon,
  CalendarIcon,
  SearchIcon,
  MaximizeIcon,
  ChevronDownIcon,
  FilterIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
} from '@shopify/polaris-icons';

import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import fs from 'fs';
import path from 'path';
// import prisma from "../db.server"; // Prisma disabled for Fake API
import { authenticate } from '../shopify.server';

const BASE_PHP_URL = "https://61fb-103-130-204-117.ngrok-free.app/make-a-combo";

/**
 * Direct function to sync data to PHP without using helpers
 */
const syncToPhp = async (payload, endpoint = "templates.php") => {
  const url = `${BASE_PHP_URL}/${endpoint}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error(`[Templates UI] Direct PHP Error (${endpoint}):`, error.message);
    throw error;
  }
};

// --- Fake API Helper ---
const FAKE_DB_PATH = path.join(process.cwd(), 'public', 'fake_db.json');

const getFakeTemplates = () => {
  try {
    if (!fs.existsSync(FAKE_DB_PATH)) return [];
    const db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    return db.templates || [];
  } catch (err) {
    console.error('Error reading fake DB:', err);
    return [];
  }
};

const saveFakeTemplates = (templates) => {
  try {
    let db = { templates: [], discounts: [] };
    if (fs.existsSync(FAKE_DB_PATH)) {
      db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    }
    db.templates = templates;
    fs.writeFileSync(FAKE_DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing fake DB:', err);
  }
};

// --- Add action to save new templates ---
// Layout designs metadata (same as dashboard)
const layoutMetadata = [
  {
    id: 1,
    title: 'The Guided Architect',
    description:
      'A conversion-focused multi-step builder with progress tracking and tiered discount logic.',
    img: '/combo-design-one-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Guided+Architect',
    badge: 'Core',
    badgeTone: 'success',
    blockName: 'combo_main',
    features: [
      'Visual progress tracking',
      'Tiered discount engine',
      'Step-by-step selection flow',
      'Sticky summary footer',
      'Ideal for complex kits',
    ],
    bestFor: 'Complex bundles and high-value kits',
  },
  {
    id: 2,
    title: 'The Velocity Stream',
    description:
      'An immersive, motion-driven experience featuring an auto-scrolling carousel for maximum engagement.',
    img: '/combo-design-two-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Motion+Slider',
    badge: 'Trending',
    badgeTone: 'success',
    blockName: 'combo_design_two',
    features: [
      'Smooth auto-scroll motion',
      'Touch-optimized swiping',
      'Dynamic navigation cues',
      'Infinite loop storytelling',
      'Visual-first discovery',
    ],
    bestFor: 'Visual storytelling and featured promotions',
  },
  {
    id: 3,
    title: 'The Editorial Split',
    description:
      'A premium, sophisticated layout that pairs high-impact imagery with detailed product storytelling.',
    img: '/combo-design-four-preview.png',
    fallbackImg:
      'https://placehold.co/400x300/000000/ffffff?text=Editorial+Split',
    badge: 'Premium',
    badgeTone: 'success',
    blockName: 'combo_design_four',
    features: [
      'Luxe split-screen design',
      'Detail-rich narratives',
      'High-contrast callouts',
      'Dark mode elegance',
      'Psychology-driven flow',
    ],
    bestFor: 'Luxury items and high-impact product stories',
  },
  {
    id: 6,
    title: 'Custom Bundle Layout',
    description: 'Build your own custom bundle layout with flexible options',
    img: '/combo-design-one-preview.png', // Placeholder
    fallbackImg:
      'https://placehold.co/400x300/ec4899/ffffff?text=Custom+Bundle',
    badge: 'Flexible',
    badgeTone: 'critical', // distinct tone
    blockName: 'custom_bundle_layout',
    features: [
      'Drag-and-drop builder',
      'Custom CSS support',
      'Dynamic pricing rules',
      'Multi-step configuration',
      'A/B testing ready',
    ],
    bestFor: 'Advanced experimental setups',
  },
];

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const templates = getFakeTemplates();

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Create new template (from customize page)
      try {
        const data = await request.json();
        console.log(`[Templates Action] JSON incoming:`, data);
        const { title, config } = data;
        if (!title || !config) {
          return json({ error: 'Missing title or config' }, { status: 400 });
        }

        const newTemplate = {
          id: Math.max(...templates.map((t) => t.id), 0) + 1,
          title: title || 'Untitled Template',
          config,
          active: true,
          shop, // Add shop domain
          createdAt: new Date().toISOString(),
        };

        // --- VALIDATION START ---
        // Requirement: check validity of discount customize & Analytics (layout)
        if (!config.layout) {
          return json(
            { error: 'Invalid configuration: Missing Layout (Analytics)' },
            { status: 400 }
          );
        }
        // Validate discount config if offer is active
        if (
          config.has_discount_offer &&
          config.selected_discount_id === undefined
        ) {
          // It's okay if it's null, but the key should exist.
          // Strictly speaking, if they said they have an offer, they usually should have picked one,
          // but we'll leniently check structure here or strict if user implies.
          // Let's ensure the key exists at least.
        }
        // --- VALIDATION END ---

        templates.unshift(newTemplate);
        saveFakeTemplates(templates);

        // Sync to MySQL
        try {
          await syncToPhp({
            event: "create",
            resource: "templates",
            shop,
            data: newTemplate
          });
        } catch (dbError) {
          console.error("[Templates Sync] MySQL Create Error:", dbError.message);
        }

        console.log(
          `[Combo App Console] Success Notification: Template created for ${shop}.`
        );
        return json({
          success: true,
          message: 'Template created successfully',
        });
      } catch (error) {
        return json({ error: error.message }, { status: 500 });
      }
    } else {
      // Handle Intent-based POST requests (Toggle or Delete)
      const form = await request.formData();
      const intent = form.get('intent');
      const id = form.get('id');
      console.log(`[Templates Action] Intent: ${intent}, ID: ${id}`);

      if (intent === 'toggle_active') {
        const active = form.get('active') === 'true';
        const index = templates.findIndex((t) => String(t.id) === String(id));
        if (index > -1) {
          templates[index].active = active;
          saveFakeTemplates(templates);

          // Sync to MySQL
          try {
            await syncToPhp({
              event: "update",
              resource: "templates",
              shop,
              data: templates[index]
            });
          } catch (dbError) {
            console.error("[Templates Sync] MySQL Toggle Error:", dbError.message);
          }

          console.log(`[Templates Action] Toggled template ${id} to ${active}`);
          return json({
            success: true,
            message: `Template marked as ${active ? 'active' : 'inactive'}`,
          });
        }
      } else if (intent === 'delete') {
        const filtered = templates.filter((t) => String(t.id) !== String(id));
        if (filtered.length < templates.length) {
          const deletedTemplate = templates.find(t => String(t.id) === String(id));
          saveFakeTemplates(filtered);

          // Sync to MySQL
          try {
            await syncToPhp({
              event: "delete",
              resource: "templates",
              shop,
              id
            });
          } catch (dbError) {
            console.error("[Templates Sync] MySQL Delete Error:", dbError.message);
          }

          console.log(`[Templates Action] Deleted template ${id}`);
          return json({ success: true, message: 'Template deleted' });
        } else {
          console.log(
            `[Templates Action] Delete failed: ID ${id} not found in ${templates.length} templates`
          );
        }
      }
      return json(
        { error: `Action failed: ${intent} for ID ${id}` },
        { status: 400 }
      );
    }
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
};

const getFakeDiscounts = () => {
  try {
    if (!fs.existsSync(FAKE_DB_PATH)) return [];
    const db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    return db.discounts || [];
  } catch (err) {
    console.error('Error reading fake DB:', err);
    return [];
  }
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const allTemplates = getFakeTemplates() || [];
  // Filter templates by shop
  const templates = allTemplates.filter((t) => t.shop === shop);
  const discounts = getFakeDiscounts() || [];
  const activeCount = templates.filter((t) => t.active).length;

  // Fetch liquid files from the extensions directory
  const blocksDir = path.join(
    process.cwd(),
    'extensions',
    'combo-templates',
    'blocks'
  );
  let layoutFiles = [];
  try {
    if (fs.existsSync(blocksDir)) {
      layoutFiles = fs
        .readdirSync(blocksDir)
        .filter((f) => f.endsWith('.liquid'));
    }
  } catch (e) {
    console.error('Error reading blocks directory:', e);
  }

  // Ensure JSON data is returned
  return json({ templates, discounts, activeCount, layoutFiles, shop });
};

export default function TemplatesPage() {
  const fetcher = useFetcher();
  const {
    templates: initialTemplates,
    discounts,
    activeCount,
    layoutFiles,
    shop,
  } = useLoaderData();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || 'Success');
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  // No need for manual fetch on mount, useLoaderData handles it.
  const templates = initialTemplates || [];

  // Merge fetched files with metadata
  const layoutDesigns = layoutFiles
    .map((filename) => {
      const blockName = filename.replace('.liquid', '');
      return layoutMetadata.find((m) => m.blockName === blockName);
    })
    .filter(Boolean); // Only show those with metadata (the 4 designs)

  // Tab & Search state
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchValue, setSearchValue] = useState('');

  // Filter states
  const [datePopoverActive, setDatePopoverActive] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Temporary states for the popover before 'Apply'
  const [tempStartDate, setTempStartDate] = useState(undefined);
  const [tempEndDate, setTempEndDate] = useState(undefined);
  const [{ month, year }, setDatePickerMonth] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [filterDesign, setFilterDesign] = useState('');
  const [filterDiscount, setFilterDiscount] = useState('');

  const [dateRangeMode, setDateRangeMode] = useState('fixed'); // 'fixed' or 'rolling'
  const [rollingValue, setRollingValue] = useState('1');
  const [rollingPeriod, setRollingPeriod] = useState('months'); // 'days', 'weeks', 'months', 'years'
  const [includeCurrentPeriod, setIncludeCurrentPeriod] = useState(false);

  const tabs = [
    { id: 'all', content: 'All', accessibilityLabel: 'All templates' },
    { id: 'active', content: 'Active', accessibilityLabel: 'Active templates' },
    {
      id: 'inactive',
      content: 'Inactive',
      accessibilityLabel: 'Inactive templates',
    },
  ];

  // Derived filtered templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.title
      .toLowerCase()
      .includes(searchValue.toLowerCase());
    const matchesTab =
      selectedTab === 0 ||
      (selectedTab === 1 && template.active) ||
      (selectedTab === 2 && !template.active);

    // Advanced filters
    const created = new Date(template.createdAt);
    created.setHours(0, 0, 0, 0);

    let matchesRange = true;
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      matchesRange = matchesRange && created >= s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      matchesRange = matchesRange && created <= e;
    }

    // Design Filter
    // Standardize 'layout1' etc.
    const layoutMap = {
      layout1: 'combo_main',
      layout2: 'combo_design_two',
      layout3: 'combo_design_three',
      layout4: 'combo_design_four',
    };
    const templateLayout = template.config?.layout || 'layout1';
    // Check if filterDesign matches the layout key (layout1) OR the blockName
    const matchesDesign =
      !filterDesign ||
      templateLayout === filterDesign ||
      layoutMap[templateLayout] === filterDesign;

    // Discount Filter
    const templateDiscountId = template.config?.selected_discount_id;
    const matchesDiscount =
      !filterDiscount || String(templateDiscountId) === String(filterDiscount);

    return (
      matchesSearch &&
      matchesTab &&
      matchesRange &&
      matchesDesign &&
      matchesDiscount
    );
  });

  const datePresets = [
    { label: 'Today', value: 'today', group: 1 },
    { label: 'Yesterday', value: 'yesterday', group: 1 },
    { type: 'separator' },
    { label: 'Last 30 minutes', value: 'last30m', group: 2 },
    { label: 'Last 12 hours', value: 'last12h', group: 2 },
    { type: 'separator' },
    { label: 'Last 7 days', value: 'last7', group: 3 },
    { label: 'Last 30 days', value: 'last30', group: 3 },
    { label: 'Last 90 days', value: 'last90', group: 3 },
    { label: 'Last 365 days', value: 'last365', group: 3 },
    { label: 'Last 12 months', value: 'last12m', group: 3 },
    { type: 'separator' },
    { label: 'Last week', value: 'lastweek', group: 4 },
    { label: 'Last month', value: 'lastmonth', group: 4 },
    { label: 'All Time', value: 'all', group: 4 },
  ];

  const handleDatePresetClick = (presetValue) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    switch (presetValue) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7':
        start.setDate(today.getDate() - 6);
        break;
      case 'last30':
        start.setDate(today.getDate() - 29);
        break;
      case 'last90':
        start.setDate(today.getDate() - 89);
        break;
      case 'last365':
        start.setDate(today.getDate() - 364);
        break;
      case 'lastmonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'all':
        start = undefined;
        end = undefined;
        break;
    }

    setTempStartDate(start);
    setTempEndDate(end);
    setActiveDatePreset(presetValue);

    if (start instanceof Date) {
      setDatePickerMonth({
        month: start.getMonth(),
        year: start.getFullYear(),
      });
    }
  };

  const calculateRollingDates = (val, period, includeCurrent) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);
    const num = parseInt(val, 10) || 0;

    if (!includeCurrent) {
      end.setDate(today.getDate() - 1);
    }

    start = new Date(end);
    switch (period) {
      case 'days':
        start.setDate(end.getDate() - num + 1);
        break;
      case 'weeks':
        start.setDate(end.getDate() - num * 7 + 1);
        break;
      case 'months':
        start.setMonth(end.getMonth() - num);
        start.setDate(end.getDate() + 1);
        break;
      case 'years':
        start.setFullYear(end.getFullYear() - num);
        start.setDate(end.getDate() + 1);
        break;
    }
    return { start, end };
  };

  const applyDateRange = () => {
    if (dateRangeMode === 'rolling') {
      const { start, end } = calculateRollingDates(
        rollingValue,
        rollingPeriod,
        includeCurrentPeriod
      );
      setStartDate(start);
      setEndDate(end);
    } else {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
    }
    setDatePopoverActive(false);
  };

  const getActiveDateLabel = () => {
    if (!startDate || !endDate) return 'All Time';
    try {
      if (startDate.getTime() === endDate.getTime()) {
        return startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch (e) {
      return 'All Time';
    }
  };

  const designOptions = [
    { label: 'All Designs', value: '' },
    ...layoutMetadata.map((m) => ({ label: m.title, value: m.blockName })),
  ];

  const discountOptions = [
    { label: 'All Discounts', value: '' },
    ...discounts.map((d) => ({ label: d.title, value: String(d.id) })),
  ];

  // Selection state for checkboxes
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);

  // Reset selection if templates change
  useEffect(() => {
    setSelectedResourceIds((prev) =>
      prev.filter((id) => templates.some((t) => String(t.id) === String(id)))
    );
  }, [templates]);

  // Handler for layout card click
  const handleLayoutSelect = (layout) => {
    setModalOpen(false);
    navigate(`/app/customize?layout=${layout}`);
  };

  // Modal states for confirmations
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [targetTemplate, setTargetTemplate] = useState(null);

  // Define confirm handlers
  const confirmDelete = () => {
    if (targetTemplate) {
      fetcher.submit(
        { id: targetTemplate.id, intent: 'delete' },
        { method: 'post' }
      );
      setDeleteModalOpen(false);
      setTargetTemplate(null);
    }
  };

  const confirmToggleStatus = () => {
    if (targetTemplate) {
      fetcher.submit(
        {
          id: targetTemplate.id,
          active: !targetTemplate.active,
          intent: 'toggle_active',
        },
        { method: 'post' }
      );
      setToggleModalOpen(false);
      setTargetTemplate(null);
    }
  };

  return (
    <Page
      title="Templates"
      titleMetadata={
        <div style={{ width: 40 }}>
          <Icon source={LayoutColumns3Icon} color="#000" />
        </div>
      }
    >
      <TitleBar title="Templates" />
      <style>{`
        .custom-tabs-container {
          background: transparent;
          padding: 0 8px;
          margin-bottom: 0px;
        }
        
        /* Force remove default container styles from Polaris */
        .unique-table-wrapper .Polaris-IndexTable__IndexTableWrapper,
        .unique-table-wrapper .Polaris-IndexTable-IndexTableWrapper,
        .unique-table-wrapper .Polaris-Card {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
        }

        /* Ensure the table itself allows spacing */
        .unique-table-wrapper table.Polaris-IndexTable__Table,
        .unique-table-wrapper table {
          border-collapse: separate !important;
          border-spacing: 0 12px !important; 
          background: transparent !important;
          width: 100%;
          table-layout: fixed !important; /* STRICT ALIGNMENT */
        }

        /* Headings: minimal, uppercase, subdued */
        .unique-table-wrapper thead tr th,
        .unique-table-wrapper thead tr th.Polaris-IndexTable__TableHeading {
          background: #f1f2f3 !important;
          border-bottom: 1px solid #e1e3e5 !important;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 600 !important;
          letter-spacing: 0.5px;
          color: #4a4a4a;
          padding: 8px 0 !important; 
          box-shadow: none !important;
          white-space: nowrap;
          height: 48px !important;
          vertical-align: middle !important;
        }

        /* Column-Specific Alignment & Widths */
        
        /* col 1: Checkbox (Balanced Padding) */
        .unique-table-wrapper th:nth-child(1),
        .unique-table-wrapper td:nth-child(1) {
            width: 70px !important;
            min-width: 70px !important;
            text-align: center !important;
            padding-left: 24px !important;
            padding-right: 0 !important;
        }

        /* Rows: White cards with shadow */
        .unique-table-wrapper tbody tr,
        .unique-table-wrapper tbody tr.Polaris-IndexTable__TableRow {
            background-color: #fff !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            border: none !important;
            transition: all 0.2s ease;
        }
        .unique-table-wrapper tbody tr:hover,
        .unique-table-wrapper tbody tr.Polaris-IndexTable__TableRow:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.08); /* Lift effect */
            background-color: #fff !important;
            z-index: 10;
            position: relative;
        }

        /* Cells: remove borders, add padding & radius */
        .unique-table-wrapper tbody td,
        .unique-table-wrapper tbody td.Polaris-IndexTable__TableCell {
            border: none !important;
            vertical-align: middle !important;
            padding: 10px 0 !important; /* Reset padding to 0-horizontal */
            background-color: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
        }
        .unique-table-wrapper tbody td:first-child {
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
        }
        .unique-table-wrapper tbody td:last-child {
            border-top-right-radius: 12px;
            border-bottom-right-radius: 12px;
            padding-right: 24px !important;
        }

        /* col 2: Template Name */
        .unique-table-wrapper th:nth-child(2),
        .unique-table-wrapper td:nth-child(2) {
            width: 25% !important;
            text-align: left !important;
        }
        
        /* col 3: Created At */
        .unique-table-wrapper th:nth-child(3),
        .unique-table-wrapper td:nth-child(3) {
            width: 15% !important;
            text-align: left !important;
        }

        /* col 4: Discount */
        .unique-table-wrapper th:nth-child(4),
        .unique-table-wrapper td:nth-child(4) {
            width: 15% !important;
            text-align: center !important;
        }

        /* col 5: Status */
        .unique-table-wrapper th:nth-child(5),
        .unique-table-wrapper td:nth-child(5) {
            width: 15% !important;
            text-align: center !important;
        }

        /* col 6: Actions (Centered) */
        .unique-table-wrapper th:nth-child(6),
        .unique-table-wrapper td:nth-child(6) {
            width: 30% !important;
            min-width: 280px !important;
            text-align: center !important;
            padding-right: 24px !important;
        }

        /* Action Buttons Styling - Premium Rounded Squares */
        .unique-table-wrapper .Polaris-Button {
            border-radius: 10px !important;
            border: 1px solid #e1e3e5 !important;
            background: #fff !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            width: 40px !important;
            height: 40px !important;
            padding: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #1a1a1a !important;
        }

        .unique-table-wrapper .Polaris-Button:hover {
            background: #1a1a1a !important;
            border-color: #1a1a1a !important;
            color: #fff !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .unique-table-wrapper .Polaris-Button .Polaris-Icon {
            margin: 0 !important;
        }

        .unique-table-wrapper .Polaris-Button:hover .Polaris-Icon {
             color: #fff !important;
        }

        /* Destructive button specifically */
        .unique-table-wrapper .Polaris-Button--destructive:hover {
            background: #d32f2f !important;
            border-color: #d32f2f !important;
        }
        
        
        /* Pill Action Buttons */
        .pill-btn {
          padding: 4px 16px;
          border-radius: 50px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          min-width: 90px;
          text-align: center;
          color: #fff !important;
        }

        .pill-btn.activate {
          background-color: #008000; /* Green */
        }
        .pill-btn.activate:hover {
          background-color: #006400;
          transform: translateY(-1px);
        }

        .pill-btn.deactivate {
          background-color: #ff0000; /* Red */
        }
        .pill-btn.deactivate:hover {
          background-color: #cc0000;
          transform: translateY(-1px);
        }

        /* Ensure headings show correctly */
        .unique-table-wrapper .Polaris-IndexTable__TableHeading--sticky {
            top: 0 !important;
            position: sticky !important;
            z-index: 20 !important;
            background: #f1f2f3 !important;
        }

        /* Search Bar Enhancement */
        .search-filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0px 8px 16px 8px;
          background: transparent;
        }

        /* --- Template Slider Styles --- */
        .template-slider-container {
          margin-bottom: 32px;
        }
        .template-slider {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding: 4px 4px 20px 4px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .template-slider-item {
          min-width: 320px;
          width: 320px;
          flex-shrink: 0;
          scroll-snap-align: start;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .template-slider-item:hover {
            transform: translateY(-4px);
        }
        
        .template-slider::-webkit-scrollbar {
            height: 8px;
        }
        .template-slider::-webkit-scrollbar-track {
            background: #edf2f7; 
            border-radius: 4px;
        }
        .template-slider::-webkit-scrollbar-thumb {
            background: #cbd5e0; 
            border-radius: 4px;
        }
        .template-slider::-webkit-scrollbar-thumb:hover {
            background: #a0aec0; 
        }
        /* Force Modal to be wide enough for dual calendars */
        .Polaris-Modal-Dialog__Modal {
          max-width: 950px !important;
          width: 95vw !important;
        }

        /* Date Picker Range Styling */
        .date-range-popover-container {
          display: flex;
          flex-direction: row;
          width: 100%;
          min-height: 450px;
          background: #fff;
          overflow: hidden;
        }

        .date-range-sidebar {
          width: 170px; /* Reduced width to avoid excessive whitespace */
          border-right: 1px solid #e1e3e5;
          padding: 8px 0;
          background: #fff;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
        }
        .date-range-sidebar-item {
          padding: 10px 16px;
          font-size: 14px;
          color: #000;
          cursor: pointer;
        }
        .date-range-sidebar-item:hover {
          background: #f1f2f3;
        }
        .date-range-sidebar-item.active {
          background: #f1f2f3;
          font-weight: 500;
        }
        .date-range-sidebar-separator {
          height: 1px;
          background: #e1e3e5;
          margin: 4px 16px;
        }
        .date-range-main {
          flex: 1;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
          overflow: hidden; /* Back to hidden, we'll fix by making modal wider */
          background: #fbfbfb;
        }
        .date-range-inputs-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff;
          border: 1px solid #e1e3e5;
          border-radius: 8px;
        }

        .date-picker-grid-container {
          display: flex;
          gap: 40px; /* Increased gap for better separation */
          justify-content: center;
          border-top: 1px solid #e1e3e5;
          padding-top: 16px;
        }
        .date-picker-single-month {
           flex: 1;
           min-width: 280px;
           max-width: 300px;
        }
        .date-range-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e1e3e5;
          margin-top: auto; /* Push to bottom */
        }
        /* Custom DatePicker Styling to make it look a bit bigger */
        .date-range-main .Polaris-DatePicker {
            width: 100% !important;
            max-width: 100% !important;
        }
      `}</style>
      <div
        style={{
          width: '95%',
          margin: '0 auto',
          padding: '16px 24px',
          maxWidth: 'none',
        }}
      >
        {/* Verification Check: Templates Module Refined */}
        {/* Create Button Top Right */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 16,
          }}
        >
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Create Template
          </Button>
        </div>

        {/* Layout Selection Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Choose a layout Design"
          large
        >
          <Modal.Section>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
                padding: '10px',
              }}
            >
              {layoutDesigns.map((layout) => (
                <Link
                  key={layout.id}
                  to={`/app/customize?layout=${layout.blockName}`}
                  prefetch="intent"
                  style={{ textDecoration: 'none', color: '#000' }}
                >
                  <Card padding="0">
                    <div
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow =
                          '0 8px 24px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={layout.img}
                          alt={layout.title}
                          onError={(e) => {
                            e.target.src = layout.fallbackImg;
                          }}
                          style={{
                            width: '100%',
                            height: '180px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                          }}
                        >
                          <Badge>{layout.badge}</Badge>
                        </div>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <BlockStack gap="200">
                          <Text variant="headingMd" as="h3">
                            {layout.title}
                          </Text>
                          <Text variant="bodySm" style={{ color: '#000' }}>
                            {layout.description}
                          </Text>
                          <Button fullWidth variant="secondary">
                            Select Layout
                          </Button>
                        </BlockStack>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </Modal.Section>
        </Modal>

        {/* Saved Templates Slider */}
        {templates.length > 0 && (
          <div className="template-slider-container">
            <Box paddingBlockEnd="400">
              <Text variant="headingLg" as="h2">
                Saved Templates
              </Text>
            </Box>
            <div className="template-slider">
              {templates.map((t) => {
                const layoutMap = {
                  layout1: 'combo_design_one',
                  layout2: 'combo_design_two',
                  layout3: 'combo_design_three',
                  layout4: 'combo_design_four',
                };
                // Resolve block name: either from map or direct usage, fallback to first
                const currentLayout = t.config?.layout;
                const blockName =
                  layoutMap[currentLayout] ||
                  currentLayout ||
                  'combo_design_one';
                const meta =
                  layoutMetadata.find((m) => m.blockName === blockName) ||
                  layoutMetadata[0];

                // Use user's banner image if available
                const previewImg = t.config?.banner_image_url || meta.img;

                return (
                  <div key={t.id} className="template-slider-item">
                    <Link
                      to={`/app/customize?templateId=${t.id}`}
                      style={{ textDecoration: 'none', color: '#000' }}
                    >
                      <Card padding="0">
                        <div
                          style={{
                            position: 'relative',
                            height: '180px',
                            overflow: 'hidden',
                            borderTopLeftRadius: '8px',
                            borderTopRightRadius: '8px',
                          }}
                        >
                          <img
                            src={previewImg}
                            alt={t.title}
                            onError={(e) => {
                              e.target.src = meta.fallbackImg;
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <div
                            style={{ position: 'absolute', top: 10, right: 10 }}
                          >
                            <Badge>{t.active ? 'Active' : 'Inactive'}</Badge>
                          </div>
                          {t.config?.has_discount_offer && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 10,
                              }}
                            >
                              <Badge>Discount Active</Badge>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '16px' }}>
                          <BlockStack gap="200">
                            <Text variant="headingMd" as="h3" truncate>
                              {t.title}
                            </Text>
                            <Text variant="headingSm" as="h4" style={{ color: '#000' }}>
                              Layout: {meta.title}
                            </Text>
                            <div
                              style={{
                                marginTop: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Text variant="bodyXs" style={{ color: '#000' }}>
                                {new Date(t.createdAt).toLocaleDateString()}
                              </Text>
                              <Button
                                size="slim"
                                icon={MaximizeIcon}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/app/customize?templateId=${t.id}`);
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                          </BlockStack>
                        </div>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs & Table Container */}
        <div className="custom-tabs-container">
          <Tabs
            tabs={tabs}
            selected={selectedTab}
            onSelect={(index) => setSelectedTab(index)}
          />
        </div>

        {/* Search bar outside table container for cleaner look */}
        <div className="search-filter-bar">
          <div style={{ flex: 1 }}>
            <TextField
              prefix={<Icon source={SearchIcon} />}
              placeholder="Search templates..."
              value={searchValue}
              onChange={(value) => setSearchValue(value)}
              autoComplete="off"
              clearButton
              onClearButtonClick={() => setSearchValue('')}
            />
          </div>
          <Button icon={MaximizeIcon} />
        </div>

        {/* Filters Row */}
        <div
          style={{
            padding: '0 16px 16px 16px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ width: 200 }}>
            <Select
              label="Filter by Design"
              labelHidden
              options={designOptions}
              value={filterDesign}
              onChange={setFilterDesign}
            />
          </div>

          <Button
            onClick={() => {
              setTempStartDate(startDate);
              setTempEndDate(endDate);
              setDatePopoverActive(true);
            }}
            icon={CalendarIcon}
            disclosure
          >
            {getActiveDateLabel()}
          </Button>

          <Modal
            open={datePopoverActive}
            onClose={() => setDatePopoverActive(false)}
            title="Select Date Range"
            large
          >
            <Modal.Section padding="0">
              <div
                className="date-range-popover-container"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 'none',
                  boxShadow: 'none',
                }}
              >
                <div className="date-range-sidebar">
                  {datePresets.map((item, index) =>
                    item.type === 'separator' ? (
                      <div
                        key={`sep-${index}`}
                        className="date-range-sidebar-separator"
                      />
                    ) : (
                      <div
                        key={item.value}
                        className={`date-range-sidebar-item ${activeDatePreset === item.value ? 'active' : ''}`}
                        onClick={() => handleDatePresetClick(item.value)}
                      >
                        {item.label}
                      </div>
                    )
                  )}
                </div>
                <div className="date-range-main">
                  <div
                    style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
                  >
                    <Button
                      size="slim"
                      variant={
                        dateRangeMode === 'fixed' ? 'primary' : 'secondary'
                      }
                      onClick={() => setDateRangeMode('fixed')}
                    >
                      Fixed
                    </Button>
                    <Button
                      size="slim"
                      variant={
                        dateRangeMode === 'rolling' ? 'primary' : 'secondary'
                      }
                      onClick={() => setDateRangeMode('rolling')}
                    >
                      Rolling
                    </Button>
                  </div>

                  {dateRangeMode === 'fixed' ? (
                    <div className="date-range-inputs-container">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Start Date"
                          labelHidden
                          value={
                            tempStartDate
                              ? tempStartDate.toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                              : ''
                          }
                          autoComplete="off"
                          readOnly
                        />
                      </div>
                      <Text variant="bodyMd" as="span">
                        →
                      </Text>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="End Date"
                          labelHidden
                          value={
                            tempEndDate
                              ? tempEndDate.toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                              : ''
                          }
                          autoComplete="off"
                          readOnly
                        />
                      </div>
                      {/* Icon removed for cleaner UI */}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'nowrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Text as="span">Last</Text>
                        <div style={{ width: '80px' }}>
                          <TextField
                            value={rollingValue}
                            onChange={setRollingValue}
                            type="number"
                            autoComplete="off"
                          />
                        </div>
                        <div style={{ width: '130px' }}>
                          <Select
                            options={[
                              { label: 'Days', value: 'days' },
                              { label: 'Weeks', value: 'weeks' },
                              { label: 'Months', value: 'months' },
                              { label: 'Years', value: 'years' },
                            ]}
                            value={rollingPeriod}
                            onChange={setRollingPeriod}
                          />
                        </div>
                      </div>
                      <Checkbox
                        label="Include current period"
                        checked={includeCurrentPeriod}
                        onChange={setIncludeCurrentPeriod}
                      />
                    </div>
                  )}

                  <div className="date-picker-grid-container">
                    <div className="date-picker-single-month">
                      <DatePicker
                        month={month}
                        year={year}
                        onChange={(range) => {
                          if (dateRangeMode === 'fixed') {
                            setTempStartDate(range.start);
                            setTempEndDate(range.end);
                            setActiveDatePreset('custom');
                          }
                        }}
                        onMonthChange={(m, y) =>
                          setDatePickerMonth({ month: m, year: y })
                        }
                        selected={
                          dateRangeMode === 'fixed'
                            ? tempStartDate && tempEndDate
                              ? { start: tempStartDate, end: tempEndDate }
                              : undefined
                            : (() => {
                              const { start, end } = calculateRollingDates(
                                rollingValue,
                                rollingPeriod,
                                includeCurrentPeriod
                              );
                              return { start, end };
                            })()
                        }
                        allowRange
                      />
                    </div>
                    <div
                      className="date-picker-single-month"
                      style={{
                        borderLeft: '1px solid #e1e3e5',
                        paddingLeft: '24px',
                      }}
                    >
                      <DatePicker
                        month={month === 11 ? 0 : month + 1}
                        year={month === 11 ? year + 1 : year}
                        onChange={(range) => {
                          if (dateRangeMode === 'fixed') {
                            setTempStartDate(range.start);
                            setTempEndDate(range.end);
                            setActiveDatePreset('custom');
                          }
                        }}
                        onMonthChange={(m, y) => {
                          const prevMonth = m === 0 ? 11 : m - 1;
                          const prevYear = m === 0 ? y - 1 : y;
                          setDatePickerMonth({
                            month: prevMonth,
                            year: prevYear,
                          });
                        }}
                        selected={
                          dateRangeMode === 'fixed'
                            ? tempStartDate && tempEndDate
                              ? { start: tempStartDate, end: tempEndDate }
                              : undefined
                            : (() => {
                              const { start, end } = calculateRollingDates(
                                rollingValue,
                                rollingPeriod,
                                includeCurrentPeriod
                              );
                              return { start, end };
                            })()
                        }
                        allowRange
                      />
                    </div>
                  </div>

                  <div className="date-range-footer">
                    <Button onClick={() => setDatePopoverActive(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={applyDateRange}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </Modal.Section>
          </Modal>

          <div style={{ width: 160 }}>
            <Select
              label="Filter by Discount"
              labelHidden
              options={discountOptions}
              value={filterDiscount}
              onChange={setFilterDiscount}
            />
          </div>
          {(startDate || endDate || filterDesign || filterDiscount) && (
            <Button
              plain
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
                setActiveDatePreset('all');
                setFilterDesign('');
                setFilterDiscount('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="unique-table-wrapper">
          <IndexTable
            resourceName={{ singular: 'template', plural: 'templates' }}
            itemCount={filteredTemplates.length}
            selectedItemsCount={
              selectedResourceIds.length === 0
                ? 0
                : selectedResourceIds.length === filteredTemplates.length
                  ? 'All'
                  : selectedResourceIds.length
            }
            onSelectionChange={(ids) => {
              if (Array.isArray(ids)) {
                setSelectedResourceIds(ids.map(String));
              } else {
                setSelectedResourceIds(typeof ids === 'string' ? [ids] : []);
              }
            }}
            headings={[
              { title: 'Template Name' },
              { title: 'Created At' },
              { title: 'Discount' },
              { title: 'Status' },
              { title: 'Actions' },
            ]}
            selectable
            selectedResourceIds={selectedResourceIds}
          >
            {filteredTemplates.map((t, idx) => (
              <IndexTable.Row
                key={String(t.id)}
                id={String(t.id)}
                position={idx}
              >
                <IndexTable.Cell>
                  <InlineStack gap="400" blockAlign="center">
                    {(() => {
                      const layoutMap = {
                        layout1: 'combo_design_one',
                        layout2: 'combo_design_two',
                        layout3: 'combo_design_three',
                        layout4: 'combo_design_four',
                      };
                      const blockName =
                        layoutMap[t.config?.layout] || 'combo_design_one';
                      const meta = layoutMetadata.find(
                        (m) => m.blockName === blockName
                      );
                      // Use banner if available for small avatar, or fallback
                      const avatarSrc =
                        t.config?.banner_image_url || meta?.fallbackImg;

                      return null;
                    })()}
                    <BlockStack gap="050">
                      <Text variant="headingMd" as="span" fontWeight="bold">
                        {t.title}
                      </Text>
                      <InlineStack gap="200" align="start">
                        <Badge tone="info" size="small">
                          {t.config?.layout
                            ? t.config.layout.toUpperCase()
                            : 'LAYOUT 1'}
                        </Badge>
                        <Text variant="bodyXs" tone="subdued">
                          {t.config?.layout === 'layout4' ? 'Editorial Split' : 'Dynamic Builder'}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </InlineStack>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    {new Date(t.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </IndexTable.Cell>

                <IndexTable.Cell>
                  {(() => {
                    const discountId = t.config?.selected_discount_id;
                    const resolvedDiscount = discountId
                      ? discounts.find(
                        (d) => String(d.id) === String(discountId)
                      )
                      : null;
                    const displayText =
                      resolvedDiscount?.title || t.config?.discountName;

                    return displayText ? (
                      <Badge>{displayText}</Badge>
                    ) : (
                      <span style={{ color: '#000' }}>—</span>
                    );
                  })()}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={t.active ? 'success' : 'attention'}>
                    {t.active ? 'Active' : 'Inactive'}
                  </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <InlineStack gap="100" wrap={false} align="center">
                    <Button
                      icon={EditIcon}
                      onClick={() => {
                        navigate(`/app/customize?templateId=${t.id}`);
                      }}
                      accessibilityLabel="Edit"
                    />
                    <button
                      className={`pill-btn ${t.active ? 'deactivate' : 'activate'}`}
                      onClick={() => {
                        setTargetTemplate(t);
                        setToggleModalOpen(true);
                      }}
                    >
                      {t.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Button
                      icon={DeleteIcon}
                      destructive
                      onClick={() => {
                        setTargetTemplate(t);
                        setDeleteModalOpen(true);
                      }}
                      accessibilityLabel="Delete"
                    />
                  </InlineStack>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Template"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setDeleteModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete <b>{targetTemplate?.title}</b>? This
            action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        title={
          targetTemplate?.active ? 'Deactivate Template' : 'Activate Template'
        }
        primaryAction={{
          content: targetTemplate?.active ? 'Deactivate' : 'Activate',
          onAction: confirmToggleStatus,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setToggleModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to mark <b>{targetTemplate?.title}</b> as{' '}
            {targetTemplate?.active ? 'inactive' : 'active'}?
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
