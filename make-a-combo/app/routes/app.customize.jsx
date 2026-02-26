import { useEffect, useState, useRef, memo, useCallback, useMemo } from 'react';
import { json } from '@remix-run/node';
import fs from 'fs';
import path from 'path';
import {
  useLoaderData,
  useFetcher,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  Button,
  ButtonGroup,
  Modal,
  ColorPicker,
  Popover,
  hexToRgb,
  Icon,
  Text,
  Tabs,
  BlockStack,
  Box,
} from '@shopify/polaris';
import {
  EditIcon,
  DesktopIcon,
  MobileIcon,
  LayoutColumns3Icon,
  PaintBrushFlatIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';

// --- Fake API Helpers ---
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

const saveFakeDiscounts = (discounts) => {
  try {
    let db = { templates: [], discounts: [] };
    if (fs.existsSync(FAKE_DB_PATH)) {
      db = JSON.parse(fs.readFileSync(FAKE_DB_PATH, 'utf-8'));
    }
    db.discounts = discounts;
    fs.writeFileSync(FAKE_DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing fake DB:', err);
  }
};

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const discountData = Object.fromEntries(formData);
    const discounts = getFakeDiscounts();

    if (!discountData.title || !discountData.value) {
      return json({ error: 'Title and value are required' }, { status: 400 });
    }

    // --- Fake API Creation ---
    const nextId = Math.max(...discounts.map((d) => d.id || 0), 0) + 1;
    const newDiscount = {
      id: nextId,
      title: discountData.title,
      code: discountData.code
        ? discountData.code.toUpperCase()
        : `CODE-${nextId}`,
      type: discountData.type,
      value: discountData.value,
      status: 'active',
      created: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      usage: '0 / Unlimited',
      startsAt: discountData.startsAt,
      endsAt: discountData.endsAt,
      oncePerCustomer: discountData.oncePerCustomer === 'on',
    };

    discounts.push(newDiscount);
    saveFakeDiscounts(discounts);

    console.log(`[Combo App Customize] Discount created: ${newDiscount.title}`);

    return json({
      success: true,
      message: 'Discount code created (Simulated)',
      discount: newDiscount,
    });
  } catch (error) {
    console.error('Discount creation error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
};

export const loader = async ({ request }) => {
  // Capture session to get shop domain
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const templateId = url.searchParams.get('templateId');

  const allDiscounts = getFakeDiscounts();
  const activeDiscounts = allDiscounts
    .filter((d) => d.status === 'active')
    .map((discount) => ({
      id: discount.id,
      title: discount.title,
      type: discount.type,
      status: discount.status,
      value: discount.value,
    }));

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

  const allTemplates = getFakeTemplates();
  // Filter by shop to ensure uniqueness within the same shop
  const shopTemplates = allTemplates.filter((t) => t.shop === shop);

  // Fetch shop pages for selection
  let shopPages = [];
  try {
    const pagesResponse = await admin.graphql(
      `#graphql
      query getPages {
        pages(first: 50) {
          nodes {
            id
            handle
            title
          }
        }
      }`
    );
    const pagesData = await pagesResponse.json();
    shopPages = pagesData.data.pages.nodes;
  } catch (e) {
    console.error('Error fetching pages:', e);
  }

  // Fetch all collections from Shopify using pagination
  let collections = [];
  try {
    console.log('[Customize] Fetching all collections from Shopify...');
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const query = `#graphql
        query getCollections($cursor: String) {
          collections(first: 250, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              handle
              productsCount {
                count
              }
            }
          }
        }`;

      const response = await admin.graphql(query, {
        variables: { cursor: endCursor },
      });

      const responseJson = await response.json();

      if (responseJson.errors) {
        console.error(
          '[Customize] GraphQL errors while fetching collections:',
          JSON.stringify(responseJson.errors, null, 2)
        );
        break;
      }

      const connection = responseJson.data?.collections;
      if (connection) {
        const nodes = connection.nodes || [];
        // Flatten productsCount if it returns as an object in some API versions, or handle if it's missing
        const mappedNodes = nodes.map((node) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          productsCount:
            typeof node.productsCount === 'object'
              ? node.productsCount?.count
              : node.productsCount,
        }));

        collections.push(...mappedNodes);
        hasNextPage = connection.pageInfo?.hasNextPage || false;
        endCursor = connection.pageInfo?.endCursor || null;
      } else {
        break;
      }
    }
    console.log(
      `[Customize] Successfully fetched ${collections.length} total collections`
    );
  } catch (e) {
    console.error('[Customize] Error fetching collections:', e);
    console.error('[Customize] Error details:', e.message, e.stack);
  }

  // Fetch products from Shopify
  let products = [];
  try {
    const productsResponse = await admin.graphql(
      `#graphql
      query getProducts {
        products(first: 50) {
          nodes {
            id
            title
            handle
            featuredMedia {
              preview {
                image {
                  url
                }
              }
            }
            variants(first: 1) {
              nodes {
                price
              }
            }
          }
        }
      }`
    );
    const productsData = await productsResponse.json();
    products = productsData.data.products.nodes;
  } catch (e) {
    console.error('Error fetching products:', e);
  }

  let initialTemplate = null;
  if (templateId) {
    initialTemplate =
      shopTemplates.find((t) => String(t.id) === String(templateId)) || null;
  }

  // Pass minimal info for validation
  const existingTemplates = shopTemplates.map((t) => ({
    id: t.id,
    title: t.title,
  }));

  console.log('[Customize] Loader returning data:');
  console.log('  - Collections:', collections.length);
  console.log('  - Products:', products.length);
  console.log('  - Shop:', shop);

  return json({
    activeDiscounts,
    layoutFiles,
    initialTemplate,
    shop,
    existingTemplates,
    shopPages,
    collections,
    products,
  });
};

// Simple PxField component
function PxField({
  label,
  value,
  onChange,
  min = 0,
  max = 2000,
  step = 1,
  suffix = 'px',
}) {
  const handle = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) {
      onChange(0);
      return;
    }
    const clamped = Math.max(min, Math.min(max, num));
    onChange(clamped);
  };
  return (
    <div className="compact-field">
      <div
        style={{
          marginBottom: 4,
          fontSize: '12px',
          fontWeight: 500,
          color: '#444',
        }}
      >
        {label}
      </div>
      <TextField
        type="number"
        value={String(value ?? 0)}
        onChange={handle}
        suffix={suffix}
        autoComplete="off"
        inputMode="numeric"
      />
    </div>
  );
}

// Helper to convert HSB to HEX
const hsbToHex = ({ hue, saturation, brightness }) => {
  const h = hue;
  const s = saturation;
  const b = brightness;
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return b - b * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
};

// Helper to convert HEX to HSB
const hexToHsb = (hex) => {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1]);
    g = parseInt('0x' + hex[2] + hex[2]);
    b = parseInt('0x' + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2]);
    g = parseInt('0x' + hex[3] + hex[4]);
    b = parseInt('0x' + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    brightness = cmax;
  let hue = 0,
    saturation = 0;

  if (delta === 0) hue = 0;
  else if (cmax === r) hue = ((g - b) / delta) % 6;
  else if (cmax === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  saturation = cmax === 0 ? 0 : delta / cmax;

  return { hue, saturation, brightness };
};

// CollapsibleCard helper component
const CollapsibleCard = ({ title, expanded, onToggle, children }) => {
  return (
    <div
      style={{
        border: '1px solid #e1e3e5',
        borderRadius: '8px',
        marginBottom: '12px',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          background: expanded ? '#f9fafb' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expanded ? '1px solid #e1e3e5' : 'none',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = expanded ? '#f9fafb' : '#fff')
        }
      >
        <span style={{ fontWeight: '600', fontSize: '14px', color: '#202223' }}>
          {title}
        </span>
        <span
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            display: 'inline-block',
            fontSize: '10px',
          }}
        >
          ▼
        </span>
      </div>
      {expanded && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
};

// Simple ColorPickerField component
function ColorPickerField({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState(hexToHsb(value || '#000000'));

  useEffect(() => {
    setColor(hexToHsb(value || '#000000'));
  }, [value]);

  const handleColorChange = (newColor) => {
    setColor(newColor);
    onChange(hsbToHex(newColor));
  };

  const togglePopover = () => setVisible(!visible);

  const activator = (
    <div onClick={(e) => e.stopPropagation()} className="compact-field">
      <div
        style={{
          marginBottom: 4,
          fontSize: '12px',
          fontWeight: 500,
          color: '#444',
        }}
      >
        {label}
      </div>
      <TextField
        value={value}
        onChange={(v) => {
          // allow manual hex entry
          onChange(v);
        }}
        autoComplete="off"
        prefix={
          <div
            role="button"
            onClick={togglePopover}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: value,
              border: '1px solid #d3d4d5',
              cursor: 'pointer',
            }}
          />
        }
      />
    </div>
  );

  return (
    <Popover
      active={visible}
      activator={activator}
      onClose={togglePopover}
      preferredAlignment="left"
    >
      <div style={{ padding: '16px' }}>
        <ColorPicker onChange={handleColorChange} color={color} />
      </div>
    </Popover>
  );
}

// Helper component to sync config to iframe
function PreviewSync({ config, device }) {
  useEffect(() => {
    const frame = document.getElementById('preview-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        { type: 'UPDATE_PREVIEW', config, device },
        '*'
      );
    }
  }, [config, device]);
  return null;
}

const DEFAULT_COMBO_CONFIG = {
  layout: 'layout1', // default layout
  product_add_btn_text: 'Add',
  product_add_btn_color: '#000',
  product_add_btn_text_color: '#fff',
  product_add_btn_font_size: 14,
  product_add_btn_font_weight: 600,
  has_discount_offer: false,
  selected_discount_id: null,
  buy_btn_text: 'Buy Now',
  buy_btn_color: '#000',
  buy_btn_text_color: '#fff',
  buy_btn_font_size: 14,
  buy_btn_font_weight: 600,
  add_to_cart_btn_text: 'Add to Cart',
  add_to_cart_btn_color: '#fff',
  add_to_cart_btn_text_color: '#000',
  add_to_cart_btn_font_size: 14,
  add_to_cart_btn_font_weight: 600,
  show_add_to_cart_btn: true,
  show_buy_btn: true,
  // New UI Settings
  show_progress_bar: true,
  progress_bar_color: '#000000',
  selection_highlight_color: '#000000',
  show_selection_tick: true,
  product_card_variants_display: 'popup', // hover, static, popup
  show_quantity_selector: true,
  show_sticky_preview_bar: true,
  grid_layout_type: 'grid', // grid, slider
  // Progress bar defaults
  desktop_columns: '3', // 3 columns by default for desktop
  mobile_columns: '2', // 2 columns by default for mobile
  container_padding_top_desktop: 24, // default container padding
  container_padding_right_desktop: 24,
  container_padding_bottom_desktop: 24,
  container_padding_left_desktop: 24,
  container_padding_top_mobile: 16,
  container_padding_right_mobile: 12,
  container_padding_bottom_mobile: 16,
  container_padding_left_mobile: 12,
  show_banner: true, // show banner by default
  banner_image_url: '',
  banner_image_mobile_url: '',
  banner_width_desktop: 100,
  banner_width_mobile: 100,
  banner_height_desktop: 180, // default desktop banner height for preview
  banner_height_mobile: 120, // default mobile banner height for preview
  preview_bg_color: '#ffffff', // white default
  preview_text_color: '#222', // dark text default
  preview_item_border_color: '#e1e3e5',
  preview_height: 70,
  bg_color: '#ffffff',
  text_color: '#1a1a1a',
  discount_percentage: 20,
  preview_font_size: 16,
  preview_font_weight: 600,
  preview_align_items: 'center',
  preview_alignment: 'center',
  preview_alignment_mobile: 'center',
  preview_item_shape: 'rectangle',
  preview_item_size: 56,
  preview_item_padding: 12,
  preview_item_padding_top: 10,
  preview_bar_full_width: true,
  preview_bar_padding_top: 16,
  preview_item_color: '#000',
  max_selections: 5,
  preview_bar_padding_bottom: 16,
  show_preview_bar: true,
  // New Button Customization Defaults
  add_btn_text: 'Add',
  add_btn_bg: '#000000',
  add_btn_text_color: '#ffffff',
  checkout_btn_text: 'Proceed to Checkout',
  checkout_btn_bg: '#000000', // for layout/main
  checkout_btn_text_color: '#ffffff', // for layout/main
  preview_bar_button_bg: '#ffffff', // for design 4 preview
  preview_bar_button_text: '#000000', // for design 4 preview
  // New Price Styling Defaults
  original_price_size: 14,
  discounted_price_size: 18,
  // New Layout Width Defaults
  container_width: 1200,
  title_width: 100,
  banner_width: 100,
  grid_width: 100,
  tabs_width: 100,
  progress_bar_width: 100,

  // Inline (default) preview bar settings
  preview_bar_width: 100,
  preview_bar_bg: '#fff',
  preview_bar_text_color: '#222',
  preview_bar_height: 70,
  preview_bar_text: 'Checkout',
  preview_bar_padding: 16,
  // Sticky preview bar settings
  sticky_preview_bar_full_width: true,
  sticky_preview_bar_width: '100%',
  sticky_preview_bar_bg: '#fff',
  sticky_preview_bar_text_color: '#222',
  sticky_preview_bar_height: 70,
  sticky_preview_bar_text: 'Checkout',
  sticky_preview_bar_padding: 16,
  sticky_checkout_btn_text: 'Checkout',
  sticky_checkout_btn_bg: '#000000',
  sticky_checkout_btn_text_color: '#ffffff',
  show_products_grid: true, // show product grid by default
  product_image_height_desktop: 250, // revert to 250 as per liquid default
  product_image_height_mobile: 200, // revert to 200
  // Title & Description defaults
  show_title_description: true,
  collection_title: 'Create Your Combo',
  collection_description: 'Select items to build your perfect bundle.',
  heading_align: 'left',
  heading_size: 28,
  heading_color: '#333333',
  heading_font_weight: '700', // Bold by default for titles
  description_align: 'left',
  description_size: 15,
  description_color: '#666666',
  description_font_weight: '400', // Normal by default for descriptions
  title_container_padding_top: 0,
  title_container_padding_right: 0,
  title_container_padding_bottom: 0,
  title_container_padding_left: 0,
  description_container_padding_top: 0,
  description_container_padding_right: 0,
  description_container_padding_bottom: 0,
  description_container_padding_left: 0,
  limit_reached_message: 'Limit reached! You can only select {{limit}} items.',
  tab_all_label: 'Collections',
  // Show the "All/Collections" tab by default so Combo Design Two
  // has a visible and working collections tab in the preview layout.
  show_tab_all: true,
  tab_count: 4,
  progress_text: '',
  discount_threshold: 5,
  // Product Card Typography
  product_title_size_desktop: 15,
  product_title_size_mobile: 13,
  product_price_size_desktop: 15,
  product_price_size_mobile: 13,
  product_card_padding: 10,
  products_gap: 12,
  // Layout 3 defaults
  primary_color: '#000000',
  hero_image_url: '',
  hero_title: 'Mega Breakfast Bundle',
  hero_subtitle: 'Milk, Bread, Eggs, Cereal & Juice',
  hero_price: '$14.99',
  hero_compare_price: '$24.50',
  hero_btn_text: 'Add to Cart - Save 38%',
  show_hero: true,
  timer_hours: 2,
  timer_minutes: 45,
  timer_seconds: 12,
  banner_fit_mode: 'cover', // cover, contain, adapt
  banner_full_width: false,
  // Banner Slider Settings
  enable_banner_slider: true,
  slider_speed: 5,
  banner_1_image: 'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455',
  banner_1_title: 'Fresh Farm Produce',
  banner_1_subtitle: 'Get 20% off on all organic items',
  banner_2_image: 'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-fruits.jpg?v=1614349455',
  banner_2_title: 'Seasonal Fruits',
  banner_2_subtitle: 'Picked fresh from the orchard',
  banner_3_image: 'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables.jpg?v=1614349455',
  banner_3_title: 'Green Wellness',
  banner_3_subtitle: 'Healthy greens for a healthy life',
  // Advanced Timer & Bundle Settings
  auto_reset_timer: true,
  change_bundle_on_timer_end: true,
  bundle_titles: 'Mega Breakfast,Healthy Lunch,Organic Dinner',
  bundle_subtitles: 'Start your day right,Stay energized all day,Clean eating for tonight',
  discount_motivation_text: 'Add {{remaining}} more items to unlock the discount!',
  discount_unlocked_text: 'Discount Unlocked!',
};

export default function Customize() {
  const shopify = useAppBridge();
  const {
    activeDiscounts = [],
    layoutFiles = [],
    initialTemplate = null,
    shop,
    existingTemplates = [],
    shopPages = [],
    collections = [],
    products = [],
  } = useLoaderData();
  const discountFetcher = useFetcher();
  const saveFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (saveFetcher.data?.success) {
      shopify.toast.show(
        saveFetcher.data.message || 'Template saved successfully!'
      );

      // Determine if we should navigate
      const submission = saveFetcher.submission;
      if (submission) {
        const bodyStr = submission.formData?.get('body');
        if (bodyStr) {
          const body = JSON.parse(bodyStr);
          // If we're just toggling active status, don't navigate away
          if (body.data && body.data.active !== undefined && Object.keys(body.data).length === 1) {
            return;
          }
        }
      }

      navigate('/app/templates');
    } else if (saveFetcher.data?.error) {
      shopify.toast.show(`Failed to save: ${saveFetcher.data.error}`, {
        isError: true,
      });
    }
  }, [saveFetcher.data, shopify, navigate]);

  const [config, setConfig] = useState(() => ({
    ...DEFAULT_COMBO_CONFIG,
    ...(initialTemplate?.config || {}),
  }));

  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState(
    initialTemplate?.title || 'Untitled Template'
  );
  const [publishToPage, setPublishToPage] = useState(true);
  const [targetPageTitle, setTargetPageTitle] = useState('About Us');
  const [targetPageHandle, setTargetPageHandle] = useState('about-us');
  const [publishType, setPublishType] = useState('new'); // "new" or "existing"
  const [selectedPageId, setSelectedPageId] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isActive, setIsActive] = useState(initialTemplate?.active || false);

  useEffect(() => {
    // Auto-generate handle from template title if it's not "About Us"
    if (
      saveTitle &&
      saveTitle !== 'Untitled Template' &&
      targetPageTitle === 'About Us'
    ) {
      const slug = saveTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setTargetPageTitle(saveTitle);
      setTargetPageHandle(slug);
    }
  }, [saveTitle]);

  const handleTitleChange = (value) => {
    setSaveTitle(value);
    if (titleError) setTitleError('');
  };
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState('layout'); // layout, style, advanced
  const [activeTab, setActiveTab] = useState('all');
  const [productsLoading, setProductsLoading] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    banner: false,
    content: false,
    products: false,
    productCard: false,
    variants: false,
    previewBar: false,
    discount: false,
    progressBar: false,
    stickyCheckoutBtn: false,
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Sync state if initialTemplate changes (e.g. when navigating between templates)
  useEffect(() => {
    if (initialTemplate) {
      console.log('Loading template:', initialTemplate.title);
      setConfig({
        ...DEFAULT_COMBO_CONFIG,
        ...(initialTemplate.config || {}),
      });
      setSaveTitle(initialTemplate.title || 'Untitled Template');
      setIsActive(initialTemplate.active || false);
      setFormKey((prev) => prev + 1);
    } else {
      const templateId = searchParams.get('templateId');
      if (!templateId) {
        // Only reset to defaults if we aren't trying to load a template
        setConfig({ ...DEFAULT_COMBO_CONFIG });
        setSaveTitle('Untitled Template');
        setFormKey((prev) => prev + 1);
      }
    }
  }, [initialTemplate, searchParams]);

  const [selectedVariants, setSelectedVariants] = useState({});

  // Debug: Log collections data
  useEffect(() => {
    console.log('[Customize Frontend] Collections received:', collections);
    console.log(
      '[Customize Frontend] Collections count:',
      collections?.length || 0
    );
  }, [collections]);

  // Fetch real Shopify products with variants at parent level for speed
  const [shopifyProducts, setShopifyProducts] = useState([]);
  useEffect(() => {
    const fetchProducts = () => {
      let handle = config.collection_handle || config.step_1_collection;

      if (config.layout === 'layout2') {
        // If "all" is selected, we fetch all products (empty handle)
        // Otherwise we fetch by the handle of the selected collection tab
        handle = activeTab === 'all' ? '' : activeTab;
      }

      const url =
        handle && handle !== ''
          ? `/api/products?handle=${handle}`
          : `/api/products`;

      console.log(
        `[Customize DEBUG] Fetching. Tab: "${activeTab}", Handle: "${handle}", URL: ${url}`
      );
      setProductsLoading(true);

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          console.log(`[Customize DEBUG] Success. Count: ${data?.length || 0}`);
          setShopifyProducts(Array.isArray(data) ? data : []);
          setProductsLoading(false);
        })
        .catch((err) => {
          console.error('[Customize DEBUG] Error:', err);
          setShopifyProducts([]);
          setProductsLoading(false);
        });
    };

    fetchProducts();
  }, [
    config.collection_handle,
    config.layout,
    activeTab,
    config.col_1,
    config.col_2,
    config.col_3,
    config.col_4,
    config.col_5,
    config.col_6,
    config.col_7,
    config.col_8,
  ]);

  // Preview scaling logic with debouncing
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    let resizeTimeout = null;
    const updateWidth = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }, 150); // Debounce resize events
    };
    // Initial and listener
    window.addEventListener('resize', updateWidth);
    // Timeout to ensure layout is painted
    const timer = setTimeout(updateWidth, 100);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);

  // Discount modal state
  const [createDiscountModalOpen, setCreateDiscountModalOpen] = useState(false);
  const [dTitle, setDTitle] = useState('');
  const [dCode, setDCode] = useState('');
  const [dType, setDType] = useState('percentage');
  const [dValue, setDValue] = useState('');
  const [dStartsAt, setDStartsAt] = useState('');
  const [dEndsAt, setDEndsAt] = useState('');
  const [dOncePerCustomer, setDOncePerCustomer] = useState(false);
  const [dAutoApply, setDAutoApply] = useState(false);
  const [localActiveDiscounts, setLocalActiveDiscounts] =
    useState(activeDiscounts);

  // Sync local discounts with loader data (fetched from API)
  useEffect(() => {
    setLocalActiveDiscounts(activeDiscounts);
  }, [activeDiscounts]);

  // Handle layout parameter from URL
  useEffect(() => {
    const layoutParam = searchParams.get('layout');
    console.log('URL layout parameter:', layoutParam);

    if (layoutParam) {
      // Map blockName to layout value
      const layoutMap = {
        combo_design_one: 'layout1',
        combo_design_two: 'layout2',
        combo_design_three: 'layout3',
        combo_design_four: 'layout4',
        custom_bundle_layout: 'layout1', // Default fallback
      };

      const mappedLayout = layoutMap[layoutParam] || 'layout1';
      console.log('Mapped layout:', mappedLayout);

      setConfig((prev) => ({
        ...prev,
        layout: mappedLayout,
      }));
    }
  }, [searchParams]);

  // Ensure activeTab is valid for Layout 2 if "All" is hidden
  useEffect(() => {
    if (
      config.layout === 'layout2' &&
      !config.show_tab_all &&
      activeTab === 'all'
    ) {
      const firstCol =
        config.col_1 ||
        config.col_2 ||
        config.col_3 ||
        config.col_4 ||
        config.col_5 ||
        config.col_6 ||
        config.col_7 ||
        config.col_8;
      if (firstCol) {
        setActiveTab(firstCol);
      }
    }
  }, [
    config.layout,
    config.show_tab_all,
    activeTab,
    config.col_1,
    config.col_2,
    config.col_3,
    config.col_4,
    config.col_5,
    config.col_6,
    config.col_7,
    config.col_8,
  ]);

  // Handle discount creation response
  useEffect(() => {
    if (discountFetcher.data) {
      if (discountFetcher.data.success) {
        shopify.toast.show('Discount created successfully on Shopify!');

        setLocalActiveDiscounts((prev) => {
          const fromServer = discountFetcher.data.discount;
          const nextId = fromServer?.id
            ? Number(fromServer.id)
            : Math.max(...prev.map((d) => d.id || 0), 0) + 1;
          const newDiscount = fromServer ?? {
            id: nextId,
            title: dTitle,
            type: dType,
          };
          updateConfig('selected_discount_id', nextId);
          updateConfig('has_discount_offer', true);
          return [...prev, newDiscount];
        });

        // Reset form and close modal
        setDTitle('');
        setDCode('');
        setDType('percentage');
        setDValue('');
        setDStartsAt('');
        setDEndsAt('');
        setDOncePerCustomer(false);
        setDAutoApply(false);
        setCreateDiscountModalOpen(false);
      } else if (discountFetcher.data.error) {
        shopify.toast.show(discountFetcher.data.error, { isError: true });
      }
    }
    // Dependency MUST NOT include form fields, otherwise typing triggers this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountFetcher.data, shopify]);

  const updateConfig = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateBoth = useCallback((keyA, keyB, value) => {
    setConfig((prev) => ({ ...prev, [keyA]: value, [keyB]: value }));
  }, []);

  const confirmSaveTemplate = async () => {
    const templateTitle = (saveTitle || 'Untitled Template').trim();

    // Check for duplicate title
    const isDuplicate = existingTemplates.some((t) => {
      // If we are strictly creating a NEW template, checking against ALL is correct.
      // However, if we assume editing (same ID) is allowed to keep same name:
      if (initialTemplate && String(t.id) === String(initialTemplate.id))
        return false;
      return t.title.toLowerCase() === templateTitle.toLowerCase();
    });

    if (isDuplicate) {
      setTitleError('This name is already used. Please choose a new name.');
      // Ensure modal is open if we are triggering save from there (it is),
      // Ensure modal is open if we are triggering save from there (it is),
      // but also if we triggered from elsewhere we might need to show where the error is.
      // The error is bound to the TextField, so it will show up.
      return;
    }

    if (!saveTitle) {
      setTitleError('Please enter a template title');
      return;
    }

    // Close modal immediately
    setSaveModalOpen(false);
    shopify.toast.show(`Saving "${saveTitle}"...`);

    const isEditing = !!initialTemplate;
    const body = {
      resource: 'templates',
      action: isEditing ? 'update' : 'create',
      id: isEditing ? initialTemplate.id : undefined,
      data: {
        title: saveTitle,
        config,
      },
      // Always publish to a page when saving a template
      publishParams: {
        title: targetPageTitle,
        handle: targetPageHandle,
        publishType: publishType,
        selectedPageId: selectedPageId,
      },
    };

    const formData = new FormData();
    formData.append('body', JSON.stringify(body));

    saveFetcher.submit(formData, {
      method: 'POST',
      action: '/api/templates',
    });
  };

  const handleToggleActive = () => {
    if (!initialTemplate) {
      shopify.toast.show('Please save your template first before activating.', {
        isError: true,
      });
      return;
    }

    const newActiveState = !isActive;
    setIsActive(newActiveState);

    const body = {
      resource: 'templates',
      action: 'update',
      id: initialTemplate.id,
      data: {
        active: newActiveState,
      },
    };

    const formData = new FormData();
    formData.append('body', JSON.stringify(body));

    saveFetcher.submit(formData, {
      method: 'POST',
      action: '/api/templates',
    });
  };

  const handleCreateDiscount = () => {
    if (!dTitle || !dValue) {
      shopify.toast.show(
        'Please fill in all required fields (Title and Value)',
        {
          isError: true,
        }
      );
      return;
    }

    const formData = new FormData();
    formData.append('title', dTitle);
    formData.append('code', dCode || dTitle.toUpperCase().replace(/\s+/g, ''));
    formData.append('type', dType);
    formData.append('value', dValue);
    formData.append('startsAt', dStartsAt || new Date().toISOString());
    formData.append('endsAt', dEndsAt || '');
    formData.append('oncePerCustomer', dOncePerCustomer ? 'on' : 'off');

    discountFetcher.submit(formData, { method: 'post' });
  };

  return (
    <Page
      title="Customize Template"
      titleMetadata={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 20 }}>
            <Icon source={EditIcon} tone="base" />
          </div>
          <div
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              background: isActive ? '#eafff2' : '#f4f6f8',
              color: isActive ? '#008060' : '#5c6ac4',
              border: isActive ? '1px solid #008060' : '1px solid #5c6ac4',
            }}
          >
            {isActive ? 'Active' : 'Draft'}
          </div>
        </div>
      }
      primaryAction={{
        content: 'Save Template',
        onAction: () => setSaveModalOpen(true),
      }}
      secondaryActions={[
        {
          content: isActive ? 'Deactivate' : 'Activate',
          onAction: handleToggleActive,
          outline: true,
          primary: !isActive,
        },
        {
          content: 'Reset to Default',
          onAction: () => setResetModalOpen(true),
        },
      ]}
    >
      <div style={{ marginBottom: '10px' }}></div>
      <Modal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Template"
        primaryAction={{ content: 'Save', onAction: confirmSaveTemplate }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setSaveModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Template Title"
              value={saveTitle}
              onChange={handleTitleChange}
              autoComplete="off"
              error={titleError}
            />
            <Checkbox
              label="Automatically create/update a Shopify Page for this combo"
              checked={publishToPage}
              onChange={setPublishToPage}
              helpText="This will link your combo design to a specific page on your store."
            />
            {publishToPage && (
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f6f6f7',
                  borderRadius: 8,
                }}
              >
                <FormLayout>
                  <ButtonGroup segmented fullWidth>
                    <Button
                      pressed={publishType === 'new'}
                      onClick={() => setPublishType('new')}
                    >
                      Create New Page
                    </Button>
                    <Button
                      pressed={publishType === 'existing'}
                      onClick={() => setPublishType('existing')}
                    >
                      Use Existing Page
                    </Button>
                  </ButtonGroup>

                  {publishType === 'new' ? (
                    <>
                      <TextField
                        label="Target Page Title"
                        value={targetPageTitle}
                        onChange={setTargetPageTitle}
                        autoComplete="off"
                      />
                      <TextField
                        label="Target Page Handle (URL slug)"
                        value={targetPageHandle}
                        onChange={setTargetPageHandle}
                        autoComplete="off"
                        prefix="/pages/"
                      />
                    </>
                  ) : (
                    <Select
                      label="Select an existing page"
                      options={[
                        { label: 'Select a page...', value: '' },
                        ...shopPages.map((p) => ({
                          label: p.title,
                          value: p.id,
                        })),
                      ]}
                      value={selectedPageId}
                      onChange={(id) => {
                        setSelectedPageId(id);
                        const page = shopPages.find((p) => p.id === id);
                        if (page) {
                          setTargetPageTitle(page.title);
                          setTargetPageHandle(page.handle);
                        }
                      }}
                    />
                  )}
                </FormLayout>
              </div>
            )}
            <p style={{ color: '#666', marginTop: 4 }}>
              Confirm to save the current customization as a template.
            </p>
          </FormLayout>
        </Modal.Section>
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Template"
        primaryAction={{
          content: 'Reset',
          destructive: true,
          onAction: () => {
            console.log('Resetting to factory defaults');
            setConfig({ ...DEFAULT_COMBO_CONFIG });
            setSaveTitle(
              DEFAULT_COMBO_CONFIG.collection_title || 'Untitled Template'
            );
            setFormKey((prev) => prev + 1);
            setResetModalOpen(false);
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setResetModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <p>
            Are you sure you want to reset all settings to default? This action
            cannot be undone.
          </p>
        </Modal.Section>
      </Modal>

      <div
        key={formKey}
        style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: '10px' }}
      >
        <div>
          <div style={{ position: 'sticky', top: 16, zIndex: 10 }}>
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Template Title"
                  value={saveTitle}
                  onChange={handleTitleChange}
                  autoComplete="off"
                  helpText="This is the name of your saved template."
                  error={titleError}
                />
              </FormLayout>
            </Card>
            <div style={{ marginTop: '10px' }}></div>
            <Card title="Preview" sectioned>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <ButtonGroup segmented>
                  <Button
                    icon={DesktopIcon}
                    pressed={previewDevice === 'desktop'}
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    Desktop
                  </Button>
                  <Button
                    icon={MobileIcon}
                    pressed={previewDevice === 'mobile'}
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    Mobile
                  </Button>
                </ButtonGroup>
              </div>
              <div
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '100%',
                  height: previewDevice === 'mobile' ? '667px' : 'auto',
                  aspectRatio: previewDevice === 'desktop' ? '16 / 9' : 'auto',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  background: '#fff',
                  margin: '0 auto', // Center it

                  // Device Frame Styles
                  border: '1px solid #e1e3e5',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',

                  transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  position: 'relative',
                }}
                className="preview-device-container"
              >
                <ComboPreview
                  config={config}
                  device={previewDevice}
                  products={shopifyProducts}
                  collections={collections}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isLoading={productsLoading}
                  activeDiscounts={localActiveDiscounts}
                  selectedVariants={selectedVariants}
                  setSelectedVariants={setSelectedVariants}
                />
              </div>
            </Card>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e1e3e5',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 40px)',
            maxHeight: 'calc(100vh - 40px)',
          }}
        >
          {/* Top Category Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e1e3e5',
              background: '#fff',
              userSelect: 'none',
            }}
          >
            {[
              { id: 'layout', label: 'Layout', icon: LayoutColumns3Icon },
              { id: 'style', label: 'Style', icon: PaintBrushFlatIcon },
              { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
            ].map((cat) => (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  borderBottom:
                    activeCategory === cat.id
                      ? '3px solid #000000'
                      : '3px solid transparent',
                  color: activeCategory === cat.id ? '#000000' : '#6d7175',
                  transition: 'all 0.2s ease',
                  fontWeight: activeCategory === cat.id ? '600' : '400',
                }}
              >
                <div
                  style={{
                    color: activeCategory === cat.id ? '#000000' : '#8c9196',
                  }}
                >
                  <Icon
                    source={cat.icon}
                    color={activeCategory === cat.id ? 'brand' : 'subdued'}
                  />
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                >
                  {cat.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '16px',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
            }}
          >
            {activeCategory === 'layout' && (
              <>
                {/* Layout 1 Specific: Multi-Step Settings */}
                {config.layout === 'layout1' && (
                  <CollapsibleCard
                    title="Steps & Collections"
                    expanded={expandedSections.general}
                    onToggle={() => toggleSection('general')}
                  >
                    <FormLayout>
                      <div style={{ marginBottom: 12 }}>
                        <Text variant="headingSm" as="h6">
                          Collection Configuration
                        </Text>
                        <p style={{ fontSize: '13px', color: '#666' }}>
                          Configure the collections for your "Build Your Box"
                          flow. The number of collections is tied to the items
                          required for the discount.
                        </p>
                      </div>

                      <div
                        style={{
                          background: '#f4f6f8',
                          padding: '16px',
                          borderRadius: '8px',
                          marginBottom: '20px',
                          border: '1px solid #e1e3e5',
                        }}
                      >
                        <Text
                          variant="bodyMd"
                          as="p"
                          fontWeight="bold"
                          style={{ marginBottom: '8px' }}
                        >
                          Bundle Rule
                        </Text>
                        <FormLayout.Group>
                          <TextField
                            label="Items to Unlock Discount (Combo Size)"
                            type="number"
                            value={String(config.discount_threshold || 5)}
                            onChange={(v) =>
                              updateConfig(
                                'discount_threshold',
                                Math.max(1, Number(v))
                              )
                            }
                            autoComplete="off"
                            helpText="This defines the number of products (collections) in your combo."
                          />
                          <TextField
                            label="Discount Label"
                            value={config.discount_text || '20% OFF'}
                            onChange={(v) => updateConfig('discount_text', v)}
                            autoComplete="off"
                            helpText="Text shown on progress bar"
                          />
                        </FormLayout.Group>
                      </div>

                      {[...Array(Number(config.discount_threshold || 5))].map(
                        (_, index) => {
                          const step = index + 1;
                          return (
                            <div
                              key={step}
                              style={{
                                background: '#f9fafb',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                border: '1px solid #e1e3e5',
                              }}
                            >
                              <Text
                                variant="bodyMd"
                                as="p"
                                fontWeight="bold"
                                style={{ marginBottom: '8px' }}
                              >
                                Collection {step}
                              </Text>
                              <FormLayout>
                                <FormLayout.Group>
                                  <TextField
                                    label="Title"
                                    value={config[`step_${step}_title`] || ''}
                                    onChange={(v) =>
                                      updateConfig(`step_${step}_title`, v)
                                    }
                                    autoComplete="off"
                                    placeholder={`e.g. ${step === 1 ? 'Cleanser' : step === 2 ? 'Toner' : 'Product'}`}
                                  />
                                  <TextField
                                    label="Subtitle"
                                    value={
                                      config[`step_${step}_subtitle`] || ''
                                    }
                                    onChange={(v) =>
                                      updateConfig(`step_${step}_subtitle`, v)
                                    }
                                    autoComplete="off"
                                    placeholder="e.g. Select one"
                                  />
                                </FormLayout.Group>
                                <FormLayout.Group>
                                  <Select
                                    label="Collection"
                                    options={[
                                      {
                                        label: '-- Choose a collection --',
                                        value: '',
                                      },
                                      ...(collections || []).map((col) => ({
                                        label: col.title,
                                        value: col.handle,
                                      })),
                                    ]}
                                    value={
                                      config[`step_${step}_collection`] || ''
                                    }
                                    onChange={(v) =>
                                      updateConfig(`step_${step}_collection`, v)
                                    }
                                  />
                                  <TextField
                                    label="Selection Limit"
                                    type="number"
                                    value={String(
                                      config[`step_${step}_limit`] || 1
                                    )}
                                    onChange={(v) =>
                                      updateConfig(
                                        `step_${step}_limit`,
                                        Math.max(1, Number(v))
                                      )
                                    }
                                    autoComplete="off"
                                    helpText="Max items from this category"
                                  />
                                </FormLayout.Group>
                              </FormLayout>
                            </div>
                          );
                        }
                      )}
                    </FormLayout>
                  </CollapsibleCard>
                )}

                {/* Layout 2 Specific: Multiple Collection Tabs */}
                {config.layout === 'layout2' && (
                  <CollapsibleCard
                    title="Collections (Switching Tabs)"
                    expanded={expandedSections.general}
                    onToggle={() => toggleSection('general')}
                  >
                    <FormLayout>
                      <div style={{ marginBottom: 12 }}>
                        <Text variant="headingSm" as="h6">
                          Collection Configuration
                        </Text>
                        <p style={{ fontSize: '13px', color: '#666' }}>
                          Select up to 8 collections. They will appear as
                          switching tabs in Template Two.
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '20px',
                          alignItems: 'center',
                          marginBottom: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Checkbox
                          label="Show 'All/Collections' Tab"
                          checked={!!config.show_tab_all}
                          onChange={(v) => updateConfig('show_tab_all', v)}
                        />
                        <TextField
                          label="First Tab Label"
                          value={config.tab_all_label || 'Collections'}
                          onChange={(v) => updateConfig('tab_all_label', v)}
                          autoComplete="off"
                        />
                      </div>
                      <PxField
                        label="Tabs Section Width (%)"
                        value={config.tabs_width}
                        onChange={(v) => updateConfig('tabs_width', v)}
                        min={10}
                        max={100}
                        suffix="%"
                        helpText="Adjust how much of the screen width the tabs should use"
                      />
                      <div style={{ marginBottom: 12 }}>
                        <TextField
                          label="Number of Collections"
                          type="number"
                          value={String(config.tab_count || 4)}
                          onChange={(v) => updateConfig('tab_count', Number(v))}
                          min={1}
                          max={8}
                          autoComplete="off"
                        />
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: '12px',
                          marginTop: '12px',
                        }}
                      >
                        {[...Array(config.tab_count || 4)].map((_, index) => {
                          const i = index + 1;
                          return (
                            <Select
                              key={i}
                              label={`Collection ${i}`}
                              options={[
                                { label: '-- None --', value: '' },
                                ...(collections || []).map((col) => ({
                                  label: col.title,
                                  value: col.handle,
                                })),
                              ]}
                              value={config[`col_${i}`] || ''}
                              onChange={(v) => updateConfig(`col_${i}`, v)}
                            />
                          );
                        })}
                      </div>
                    </FormLayout>
                  </CollapsibleCard>
                )}

                {/* Layout 3 Specific: FMCG / Instamart Style */}
                {config.layout === 'layout3' && (
                  <>
                    <CollapsibleCard
                      title="Hero Deal Card"
                      expanded={expandedSections.hero}
                      onToggle={() => toggleSection('hero')}
                    >
                      <FormLayout>
                        <Checkbox
                          label="Show Deal of the Day"
                          checked={config.show_hero !== false}
                          onChange={(v) => updateConfig('show_hero', v)}
                        />
                        {config.show_hero !== false && (
                          <>
                            <TextField
                              label="Hero Image URL"
                              value={config.hero_image_url || ''}
                              onChange={(v) =>
                                updateConfig('hero_image_url', v)
                              }
                              autoComplete="off"
                              placeholder="https://example.com/image.jpg"
                            />
                            <TextField
                              label="Hero Title"
                              value={
                                config.hero_title || 'Mega Breakfast Bundle'
                              }
                              onChange={(v) => updateConfig('hero_title', v)}
                              autoComplete="off"
                            />
                            <TextField
                              label="Hero Subtitle"
                              value={
                                config.hero_subtitle ||
                                'Milk, Bread, Eggs, Cereal & Juice'
                              }
                              onChange={(v) => updateConfig('hero_subtitle', v)}
                              autoComplete="off"
                            />
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                              }}
                            >
                              <TextField
                                label="Hero Price"
                                value={config.hero_price || '$14.99'}
                                onChange={(v) => updateConfig('hero_price', v)}
                                autoComplete="off"
                              />
                              <TextField
                                label="Compare Price"
                                value={config.hero_compare_price || '$24.50'}
                                onChange={(v) =>
                                  updateConfig('hero_compare_price', v)
                                }
                                autoComplete="off"
                              />
                            </div>
                            <TextField
                              label="Button Text"
                              value={
                                config.hero_btn_text || 'Add to Cart - Save 38%'
                              }
                              onChange={(v) => updateConfig('hero_btn_text', v)}
                              autoComplete="off"
                            />
                            <div style={{ marginTop: 12 }}>
                              <Text variant="headingSm" as="h6">
                                Countdown Timer
                              </Text>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr 1fr',
                                  gap: '12px',
                                  marginTop: '8px',
                                }}
                              >
                                <RangeSlider
                                  label="Hours"
                                  value={config.timer_hours || 2}
                                  onChange={(v) =>
                                    updateConfig('timer_hours', v)
                                  }
                                  min={0}
                                  max={23}
                                  output
                                />
                                <RangeSlider
                                  label="Minutes"
                                  value={config.timer_minutes || 45}
                                  onChange={(v) =>
                                    updateConfig('timer_minutes', v)
                                  }
                                  min={0}
                                  max={59}
                                  output
                                />
                                <RangeSlider
                                  label="Seconds"
                                  value={config.timer_seconds || 12}
                                  onChange={(v) =>
                                    updateConfig('timer_seconds', v)
                                  }
                                  min={0}
                                  max={59}
                                  output
                                />
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <Checkbox
                                  label="Auto Reset Timer on Expiry"
                                  checked={!!config.auto_reset_timer}
                                  onChange={(v) => updateConfig('auto_reset_timer', v)}
                                />
                                <Checkbox
                                  label="Change Bundle on Timer End"
                                  checked={!!config.change_bundle_on_timer_end}
                                  onChange={(v) => updateConfig('change_bundle_on_timer_end', v)}
                                />
                              </div>
                              {(config.change_bundle_on_timer_end || config.auto_reset_timer) && (
                                <div style={{ marginTop: 12 }}>
                                  <TextField
                                    label="Bundle Titles (CSV)"
                                    value={config.bundle_titles || ''}
                                    onChange={(v) => updateConfig('bundle_titles', v)}
                                    autoComplete="off"
                                    helpText="Alternative titles for rotation (e.g. Mega Deal, Super Offer)"
                                  />
                                  <TextField
                                    label="Bundle Subtitles (CSV)"
                                    value={config.bundle_subtitles || ''}
                                    onChange={(v) => updateConfig('bundle_subtitles', v)}
                                    autoComplete="off"
                                    helpText="Alternative subtitles for rotation"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </FormLayout>
                    </CollapsibleCard>

                    <CollapsibleCard
                      title="Pricing & Discounts"
                      expanded={expandedSections.pricing}
                      onToggle={() => toggleSection('pricing')}
                    >
                      <FormLayout>
                        <RangeSlider
                          label="Discount Percentage"
                          value={config.discount_percentage || 20}
                          onChange={(v) =>
                            updateConfig('discount_percentage', v)
                          }
                          min={0}
                          max={50}
                          step={5}
                          output
                          suffix="%"
                        />
                        <Checkbox
                          label="Show Preview Bar"
                          checked={config.show_preview_bar !== false}
                          onChange={(v) => updateConfig('show_preview_bar', v)}
                          helpText="Display product preview bar with images and pricing"
                        />
                      </FormLayout>
                    </CollapsibleCard>

                    <CollapsibleCard
                      title="Collections & Categories"
                      expanded={expandedSections.collections}
                      onToggle={() => toggleSection('collections')}
                    >
                      <FormLayout>
                        <div style={{ marginBottom: 12 }}>
                          <Text variant="headingSm" as="h6">
                            Category Pills
                          </Text>
                          <p
                            style={{
                              fontSize: '13px',
                              color: '#666',
                              marginTop: '4px',
                            }}
                          >
                            Configure up to 4 category navigation pills
                          </p>
                        </div>

                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              padding: '10px',
                              background: '#f4f6f8',
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <Select
                              label={`Category ${i} Collection`}
                              options={[
                                { label: '-- None --', value: '' },
                                ...(collections || []).map((col) => ({
                                  label: col.title,
                                  value: col.handle,
                                })),
                              ]}
                              value={config[`col_${i}`] || ''}
                              onChange={(v) => updateConfig(`col_${i}`, v)}
                            />
                            <TextField
                              label={`Category ${i} Title`}
                              value={
                                config[`title_${i}`] ||
                                (i === 1 ? 'All Packs' : `Category ${i}`)
                              }
                              onChange={(v) => updateConfig(`title_${i}`, v)}
                              autoComplete="off"
                            />
                            <TextField
                              label={`Category ${i} Limit`}
                              type="number"
                              value={String(config[`col_${i}_limit`] || 10)}
                              onChange={(v) => updateConfig(`col_${i}_limit`, Math.max(1, Number(v)))}
                              helpText="Max items allowed from this category"
                              autoComplete="off"
                            />
                          </div>
                        ))}
                      </FormLayout>
                    </CollapsibleCard>

                    <CollapsibleCard
                      title="Colors & Branding"
                      expanded={expandedSections.colors}
                      onToggle={() => toggleSection('colors')}
                    >
                      <FormLayout>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                          }}
                        >
                          <ColorPickerField
                            label="Primary Color"
                            value={config.primary_color || '#000000'}
                            onChange={(v) => updateConfig('primary_color', v)}
                          />
                          <ColorPickerField
                            label="Text Color"
                            value={config.text_color || '#111111'}
                            onChange={(v) => updateConfig('text_color', v)}
                          />
                        </div>
                        <TextField
                          label="Page Title"
                          value={config.page_title || 'Value Combo Packs'}
                          onChange={(v) => updateConfig('page_title', v)}
                          autoComplete="off"
                        />
                      </FormLayout>
                    </CollapsibleCard>
                  </>
                )}

                {/* Default Single Collection (For generic layouts) */}
                {config.layout !== 'layout1' &&
                  config.layout !== 'layout2' &&
                  config.layout !== 'layout3' && (
                    <CollapsibleCard
                      title="Collection"
                      expanded={expandedSections.general}
                      onToggle={() => toggleSection('general')}
                    >
                      <FormLayout>
                        <Select
                          label="Select Collection"
                          options={[
                            { label: '-- Choose a collection --', value: '' },
                            ...(collections || []).map((collection) => ({
                              label: `${collection.title} (${collection.productsCount} products)`,
                              value: collection.handle,
                            })),
                          ]}
                          value={config.collection_handle || ''}
                          onChange={(v) => updateConfig('collection_handle', v)}
                        />
                      </FormLayout>
                    </CollapsibleCard>
                  )}
                {/* Banner Settings */}
                <CollapsibleCard
                  title="Banner Settings"
                  expanded={expandedSections.banner}
                  onToggle={() => toggleSection('banner')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show Banner"
                      checked={!!config.show_banner}
                      onChange={(checked) =>
                        updateConfig('show_banner', checked)
                      }
                    />
                    {config.show_banner && (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '10px',
                            marginBottom: '12px',
                          }}
                        >
                          <TextField
                            label="Desktop Banner Image URL"
                            value={config.banner_image_url}
                            onChange={(v) =>
                              updateConfig('banner_image_url', v)
                            }
                            autoComplete="off"
                            placeholder="https://example.com/desktop-banner.jpg"
                          />
                          <TextField
                            label="Mobile Banner Image URL"
                            value={config.banner_image_mobile_url}
                            onChange={(v) =>
                              updateConfig('banner_image_mobile_url', v)
                            }
                            autoComplete="off"
                            placeholder="https://example.com/mobile-banner.jpg"
                            helpText="Leave empty to use desktop banner on mobile"
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <Select
                            label="Banner Fit Mode"
                            options={[
                              { label: 'Cover (Fill & Crop)', value: 'cover' },
                              {
                                label: 'Contain (Show Full Image)',
                                value: 'contain',
                              },
                              {
                                label: 'Adapt to Image (Natural Height)',
                                value: 'adapt',
                              },
                            ]}
                            value={config.banner_fit_mode || 'cover'}
                            onChange={(v) => updateConfig('banner_fit_mode', v)}
                          />
                          <div style={{ marginTop: '12px' }}>
                            <Checkbox
                              label="Full Width"
                              checked={!!config.banner_full_width}
                              onChange={(v) =>
                                updateConfig('banner_full_width', v)
                              }
                              helpText="Edge-to-edge ignoring container padding"
                            />
                          </div>
                        </div>

                        {config.layout === 'layout2' && (
                          <>
                            <TextField
                              label="Banner Title"
                              value={config.banner_title || ''}
                              onChange={(v) => updateConfig('banner_title', v)}
                              autoComplete="off"
                            />
                            <TextField
                              label="Banner Subtitle"
                              value={config.banner_subtitle || ''}
                              onChange={(v) =>
                                updateConfig('banner_subtitle', v)
                              }
                              autoComplete="off"
                            />
                          </>
                        )}

                        {config.layout === 'layout3' && (
                          <>
                            <TextField
                              label="Hero Image URL (Template 3)"
                              value={config.hero_image_url || ''}
                              onChange={(v) =>
                                updateConfig('hero_image_url', v)
                              }
                              autoComplete="off"
                              placeholder="Hero image for Template 3"
                            />
                            <TextField
                              label="Hero Title"
                              value={config.hero_title || ''}
                              onChange={(v) => updateConfig('hero_title', v)}
                              autoComplete="off"
                            />
                            <div style={{ marginTop: 16 }}>
                              <Checkbox
                                label="Enable Banner Slider (Rotates 3 images)"
                                checked={!!config.enable_banner_slider}
                                onChange={(v) => updateConfig('enable_banner_slider', v)}
                              />
                              {config.enable_banner_slider && (
                                <div style={{ marginTop: 12, padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
                                  <RangeSlider
                                    label="Auto-Rotation Speed (Seconds)"
                                    value={config.slider_speed || 5}
                                    onChange={(v) => updateConfig('slider_speed', v)}
                                    min={2} max={15} output
                                  />
                                  {[1, 2, 3].map(i => (
                                    <div key={i} style={{ marginTop: 12, paddingTop: 12, borderTop: i > 1 ? '1px solid #ddd' : 'none' }}>
                                      <Text variant="headingSm" as="h6">Banner {i}</Text>
                                      <TextField label="Image URL" value={config[`banner_${i}_image`]} onChange={(v) => updateConfig(`banner_${i}_image`, v)} autoComplete="off" />
                                      <TextField label="Title" value={config[`banner_${i}_title`]} onChange={(v) => updateConfig(`banner_${i}_title`, v)} autoComplete="off" />
                                      <TextField label="Subtitle" value={config[`banner_${i}_subtitle`]} onChange={(v) => updateConfig(`banner_${i}_subtitle`, v)} autoComplete="off" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div
                          style={{
                            borderTop: '1px solid #eee',
                            paddingTop: '12px',
                            marginTop: '8px',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Desktop Banner Sizing
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                              marginTop: '8px',
                            }}
                          >
                            <PxField
                              label="Width (%)"
                              value={config.banner_width_desktop}
                              onChange={(v) =>
                                updateConfig('banner_width_desktop', v)
                              }
                              min={0}
                              max={100}
                              suffix="%"
                            />
                            <PxField
                              label="Height (px)"
                              value={config.banner_height_desktop}
                              onChange={(v) =>
                                updateConfig('banner_height_desktop', v)
                              }
                              suffix="px"
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            borderTop: '1px solid #eee',
                            paddingTop: '12px',
                            marginTop: '12px',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Mobile Banner Sizing
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                              marginTop: '8px',
                            }}
                          >
                            <PxField
                              label="Width (%)"
                              value={
                                config.banner_width_mobile ||
                                config.banner_width_desktop
                              }
                              onChange={(v) =>
                                updateConfig('banner_width_mobile', v)
                              }
                              min={0}
                              max={100}
                              suffix="%"
                            />
                            <PxField
                              label="Height (px)"
                              value={
                                config.banner_height_mobile ||
                                config.banner_height_desktop
                              }
                              onChange={(v) =>
                                updateConfig('banner_height_mobile', v)
                              }
                              suffix="px"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                {/* Products & Grid */}
                <CollapsibleCard
                  title="Products & Grid"
                  expanded={expandedSections.products}
                  onToggle={() => toggleSection('products')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show product grid"
                      checked={!!config.show_products_grid}
                      onChange={(checked) =>
                        updateConfig('show_products_grid', checked)
                      }
                    />
                    <PxField
                      label="Product Grid Width (%)"
                      value={config.grid_width}
                      onChange={(v) => updateConfig('grid_width', v)}
                      min={10}
                      max={100}
                      suffix="%"
                      helpText="Adjust the overall width of the product grid"
                    />
                    {config.show_products_grid && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <Select
                          label="Desktop Columns"
                          options={[
                            { label: '2', value: '2' },
                            { label: '3', value: '3' },
                            { label: '4', value: '4' },
                          ]}
                          value={config.desktop_columns}
                          onChange={(v) => updateConfig('desktop_columns', v)}
                        />
                        <Select
                          label="Layout Type"
                          options={[
                            { label: 'Grid', value: 'grid' },
                            { label: 'Slider', value: 'slider' },
                          ]}
                          value={config.grid_layout_type}
                          onChange={(v) => updateConfig('grid_layout_type', v)}
                        />
                        <Select
                          label="Mobile Columns"
                          options={[
                            { label: '1', value: '1' },
                            { label: '2', value: '2' },
                          ]}
                          value={config.mobile_columns}
                          onChange={(v) => updateConfig('mobile_columns', v)}
                        />
                        <PxField
                          label="Image Height (D)"
                          value={config.product_image_height_desktop}
                          onChange={(v) =>
                            updateConfig('product_image_height_desktop', v)
                          }
                        />
                        <PxField
                          label="Image Height (M)"
                          value={config.product_image_height_mobile}
                          onChange={(v) =>
                            updateConfig('product_image_height_mobile', v)
                          }
                        />
                      </div>
                    )}
                  </FormLayout>
                </CollapsibleCard>
              </>
            )}

            {activeCategory === 'style' && (
              <>
                {/* Content - Tab 2 */}
                {config.layout === 'layout4' && (
                  <CollapsibleCard
                    title="Design Four (Editorial) Styles"
                    expanded={expandedSections.designFourStyles}
                    onToggle={() => toggleSection('designFourStyles')}
                  >
                    <FormLayout>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <ColorPickerField
                          label="Background Color"
                          value={config.bg_color || '#ffffff'}
                          onChange={(v) => updateConfig('bg_color', v)}
                        />
                        <ColorPickerField
                          label="Text Color"
                          value={config.text_color || '#1a1a1a'}
                          onChange={(v) => updateConfig('text_color', v)}
                        />
                      </div>
                      <RangeSlider
                        label="Bundle Discount (%)"
                        value={config.discount_percentage || 20}
                        onChange={(v) => updateConfig('discount_percentage', v)}
                        min={0}
                        max={100}
                        step={5}
                        output
                        suffix="%"
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        This discount percentage is used for calculating the "You Save" badge in Design Four.
                      </p>
                    </FormLayout>
                  </CollapsibleCard>
                )}
                <CollapsibleCard
                  title="Title & Description"
                  expanded={expandedSections.content}
                  onToggle={() => toggleSection('content')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show title & description"
                      checked={!!config.show_title_description}
                      onChange={(checked) =>
                        updateConfig('show_title_description', checked)
                      }
                    />
                    {config.show_title_description && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: 10,
                        }}
                      >
                        {config.layout === 'layout2' && (
                          <TextField
                            label="Header Title (Sticky Top)"
                            value={config.header_title || ''}
                            onChange={(v) => updateConfig('header_title', v)}
                            autoComplete="off"
                          />
                        )}

                        {/* Title Text Field */}
                        <div style={{ paddingBottom: '12px' }}>
                          <TextField
                            label="Collection Title"
                            value={config.collection_title}
                            onChange={(v) => updateConfig('collection_title', v)}
                          />
                        </div>

                        {/* Title Styling Options */}
                        <div
                          style={{
                            marginBottom: 12,
                            paddingTop: 8,
                            borderTop: '1px solid #e1e3e5',
                          }}
                        >
                          <Text
                            variant="headingSm"
                            as="h6"
                            style={{ marginBottom: 8 }}
                          >
                            Title Styling
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr',
                              gap: 10,
                            }}
                          >
                            <Select
                              label="Title Alignment"
                              options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                              ]}
                              value={config.heading_align || 'left'}
                              onChange={(v) => updateConfig('heading_align', v)}
                            />
                            <Select
                              label="Title Font Weight"
                              options={[
                                { label: 'Normal (400)', value: '400' },
                                { label: 'Medium (500)', value: '500' },
                                { label: 'Semi-Bold (600)', value: '600' },
                                { label: 'Bold (700)', value: '700' },
                                { label: 'Extra Bold (800)', value: '800' },
                              ]}
                              value={String(
                                config.heading_font_weight || '700'
                              )}
                              onChange={(v) =>
                                updateConfig('heading_font_weight', v)
                              }
                            />
                            <PxField
                              label="Title Size"
                              value={config.heading_size}
                              onChange={(v) => updateConfig('heading_size', v)}
                            />
                            <ColorPickerField
                              label="Title Color"
                              value={config.heading_color}
                              onChange={(v) => updateConfig('heading_color', v)}
                            />
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Text
                              variant="bodySm"
                              as="span"
                              style={{ fontWeight: 500 }}
                            >
                              Title Padding (px)
                            </Text>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: 12,
                                marginTop: 6,
                                width: '100%',
                              }}
                            >
                              <PxField
                                label="Top"
                                value={config.title_container_padding_top}
                                onChange={(v) =>
                                  updateConfig('title_container_padding_top', v)
                                }
                                style={{
                                  minWidth: 80,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  padding: 4,
                                }}
                              />
                              <PxField
                                label="Right"
                                value={config.title_container_padding_right}
                                onChange={(v) =>
                                  updateConfig(
                                    'title_container_padding_right',
                                    v
                                  )
                                }
                                style={{
                                  minWidth: 80,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  padding: 4,
                                }}
                              />
                              <PxField
                                label="Bottom"
                                value={config.title_container_padding_bottom}
                                onChange={(v) =>
                                  updateConfig(
                                    'title_container_padding_bottom',
                                    v
                                  )
                                }
                                style={{
                                  minWidth: 80,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  padding: 4,
                                }}
                              />
                              <PxField
                                label="Left"
                                value={config.title_container_padding_left}
                                onChange={(v) =>
                                  updateConfig(
                                    'title_container_padding_left',
                                    v
                                  )
                                }
                                style={{
                                  minWidth: 80,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  padding: 4,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Spacer to prevent overlap */}
                        <div style={{ height: '24px' }}></div>

                        {/* Description Text Field */}
                        <div style={{ paddingBottom: '12px' }}>
                          <TextField
                            label="Collection Description"
                            value={config.collection_description}
                            onChange={(v) =>
                              updateConfig('collection_description', v)
                            }
                            multiline={3}
                          />
                        </div>

                        {/* Description Styling Options */}
                        <div
                          style={{
                            marginBottom: 12,
                            paddingTop: 8,
                            borderTop: '1px solid #e1e3e5',
                          }}
                        >
                          <Text
                            variant="headingSm"
                            as="h6"
                            style={{ marginBottom: 8 }}
                          >
                            Description Styling
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr',
                              gap: 10,
                            }}
                          >
                            <Select
                              label="Description Alignment"
                              options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                              ]}
                              value={config.description_align || 'left'}
                              onChange={(v) =>
                                updateConfig('description_align', v)
                              }
                            />
                            <Select
                              label="Description Font Weight"
                              options={[
                                { label: 'Light (300)', value: '300' },
                                { label: 'Normal (400)', value: '400' },
                                { label: 'Medium (500)', value: '500' },
                                { label: 'Semi-Bold (600)', value: '600' },
                                { label: 'Bold (700)', value: '700' },
                              ]}
                              value={String(
                                config.description_font_weight || '400'
                              )}
                              onChange={(v) =>
                                updateConfig('description_font_weight', v)
                              }
                            />
                            <PxField
                              label="Description Size"
                              value={config.description_size}
                              onChange={(v) =>
                                updateConfig('description_size', v)
                              }
                            />
                            <ColorPickerField
                              label="Description Color"
                              value={config.description_color}
                              onChange={(v) =>
                                updateConfig('description_color', v)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                {/* Product Card Section */}
                <CollapsibleCard
                  title="Product Card"
                  expanded={expandedSections.productCard}
                  onToggle={() => toggleSection('productCard')}
                >
                  <FormLayout>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                      }}
                    >
                      <ColorPickerField
                        label="Highlight Color"
                        value={config.selection_highlight_color}
                        onChange={(v) =>
                          updateConfig('selection_highlight_color', v)
                        }
                      />
                      <div style={{ paddingTop: '20px' }}>
                        <Checkbox
                          label="Show Tick on Selected"
                          checked={!!config.show_selection_tick}
                          onChange={(v) =>
                            updateConfig('show_selection_tick', v)
                          }
                        />
                      </div>
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Variants & Actions Section */}
                <CollapsibleCard
                  title="Variants & Actions"
                  expanded={expandedSections.variants}
                  onToggle={() => toggleSection('variants')}
                >
                  <FormLayout>
                    <Select
                      label="Variant Display"
                      options={[
                        { label: 'Hover Popup', value: 'hover' },
                        { label: 'Static Inside Card', value: 'static' },
                        { label: 'Selection Popup (Bottom)', value: 'popup' },
                      ]}
                      value={config.product_card_variants_display}
                      onChange={(v) =>
                        updateConfig('product_card_variants_display', v)
                      }
                    />
                    <div
                      style={{ display: 'flex', gap: '10px', marginTop: '8px' }}
                    >
                      <Checkbox
                        label="Quantity Selector"
                        checked={!!config.show_quantity_selector}
                        onChange={(v) =>
                          updateConfig('show_quantity_selector', v)
                        }
                      />
                      <Checkbox
                        label="Add to Cart Button"
                        checked={!!config.show_add_to_cart_btn}
                        onChange={(v) =>
                          updateConfig('show_add_to_cart_btn', v)
                        }
                      />
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Button Customization - New Section */}
                <CollapsibleCard
                  title="Button Customization"
                  expanded={expandedSections.buttonCustomization}
                  onToggle={() => toggleSection('buttonCustomization')}
                >
                  <FormLayout>
                    <Text variant="headingSm" as="h6">Add Button</Text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <TextField
                        label="Text"
                        value={config.add_btn_text}
                        onChange={(v) => updateConfig('add_btn_text', v)}
                      />
                      <ColorPickerField
                        label="Background"
                        value={config.add_btn_bg}
                        onChange={(v) => updateConfig('add_btn_bg', v)}
                      />
                      <ColorPickerField
                        label="Text Color"
                        value={config.add_btn_text_color}
                        onChange={(v) => updateConfig('add_btn_text_color', v)}
                      />
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                      <Text variant="headingSm" as="h6">Checkout / Preview Button</Text>
                      <TextField
                        label="Text"
                        value={config.checkout_btn_text}
                        onChange={(v) => updateConfig('checkout_btn_text', v)}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                        <ColorPickerField
                          label="Background (Main)"
                          value={config.checkout_btn_bg}
                          onChange={(v) => updateConfig('checkout_btn_bg', v)}
                        />
                        <ColorPickerField
                          label="Text Color (Main)"
                          value={config.checkout_btn_text_color}
                          onChange={(v) => updateConfig('checkout_btn_text_color', v)}
                        />
                        <ColorPickerField
                          label="Preview Btn Bg (Layout 4)"
                          value={config.preview_bar_button_bg}
                          onChange={(v) => updateConfig('preview_bar_button_bg', v)}
                        />
                        <ColorPickerField
                          label="Preview Btn Text (Layout 4)"
                          value={config.preview_bar_button_text}
                          onChange={(v) => updateConfig('preview_bar_button_text', v)}
                        />
                      </div>
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Preview Bar - Tab 4 */}
                <CollapsibleCard
                  title="Sticky Preview Bar"
                  expanded={expandedSections.previewBar}
                  onToggle={() => toggleSection('previewBar')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show Bottom Sticky Bar"
                      checked={!!config.show_sticky_preview_bar}
                      onChange={(checked) =>
                        updateConfig('show_sticky_preview_bar', checked)
                      }
                    />
                    <Checkbox
                      label="Full width sticky preview bar"
                      checked={!!config.sticky_preview_bar_full_width}
                      onChange={(checked) =>
                        updateConfig('sticky_preview_bar_full_width', checked)
                      }
                    />
                    {config.show_sticky_preview_bar && (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <ColorPickerField
                            label="Background"
                            value={config.sticky_preview_bar_bg}
                            onChange={(v) =>
                              updateConfig('sticky_preview_bar_bg', v)
                            }
                          />
                          <ColorPickerField
                            label="Text"
                            value={config.sticky_preview_bar_text_color}
                            onChange={(v) =>
                              updateConfig('sticky_preview_bar_text_color', v)
                            }
                          />
                        </div>
                        <PxField
                          label="Width (%)"
                          value={config.sticky_preview_bar_width}
                          onChange={(v) =>
                            updateConfig('sticky_preview_bar_width', v)
                          }
                          min={0}
                          max={100}
                          suffix="%"
                        />
                        <PxField
                          label="Height (px)"
                          value={config.sticky_preview_bar_height}
                          onChange={(v) =>
                            updateConfig('sticky_preview_bar_height', v)
                          }
                          min={40}
                          max={200}
                          suffix="px"
                        />
                        <PxField
                          label="Padding (px)"
                          value={config.sticky_preview_bar_padding}
                          onChange={(v) =>
                            updateConfig('sticky_preview_bar_padding', v)
                          }
                          min={0}
                          max={80}
                          suffix="px"
                        />
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                <CollapsibleCard
                  title="Inline Preview Bar"
                  expanded={expandedSections.inlinePreviewBar}
                  onToggle={() => toggleSection('inlinePreviewBar')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show Inline Preview Bar"
                      checked={!!config.show_preview_bar}
                      onChange={(checked) =>
                        updateConfig('show_preview_bar', checked)
                      }
                    />
                    <PxField
                      label="Inline Preview Bar Width (%)"
                      value={config.preview_bar_width}
                      onChange={(v) => updateConfig('preview_bar_width', v)}
                      min={10}
                      max={100}
                      suffix="%"
                      helpText="Set to 100% for full width, or adjust as needed."
                    />
                    {config.show_preview_bar && (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <ColorPickerField
                            label="Background"
                            value={config.preview_bar_bg}
                            onChange={(v) => updateConfig('preview_bar_bg', v)}
                          />
                          <ColorPickerField
                            label="Text"
                            value={config.preview_bar_text_color}
                            onChange={(v) =>
                              updateConfig('preview_bar_text_color', v)
                            }
                          />
                        </div>
                        <PxField
                          label="Width (%)"
                          value={config.preview_bar_width}
                          onChange={(v) => updateConfig('preview_bar_width', v)}
                          min={0}
                          max={100}
                          suffix="%"
                        />
                        <PxField
                          label="Height (px)"
                          value={config.preview_bar_height}
                          onChange={(v) =>
                            updateConfig('preview_bar_height', v)
                          }
                          min={40}
                          max={200}
                          suffix="px"
                        />
                        <PxField
                          label="Padding (px)"
                          value={config.preview_bar_padding}
                          onChange={(v) =>
                            updateConfig('preview_bar_padding', v)
                          }
                          min={0}
                          max={80}
                          suffix="px"
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <PxField
                            label="Original Price Size"
                            value={config.original_price_size}
                            onChange={(v) => updateConfig('original_price_size', v)}
                            min={10} max={40}
                          />
                          <PxField
                            label="Discounted Price Size"
                            value={config.discounted_price_size}
                            onChange={(v) => updateConfig('discounted_price_size', v)}
                            min={10} max={40}
                          />
                        </div>
                        <Select
                          label="Preview Bar Shape"
                          options={[
                            { label: 'Rectangle', value: 'rectangle' },
                            { label: 'Circle', value: 'circle' },
                          ]}
                          value={config.preview_item_shape || 'rectangle'}
                          onChange={(v) =>
                            updateConfig('preview_item_shape', v)
                          }
                        />
                        <PxField
                          label="Shape Size (px)"
                          value={config.preview_item_size}
                          onChange={(v) => updateConfig('preview_item_size', v)}
                          min={24}
                          max={120}
                          suffix="px"
                        />
                        <PxField
                          label="Shape Padding (px)"
                          value={config.preview_item_padding}
                          onChange={(v) =>
                            updateConfig('preview_item_padding', v)
                          }
                          min={0}
                          max={40}
                          suffix="px"
                        />
                        <ColorPickerField
                          label="Shape Color"
                          value={config.preview_item_color}
                          onChange={(v) =>
                            updateConfig('preview_item_color', v)
                          }
                        />
                        <ColorPickerField
                          label="Shape Border Color"
                          value={config.preview_item_border_color}
                          onChange={(v) =>
                            updateConfig('preview_item_border_color', v)
                          }
                        />
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                <CollapsibleCard
                  title="Sticky Checkout Button"
                  expanded={expandedSections.stickyCheckoutBtn}
                  onToggle={() => toggleSection('stickyCheckoutBtn')}
                >
                  <FormLayout>
                    <TextField
                      label="Button Text"
                      value={config.sticky_checkout_btn_text || 'Checkout'}
                      onChange={(v) => updateConfig('sticky_checkout_btn_text', v)}
                      autoComplete="off"
                      helpText="Text displayed on the sticky checkout button"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ColorPickerField
                        label="Button Background"
                        value={config.sticky_checkout_btn_bg}
                        onChange={(v) => updateConfig('sticky_checkout_btn_bg', v)}
                      />
                      <ColorPickerField
                        label="Button Text Color"
                        value={config.sticky_checkout_btn_text_color}
                        onChange={(v) => updateConfig('sticky_checkout_btn_text_color', v)}
                      />
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Style & Spacing - Tab 6 */}
                <CollapsibleCard
                  title="Style & Spacing"
                  expanded={expandedSections.styles}
                  onToggle={() => toggleSection('styles')}
                >
                  <FormLayout>
                    <div style={{ marginBottom: '12px' }}>
                      <Text variant="headingSm" as="h6">
                        Container Padding
                      </Text>

                      {/* Width Controls */}
                      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
                        <Text variant="headingSm" as="h6" style={{ marginBottom: 8 }}>Width Control (%)</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <PxField
                            label="Container"
                            value={config.container_width}
                            onChange={(v) => updateConfig('container_width', v)}
                            min={50} max={100} suffix="%"
                          />
                          <PxField
                            label="Title"
                            value={config.title_width}
                            onChange={(v) => updateConfig('title_width', v)}
                            min={20} max={100} suffix="%"
                          />
                          <PxField
                            label="Banner"
                            value={config.banner_width}
                            onChange={(v) => updateConfig('banner_width', v)}
                            min={20} max={100} suffix="%"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <PxField
                          label="D Vertical"
                          value={config.container_padding_top_desktop}
                          onChange={(v) =>
                            updateBoth(
                              'container_padding_top_desktop',
                              'container_padding_bottom_desktop',
                              v
                            )
                          }
                        />
                        <PxField
                          label="D Horizontal"
                          value={config.container_padding_left_desktop}
                          onChange={(v) =>
                            updateBoth(
                              'container_padding_left_desktop',
                              'container_padding_right_desktop',
                              v
                            )
                          }
                        />
                        <PxField
                          label="M Vertical"
                          value={config.container_padding_top_mobile}
                          onChange={(v) =>
                            updateBoth(
                              'container_padding_top_mobile',
                              'container_padding_bottom_mobile',
                              v
                            )
                          }
                        />
                        <PxField
                          label="M Horizontal"
                          value={config.container_padding_left_mobile}
                          onChange={(v) =>
                            updateBoth(
                              'container_padding_left_mobile',
                              'container_padding_right_mobile',
                              v
                            )
                          }
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid #eee',
                        paddingTop: '12px',
                      }}
                    >
                      <Text variant="headingSm" as="h6">
                        Preview Bar Shape
                      </Text>
                      <Select
                        label="Preview Bar Shape"
                        options={[
                          { label: 'Rectangle', value: 'rectangle' },
                          { label: 'Circle', value: 'circle' },
                        ]}
                        value={config.preview_item_shape || 'rectangle'}
                        onChange={(v) => updateConfig('preview_item_shape', v)}
                      />
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid #eee',
                        paddingTop: '12px',
                      }}
                    >
                      <Text variant="headingSm" as="h6">
                        Buttons visibility
                      </Text>
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          marginTop: '8px',
                        }}
                      >
                        <Checkbox
                          label="Add to Cart"
                          checked={!!config.show_add_to_cart_btn}
                          onChange={(v) =>
                            updateConfig('show_add_to_cart_btn', v)
                          }
                        />
                        <Checkbox
                          label="Buy Now"
                          checked={!!config.show_buy_btn}
                          onChange={(v) => updateConfig('show_buy_btn', v)}
                        />
                      </div>
                    </div>
                  </FormLayout>
                </CollapsibleCard>
              </>
            )}

            {activeCategory === 'advanced' && (
              <>
                {/* Discount - Tab 5 */}
                <CollapsibleCard
                  title="Discount"
                  expanded={expandedSections.discount}
                  onToggle={() => toggleSection('discount')}
                >
                  <FormLayout>
                    <div style={{ marginBottom: '12px' }}>
                      <Text variant="headingSm" as="h6">
                        Discount Offer
                      </Text>
                      <ButtonGroup segmented>
                        <Button
                          pressed={config.has_discount_offer === true}
                          onClick={() =>
                            updateConfig('has_discount_offer', true)
                          }
                        >
                          Yes
                        </Button>
                        <Button
                          pressed={config.has_discount_offer === false}
                          onClick={() =>
                            updateConfig('has_discount_offer', false)
                          }
                        >
                          No
                        </Button>
                      </ButtonGroup>
                    </div>
                    {config.has_discount_offer && (
                      <Select
                        label="Select Discount"
                        options={[
                          { label: '-- Choose a discount --', value: '' },
                          ...localActiveDiscounts
                            .filter((d) => d.status === 'active')
                            .map((d) => ({
                              label: `${d.title} (${d.type || 'custom'})`,
                              value: String(d.id),
                            })),
                        ]}
                        value={String(config.selected_discount_id || '')}
                        onChange={(v) =>
                          updateConfig(
                            'selected_discount_id',
                            v ? Number(v) : null
                          )
                        }
                      />
                    )}
                    {!config.has_discount_offer && (
                      <Button onClick={() => setCreateDiscountModalOpen(true)}>
                        Create Discount
                      </Button>
                    )}
                    <div
                      style={{
                        marginTop: '16px',
                        borderTop: '1px solid #eee',
                        paddingTop: '12px',
                      }}
                    >
                      <TextField
                        label="Max Selections"
                        type="number"
                        value={String(config.max_selections)}
                        onChange={(v) =>
                          updateConfig('max_selections', Number(v))
                        }
                        min={3}
                        max={10}
                        autoComplete="off"
                      />
                      <TextField
                        label="Limit Reached Message"
                        value={config.limit_reached_message}
                        onChange={(v) =>
                          updateConfig('limit_reached_message', v)
                        }
                        autoComplete="off"
                        helpText="Use {{limit}} as a placeholder for the max selections number."
                      />
                      <TextField
                        label="Discount Motivation Text"
                        value={config.discount_motivation_text}
                        onChange={(v) =>
                          updateConfig('discount_motivation_text', v)
                        }
                        autoComplete="off"
                        helpText="Use {{remaining}} as a placeholder for the items left to unlock discount."
                      />
                      <TextField
                        label="Discount Unlocked Text"
                        value={config.discount_unlocked_text}
                        onChange={(v) =>
                          updateConfig('discount_unlocked_text', v)
                        }
                        autoComplete="off"
                      />
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Progress Bar Section - Always available in Advanced for fine-tuning */}
                <CollapsibleCard
                  title="Progress Bar"
                  expanded={expandedSections.progressBar}
                  onToggle={() => toggleSection('progressBar')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Show Top Progress Bar"
                      checked={!!config.show_progress_bar}
                      onChange={(v) => updateConfig('show_progress_bar', v)}
                    />
                    {config.show_progress_bar && (
                      <>
                        <ColorPickerField
                          label="Progress Bar Color"
                          value={config.progress_bar_color}
                          onChange={(v) =>
                            updateConfig('progress_bar_color', v)
                          }
                        />
                        <TextField
                          label="Progress Text"
                          value={config.progress_text || ''}
                          onChange={(v) => updateConfig('progress_text', v)}
                          autoComplete="off"
                          helpText="Text shown on progress bar"
                        />
                        <PxField
                          label="Progress Bar Width (%)"
                          value={config.progress_bar_width}
                          onChange={(v) =>
                            updateConfig('progress_bar_width', v)
                          }
                          min={10}
                          max={100}
                          suffix="%"
                        />
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>
              </>
            )}
          </div>
        </div >
      </div >

      {/* Discount Creation Modal */}
      < Modal
        open={createDiscountModalOpen}
        onClose={() => {
          setCreateDiscountModalOpen(false);
          setDTitle('');
          setDCode('');
          setDType('percentage');
          setDValue('');
          setDStartsAt('');
          setDEndsAt('');
          setDOncePerCustomer(false);
        }
        }
        title="Create Discount"
        primaryAction={{
          content: 'Create',
          onAction: handleCreateDiscount,
          loading: discountFetcher.state === 'submitting',
        }}
        secondaryActions={
          [
            {
              content: 'Cancel',
              onAction: () => {
                setCreateDiscountModalOpen(false);
                setDTitle('');
                setDCode('');
                setDType('percentage');
                setDValue('');
                setDStartsAt('');
                setDEndsAt('');
                setDOncePerCustomer(false);
              },
            },
          ]}
      >
        <Modal.Section>
          <div style={{ padding: '8px 0' }}>
            {/* Title and Code */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Title *
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                  }}
                >
                  Shown in Shopify Admin discounts
                </span>
                <input
                  required
                  value={dTitle}
                  onChange={(e) => setDTitle(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="Summer Sale 20% Off"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Code *
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                  }}
                >
                  Must be unique. Try a distinctive name
                </span>
                <input
                  required
                  value={dCode}
                  onChange={(e) => setDCode(e.target.value.toUpperCase())}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="SAVE10WINTER"
                />
              </div>
            </div>

            {/* Type and Value */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Type *
                </label>
                <select
                  value={dType}
                  onChange={(e) => setDType(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                  required
                >
                  <option value="percentage">Percentage off (%)</option>
                  <option value="amount">Fixed amount off</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Value *
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                  }}
                >
                  {dType === 'percentage'
                    ? 'Enter 0–100'
                    : 'Enter amount in your store currency'}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={dValue}
                  onChange={(e) => setDValue(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                  placeholder={dType === 'percentage' ? '10' : '20'}
                />
              </div>
            </div>

            {/* Dates */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Starts at *
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                  }}
                >
                  When the discount becomes active
                </span>
                <input
                  type="datetime-local"
                  required
                  value={dStartsAt}
                  onChange={(e) => setDStartsAt(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Ends at (optional)
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                  }}
                >
                  Leave blank for no end date
                </span>
                <input
                  type="datetime-local"
                  value={dEndsAt}
                  onChange={(e) => setDEndsAt(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={dOncePerCustomer}
                onChange={(e) => setDOncePerCustomer(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    display: 'block',
                  }}
                >
                  Applies once per customer
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}></span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={dAutoApply}
                onChange={(e) => setDAutoApply(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    display: 'block',
                  }}
                >
                  Auto Apply Discount
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  Automatically apply this discount when conditions are met
                </span>
              </div>
            </label>

            {/* Once per customer */}
          </div>
        </Modal.Section>
      </Modal >
    </Page >
  );
}

function ComboPreview({
  config,
  device,
  products,
  collections = [],
  activeTab,
  setActiveTab,
  isLoading,
  activeDiscounts = [],
  selectedVariants = {},
  setSelectedVariants = () => { },
}) {
  const isMobile = device === 'mobile';
  const sliderRef = useRef(null);

  // Custom Styles for the Preview
  const previewStyles = `
    .cdo-slider-horizontal::-webkit-scrollbar {
      display: none !important;
    }
    .cdo-slider-horizontal::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    .cdo-slider-horizontal::-webkit-scrollbar-thumb {
      background: ${config.selection_highlight_color || '#ca275c'};
      border-radius: 10px;
    }
    .cdo-slider-horizontal {
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-behavior: smooth;
    }
    .cdo-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }
    .cdo-arrow-btn:hover {
      background: ${config.selection_highlight_color || '#ca275c'};
      color: #fff;
      border-color: ${config.selection_highlight_color || '#ca275c'};
    }
  `;
  const paddingTop = isMobile
    ? config.container_padding_top_mobile
    : config.container_padding_top_desktop;
  const paddingRight = isMobile
    ? config.container_padding_right_mobile
    : config.container_padding_right_desktop;
  const paddingBottom = isMobile
    ? config.container_padding_bottom_mobile
    : config.container_padding_bottom_desktop;
  const paddingLeft = isMobile
    ? config.container_padding_left_mobile
    : config.container_padding_left_desktop;
  const bannerWidth = isMobile
    ? config.banner_width_mobile || config.banner_width_desktop || 100
    : config.banner_width_desktop || 100;
  const bannerHeight = isMobile
    ? config.banner_height_mobile || config.banner_height_desktop || 120
    : config.banner_height_desktop || 180;

  const finalBannerHeight =
    config.banner_fit_mode === 'adapt' ? 'auto' : `${bannerHeight}px`;
  const bannerObjectFit =
    config.banner_fit_mode === 'cover' || config.banner_fit_mode === 'contain'
      ? config.banner_fit_mode
      : 'initial';

  const previewAlignment = isMobile
    ? config.preview_alignment_mobile
    : config.preview_alignment;
  const previewJustify = previewAlignment;
  const previewGap = config.preview_item_gap ?? 12;
  const previewShape = config.preview_item_shape || 'circle';
  // const previewItemSize = config.preview_item_size; // unused
  const previewAlignItems = config.preview_align_items || 'center';
  const previewFontWeight = config.preview_font_weight || 600;
  const productTitleSize = isMobile
    ? config.product_title_size_mobile || 13
    : config.product_title_size_desktop || 15;
  const productPriceSize = isMobile
    ? config.product_price_size_mobile || 13
    : config.product_price_size_desktop || 15;
  const productCardPadding = config.product_card_padding ?? 10;
  const viewportWidth = '100%';
  const columns = isMobile ? config.mobile_columns : config.desktop_columns;
  const numericColumns = Math.max(1, Number(columns) || 1);
  const gridGap = Number(config.products_gap ?? 12);
  const effectiveColumns = numericColumns; // Width is adaptive; keep selected columns
  // const cardHeight = isMobile
  //   ? config.card_height_mobile
  //   : config.card_height_desktop; // unused
  const productImageHeight = isMobile
    ? config.product_image_height_mobile
    : config.product_image_height_desktop;
  // const cardHeight = isMobile
  //   ? config.card_height_mobile
  //   : config.card_height_desktop; // unused
  const headingAlign = config.heading_align || 'left';
  const descriptionAlign = config.description_align || 'left';

  // Title & Description renderer
  const renderTitleDescription = () => (
    <div style={{ width: `${config.title_width || 100}%`, margin: '0 auto' }}>
      <div
        style={{
          paddingTop: config.title_container_padding_top,
          paddingRight: config.title_container_padding_right,
          paddingBottom: config.title_container_padding_bottom,
          paddingLeft: config.title_container_padding_left,
          textAlign: headingAlign,
        }}
      >
        <h1
          style={{
            fontSize: config.heading_size,
            marginBottom: 4,
            color: config.heading_color,
            fontWeight: config.heading_font_weight || 700,
            textAlign: headingAlign,
          }}
        >
          {config.collection_title}
        </h1>
        <p
          style={{
            fontSize: config.description_size,
            color: config.description_color,
            fontWeight: config.description_font_weight || 400,
            textAlign: descriptionAlign,
          }}
        >
          {config.collection_description}
        </p>
      </div>
    </div>
  );
  const cardBorderRadius = config.card_border_radius || 12;

  const maxSel = Number(config.max_selections) || 3;
  const baseSizeDesktop = maxSel > 3 ? Math.max(30, 56 - (maxSel - 3) * 8) : 56;
  const baseSizeMobile = maxSel > 3 ? Math.max(24, 44 - (maxSel - 3) * 6) : 44;
  const baseSize = isMobile ? baseSizeMobile : baseSizeDesktop;

  const shapeStyles = (size) => {
    if (previewShape === 'circle')
      return { width: size, height: size, borderRadius: '50%' };
    if (previewShape === 'rectangle')
      return {
        width: size * 1.4,
        height: size * 0.8,
        borderRadius: config.preview_border_radius,
      };
    return {
      width: size,
      height: size,
      borderRadius: config.preview_border_radius,
    };
  };

  // Section rendering functions
  const renderBanner = () => {
    if (config.show_banner === false) return null;
    const bannerUrl =
      isMobile && config.banner_image_mobile_url
        ? config.banner_image_mobile_url
        : config.banner_image_url;

    const bannerImage =
      bannerUrl ||
      'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455';

    if (config.layout === 'layout2') {
      return (
        <div
          style={{
            position: 'relative',
            width: `${bannerWidth}%`,
            margin: '0 auto',
            height: finalBannerHeight,
            overflow: 'hidden',
          }}
        >
          <img
            src={bannerImage}
            alt="Banner"
            style={{
              width: '100%',
              height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
              objectFit: bannerObjectFit,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.7) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px 20px',
              color: 'white',
            }}
          >
            <h1 style={{ fontSize: '36px', fontWeight: '800', margin: 0 }}>
              {config.banner_title || config.collection_title}
            </h1>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              {config.banner_subtitle || config.collection_description}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: config.banner_full_width
            ? `calc(100% + ${paddingLeft + paddingRight}px)`
            : `${bannerWidth}%`,
          height: finalBannerHeight,
          background: bannerUrl ? 'none' : '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: config.banner_padding_top,
          paddingBottom: config.banner_padding_bottom,
          margin: config.banner_full_width ? `0 -${paddingLeft}px` : '0 auto',
          overflow: 'hidden',
        }}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Banner"
            style={{
              width: '100%',
              height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
              objectFit: bannerObjectFit,
              display: 'block',
            }}
          />
        ) : (
          <span style={{ color: '#999' }}>Banner Image</span>
        )}
      </div>
    );
  };

  // Interactive Preview State
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cardQtys, setCardQtys] = useState({}); // {productId: qty}

  // --- Banner Slider Logic ---
  const [currentSlide, setCurrentSlide] = useState(0);
  const banners = useMemo(() => [
    { image: config.banner_1_image, title: config.banner_1_title, subtitle: config.banner_1_subtitle },
    { image: config.banner_2_image, title: config.banner_2_title, subtitle: config.banner_2_subtitle },
    { image: config.banner_3_image, title: config.banner_3_title, subtitle: config.banner_3_subtitle },
  ].filter(b => b.image), [config.banner_1_image, config.banner_1_title, config.banner_1_subtitle, config.banner_2_image, config.banner_2_title, config.banner_2_subtitle, config.banner_3_image, config.banner_3_title, config.banner_3_subtitle]);

  useEffect(() => {
    if (!config.enable_banner_slider || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, (config.slider_speed || 5) * 1000);
    return () => clearInterval(interval);
  }, [config.enable_banner_slider, config.slider_speed, banners.length]);

  // --- Advanced Timer Logic ---
  const [bundleIndex, setBundleIndex] = useState(0);
  const titles = useMemo(() => (config.bundle_titles || '').split(',').filter(t => t.trim()), [config.bundle_titles]);
  const subtitles = useMemo(() => (config.bundle_subtitles || '').split(',').filter(t => t.trim()), [config.bundle_subtitles]);

  const [timeLeft, setTimeLeft] = useState(() => {
    return (Number(config.timer_hours || 0) * 3600) + (Number(config.timer_minutes || 0) * 60) + Number(config.timer_seconds || 0);
  });

  useEffect(() => {
    const totalSeconds = (Number(config.timer_hours || 0) * 3600) + (Number(config.timer_minutes || 0) * 60) + Number(config.timer_seconds || 0);
    setTimeLeft(totalSeconds);
  }, [config.timer_hours, config.timer_minutes, config.timer_seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (config.auto_reset_timer) {
        const totalSeconds = (Number(config.timer_hours || 0) * 3600) + (Number(config.timer_minutes || 0) * 60) + Number(config.timer_seconds || 0);
        setTimeLeft(totalSeconds);
        if (config.change_bundle_on_timer_end && titles.length > 0) {
          setBundleIndex(prev => (prev + 1) % titles.length);
        }
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, config.auto_reset_timer, config.change_bundle_on_timer_end, titles.length, config.timer_hours, config.timer_minutes, config.timer_seconds]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
  };
  const time = formatTime(timeLeft);
  const totalItems = selectedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const discountThreshold = Math.max(1, parseInt(config.discount_threshold) || 1);

  const handleQtyChange = (pid, val, source = 'all') => {
    const qty = Math.max(0, parseInt(val) || 0);
    const maxSel = parseInt(config.max_selections) || 3;

    if (qty === 0) {
      handleRemoveProduct(pid, source);
      return;
    }

    setSelectedProducts((selected) => {
      const item = selected.find((p) => String(p.id) === String(pid) && p.source === source);
      if (!item) return selected;

      const otherQtySum = selected
        .filter((p) => !(String(p.id) === String(pid) && p.source === source))
        .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

      const currentQtyInSource = selected
        .filter((p) => p.source === source && !(String(p.id) === String(pid)))
        .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

      let sourceLimit = 999;
      if (source.startsWith('step_')) {
        const stepIdx = source.replace('step_', '');
        sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
      } else if (source !== 'all') {
        for (let i = 1; i <= 4; i++) {
          if (config[`col_${i}`] === source) {
            sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
            break;
          }
        }
      }

      const allowedByGlobal = maxSel - otherQtySum;
      const allowedBySource = sourceLimit - currentQtyInSource;
      const finalAllowed = Math.max(1, Math.min(qty, allowedByGlobal, allowedBySource));

      if (finalAllowed < qty) {
        shopify.toast.show(`Limit reached! Max allowed here is ${finalAllowed}`, { isError: true });
      }

      setCardQtys((prev) => ({ ...prev, [pid]: finalAllowed }));
      return selected.map((p) =>
        String(p.id) === String(pid) && p.source === source ? { ...p, quantity: finalAllowed } : p
      );
    });
  };

  const handleInc = (pid, variant = null, source = 'all') => {
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    const product = products.find((p) => String(p.id) === String(pid));
    if (!product) return;

    const currentQtyInSource = selectedProducts
      .filter((p) => p.source === source)
      .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    let sourceLimit = 999;
    if (source.startsWith('step_')) {
      const stepIdx = source.replace('step_', '');
      sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
    } else if (source !== 'all') {
      // For layout 2/3 category handles
      for (let i = 1; i <= 4; i++) {
        if (config[`col_${i}`] === source) {
          sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
          break;
        }
      }
    }

    if (currentQtyInSource >= sourceLimit) {
      shopify.toast.show(`Limit reached for this category! (Max ${sourceLimit} items)`, { isError: true });
      return;
    }

    const currentTotalQty = selectedProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const maxThreshold = parseInt(config.max_selections) || Math.max(3, parseInt(config.discount_threshold) || 3);

    if (!isSelected) {
      if (currentTotalQty >= maxThreshold) {
        shopify.toast.show(`Global limit reached! You can only add up to ${maxThreshold} items.`, { isError: true });
        return;
      }
      handleAddProduct(product, 1, variant, source);
    } else {
      handleQtyChange(pid, (cardQtys[pid] || 0) + 1, source);

      // Motivation/Unlocked Toast Notification
      const nextTotal = currentTotalQty + 1;
      if (nextTotal >= discountThreshold) {
        shopify.toast.show(config.discount_unlocked_text || "Discount Unlocked! 🎉");
      } else {
        const remaining = discountThreshold - nextTotal;
        const motivation = (config.discount_motivation_text || "Add {{remaining}} more items to unlock the discount!")
          .replace('{{remaining}}', remaining);
        shopify.toast.show(motivation);
      }
    }
  };

  const handleDec = (pid, source = 'all') => {
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    if (!isSelected) return;
    const item = selectedProducts.find((p) => String(p.id) === String(pid) && p.source === source);
    const currentQty =
      cardQtys[pid] !== undefined ? cardQtys[pid] : item?.quantity;
    handleQtyChange(pid, currentQty - 1, source);
  };

  const handleAddProduct = (product, initialQty, variant = null, source = 'all') => {
    const qty = initialQty || cardQtys[product.id] || 1;
    const selectedVariant = variant ||
      (product.variants || []).find(
        (v) => String(v.id) === String(selectedVariants[product.id])
      ) ||
      (product.variants && product.variants[0]);
    if (!selectedVariant) return;

    const currentTotalQty = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const maxThreshold = parseInt(config.max_selections) || 3;

    if (currentTotalQty + Number(qty) > maxThreshold) {
      shopify.toast.show(`Global limit reached! You can only add up to ${maxThreshold} items.`, { isError: true });
      return;
    }

    // Check source-specific limit
    const currentQtyInSource = selectedProducts
      .filter((p) => p.source === source)
      .reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    let sourceLimit = 999;
    if (source.startsWith('step_')) {
      const stepIdx = source.replace('step_', '');
      sourceLimit = parseInt(config[`step_${stepIdx}_limit`]) || 999;
    } else if (source !== 'all') {
      for (let i = 1; i <= (config.tab_count || 4); i++) {
        if (config[`col_${i}`] === source) {
          sourceLimit = parseInt(config[`col_${i}_limit`]) || 999;
          break;
        }
      }
    }

    if (currentQtyInSource + Number(qty) > sourceLimit) {
      shopify.toast.show(`Limit reached for this category! (Max ${sourceLimit} items)`, { isError: true });
      return;
    }

    const newItem = {
      id: product.id,
      variantId: selectedVariant.id,
      image: selectedVariant.image?.src || selectedVariant.image?.url || product.image?.src || product.featuredMedia?.preview?.image?.url || 'https://placehold.co/100x100',
      price: parseFloat(selectedVariant.price || 0),
      quantity: Number(qty),
      source: source
    };

    setSelectedProducts([...selectedProducts, newItem]);
    setCardQtys((prev) => ({ ...prev, [product.id]: Number(qty) }));

    // Motivation/Unlocked Toast Notification (only for initial adds, handleInc handles others)
    const nextTotal = currentTotalQty + Number(qty);
    if (nextTotal >= discountThreshold) {
      shopify.toast.show(config.discount_unlocked_text || "Discount Unlocked! 🎉");
    } else {
      const remaining = discountThreshold - nextTotal;
      const motivation = (config.discount_motivation_text || "Add {{remaining}} more items to unlock the discount!")
        .replace('{{remaining}}', remaining);
      shopify.toast.show(motivation);
    }
  };

  const handleRemoveProduct = (productId, source = 'all') => {
    setSelectedProducts(
      selectedProducts.filter((p) => !(String(p.id) === String(productId) && p.source === source))
    );
    setCardQtys((prev) => ({ ...prev, [productId]: 0 }));
  };

  const totalPrice = selectedProducts.reduce(
    (sum, p) => sum + p.price * (p.quantity || 0),
    0
  );

  const selectedDiscount = config.has_discount_offer && config.selected_discount_id
    ? activeDiscounts.find(d => String(d.id) === String(config.selected_discount_id))
    : null;

  const discountType = selectedDiscount ? selectedDiscount.type : config.discount_selection; // 'percentage' or 'fixed'
  const discountVal = selectedDiscount ? parseFloat(selectedDiscount.value) : (parseFloat(config.discount_amount) || 0);
  const hasDiscount =
    !!discountType &&
    !Number.isNaN(discountVal) &&
    discountVal > 0;
  const discountedPrice =
    String(discountType).toLowerCase() === 'percentage'
      ? totalPrice * (1 - discountVal / 100)
      : Math.max(0, totalPrice - discountVal);
  const finalPrice = hasDiscount ? discountedPrice : totalPrice;

  const renderTabs = () => {
    if (config.layout !== 'layout2') return null;
    const tabs = [];
    if (config.show_tab_all !== false) {
      tabs.push({ label: config.tab_all_label || 'Collections', value: 'all' });
    }
    for (let i = 1; i <= (config.tab_count || 4); i++) {
      const handle = config[`col_${i}`];
      if (handle) {
        const col = (collections || []).find((c) => c.handle === handle);
        tabs.push({ label: col ? col.title : (config[`step_${i}_title`] || handle), value: handle });
      }
    }
    if (tabs.length === 0) return null;

    return (
      <div style={{ width: `${config.tabs_width || 100}%`, margin: '0 auto' }}>
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            borderBottom: '1px solid #eee',
            background: '#fff',
          }}
          className="cdo-slider-horizontal"
        >
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '25px',
                  border: `1px solid ${isActive ? config.selection_highlight_color || '#5e1c5f' : '#eee'}`,
                  background: isActive
                    ? config.selection_highlight_color || '#5e1c5f'
                    : '#fff',
                  color: isActive ? '#fff' : '#444',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!config.show_progress_bar) return null;
    const percent = discountThreshold > 0 ? Math.min(100, Math.round((totalItems / discountThreshold) * 100)) : 0;
    const primaryColor = config.primary_color || config.selection_highlight_color || '#ca275c';

    return (
      <div style={{ width: `${config.progress_bar_width || 100}%`, margin: '0 auto' }}>
        <div style={{ padding: '20px 20px 10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span style={{ color: totalItems >= discountThreshold ? '#4CAF50' : (config.progress_bar_color || primaryColor) }}>
              {totalItems >= discountThreshold
                ? `Bundle Complete! ${config.discount_percentage > 0 ? config.discount_percentage + '% discount applied! 🎉' : '🎉'}`
                : config.progress_text || (totalItems < discountThreshold ? `Add ${discountThreshold - totalItems} more for discount` : 'Discount Unlocked!')}
            </span>
            <span style={{ color: '#6d7175' }}>{percent}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${percent}%`,
              background: config.progress_bar_color || primaryColor,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 0 10px ${(config.progress_bar_color || primaryColor)}40`
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                backgroundSize: '20px 20px',
                opacity: 0.2
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewBar = () => {
    const savings = totalPrice - finalPrice;
    return (
      <div style={{ width: `${config.preview_bar_width || 100}%`, margin: '0 auto' }}>
        <div
          style={{
            background: config.layout === 'layout4' ? 'rgba(255, 255, 255, 0.7)' : config.preview_bar_bg,
            backdropFilter: config.layout === 'layout4' ? 'blur(10px)' : 'none',
            WebkitBackdropFilter: config.layout === 'layout4' ? 'blur(10px)' : 'none',
            color: config.preview_bar_text_color,
            borderRadius: config.preview_border_radius,
            padding: config.preview_bar_padding,
            minHeight: config.preview_bar_height,
            fontSize: config.preview_font_size,
            fontWeight: previewFontWeight,
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: config.show_preview_bar ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 0,
            border: config.layout === 'layout4' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
            boxShadow: config.layout === 'layout4' ? '0 8px 32px 0 rgba(31, 38, 135, 0.07)' : 'none',
          }}
        >
          {/* Product images neatly centered */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: previewGap,
              width: '100%',
              minHeight: baseSize + 8,
              marginBottom: 4,
            }}
          >
            {(() => {
              const flattenedProducts = selectedProducts.flatMap((p) =>
                Array(p.quantity || 0).fill(p)
              );
              return [...Array(maxSel)].map((_, i) => {
                const item = flattenedProducts[i];
                const shape = shapeStyles(baseSize);
                return (
                  <div
                    key={i}
                    style={{
                      ...shape,
                      background: config.preview_item_color,
                      border: `2px solid ${config.preview_item_border_color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      padding: 0,
                      paddingTop: 0,
                      flexShrink: 0,
                      overflow: 'hidden',
                      boxShadow: item ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {item ? (
                      <img
                        src={item.image}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 'inherit',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                        }}
                        alt="selected"
                      />
                    ) : (
                      <span style={{ fontSize: baseSize * 0.7, color: '#bbb' }}>
                        +
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          {/* Motivation/Unlocked Message */}
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div
              style={{
                fontSize: '13px',
                color: totalItems >= discountThreshold ? '#28a745' : '#888',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {totalItems >= discountThreshold ? (
                <>
                  <span style={{ fontSize: '16px' }}>🎉</span>
                  {config.discount_unlocked_text || 'Discount Unlocked!'}
                </>
              ) : (
                <>
                  {totalItems > 0 && (config.discount_motivation_text || 'Add {{remaining}} more to get a discount').replace('{{remaining}}', Math.max(0, discountThreshold - totalItems))}
                </>
              )}
            </div>
          </div>
          {/* Prices row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              width: '100%',
              minHeight: 32,
            }}
          >
            {hasDiscount && finalPrice < totalPrice && (
              <span
                style={{
                  fontSize: config.preview_original_price_size || 14,
                  color: config.preview_original_price_color || '#999',
                  textDecoration: 'line-through',
                  whiteSpace: 'nowrap',
                }}
              >
                Rs.{totalPrice.toFixed(2)}
              </span>
            )}
            <span
              style={{
                fontSize: config.preview_discount_price_size || 18,
                color: config.preview_discount_price_color || config.selection_highlight_color || '#5e1c5f',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Rs.{finalPrice.toFixed(2)}
            </span>
            {savings > 0 && config.layout === 'layout4' && (
              <div style={{
                background: '#4CAF50',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                You Save Rs.{savings.toFixed(2)}
              </div>
            )}
          </div>
          {/* Buttons row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 18,
              width: '100%',
              minHeight: 40,
              marginTop: 8,
            }}
          >
            {config.show_add_to_cart_btn && (
              <button
                onClick={() => alert(config.checkout_btn_text || 'Proceed to Checkout')}
                style={{
                  background: config.preview_bar_button_bg || config.checkout_btn_bg || config.add_to_cart_btn_color,
                  color: config.preview_bar_button_text || config.checkout_btn_text_color || config.add_to_cart_btn_text_color,
                  border: `1px solid ${config.buy_btn_color || '#000'}`,
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontWeight: config.add_to_cart_btn_font_weight,
                  fontSize: config.add_to_cart_btn_font_size,
                  cursor: 'pointer',
                  marginRight: 8,
                  whiteSpace: 'nowrap',
                  minHeight: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {config.checkout_btn_text || config.add_to_cart_btn_text}
              </button>
            )}
            {config.show_buy_btn && (
              <button
                onClick={() => alert(config.buy_btn_text || 'Buy Now')}
                style={{
                  background: config.buy_btn_color,
                  color: config.buy_btn_text_color,
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 8,
                  fontWeight: config.buy_btn_font_weight,
                  fontSize: config.buy_btn_font_size,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {config.buy_btn_text}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleVariantChange = (productId, variantId) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }));
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(productId)) {
          const prod = products.find(
            (p) => String(p.id) === String(productId)
          );
          const variant = prod?.variants?.find(
            (v) => String(v.id) === String(variantId)
          );
          if (variant) {
            return {
              ...item,
              variantId: variant.id,
              price: parseFloat(variant.price || 0),
              image: variant.image?.src || prod.image?.src,
            };
          }
        }
        return item;
      })
    );
  };

  const ProductCardItem = ({ product, source = 'all' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    const hasVariants = product.variants && product.variants.length > 1;
    const selectedVariantId =
      selectedVariants[product.id] ||
      (product.variants && product.variants[0]?.id);
    const selectedVariant =
      (product.variants || []).find((v) => v.id === selectedVariantId) ||
      (product.variants && product.variants[0]);

    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(product.id) && p.source === source
    );

    const onAddClick = () => {
      if (isSelected) {
        if (!config.show_quantity_selector) {
          handleRemoveProduct(product.id, source);
        } else {
          handleInc(product.id, selectedVariant, source);
        }
      } else {
        if (hasVariants && config.product_card_variants_display === 'popup') {
          setShowPopup(true);
        } else {
          handleAddProduct(product, 1, selectedVariant, source);
        }
      }
    };

    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onAddClick}
        style={{
          cursor: 'pointer',
          border: isSelected
            ? `2px solid ${config.selection_highlight_color || '#5e1c5f'}`
            : isHovered && !isMobile
              ? '2px solid #ccc'
              : '2px solid #eee',
          borderRadius: config.card_border_radius || 12,
          overflow: 'hidden',
          background: 'white',
          width: '100%',
          margin: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          justifyContent: 'space-between',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          transform:
            isHovered && !isMobile ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow:
            isHovered && !isMobile
              ? '0 10px 20px rgba(0,0,0,0.1)'
              : '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* Variant Selection Popup Overlay */}
        {showPopup && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255,0.98)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              padding: isMobile ? '8px' : '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '8px' : '12px',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: '700',
                  fontSize: isMobile ? '10px' : '12px',
                  textTransform: 'uppercase',
                  color: '#666',
                }}
              >
                Pick Options
              </span>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: isMobile ? '18px' : '20px',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '6px' : '8px',
              }}
            >
              {product.variants.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    handleVariantChange(product.id, v.id);
                    handleAddProduct(product, 1, v, source);
                    setShowPopup(false);
                  }}
                  style={{
                    padding: isMobile ? '8px' : '10px',
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: '600',
                    background:
                      selectedVariantId === v.id
                        ? config.selection_highlight_color
                        : '#f9f9f9',
                    color: selectedVariantId === v.id ? '#fff' : '#333',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {v.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection Tick */}
        {isSelected && config.show_selection_tick && (
          <div
            style={{
              position: 'absolute',
              top: isMobile ? 4 : 8,
              right: isMobile ? 4 : 8,
              background: config.selection_highlight_color,
              color: 'white',
              width: isMobile ? 18 : 22,
              height: isMobile ? 18 : 22,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? 10 : 12,
              zIndex: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ✓
          </div>
        )}

        <div
          style={{
            width: '100%',
            height: productImageHeight,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <img
            src={
              selectedVariant?.image?.src ||
              selectedVariant?.image?.url ||
              product.image?.src ||
              product.featuredMedia?.preview?.image?.url ||
              'https://placehold.co/300x300?text=Product'
            }
            alt={product.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Hover Variants Popup */}
          {hasVariants &&
            config.product_card_variants_display === 'hover' &&
            isHovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(255,255,255,0.95)',
                  padding: '10px',
                  borderTop: '1px solid #eee',
                  zIndex: 3,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}
              >
                {product.variants.map((v) => (
                  <div
                    key={v.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVariantChange(product.id, v.id);
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      border:
                        selectedVariantId === v.id
                          ? `1px solid ${config.selection_highlight_color}`
                          : '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background:
                        selectedVariantId === v.id
                          ? config.selection_highlight_color
                          : 'white',
                      color: selectedVariantId === v.id ? 'white' : 'black',
                    }}
                  >
                    {v.title}
                  </div>
                ))}
              </div>
            )}
        </div>

        <div style={{ padding: productCardPadding }}>
          {/* Static Variants Display - Below Image */}
          {hasVariants && config.product_card_variants_display === 'static' && (
            <div
              style={{ marginBottom: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Select
                label="Variant"
                options={product.variants.map((v) => ({
                  label: v.title,
                  value: String(v.id),
                }))}
                value={selectedVariantId ? String(selectedVariantId) : ''}
                onChange={(v) => handleVariantChange(product.id, v)}
              />
            </div>
          )}

          <div
            style={{
              fontWeight: 500,
              marginBottom: 4,
              fontSize: `${productTitleSize}px`,
            }}
          >
            {product.title}
          </div>

          <div
            style={{
              fontWeight: 600,
              marginBottom: 8,
              fontSize: `${productPriceSize}px`,
            }}
          >
            Rs.{selectedVariant?.price || 0}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              borderTop: '1px solid #eee',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            {config.show_quantity_selector && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDec(product.id, source);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid #ddd',
                    background: '#f9f9f9',
                    borderRadius: '4px 0 0 4px',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={cardQtys[product.id] || 0}
                  onChange={(e) => handleQtyChange(product.id, e.target.value, source)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 35,
                    height: 32,
                    border: '1px solid #ddd',
                    borderLeft: 'none',
                    borderRight: 'none',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 14,
                    WebkitAppearance: 'none',
                    margin: 0,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInc(product.id, selectedVariant, source);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    border: '1px solid #ddd',
                    background: '#f9f9f9',
                    borderRadius: '0 4px 4px 0',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>
            )}
            {config.show_add_to_cart_btn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick();
                }}
                style={{
                  background: isSelected
                    ? '#ff4d4d'
                    : config.add_btn_bg || config.product_add_btn_color || '#000',
                  color: isSelected
                    ? '#fff'
                    : config.add_btn_text_color || config.product_add_btn_text_color || '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: config.product_add_btn_font_weight || 600,
                  fontSize: config.product_add_btn_font_size || 14,
                  marginLeft: 4,
                  transition: 'all 0.2s',
                }}
              >
                {config.add_btn_text || config.product_add_btn_text || 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProductsGrid = () => {
    if (isLoading) {
      return (
        <div
          style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⌛</div>
          <p>
            Loading products for {activeTab === 'all' ? 'All' : activeTab}...
          </p>
        </div>
      );
    }

    const isSlider = config.grid_layout_type === 'slider';
    const filteredProducts = products || [];

    if (filteredProducts.length === 0) {
      return (
        <div
          style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}
        >
          <p>No products found in this collection.</p>
        </div>
      );
    }

    return (
      <div style={{ width: `${config.grid_width || 100}%`, margin: '0 auto' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          {isSlider && (
            <>
              <button
                className="cdo-arrow-btn"
                onClick={() =>
                  sliderRef.current?.scrollBy({ left: -300, behavior: 'smooth' })
                }
                style={{ left: '10px' }}
              >
                ←
              </button>
              <button
                className="cdo-arrow-btn"
                onClick={() =>
                  sliderRef.current?.scrollBy({ left: 300, behavior: 'smooth' })
                }
                style={{ right: '10px' }}
              >
                →
              </button>
            </>
          )}
          <div
            ref={sliderRef}
            className={isSlider ? 'cdo-slider-horizontal' : 'cdo-grid-vertical'}
            style={{
              display: isSlider ? 'flex' : 'grid',
              gridTemplateColumns: isSlider
                ? 'none'
                : `repeat(${effectiveColumns}, minmax(0, 1fr))`,
              flexDirection: isSlider ? 'row' : 'column',
              flexWrap: 'nowrap',
              gap: gridGap,
              paddingTop: config.products_padding_top,
              paddingBottom: config.products_padding_bottom,
              width: '100%',
              boxSizing: 'border-box',
              alignItems: 'stretch',
              marginTop: config.products_margin_top,
              marginBottom: config.products_margin_bottom,
              overflowX: isSlider ? 'auto' : 'visible',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: isSlider ? 'x mandatory' : 'none',
              paddingLeft: isSlider ? '20px' : '0',
              paddingRight: isSlider ? '20px' : '0',
              scrollbarWidth: 'none',
            }}
          >
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  minWidth: isSlider ? (isMobile ? '220px' : '280px') : 'auto',
                  width: isSlider ? (isMobile ? '220px' : '280px') : 'auto',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                }}
              >
                <ProductCardItem product={product} source={activeTab} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  let sectionOrder;
  const progressSec = config.show_progress_bar ? [renderProgressBar] : [];

  if (config.layout === 'layout2') {
    // For Combo Design Two, show the title/description first,
    // then the collection tabs directly underneath.
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderTabs,
      renderPreviewBar,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option2') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option3') {
    sectionOrder = [
      ...progressSec,
      renderProductsGrid,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderTitleDescription,
    ];
  } else if (config.new_option_dropdown === 'option4') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option5') {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
      renderPreviewBar,
    ];
  } else if (config.new_option_dropdown === 'option6') {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option7' ||
    config.layout === 'layout3'
  ) {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option8' ||
    config.layout === 'layout4'
  ) {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
      renderPreviewBar,
    ];
  } else if (config.new_option_dropdown === 'option9') {
    sectionOrder = [
      ...progressSec,
      renderPreviewBar,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTabs,
      renderPreviewBar,
      renderTitleDescription,
      renderProductsGrid,
    ];
  }

  const renderGlobalStickyBar = () => {
    if (!config.show_sticky_preview_bar) return null;

    return (
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: config.sticky_preview_bar_bg || '#fff',
          borderTop: config.layout === 'layout2' ? 'none' : '1px solid #eee',
          padding: config.sticky_preview_bar_padding,
          display: 'flex',
          flexDirection: config.layout === 'layout2' ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: config.layout === 'layout2' ? 'stretch' : 'center',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
          zIndex: 50,
          width: config.sticky_preview_bar_full_width
            ? '100%'
            : config.sticky_preview_bar_width,
          boxSizing: 'border-box',
          color: config.sticky_preview_bar_text_color || '#333',
          borderRadius: config.layout === 'layout2' ? '30px 30px 0 0' : '0',
          backdropFilter: 'blur(15px)',
          marginTop: 'auto',
          minHeight: config.sticky_preview_bar_height,
        }}
      >
        {config.layout === 'layout2' && (
          <div
            style={{
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {/* Progress bar removed as per user request */}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              overflowX: 'visible',
            }}
          >
            {(() => {
              const flattenedProducts = selectedProducts.flatMap((p) =>
                Array(p.quantity || 0).fill(p)
              );

              if (flattenedProducts.length === 0) return null;

              const maxVisible = 3;
              const visible = flattenedProducts.slice(0, maxVisible);
              const overflow = flattenedProducts.length - maxVisible;
              const avatarSize = isMobile ? 32 : 40;
              const overlapMargin = isMobile ? -10 : -12;

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 0,
                  }}
                >
                  {visible.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: '999px',
                        border: '2px solid #fff',
                        overflow: 'hidden',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        background: '#e5e7eb',
                        marginLeft: i === 0 ? 0 : overlapMargin,
                      }}
                    >
                      <img
                        src={p.image}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div
                      style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: '999px',
                        border: '2px solid #fff',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        marginLeft: overlapMargin,
                        background:
                          config.selection_highlight_color || '#0070f3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 700,
                      }}
                    >
                      +{overflow}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div
            style={{
              borderLeft: '1px solid #eee',
              paddingLeft: isMobile ? '10px' : '16px',
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                {hasDiscount && finalPrice < totalPrice && (
                  <div
                    style={{
                      fontSize: isMobile ? '11px' : '13px',
                      color: '#999',
                      textDecoration: 'line-through',
                      opacity: 0.6,
                    }}
                  >
                    Rs.{totalPrice.toFixed(2)}
                  </div>
                )}
                <div
                  style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: '900',
                    color: config.selection_highlight_color || '#5e1c5f',
                  }}
                >
                  Rs.{finalPrice.toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  fontSize: isMobile ? '10px' : '12px',
                  color: totalItems >= discountThreshold ? '#28a745' : '#888',
                  fontWeight: '700',
                  marginTop: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {totalItems >= discountThreshold ? (
                  <>
                    <span style={{ fontSize: isMobile ? '12px' : '14px' }}>🎉</span>
                    {config.discount_unlocked_text || 'Discount Unlocked!'}
                  </>
                ) : (
                  <>
                    {totalItems > 0 && (config.discount_motivation_text || 'Add {{remaining}} more to get a discount').replace('{{remaining}}', Math.max(0, discountThreshold - totalItems))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          style={{
            background: config.sticky_checkout_btn_bg || config.selection_highlight_color || '#7c3aed',
            color: config.sticky_checkout_btn_text_color || '#fff',
            border: 'none',
            padding: isMobile ? '10px 18px' : '12px 32px',
            borderRadius: '50px',
            fontWeight: '800',
            fontSize: isMobile ? '13px' : '15px',
            cursor: 'pointer',
            marginTop: isMobile ? '12px' : '16px',
            marginLeft: isMobile ? '12px' : '20px',
            whiteSpace: 'nowrap',
            transition: 'transform 0.2s',
          }}
        >
          {config.sticky_checkout_btn_text || (isMobile ? 'Buy' : 'Checkout')}
        </button>
      </div>
    );
  };

  // === Layout 3 (FMCG / App Style) Specific Rendering ===
  if (config.layout === 'layout3') {
    const primaryColor = config.primary_color || '#20D060';
    const bgColor = '#eef2f7';
    const textColor = config.text_color || '#111';

    return (
      <div
        style={{
          background: bgColor,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: textColor,
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '480px', // App-like width constraint for preview
          margin: '0 auto',
        }}
      >
        {/* App Header */}

        <div style={{ paddingBottom: '100px' }}>
          {' '}
          {/* Scroll Content */}
          {/* Hero Section */}
          {config.show_hero !== false && (
            <div style={{ padding: '16px 20px' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  padding: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    background: primaryColor,
                    color: '#000',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'inline-block',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  DEAL OF THE DAY
                </div>
                <div
                  style={{
                    width: '100%',
                    height:
                      config.banner_fit_mode === 'adapt' ? 'auto' : '160px',
                    background: '#f9f9f9',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {config.enable_banner_slider && banners.length > 1 ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      {banners.map((banner, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: currentSlide === idx ? 1 : 0,
                            transition: 'opacity 0.8s ease-in-out',
                            zIndex: currentSlide === idx ? 1 : 0
                          }}
                        >
                          <img
                            src={banner.image}
                            alt={banner.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: bannerObjectFit,
                              display: 'block',
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                            padding: '10px 15px',
                            color: 'white'
                          }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{banner.title}</div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>{banner.subtitle}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <img
                      src={
                        config.hero_image_url ||
                        'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455'
                      }
                      alt="Hero"
                      style={{
                        width: '100%',
                        height:
                          config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
                        objectFit:
                          config.banner_fit_mode === 'cover' ||
                            config.banner_fit_mode === 'contain'
                            ? config.banner_fit_mode
                            : 'cover',
                        display: 'block',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      lineHeight: 1.2,
                      flex: 1,
                    }}
                  >
                    {titles[bundleIndex] || config.hero_title || 'Mega Breakfast Bundle'}
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: primaryColor,
                      marginLeft: '12px',
                    }}
                  >
                    {config.hero_price || '$14.99'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    textDecoration: 'line-through',
                    color: '#bbb',
                    textAlign: 'right',
                    marginTop: '-4px',
                    marginBottom: '8px',
                  }}
                >
                  {config.hero_compare_price || '$24.50'}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '16px',
                  }}
                >
                  {subtitles[bundleIndex] || config.hero_subtitle || 'Milk, Bread, Eggs, Cereal & Juice'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    fontSize: '11px',
                    color: '#888',
                    fontWeight: '600',
                  }}
                >
                  ENDS IN:
                  <span
                    style={{
                      background: '#eafff2',
                      color: primaryColor,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px',
                    }}
                  >
                    {time.h}
                  </span>{' '}
                  :
                  <span
                    style={{
                      background: '#eafff2',
                      color: primaryColor,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px',
                    }}
                  >
                    {time.m}
                  </span>{' '}
                  :
                  <span
                    style={{
                      background: '#eafff2',
                      color: primaryColor,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '13px',
                    }}
                  >
                    {time.s}
                  </span>
                </div>

                <button
                  style={{
                    width: '100%',
                    background: primaryColor,
                    color: '#000',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  🛒 {config.hero_btn_text || 'Add to Cart - Save 38%'}
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {config.show_progress_bar && (
            <div style={{ padding: '0 20px 15px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: '800',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span style={{ color: config.progress_bar_color || primaryColor }}>
                  {config.progress_text || (totalItems < discountThreshold ? `Add ${discountThreshold - totalItems} more for discount` : 'Discount Unlocked!')}
                </span>
                <span>{Math.min(100, Math.round((totalItems / discountThreshold) * 100))}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (totalItems / discountThreshold) * 100)}%`,
                  background: config.progress_bar_color || primaryColor,
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `0 0 10px ${(config.progress_bar_color || primaryColor)}40`
                }} />
              </div>
            </div>
          )}

          {/* Nav Pills */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              padding: '8px 20px 20px',
              scrollbarWidth: 'none',
            }}
          >
            {[1, 2, 3, 4]
              .map((i) => ({
                handle: config[`col_${i}`],
                title: config[`title_${i}`] || (i === 1 ? 'All Packs' : `Category ${i}`)
              }))
              .filter((t) => t.handle || t.title)
              .map((tab, idx) => {
                const isActive = activeTab === (idx === 0 && config.show_tab_all !== false ? 'all' : tab.handle);
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(idx === 0 && config.show_tab_all !== false ? 'all' : tab.handle)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 20px',
                      borderRadius: '20px',
                      backgroundColor: isActive ? (config.selection_highlight_color || primaryColor) : '#fff',
                      border: `1px solid ${isActive ? (config.selection_highlight_color || primaryColor) : '#eee'}`,
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isActive ? '#fff' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {tab.title}
                  </div>
                );
              })}
          </div>
          {/* Grid Section */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 20px 12px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '700' }}>
              Curated For You
            </div>
            <div
              style={{
                fontSize: '12px',
                color: primaryColor,
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              View All
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '0 20px 40px',
            }}
          >
            {isLoading ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                Loading products...
              </div>
            ) : (
              products.slice(0, 6).map((product) => {
                if (!product) return null;
                const isSelected = selectedProducts.some(
                  (p) => String(p.id) === String(product.id)
                );
                const qty = cardQtys[product.id] || 0;

                // Safe variant access
                let price = '10.00';
                if (product.variants) {
                  if (Array.isArray(product.variants)) {
                    price = product.variants[0]?.price || '10.00';
                  } else if (product.variants.nodes) {
                    price = product.variants.nodes[0]?.price || '10.00';
                  }
                }

                return (
                  <div
                    key={product.id}
                    style={{
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                      padding: '10px',
                      position: 'relative',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: primaryColor,
                        color: '#000',
                        fontSize: '9px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        zIndex: 2,
                      }}
                    >
                      -20%
                    </div>
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        background: '#f9f9f9',
                        marginBottom: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={
                          product.featuredMedia?.preview?.image?.url ||
                          'https://placehold.co/300x300'
                        }
                        alt={product.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        lineHeight: 1.3,
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {product.title}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#888',
                        marginBottom: '8px',
                      }}
                    >
                      {config.vendor || 'Brand'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '800' }}>
                          Rs.{price}
                        </span>
                      </div>
                    </div>

                    {!isSelected ? (
                      <button
                        onClick={() => handleAddProduct(product)}
                        style={{
                          width: '100%',
                          background: '#eafff2',
                          color: '#1a1a1a',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
                        <button
                          onClick={() => handleDec(product.id)}
                          style={{
                            flex: 1,
                            background: primaryColor,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            padding: '0 4px',
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          onClick={() => handleInc(product.id)}
                          style={{
                            flex: 1,
                            background: primaryColor,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        {selectedProducts.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1a1a',
              color: '#fff',
              width: 'calc(100% - 40px)',
              maxWidth: '440px',
              padding: '12px 20px',
              borderRadius: '50px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              zIndex: 500,
            }}
          >
            <div>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>Total</span>
              <br />
              {/* Calculate Total correctly */}
              <strong style={{ fontSize: '14px' }}>
                Rs.
                {selectedProducts
                  .reduce((sum, p) => sum + p.price * (p.quantity || 0), 0)
                  .toFixed(2)}
              </strong>
            </div>
            <div
              style={{ fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              onClick={() => alert('Checkout')}
            >
              View Cart →
            </div>
          </div>
        )}
      </div>
    );
  }

  // === Layout 1 (Multi-Step / Build Your Box) Specific Rendering ===
  if (config.layout === 'layout1') {
    const allSteps = [1, 2, 3, 4, 5];

    // Determine which steps are "active" (configured)
    const activeSteps = allSteps.filter((step) => {
      if (step === 1) return true; // Step 1 always active
      return config[`step_${step}_collection`] || config[`step_${step}_title`];
    });

    const totalItems = selectedProducts.reduce(
      (sum, p) => sum + (p.quantity || 0),
      0
    );
    const totalSteps = activeSteps.length;
    const discountThreshold = config.discount_threshold || 5;
    const percent =
      discountThreshold > 0
        ? Math.min(100, Math.round((totalItems / discountThreshold) * 100))
        : 0;

    return (
      <div
        style={{
          background: '#fff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: '#333',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Top Progress Bar */}
        {config.show_progress_bar && (
          <div
            style={{
              background: '#fff',
              padding: '20px',
              position: 'sticky',
              top: 0,
              zIndex: 100,
              borderBottom: '1px solid #eee',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '800',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  color: config.progress_bar_color,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                }}
              >
                {config.progress_text || 'Bundle Progress'}
              </span>
              <span style={{ color: '#5c5f62' }}>{percent}%</span>
            </div>
            <div
              style={{
                background: '#f1f2f3',
                height: '12px',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  background: `linear-gradient(90deg, ${config.progress_bar_color}, ${config.progress_bar_color}cc)`,
                  height: '100%',
                  width: `${percent}%`,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  borderRadius: '10px',
                  boxShadow: `0 0 10px ${config.progress_bar_color}40`,
                }}
              >
                {/* Animated Shine Effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                    backgroundSize: '30px 30px',
                    opacity: 0.3,
                  }}
                />
                {/* Glowing Tip */}
                {percent > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      height: '100%',
                      width: '4px',
                      background: '#fff',
                      boxShadow: `0 0 8px 2px #fff`,
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            </div>
            <div
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: '#6d7175',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {totalItems < discountThreshold ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      background: `${config.progress_bar_color}15`,
                      borderRadius: '50%',
                      textAlign: 'center',
                      lineHeight: '16px',
                      fontSize: '10px',
                      color: config.progress_bar_color,
                    }}
                  >
                    !
                  </span>
                  <span>
                    Add{' '}
                    <strong>
                      {Math.max(0, discountThreshold - totalItems)}
                    </strong>{' '}
                    more for{' '}
                    <strong>{config.discount_text || config.progress_text || 'Bundle Discount'}</strong>
                  </span>
                </>
              ) : (
                <span
                  style={{
                    color: '#008060',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>🎉</span> Discount
                  Unlocked!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Banner Image */}
        {config.show_banner !== false && (
          <div
            style={{
              width: config.banner_full_width
                ? 'calc(100% + 40px)'
                : `${bannerWidth}%`,
              height: finalBannerHeight,
              margin: config.banner_full_width ? '0 -20px' : '0 auto',
              overflow: 'hidden',
              background:
                config.banner_image_url || config.banner_image_mobile_url
                  ? 'none'
                  : '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {config.banner_image_url || config.banner_image_mobile_url ? (
              <img
                src={
                  isMobile && config.banner_image_mobile_url
                    ? config.banner_image_mobile_url
                    : config.banner_image_url
                }
                alt="Banner"
                style={{
                  width: '100%',
                  height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%',
                  objectFit: bannerObjectFit,
                  display: 'block',
                }}
              />
            ) : (
              <span style={{ color: '#999' }}>Banner Image Placeholder</span>
            )}
          </div>
        )}

        {/* Title & Description */}
        {config.show_title_description !== false && (
          <div style={{ padding: '24px 20px', textAlign: headingAlign }}>
            <h1
              style={{
                fontSize: `${isMobile ? parseInt(config.heading_size || 28) * 0.8 : config.heading_size || 28}px`,
                fontWeight: '800',
                marginBottom: '10px',
                color: config.heading_color || '#333',
              }}
            >
              {config.collection_title || 'Create Your Combo'}
            </h1>
            <p
              style={{
                color: config.description_color || '#666',
                fontSize: `${config.description_size || 15}px`,
                lineHeight: '1.5',
                textAlign: descriptionAlign,
              }}
            >
              {config.collection_description ||
                'Select items to build your perfect bundle.'}
            </p>
          </div>
        )}

        {/* Collections / Steps */}
        <div style={{ padding: '20px', flex: 1 }}>
          {activeSteps.map((step, index) => {
            const stepTitle =
              config[`step_${step}_title`] || `Category ${step}`;
            const stepSubtitle =
              config[`step_${step}_subtitle`] || 'Select your items';
            const isCompleted = selectedProducts.length > index;

            return (
              <div key={step} style={{ marginBottom: '40px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                      {stepTitle}
                    </h3>
                    {isCompleted && (
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#888' }}>
                    {stepSubtitle}
                  </p>
                </div>

                {config.grid_layout_type === 'slider' ? (
                  /* Slider Mockup */
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      overflowX: 'auto',
                      paddingBottom: '10px',
                      scrollbarWidth: 'none',
                    }}
                  >
                    {products.slice(0, 6).map((p) => (
                      <div
                        key={p.id}
                        style={{ minWidth: '160px', width: '160px' }}
                      >
                        <ProductCardItem product={p} source={`step_${step}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Grid Layout */
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${device === 'desktop' ? config.desktop_columns || 3 : config.mobile_columns || 2}, minmax(0, 1fr))`,
                      gap: '16px',
                    }}
                  >
                    {products.slice(0, 6).map((p) => (
                      <ProductCardItem key={p.id} product={p} source={`step_${step}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {renderGlobalStickyBar()}
      </div>
    );
  }

  return (
    <div style={{ background: '#eef1f5', padding: 16 }}>
      <div
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          paddingTop: paddingTop,
          paddingRight: paddingRight,
          paddingBottom: paddingBottom,
          paddingLeft: paddingLeft,
          background: '#f9f9f9',
          maxWidth: viewportWidth,
          margin: '0 auto',
          border: '1px solid #e5e5e5',
          borderRadius: 12,
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          minHeight: '100%',
          position: 'relative',
        }}
      >
        <style>{previewStyles}</style>
        {sectionOrder.map((Section, idx) => (
          <div key={idx}>{Section()}</div>
        ))}
        {renderGlobalStickyBar()}
      </div>
    </div>
  );
}
