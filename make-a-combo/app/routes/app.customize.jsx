import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  Icon,
  Text,
  Tooltip,
} from '@shopify/polaris';
import {
  EditIcon,
  DesktopIcon,
  MobileIcon,
  LayoutColumns3Icon,
  PaintBrushFlatIcon,
  SettingsIcon,
  MagicIcon,
} from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { CdoPreviewBar } from '../components/CdoPreviewBar';
import { getDb, sendToPhp } from '../utils/api-helpers';

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const discountData = Object.fromEntries(formData);
    const db = await getDb(shop);
    const discounts = db.discounts || [];

    const type = String(discountData.type || 'amount_off_products');
    const title = String(discountData.title || '').trim();
    const valueType = String(discountData.valueType || 'percentage');
    const startsAt = discountData.startsAt
      ? new Date(discountData.startsAt).toISOString()
      : new Date().toISOString();
    const endsAt = discountData.endsAt
      ? new Date(discountData.endsAt).toISOString()
      : null;
    const parseBool = (v) => v === true || v === 'true' || v === 'on';
    const parseNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    if (!title) {
      return json({ error: 'Title is required' }, { status: 400 });
    }

    if (
      [
        'amount_off_products',
        'amount_off_order',
        'percentage',
        'fixed',
        'amount',
      ].includes(type)
    ) {
      const baseValue = parseNum(discountData.value);
      if (!Number.isFinite(baseValue) || baseValue <= 0) {
        return json({ error: 'Value must be greater than 0' }, { status: 400 });
      }
    }

    if (type === 'buy_x_get_y') {
      const buyQty = parseNum(discountData.buyQuantity);
      const getQty = parseNum(discountData.getQuantity);
      const getVal = parseNum(discountData.getValue);
      if (!Number.isFinite(buyQty) || buyQty <= 0) {
        return json({ error: 'Buy quantity is required' }, { status: 400 });
      }
      if (!Number.isFinite(getQty) || getQty <= 0) {
        return json({ error: 'Get quantity is required' }, { status: 400 });
      }
      if (!Number.isFinite(getVal) || getVal <= 0) {
        return json({ error: 'Get value is required' }, { status: 400 });
      }
    }

    const minimumRequirement =
      discountData.minRequirementType === 'amount' &&
      discountData.minRequirementValue
        ? {
            subtotal: {
              greaterThanOrEqualToSubtotal: parseFloat(
                discountData.minRequirementValue
              ),
            },
          }
        : discountData.minRequirementType === 'quantity' &&
            discountData.minRequirementValue
          ? {
              quantity: {
                greaterThanOrEqualToQuantity: String(
                  discountData.minRequirementValue
                ),
              },
            }
          : null;

    let combinations = { product: false, order: false, shipping: false };
    try {
      if (discountData.combinations) {
        combinations = JSON.parse(discountData.combinations);
      }
    } catch (err) {
      console.warn(
        '[Customize] Failed parsing combinations JSON:',
        err.message
      );
    }

    const usageLimit = discountData.maxUsage
      ? parseInt(discountData.maxUsage, 10)
      : null;
    const appliesOncePerCustomer = parseBool(discountData.oncePerCustomer);
    const code = discountData.code
      ? String(discountData.code).toUpperCase()
      : title.toUpperCase().replace(/\s+/g, '');

    let shopifyDiscountId = null;

    if (
      [
        'amount_off_products',
        'amount_off_order',
        'percentage',
        'fixed',
        'amount',
      ].includes(type)
    ) {
      const mutation = `#graphql
        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode { id }
            userErrors { field message }
          }
        }
      `;

      const discountValue = parseFloat(discountData.value || 0) || 0;
      const isPercentage = valueType === 'percentage';
      const customerGetsValue = isPercentage
        ? { percentage: discountValue / 100 }
        : {
            discountAmount: {
              amount: String(discountValue),
              appliesOnEachItem: type !== 'amount_off_order',
            },
          };

      const variables = {
        basicCodeDiscount: {
          title,
          code,
          startsAt,
          ...(endsAt ? { endsAt } : {}),
          customerSelection: { all: true },
          customerGets: {
            value: customerGetsValue,
            items: type === 'amount_off_order' ? { all: true } : { all: true },
          },
          appliesOncePerCustomer,
          combinesWith: {
            orderDiscounts: !!combinations.order,
            productDiscounts: !!combinations.product,
            shippingDiscounts: !!combinations.shipping,
          },
          ...(minimumRequirement ? { minimumRequirement } : {}),
          ...(usageLimit ? { usageLimit } : {}),
        },
      };

      const response = await admin.graphql(mutation, { variables });
      const responseJson = await response.json();
      const userErrors =
        responseJson.data?.discountCodeBasicCreate?.userErrors || [];

      if (userErrors.length > 0) {
        return json(
          {
            error: `Shopify Error: ${userErrors.map((e) => e.message).join(', ')}`,
          },
          { status: 400 }
        );
      }

      shopifyDiscountId =
        responseJson.data?.discountCodeBasicCreate?.codeDiscountNode?.id ||
        null;
    } else if (type === 'free_shipping') {
      const mutation = `#graphql
        mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
          discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
            codeDiscountNode { id }
            userErrors { field message }
          }
        }
      `;

      const variables = {
        freeShippingCodeDiscount: {
          title,
          code,
          startsAt,
          ...(endsAt ? { endsAt } : {}),
          customerSelection: { all: true },
          destination: { all: true },
          appliesOncePerCustomer,
          combinesWith: {
            orderDiscounts: !!combinations.order,
            productDiscounts: !!combinations.product,
            shippingDiscounts: !!combinations.shipping,
          },
          ...(minimumRequirement ? { minimumRequirement } : {}),
          ...(usageLimit ? { usageLimit } : {}),
        },
      };

      const response = await admin.graphql(mutation, { variables });
      const responseJson = await response.json();
      const userErrors =
        responseJson.data?.discountCodeFreeShippingCreate?.userErrors || [];

      if (userErrors.length > 0) {
        return json(
          {
            error: `Shopify Error: ${userErrors.map((e) => e.message).join(', ')}`,
          },
          { status: 400 }
        );
      }

      shopifyDiscountId =
        responseJson.data?.discountCodeFreeShippingCreate?.codeDiscountNode
          ?.id || null;
    } else if (type === 'buy_x_get_y') {
      const mutation = `#graphql
        mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
          discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
            codeDiscountNode { id }
            userErrors { field message }
          }
        }
      `;

      const getValueType = String(discountData.getValueType || 'percentage');
      const getValue = parseFloat(discountData.getValue || 0) || 0;
      const buyQuantity = String(parseInt(discountData.buyQuantity, 10));
      const getQuantity = String(parseInt(discountData.getQuantity, 10));
      const buyTargetType = String(discountData.buyTargetType || 'products');
      const getTargetType = String(discountData.getTargetType || 'all');

      let buyTargetIds = [];
      let getTargetIds = [];
      try {
        buyTargetIds = discountData.buyTargetIds
          ? JSON.parse(discountData.buyTargetIds)
          : [];
        getTargetIds = discountData.getTargetIds
          ? JSON.parse(discountData.getTargetIds)
          : [];
      } catch (err) {
        return json(
          { error: 'Invalid buy/get target data provided' },
          { status: 400 }
        );
      }

      const customerBuysItems =
        buyTargetType === 'collections'
          ? {
              collections: {
                add: buyTargetIds,
              },
            }
          : {
              products: {
                productsToAdd: buyTargetIds,
              },
            };

      const customerGetsItems =
        getTargetType === 'all'
          ? { all: true }
          : getTargetType === 'collections'
            ? {
                collections: {
                  add: getTargetIds,
                },
              }
            : {
                products: {
                  productsToAdd: getTargetIds,
                },
              };

      if (!buyTargetIds.length) {
        return json(
          {
            error:
              buyTargetType === 'collections'
                ? 'Select at least one collection for customer buys'
                : 'Select at least one product for customer buys',
          },
          { status: 400 }
        );
      }
      if (getTargetType !== 'all' && !getTargetIds.length) {
        return json(
          {
            error:
              getTargetType === 'collections'
                ? 'Select at least one collection for customer gets'
                : 'Select at least one product for customer gets',
          },
          { status: 400 }
        );
      }

      const effect =
        getValueType === 'fixed_amount'
          ? { amount: String(getValue) }
          : getValueType === 'free'
            ? { percentage: 1.0 }
            : { percentage: getValue / 100 };

      const variables = {
        bxgyCodeDiscount: {
          title,
          code,
          startsAt,
          ...(endsAt ? { endsAt } : {}),
          customerSelection: { all: true },
          appliesOncePerCustomer,
          combinesWith: {
            orderDiscounts: !!combinations.order,
            productDiscounts: !!combinations.product,
            shippingDiscounts: !!combinations.shipping,
          },
          ...(minimumRequirement ? { minimumRequirement } : {}),
          ...(usageLimit ? { usageLimit } : {}),
          customerBuys: {
            value: { quantity: buyQuantity },
            items: customerBuysItems,
          },
          customerGets: {
            value: {
              discountOnQuantity: {
                quantity: getQuantity,
                effect,
              },
            },
            items: customerGetsItems,
          },
        },
      };

      const response = await admin.graphql(mutation, { variables });
      const responseJson = await response.json();
      const userErrors =
        responseJson.data?.discountCodeBxgyCreate?.userErrors || [];

      if (userErrors.length > 0) {
        return json(
          {
            error: `Shopify Error: ${userErrors.map((e) => e.message).join(', ')}`,
          },
          { status: 400 }
        );
      }

      shopifyDiscountId =
        responseJson.data?.discountCodeBxgyCreate?.codeDiscountNode?.id || null;
    } else {
      return json({ error: 'Unsupported discount type' }, { status: 400 });
    }

    const nextId = Math.max(...discounts.map((d) => Number(d.id) || 0), 0) + 1;
    const newDiscount = {
      id: nextId,
      shopifyId: shopifyDiscountId,
      title,
      code,
      type,
      value:
        type === 'free_shipping'
          ? '0'
          : type === 'buy_x_get_y'
            ? String(discountData.getValue || '')
            : String(discountData.value || ''),
      valueType:
        type === 'buy_x_get_y'
          ? String(discountData.getValueType || 'percentage')
          : valueType,
      status: 'active',
      created: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      usage: usageLimit ? `0 / ${usageLimit}` : '0 / Unlimited',
      startsAt: discountData.startsAt || startsAt,
      endsAt: discountData.endsAt || null,
      oncePerCustomer: appliesOncePerCustomer,
    };

    discounts.push(newDiscount);

    // Sync to PHP
    try {
      await sendToPhp(
        {
          event: 'create',
          resource: 'discount',
          shop,
          data: newDiscount,
        },
        'discount.php'
      );
    } catch (err) {
      console.error('[Customize] PHP Sync Error:', err.message);
    }

    console.log(`[Combo App Customize] Discount created: ${newDiscount.title}`);

    return json({
      success: true,
      message: 'Discount code created on Shopify',
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
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const templateId = url.searchParams.get('templateId');
  const mode = url.searchParams.get('mode'); // 'resources' or 'full'

  // RESOURCE FETCHING MODE (Background)
  if (mode === 'resources') {
    console.log('[Customize Loader] Entering resources mode for shop:', shop);
    let collections = [];
    try {
      let hasNextPage = true,
        endCursor = null,
        pageCount = 0;
      while (hasNextPage && pageCount < 10) {
        console.log(
          `[Customize Loader] Fetching collections page ${pageCount + 1}, cursor: ${endCursor}`
        );
        const res = await admin.graphql(
          `#graphql
          query getCollections($cursor: String) {
            collections(first: 250, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes { id title handle }
            }
          }`,
          { variables: { cursor: endCursor } }
        );

        const json = await res.json();

        if (json.errors) {
          console.error(
            '[Customize Loader] GraphQL Errors:',
            JSON.stringify(json.errors)
          );
          break;
        }

        const data = json.data?.collections;
        if (data && data.nodes) {
          console.log(
            `[Customize Loader] Found ${data.nodes.length} collections on this page`
          );
          collections.push(
            ...data.nodes.map((n) => ({
              id: n.id,
              title: n.title,
              handle: n.handle,
              productsCount: 0, // Simplified for now
            }))
          );
          hasNextPage = data.pageInfo.hasNextPage;
          endCursor = data.pageInfo.endCursor;
        } else {
          console.log(
            '[Customize Loader] No more collections data in response'
          );
          break;
        }
        pageCount++;
      }
      console.log(
        `[Customize Loader] Total collections fetched: ${collections.length}`
      );
    } catch (e) {
      console.error('[Customize Loader] Collection fetch CRITICAL error:', e);
    }

    console.log('[Customize Loader] Fetching products and pages...');
    const productsRes = await admin
      .graphql(
        `#graphql
      query getProducts {
        products(first: 60) {
          nodes { id title handle vendor availableForSale totalInventory descriptionHtml images(first: 8) { nodes { url } } featuredMedia { preview { image { url } } } collections(first: 5) { nodes { handle } } variants(first: 10) { nodes { id title price compareAtPrice availableForSale inventoryQuantity image { url } } } }
        }
      }`
      )
      .then((r) => r.json())
      .catch((err) => {
        console.error('[Customize Loader] Product fetch error:', err);
        return { data: { products: { nodes: [] } } };
      });

    const products = (productsRes.data?.products?.nodes || []).map((p) => {
      const variants = p.variants?.nodes || [];
      const hasSellableVariant = variants.some(
        (v) => v.availableForSale === true || Number(v.inventoryQuantity || 0) > 0
      );

      return {
        ...p,
        available:
          p.availableForSale === true ||
          Number(p.totalInventory || 0) > 0 ||
          hasSellableVariant,
        collections: p.collections?.nodes || [],
        variants: variants.map((v) => ({
          ...v,
          available:
            v.availableForSale === true ||
            Number(v.inventoryQuantity || 0) > 0,
        })),
        secondImageSrc:
          p.images?.nodes?.length > 1 ? p.images.nodes[1].url : null,
      };
    });

    const pagesRes = await admin
      .graphql(
        `#graphql
      query getPages { pages(first: 50) { nodes { id handle title } } }`
      )
      .then((r) => r.json())
      .catch((err) => {
        console.error('[Customize Loader] Pages fetch error:', err);
        return { data: { pages: { nodes: [] } } };
      });
    const shopPages = pagesRes.data?.pages?.nodes || [];

    console.log(
      `[Customize Loader] Returning ${collections.length} collections, ${products.length} products, ${shopPages.length} pages`
    );
    return json({ collections, products, shopPages });
  }

  // INITIAL LOAD MODE (Fast)
  const db = await getDb(shop).catch(() => ({ templates: [], discounts: [] }));
  const shopTemplates = (db.templates || []).filter((t) => t.shop === shop);
  const initialTemplate = templateId
    ? shopTemplates.find((t) => String(t.id) === String(templateId)) || null
    : null;

  let initialCollections = [];
  try {
    const colRes = await admin.graphql(
      `#graphql
      query InitialCollections {
        collections(first: 250) {
          nodes {
            id
            title
            handle
          }
        }
      }`
    );

    const colJson = await colRes.json();
    initialCollections = (colJson.data?.collections?.nodes || []).map((n) => ({
      id: n.id,
      title: n.title,
      handle: n.handle,
      productsCount: 0,
    }));
  } catch (error) {
    console.error('[Customize Loader] Initial collection fetch error:', error);
  }

  const blocksDir = path.join(
    process.cwd(),
    'extensions',
    'combo-templates',
    'blocks'
  );
  let layoutFiles = [];
  try {
    if (fs.existsSync(blocksDir))
      layoutFiles = fs
        .readdirSync(blocksDir)
        .filter((f) => f.endsWith('.liquid'));
  } catch (e) {}

  return json({
    initialTemplate,
    shop,
    collections: initialCollections,
    existingTemplates: shopTemplates.map((t) => ({ id: t.id, title: t.title })),
    layoutFiles,
    activeDiscounts: (db.discounts || []).map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      value: d.value,
    })),
  });
};

// Helper for simple PxField component

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

const isPreviewProductInStock = (product) => {
  if (!product) return false;
  if (product.available === false) return false;

  const productInventory = parseInt(product.totalInventory, 10);
  if (Number.isFinite(productInventory) && productInventory > 0) return true;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return product.available !== false;

  return variants.some((variant) => {
    if (variant.available === false) return false;
    const inventory = parseInt(variant.inventoryQuantity, 10);
    if (Number.isFinite(inventory)) return inventory > 0;
    return variant.available !== false;
  });
};

const filterPreviewProductsByStock = (list, config) => {
  const items = Array.isArray(list) ? list : [];
  if (config?.show_sold_out_products) return items;
  return items.filter(isPreviewProductInStock);
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

const DEFAULT_COMBO_CONFIG = {
  show_tab_all: true,
  grid_layout_type: 'grid',
  show_nav_arrows: true,
  enable_touch_swipe: true,
  swipe_sensitivity: 5,
  show_scrollbar: false,
  arrow_color: '#ffffff',
  arrow_bg_color: '#000000',
  arrow_size: 40,
  arrow_border_radius: 50,
  arrow_opacity: 0.9,
  arrow_position: 'inside',
  scrollbar_color: '#dddddd',
  scrollbar_thickness: 4,
  desktop_columns: 4,
  mobile_columns: 2,
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
  enable_product_hover: false,
  product_hover_mode: 'second_image',
  progress_bar_color: '#000000',
  selection_highlight_color: '#000000',
  show_selection_tick: true,
  preview_icon_visibility: 'static', // hover, static
  preview_modal_content_gap: 10,
  preview_modal_gallery_ratio: 1.45,
  preview_modal_info_ratio: 0.85,
  preview_modal_gallery_columns: 2,
  preview_modal_show_arrows: true,
  product_card_variants_display: 'static', // hover, static, popup
  // Variant select dropdown styling defaults
  variant_select_bg: '#f9f9f9',
  variant_select_border_color: '#e0e0e0',
  variant_select_text_color: '#333333',
  variant_select_border_radius: 8,
  variant_select_font_size: 13,
  variant_select_padding_vertical: 9,
  variant_select_padding_horizontal: 12,
  variant_select_margin_top: 10,
  variant_select_margin_bottom: 12,
  variant_select_placeholder: '— Select a variant —',
  show_quantity_selector: true,
  show_sold_out_products: false,
  show_sticky_preview_bar: false,
  grid_layout_type: 'grid', // grid, slider
  // Progress bar defaults
  desktop_columns: '3', // 3 columns by default for desktop
  mobile_columns: '2', // 2 columns by default for mobile
  // Container Spacing
  container_padding_top_desktop: 24,
  container_padding_top_mobile: 16,
  container_padding_right_desktop: 24,
  container_padding_right_mobile: 12,
  container_padding_bottom_desktop: 80,
  container_padding_bottom_mobile: 80,
  container_padding_left_desktop: 24,
  container_padding_left_mobile: 12,

  // Grid/Layout Spacing
  products_gap: 16,
  products_gap_mobile: 10,
  grid_width: 100,

  // Title Container Spacing
  title_container_padding_top: 0,
  title_container_padding_top_mobile: 0,
  title_container_padding_bottom: 0,
  title_container_padding_bottom_mobile: 0,
  title_container_margin_top: 0,
  title_container_margin_top_mobile: 0,
  title_container_margin_bottom: 12,
  title_container_margin_bottom_mobile: 8,

  // Description Container Spacing
  description_container_padding_top: 0,
  description_container_padding_top_mobile: 0,
  description_container_padding_bottom: 0,
  description_container_padding_bottom_mobile: 0,
  description_container_margin_top: 0,
  description_container_margin_top_mobile: 0,
  description_container_margin_bottom: 20,
  description_container_margin_bottom_mobile: 16,
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
  discount_percentage: 10,
  ai_mode: false,
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
  max_selections: 3,
  max_products: 5,
  preview_bar_padding_bottom: 16,
  show_preview_bar: true,
  // New Button Customization Defaults
  add_btn_text: 'Add',
  add_btn_bg: '#000000',
  add_btn_text_color: '#ffffff',
  add_btn_font_size: 14,
  add_btn_font_weight: 600,
  add_btn_border_radius: 8,
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
  preview_checkout_btn_text: 'Proceed to Checkout',
  preview_checkout_btn_bg: '#000000',
  preview_checkout_btn_text_color: '#ffffff',
  preview_reset_btn_text: 'Reset Combo',
  preview_reset_btn_bg: '#ff4d4d',
  preview_reset_btn_text_color: '#ffffff',
  preview_original_price_color: '#999',
  preview_discount_price_color: '#000',
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
  product_image_ratio: 'square',
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
  title_container_margin_top: 0,
  title_container_margin_right: 0,
  title_container_margin_bottom: 0,
  title_container_margin_left: 0,
  description_container_padding_top: 0,
  description_container_padding_right: 0,
  description_container_padding_bottom: 0,
  description_container_padding_left: 0,
  description_container_margin_top: 0,
  description_container_margin_right: 0,
  description_container_margin_bottom: 0,
  description_container_margin_left: 0,
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
  // Responsive Typography Overrides
  heading_size_mobile: 22,
  description_size_mobile: 13,
  heading_align_mobile: 'left',
  description_align_mobile: 'left',
  product_title_size_desktop: 15,
  product_title_size_mobile: 12,
  product_price_size_desktop: 15,
  product_price_size_mobile: 12,
  // Responsive Spacing Overrides
  products_gap_desktop: 16,
  products_gap_mobile: 10,
  tab_font_size_mobile: 12,
  tab_padding_vertical_mobile: 8,
  tab_padding_horizontal_mobile: 14,
  tab_margin_top_mobile: 0,
  tab_margin_bottom_mobile: 16,
  add_btn_font_size_mobile: 12,
  checkout_btn_font_size_mobile: 13,
  banner_full_width: false,
  // Banner Slider Settings
  enable_banner_slider: true,
  slider_speed: 5,
  banner_1_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455',
  banner_1_title: 'Fresh Farm Produce',
  banner_1_subtitle: 'Get 20% off on all organic items',
  banner_2_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-fruits.jpg?v=1614349455',
  banner_2_title: 'Seasonal Fruits',
  banner_2_subtitle: 'Picked fresh from the orchard',
  banner_3_image:
    'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables.jpg?v=1614349455',
  banner_3_title: 'Green Wellness',
  banner_3_subtitle: 'Healthy greens for a healthy life',
  // Advanced Timer & Bundle Settings
  auto_reset_timer: true,
  change_bundle_on_timer_end: true,
  bundle_titles: 'Mega Breakfast,Healthy Lunch,Organic Dinner',
  bundle_subtitles:
    'Start your day right,Stay energized all day,Clean eating for tonight',
  discount_motivation_text:
    'Add {{remaining}} more items to unlock the discount!',
  discount_unlocked_text: 'Discount Unlocked!',
  // Collection Tabs Premium Styling
  tab_alignment: 'left',
  tab_navigation_mode: 'scroll',
  tab_font_size: 14,
  tab_padding_vertical: 12,
  tab_padding_horizontal: 28,
  tab_margin_top: 0,
  tab_margin_bottom: 24,
  tab_bg_color: '#f5f5ee',
  tab_text_color: '#555555',
  tab_active_bg_color: '#000000',
  tab_active_text_color: '#ffffff',
  tab_border_radius: 30,
  enable_product_hover: false,
  product_hover_mode: 'second_image', // description, second_image
};

const DESKTOP_PREVIEW_BASE_WIDTH = 1280;
const DESKTOP_PREVIEW_BASE_HEIGHT = 864;
const MOBILE_PREVIEW_BASE_WIDTH = 390;
const MOBILE_PREVIEW_BASE_HEIGHT = 844;

// Maps Shopify block names → internal layout keys
const LAYOUT_MAP = {
  combo_design_one: 'layout1',
  combo_design_two: 'layout2',
  combo_design_three: 'layout3',
  combo_design_four: 'layout4',
  combo_main: 'layout1',
  custom_bundle_layout: 'layout1',
};

// Template catalogue shown in the picker screen
const TEMPLATE_CATALOGUE = [
  {
    id: 'combo_main',
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
    id: 'combo_design_two',
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
    id: 'combo_design_four',
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
];

export default function Customize() {
  const shopify = useAppBridge();
  const {
    activeDiscounts = [],
    initialTemplate = null,
    existingTemplates = [],
    layoutFiles = [],
    collections: initialCollections = [],
    shop,
  } = useLoaderData();

  // Background resource fetching for speed
  const resourceFetcher = useFetcher();
  const [collections, setCollections] = useState(initialCollections);
  const [products, setProducts] = useState([]);
  const [shopPages, setShopPages] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(
    !(initialCollections && initialCollections.length > 0)
  );

  useEffect(() => {
    console.log('[Customize] Triggering resource fetcher...');
    resourceFetcher.load('?mode=resources');
  }, []);

  useEffect(() => {
    console.log('[Customize] resourceFetcher state:', resourceFetcher.state);
    if (resourceFetcher.data) {
      console.log('[Customize] resourceFetcher data received:', {
        collectionsCount: resourceFetcher.data.collections?.length || 0,
        productsCount: resourceFetcher.data.products?.length || 0,
        pagesCount: resourceFetcher.data.shopPages?.length || 0,
      });
      setCollections(resourceFetcher.data.collections || []);
      setProducts(resourceFetcher.data.products || []);
      setShopPages(resourceFetcher.data.shopPages || []);
      setResourcesLoading(false);
    } else if (resourceFetcher.state === 'idle' && !resourcesLoading) {
      // This might happen if fetcher is done but no data. Usually handled by if (resourceFetcher.data)
    }
  }, [resourceFetcher.data, resourceFetcher.state]);
  const discountFetcher = useFetcher();
  const saveFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (saveFetcher.data !== undefined) {
      console.log(
        '[Customize] Server response from /api/templates:',
        JSON.stringify(saveFetcher.data)
      );
    }
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
          if (
            body.data &&
            body.data.active !== undefined &&
            Object.keys(body.data).length === 1
          ) {
            return;
          }
        }
      }

      navigate('/app/templates');
    } else if (saveFetcher.data?.error) {
      if (saveFetcher.data?.pageHandleConflict) {
        // Re-open the save modal, switch to existing page tab, show the error
        setPublishType('existing');
        setPageError(saveFetcher.data.error);
        setSaveModalOpen(true);
      } else {
        shopify.toast.show(`Failed to save: ${saveFetcher.data.error}`, {
          isError: true,
        });
      }
    }
  }, [saveFetcher.data, saveFetcher.submission, shopify, navigate]);

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
  const [targetPageTitle, setTargetPageTitle] = useState(
    initialTemplate?.page_url || 'About Us'
  );
  const [targetPageHandle, setTargetPageHandle] = useState(
    initialTemplate?.page_url || 'about-us'
  );
  const [publishType, setPublishType] = useState(
    initialTemplate?.page_id ? 'existing' : 'new'
  );
  const [selectedPageId, setSelectedPageId] = useState(
    initialTemplate?.page_id || ''
  );
  const [titleError, setTitleError] = useState('');
  const [pageError, setPageError] = useState('');
  const [isActive, setIsActive] = useState(initialTemplate?.active || false);
  const [initTemplateId, setInitTemplateId] = useState(initialTemplate?.id);

  useEffect(() => {
    if (initialTemplate) {
      if (initialTemplate.id !== initTemplateId) {
        setInitTemplateId(initialTemplate.id);
        setConfig((prev) => ({
          ...DEFAULT_COMBO_CONFIG,
          ...(initialTemplate.config || {}),
        }));
        setSaveTitle(initialTemplate.title || 'Untitled Template');
        setIsActive(initialTemplate.active || false);
        setPickedLayout(initialTemplate.config?.layout || 'layout1');
        // Reset any context-specific state if needed
        fetchedHandlesRef.current.clear();
      }
    } else {
      // Reset if we go back to "new" mode
      if (initTemplateId) {
        setInitTemplateId(undefined);
        setConfig(DEFAULT_COMBO_CONFIG);
        setSaveTitle('Untitled Template');
        setIsActive(false);
        setPickedLayout(null);
      }
    }
  }, [initialTemplate, initTemplateId]);

  useEffect(() => {
    // Auto-generate handle from template title only for NEW templates
    if (
      !initialTemplate &&
      saveTitle &&
      saveTitle !== 'Untitled Template' &&
      targetPageTitle === 'About Us'
    ) {
      const slug = saveTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setTargetPageTitle(saveTitle);
      setTargetPageHandle(slug);
    }
  }, [initialTemplate, saveTitle, targetPageTitle]);

  const handleTitleChange = (value) => {
    setSaveTitle(value);
    if (titleError) setTitleError('');
  };
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState('layout'); // layout, style, advanced
  const [styleDevice, setStyleDevice] = useState('desktop'); // desktop, mobile, linked
  const [activeTab, setActiveTab] = useState('all');
  const [allStepProducts, setAllStepProducts] = useState({});
  const fetchedHandlesRef = useRef(new Set());
  const productFetcher = useFetcher();
  const [productsLoading, setProductsLoading] = useState(false);
  const [stepProductsLoading, setStepProductsLoading] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [stepFieldAiLoading, setStepFieldAiLoading] = useState({});
  const [collectionAiLoading, setCollectionAiLoading] = useState({});
  const [aiSuggestionNonce, setAiSuggestionNonce] = useState(0);

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
      // Restore page link settings so re-saving doesn't overwrite with wrong handle
      if (initialTemplate.page_url) {
        setTargetPageHandle(initialTemplate.page_url);
        setTargetPageTitle(initialTemplate.page_url);
        setPublishType('existing');
        setSelectedPageId(initialTemplate.page_id || '');
      } else {
        setTargetPageHandle('about-us');
        setTargetPageTitle('About Us');
        setPublishType('new');
        setSelectedPageId('');
      }
    } else {
      const templateId = searchParams.get('templateId');
      if (!templateId) {
        // Only reset to defaults if we aren't trying to load a template
        setConfig({ ...DEFAULT_COMBO_CONFIG });
        setSaveTitle('Untitled Template');
        setFormKey((prev) => prev + 1);
        setTargetPageHandle('about-us');
        setTargetPageTitle('About Us');
        setPublishType('new');
        setSelectedPageId('');
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
          ? `/api/products?handle=${encodeURIComponent(handle)}`
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
    config.step_1_collection,
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
  }, [previewDevice]);

  const previewBaseWidth =
    previewDevice === 'mobile'
      ? MOBILE_PREVIEW_BASE_WIDTH
      : DESKTOP_PREVIEW_BASE_WIDTH;
  const previewBaseHeight =
    previewDevice === 'mobile'
      ? MOBILE_PREVIEW_BASE_HEIGHT
      : DESKTOP_PREVIEW_BASE_HEIGHT;
  const previewScale = Math.max(containerWidth, 1) / previewBaseWidth;
  const scaledCanvasStyle = {
    width: `${previewBaseWidth}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
  };
  const scaledPanelStyle = {
    height: `${Math.round(previewBaseHeight * previewScale)}px`,
  };

  // Discount modal state
  const [createDiscountModalOpen, setCreateDiscountModalOpen] = useState(false);
  const [configureDiscountModalOpen, setConfigureDiscountModalOpen] =
    useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState(
    'amount_off_products'
  );
  const [dTitle, setDTitle] = useState('');
  const [dCode, setDCode] = useState('');
  const [dType, setDType] = useState('amount_off_products');
  const [dValue, setDValue] = useState('');
  const [dStartsAt, setDStartsAt] = useState('');
  const [dEndsAt, setDEndsAt] = useState('');
  const [dOncePerCustomer, setDOncePerCustomer] = useState(false);
  // Discount Engine parity states
  const [dValueType, setDValueType] = useState('percentage');
  const [dHasEndDate, setDHasEndDate] = useState(false);
  const [dMinRequirementType, setDMinRequirementType] = useState('none');
  const [dMinRequirementValue, setDMinRequirementValue] = useState('');
  const [dLimitUsage, setDLimitUsage] = useState(false);
  const [dMaxUsageLimit, setDMaxUsageLimit] = useState('');
  const [dCombinations, setDCombinations] = useState({
    product: false,
    order: false,
    shipping: false,
  });
  const [dBuyQuantity, setDBuyQuantity] = useState('1');
  const [dGetQuantity, setDGetQuantity] = useState('1');
  const [dGetValueType, setDGetValueType] = useState('percentage');
  const [dGetValue, setDGetValue] = useState('100');
  const [dBuyTargetType, setDBuyTargetType] = useState('products');
  const [dBuyTargetIds, setDBuyTargetIds] = useState([]);
  const [dGetTargetType, setDGetTargetType] = useState('all');
  const [dGetTargetIds, setDGetTargetIds] = useState([]);
  const [dErrors, setDErrors] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [maxProductsError, setMaxProductsError] = useState('');
  const [localActiveDiscounts, setLocalActiveDiscounts] =
    useState(activeDiscounts);

  // Sync local discounts with loader data (fetched from API)
  useEffect(() => {
    setLocalActiveDiscounts(activeDiscounts);
  }, [activeDiscounts]);

  // Determine initial pickedLayout:
  //  - If editing an existing template, skip picker entirely
  //  - If a ?layout= param is present (legacy direct link), pre-pick it
  //  - Otherwise null → show picker
  const initPickedLayout = (() => {
    if (initialTemplate) return initialTemplate.config?.layout || 'layout1';
    const lp = searchParams.get('layout');
    if (lp) return LAYOUT_MAP[lp] || 'layout1';
    return null;
  })();

  const [pickedLayout, setPickedLayout] = useState(initPickedLayout);

  // Keep pickedLayout in sync when URL search params change
  useEffect(() => {
    const lp = searchParams.get('layout');
    if (lp && !pickedLayout) {
      const mapped = LAYOUT_MAP[lp] || 'layout1';
      setPickedLayout(mapped);
      setConfig((prev) => ({ ...prev, layout: mapped }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Called when user explicitly selects a template from the picker
  const handlePickLayout = useCallback(
    (blockName) => {
      const mapped = LAYOUT_MAP[blockName] || 'layout1';
      setPickedLayout(mapped);
      setConfig((prev) => ({ ...prev, layout: mapped }));
    },
    // LAYOUT_MAP is stable (module-level constant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Real-time product fetching for multi-step bundles (Layout 1)
  useEffect(() => {
    if (config.layout !== 'layout1') return;
    const numSteps = Number(config.max_selections || 3);
    const handles = [];
    for (let i = 1; i <= numSteps; i++) {
      const h = config[`step_${i}_collection`];
      if (h && h !== '' && !fetchedHandlesRef.current.has(h)) handles.push(h);
    }

    if (handles.length > 0 && productFetcher.state === 'idle') {
      handles.forEach((h) => fetchedHandlesRef.current.add(h));
      setStepProductsLoading(true);
      productFetcher.load(
        `/api/products?handles=${encodeURIComponent(handles.join(','))}`
      );
    }
  }, [config, productFetcher]);

  useEffect(() => {
    if (productFetcher.data) {
      setStepProductsLoading(false);
      if (!productFetcher.data.error && !Array.isArray(productFetcher.data)) {
        setAllStepProducts((prev) => ({ ...prev, ...productFetcher.data }));
      }
    }
  }, [productFetcher.data]);

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

        // Reset form and close both modals
        setDTitle('');
        setDCode('');
        setDType('amount_off_products');
        setSelectedDiscountType('amount_off_products');
        setDValue('');
        setDStartsAt('');
        setDEndsAt('');
        setDOncePerCustomer(false);
        setDValueType('percentage');
        setDHasEndDate(false);
        setDMinRequirementType('none');
        setDMinRequirementValue('');
        setDLimitUsage(false);
        setDMaxUsageLimit('');
        setDCombinations({ product: false, order: false, shipping: false });
        setDBuyQuantity('1');
        setDGetQuantity('1');
        setDGetValueType('percentage');
        setDGetValue('100');
        setDBuyTargetType('products');
        setDBuyTargetIds([]);
        setDGetTargetType('all');
        setDGetTargetIds([]);
        setCreateDiscountModalOpen(false);
        setConfigureDiscountModalOpen(false);
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

  const generateAiSuggestion = useCallback(
    async (requestedTarget) => {
      const currentTitle = String(config.collection_title || '').trim();
      const currentDescription = String(
        config.collection_description || ''
      ).trim();
      const bothEmpty = !currentTitle && !currentDescription;
      const effectiveTarget = bothEmpty ? 'both' : requestedTarget;
      const nonce = `${Date.now()}-${aiSuggestionNonce}`;

      setAiSuggestionNonce((prev) => prev + 1);

      if (effectiveTarget === 'both') {
        setGeneratingTitle(true);
        setGeneratingDescription(true);
      } else if (requestedTarget === 'title') {
        setGeneratingTitle(true);
      } else {
        setGeneratingDescription(true);
      }

      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: effectiveTarget,
            currentTitle,
            currentDescription,
            nonce,
            context: {
              layout: config.layout,
              templateTitle: saveTitle,
              collectionHandle:
                config.collection_handle || config.step_1_collection,
              selectedCollections: [
                config.collection_handle,
                config.step_1_collection,
                config.step_2_collection,
                config.step_3_collection,
                config.step_4_collection,
                config.col_1,
                config.col_2,
                config.col_3,
                config.col_4,
                config.col_5,
                config.col_6,
                config.col_7,
                config.col_8,
              ].filter(Boolean),
            },
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(
            payload?.error || 'Unable to generate AI suggestion right now.'
          );
        }

        if (payload?.data?.title) {
          updateConfig('collection_title', payload.data.title);
        }
        if (payload?.data?.description) {
          updateConfig('collection_description', payload.data.description);
        }

        const message =
          effectiveTarget === 'both'
            ? 'AI Sparkle updated title and description.'
            : requestedTarget === 'title'
              ? 'AI Sparkle updated collection title.'
              : 'AI Sparkle updated collection description.';
        shopify.toast.show(message);
      } catch (error) {
        shopify.toast.show(
          error.message || 'AI suggestion failed. Please try again.',
          {
            isError: true,
          }
        );
      } finally {
        setGeneratingTitle(false);
        setGeneratingDescription(false);
      }
    },
    [aiSuggestionNonce, config, saveTitle, shopify, updateConfig]
  );

  const generateStepFieldSuggestion = useCallback(
    async (step, field) => {
      const loadingKey = `${step}_${field}`;
      const collectionHandle = config[`step_${step}_collection`] || '';
      const collectionTitle =
        collections.find((col) => col.handle === collectionHandle)?.title || '';
      const nonce = `${Date.now()}-${aiSuggestionNonce}`;

      setAiSuggestionNonce((prev) => prev + 1);
      setStepFieldAiLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'steps',
            requestedField: field,
            steps: [
              {
                step,
                collectionHandle,
                collectionTitle,
                currentTitle: config[`step_${step}_title`] || '',
                currentSubtitle: config[`step_${step}_subtitle`] || '',
              },
            ],
            nonce,
            context: {
              layout: config.layout,
              templateTitle: saveTitle,
              selectedCollections: [collectionHandle].filter(Boolean),
            },
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(
            payload?.providerMessage ||
              payload?.error ||
              'Unable to generate AI suggestion right now.'
          );
        }

        const stepData = Array.isArray(payload?.data?.steps)
          ? payload.data.steps.find((item) => Number(item?.step) === step)
          : null;

        if (!stepData) {
          throw new Error('No AI suggestion returned for this step.');
        }

        if (field === 'title' && stepData.title) {
          updateConfig(`step_${step}_title`, stepData.title);
          shopify.toast.show(
            `AI Sparkle updated title for Collection ${step}.`
          );
          return;
        }

        if (field === 'subtitle' && stepData.subtitle) {
          updateConfig(`step_${step}_subtitle`, stepData.subtitle);
          shopify.toast.show(
            `AI Sparkle updated subtitle for Collection ${step}.`
          );
          return;
        }

        throw new Error('AI response did not include the requested field.');
      } catch (error) {
        shopify.toast.show(error.message || 'AI suggestion failed.', {
          isError: true,
        });
      } finally {
        setStepFieldAiLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [aiSuggestionNonce, collections, config, saveTitle, shopify, updateConfig]
  );

  const suggestNextCollection = useCallback(
    async (step) => {
      setCollectionAiLoading((prev) => ({ ...prev, [step]: true }));
      try {
        const numSteps = Number(config.num_steps) || 3;
        const selectedHandles = Array.from({ length: numSteps }, (_, i) => i + 1)
          .filter((s) => s !== step)
          .map((s) => config[`step_${s}_collection`])
          .filter(Boolean);

        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'collection_suggest',
            availableCollections: (collections || []).map((c) => ({
              handle: c.handle,
              title: c.title,
            })),
            selectedHandles,
            templateTitle: saveTitle,
            layout: config.layout,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(
            payload?.error || 'Unable to suggest a collection right now.'
          );
        }

        const suggestedHandle = payload?.data?.handle;
        const suggestedTitle = payload?.data?.title;
        if (!suggestedHandle) {
          throw new Error('AI did not return a collection suggestion.');
        }

        updateConfig(`step_${step}_collection`, suggestedHandle);
        shopify.toast.show(
          `AI suggested "${suggestedTitle || suggestedHandle}" for step ${step}.`
        );
      } catch (error) {
        shopify.toast.show(error.message || 'AI suggestion failed.', {
          isError: true,
        });
      } finally {
        setCollectionAiLoading((prev) => ({ ...prev, [step]: false }));
      }
    },
    [collections, config, saveTitle, shopify, updateConfig]
  );

  const getStyleKey = useCallback(
    (baseKey) => {
      if (styleDevice === 'mobile') {
        const mobileKey = `${baseKey}_mobile`;
        // We check if the mobile version is specifically defined in our config,
        // though typically we'll just bind to it directly.
        return mobileKey;
      }
      return baseKey;
    },
    [styleDevice]
  );

  const updateBoth = useCallback((keyA, keyB, value) => {
    setConfig((prev) => ({ ...prev, [keyA]: value, [keyB]: value }));
  }, []);

  const confirmSaveTemplate = async () => {
    const templateTitle = (saveTitle || '').trim();

    if (!templateTitle) {
      setTitleError('Please enter a template title');
      return;
    }

    // Check for duplicate title
    const isDuplicate = existingTemplates.some((t) => {
      if (initialTemplate && String(t.id) === String(initialTemplate.id))
        return false;
      return t.title.toLowerCase() === templateTitle.toLowerCase();
    });

    if (isDuplicate) {
      setTitleError('This name is already used. Please choose a new name.');
      return;
    }

    if (publishToPage) {
      if (publishType === 'new' && !targetPageTitle.trim()) {
        setPageError('Page title is required');
        return;
      }
      if (publishType === 'existing' && !selectedPageId) {
        setPageError('Please select a page');
        return;
      }
    }
    setPageError('');

    if (config.layout === 'layout1') {
      const numSteps = Number(config.max_selections || 3);
      const newStepErrors = {};
      for (let i = 1; i <= numSteps; i++) {
        if (!config[`step_${i}_collection`]) {
          newStepErrors[`step_${i}_collection`] = 'Please select a collection';
        }
      }
      if (Object.keys(newStepErrors).length > 0) {
        setStepErrors(newStepErrors);
        setExpandedSections((prev) => ({ ...prev, general: true }));
        setSaveModalOpen(false);
        shopify.toast.show('Please select a collection for each step', {
          isError: true,
        });
        return;
      }
    }
    setStepErrors({});

    // Close modal immediately
    setSaveModalOpen(false);
    shopify.toast.show(`Saving "${saveTitle}"...`);

    const isEditing = !!initialTemplate;
    const sanitizedHandle = targetPageHandle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const normalizedConfig = {
      ...config,
      preview_modal_content_gap:
        Number(config.preview_modal_content_gap ?? 10) || 10,
      preview_modal_gallery_ratio:
        Number(config.preview_modal_gallery_ratio ?? 1.45) || 1.45,
      preview_modal_info_ratio:
        Number(config.preview_modal_info_ratio ?? 0.85) || 0.85,
      preview_modal_gallery_columns:
        Math.max(1, Number(config.preview_modal_gallery_columns ?? 2)) || 2,
      preview_modal_show_arrows: config.preview_modal_show_arrows !== false,
    };

    const body = {
      resource: 'templates',
      action: isEditing ? 'update' : 'create',
      id: isEditing ? initialTemplate.id : undefined,
      data: {
        title: saveTitle,
        config: normalizedConfig,
      },
      // Only publish/link to a page if enabled
      publishParams: publishToPage
        ? {
            title: targetPageTitle.trim(),
            handle: sanitizedHandle,
            publishType: publishType,
            selectedPageId: selectedPageId,
          }
        : null,
    };

    console.log(
      '[Customize] Submitting to /api/templates:',
      JSON.stringify({
        action: body.action,
        publishParams: body.publishParams,
      })
    );

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

  const discountTypeOptions = [
    {
      value: 'amount_off_products',
      title: 'Amount off products',
      description: 'Discount specific products or collections of products',
    },
    {
      value: 'amount_off_order',
      title: 'Amount off order',
      description: 'Discount the total order amount',
    },
    {
      value: 'free_shipping',
      title: 'Free shipping',
      description: 'Offer free shipping on qualifying orders',
    },
    {
      value: 'buy_x_get_y',
      title: 'Buy X get Y',
      description: 'Customers get a discount after buying a quantity',
    },
  ];

  const bxgyProductOptions = useMemo(
    () =>
      products.map((p) => ({
        label: p.title,
        value: p.id,
      })),
    [products]
  );

  const bxgyCollectionOptions = useMemo(
    () =>
      collections.map((c) => ({
        label: c.title,
        value: c.id,
      })),
    [collections]
  );

  const resetDiscountForm = useCallback(() => {
    setDTitle('');
    setDCode('');
    setDType('amount_off_products');
    setSelectedDiscountType('amount_off_products');
    setDValue('');
    setDValueType('percentage');
    setDStartsAt('');
    setDEndsAt('');
    setDHasEndDate(false);
    setDOncePerCustomer(false);
    setDMinRequirementType('none');
    setDMinRequirementValue('');
    setDLimitUsage(false);
    setDMaxUsageLimit('');
    setDCombinations({ product: false, order: false, shipping: false });
    setDBuyQuantity('1');
    setDGetQuantity('1');
    setDGetValueType('percentage');
    setDGetValue('100');
    setDBuyTargetType('products');
    setDBuyTargetIds([]);
    setDGetTargetType('all');
    setDGetTargetIds([]);
    setDErrors({});
  }, []);

  const openDiscountConfiguration = (type) => {
    setSelectedDiscountType(type);
    setDType(type);
    setCreateDiscountModalOpen(false);
    setTimeout(() => setConfigureDiscountModalOpen(true), 0);
  };

  const handleCreateDiscount = () => {
    const errors = {};

    if (!dTitle.trim()) errors.title = 'Title is required';

    if (selectedDiscountType !== 'free_shipping') {
      if (!dValue && selectedDiscountType !== 'buy_x_get_y') {
        errors.value = 'Value is required';
      } else if (selectedDiscountType !== 'buy_x_get_y') {
        const num = Number(dValue);
        if (isNaN(num) || num <= 0) {
          errors.value = 'Value must be greater than 0';
        } else if (dValueType === 'percentage' && num > 100) {
          errors.value = 'Percentage cannot exceed 100';
        }
      }
    }

    if (selectedDiscountType === 'buy_x_get_y') {
      const buyQty = parseInt(dBuyQuantity, 10);
      const getQty = parseInt(dGetQuantity, 10);
      const getVal = Number(dGetValue);

      if (isNaN(buyQty) || buyQty <= 0) {
        errors.buyQuantity = 'Buy quantity must be greater than 0';
      }
      if (isNaN(getQty) || getQty <= 0) {
        errors.getQuantity = 'Get quantity must be greater than 0';
      }
      if (isNaN(getVal) || getVal <= 0) {
        errors.getValue = 'Get value must be greater than 0';
      } else if (dGetValueType === 'percentage' && getVal > 100) {
        errors.getValue = 'Percentage cannot exceed 100';
      }

      if (!dBuyTargetIds.length) {
        errors.buyTargets =
          dBuyTargetType === 'products'
            ? 'Select at least one buy product'
            : 'Select at least one buy collection';
      }
      if (dGetTargetType !== 'all' && !dGetTargetIds.length) {
        errors.getTargets =
          dGetTargetType === 'products'
            ? 'Select at least one get product'
            : 'Select at least one get collection';
      }
    }

    if (!dStartsAt) errors.startsAt = 'Start date is required';

    if (
      dHasEndDate &&
      dEndsAt &&
      dStartsAt &&
      new Date(dEndsAt) <= new Date(dStartsAt)
    ) {
      errors.endsAt = 'End date must be after start date';
    }

    if (
      dMinRequirementType === 'amount' &&
      (!dMinRequirementValue || parseFloat(dMinRequirementValue) <= 0)
    ) {
      errors.minRequirementValue = 'Please enter a minimum purchase amount';
    }
    if (
      dMinRequirementType === 'quantity' &&
      (!dMinRequirementValue || parseInt(dMinRequirementValue, 10) <= 0)
    ) {
      errors.minRequirementValue = 'Please enter a minimum quantity';
    }
    if (dLimitUsage && (!dMaxUsageLimit || parseInt(dMaxUsageLimit, 10) <= 0)) {
      errors.maxUsage = 'Please enter a valid usage limit';
    }

    if (Object.keys(errors).length > 0) {
      setDErrors(errors);
      return;
    }

    setDErrors({});
    const formData = new FormData();
    formData.append('title', dTitle.trim());
    formData.append('code', dCode || dTitle.toUpperCase().replace(/\s+/g, ''));
    formData.append('type', selectedDiscountType);
    formData.append(
      'value',
      selectedDiscountType === 'free_shipping'
        ? '0'
        : selectedDiscountType === 'buy_x_get_y'
          ? dGetValue
          : dValue
    );
    formData.append('valueType', dValueType);
    formData.append('startsAt', dStartsAt);
    formData.append('endsAt', dHasEndDate && dEndsAt ? dEndsAt : '');
    formData.append('oncePerCustomer', dOncePerCustomer ? 'on' : 'off');
    formData.append('minRequirementType', dMinRequirementType);
    formData.append('minRequirementValue', dMinRequirementValue || '');
    formData.append('maxUsage', dLimitUsage ? dMaxUsageLimit : '');
    formData.append('combinations', JSON.stringify(dCombinations));
    if (selectedDiscountType === 'buy_x_get_y') {
      formData.append('buyQuantity', dBuyQuantity);
      formData.append('getQuantity', dGetQuantity);
      formData.append('getValueType', dGetValueType);
      formData.append('getValue', dGetValue);
      formData.append('buyTargetType', dBuyTargetType);
      formData.append('buyTargetIds', JSON.stringify(dBuyTargetIds));
      formData.append('getTargetType', dGetTargetType);
      formData.append('getTargetIds', JSON.stringify(dGetTargetIds));
    }

    discountFetcher.submit(formData, { method: 'post' });
  };

  const selectedDiscountTypeMeta =
    discountTypeOptions.find((opt) => opt.value === selectedDiscountType) ||
    discountTypeOptions[0];

  // ── Template picker gate ──────────────────────────────────────────────────
  // Show the picker ONLY when creating a new template with no layout chosen.
  if (!pickedLayout && !initialTemplate) {
    return (
      <Page
        title="Customize Template"
        backAction={{
          content: 'Template Modules',
          onAction: () => navigate('/app/templates', { replace: true }),
        }}
      >
        <div style={{ padding: '12px 0 24px' }}>
          <Text variant="headingLg" as="h2">
            Choose a Template to Get Started
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text variant="bodyMd" tone="subdued">
              Select one of the layouts below. You can fully customise colours,
              content, and settings in the next step.
            </Text>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '32px',
            marginBottom: '40px',
          }}
        >
          {TEMPLATE_CATALOGUE.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                border: '1px solid #ebeef0',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow =
                  '0 12px 28px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#d2d5d8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                e.currentTarget.style.borderColor = '#ebeef0';
              }}
            >
              {/* Preview image */}
              <div
                style={{
                  position: 'relative',
                  borderBottom: '1px solid #f0f2f4',
                }}
              >
                <img
                  src={tpl.img}
                  alt={tpl.title}
                  onError={(e) => {
                    e.target.src = tpl.fallbackImg;
                  }}
                  style={{
                    width: '100%',
                    height: '220px',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.5s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background:
                      tpl.badgeTone === 'success' ? '#e3f1df' : '#e6f0ff',
                    color: tpl.badgeTone === 'success' ? '#1a7f45' : '#004fe6',
                    padding: '4px 12px',
                    borderRadius: '24px',
                    fontSize: '12px',
                    fontWeight: '600',
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  {tpl.badge}
                </div>
              </div>

              {/* Card body */}
              <div
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Text variant="headingLg" as="h3" fontWeight="bold">
                    {tpl.title}
                  </Text>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <Text variant="bodyMd" tone="subdued">
                    {tpl.description}
                  </Text>
                </div>

                {/* Features list */}
                <ul
                  style={{
                    margin: '0 0 24px',
                    padding: '0',
                    fontSize: '14px',
                    color: '#333',
                    lineHeight: '1.6',
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flexGrow: 1,
                  }}
                >
                  {tpl.features.map((f, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#008060"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0, marginTop: '2px' }}
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span style={{ color: '#4a4a4a' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingTop: '20px',
                    borderTop: '1px solid #f0f2f4',
                    marginTop: 'auto',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      fontWeight: '500',
                    }}
                  >
                    Best for:{' '}
                    <span style={{ color: '#202223' }}>{tpl.bestFor}</span>
                  </div>
                  <Button
                    variant="primary"
                    id={`select-template-${tpl.id}`}
                    onClick={() => handlePickLayout(tpl.blockName)}
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Page>
    );
  }

  // ── Full customisation editor ────────────────────────────────────────────
  return (
    <Page
      backAction={{
        content: 'Template Modules',
        onAction: () => navigate('/app/templates', { replace: true }),
      }}
      title="Customize Template"
      titleMetadata={
        <div className="template-status-meta">
          <div className="template-status-icon">
            <Icon source={EditIcon} tone="base" />
          </div>
          <div
            className="template-status-badge"
            style={{
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
        onAction: () => {
          if (config.layout === 'layout1') {
            const numSteps = Number(config.max_selections || 3);
            const newStepErrors = {};
            for (let i = 1; i <= numSteps; i++) {
              if (!config[`step_${i}_collection`]) {
                newStepErrors[`step_${i}_collection`] =
                  'Please select a collection';
              }
            }
            if (Object.keys(newStepErrors).length > 0) {
              setStepErrors(newStepErrors);
              setExpandedSections((prev) => ({ ...prev, general: true }));
              shopify.toast.show('Please select a collection for each step', {
                isError: true,
              });
              return;
            }
            // Validate max_products vs sum of step limits
            const maxProducts = Number(config.max_products || 5);
            let stepLimitSum = 0;
            let allStepsHaveLimits = true;
            for (let i = 1; i <= numSteps; i++) {
              const lim = config[`step_${i}_limit`];
              if (lim === '' || lim == null) {
                allStepsHaveLimits = false;
                break;
              }
              stepLimitSum += Number(lim);
            }
            if (allStepsHaveLimits && maxProducts > stepLimitSum) {
              const errMsg = `Max products (${maxProducts}) exceeds total possible from step limits (${stepLimitSum}). Please adjust.`;
              setMaxProductsError(errMsg);
              setExpandedSections((prev) => ({ ...prev, general: true }));
              shopify.toast.show(errMsg, { isError: true });
              return;
            }
            setMaxProductsError('');
          }
          if (config.layout === 'layout3') {
            const maxProducts = Number(config.max_products || 5);
            let colLimitSum = 0;
            let allColsHaveLimits = true;
            for (let i = 1; i <= 4; i++) {
              if (!config[`col_${i}`]) continue; // skip unconfigured categories
              const lim = config[`col_${i}_limit`];
              if (lim == null || lim === '') {
                allColsHaveLimits = false;
                break;
              }
              colLimitSum += Number(lim);
            }
            if (
              allColsHaveLimits &&
              colLimitSum > 0 &&
              maxProducts > colLimitSum
            ) {
              const errMsg = `Max products (${maxProducts}) exceeds total possible from category limits (${colLimitSum}). Please adjust.`;
              setMaxProductsError(errMsg);
              setExpandedSections((prev) => ({ ...prev, general: true }));
              shopify.toast.show(errMsg, { isError: true });
              return;
            }
            setMaxProductsError('');
          }
          setSaveModalOpen(true);
        },
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
      <div className="customize-top-gap"></div>
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
                        onChange={(v) => {
                          setTargetPageTitle(v);
                          setTargetPageHandle(
                            v
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '')
                          );
                          if (pageError) setPageError('');
                        }}
                        autoComplete="off"
                        error={pageError}
                      />
                      <TextField
                        label="Target Page Handle (URL slug)"
                        value={targetPageHandle}
                        onChange={(v) =>
                          setTargetPageHandle(
                            v.toLowerCase().replace(/[^a-z0-9-]+/g, '')
                          )
                        }
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
                        if (pageError) setPageError('');
                        const page = shopPages.find((p) => p.id === id);
                        if (page) {
                          setTargetPageTitle(page.title);
                          setTargetPageHandle(page.handle);
                        }
                      }}
                      error={pageError}
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

      <div key={formKey} className="customize-layout-grid">
        <div>
          <div className="customize-left-sticky">
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
            <div className="customize-section-gap"></div>
            <Card title="Preview" sectioned>
              <div className={`preview-stage preview-stage--${previewDevice}`}>
                {previewDevice === 'desktop' ? (
                  <div
                    ref={containerRef}
                    className="preview-scale-panel"
                    style={scaledPanelStyle}
                  >
                    <div
                      className="preview-scale-canvas"
                      style={scaledCanvasStyle}
                    >
                      <div
                        className="preview-browser-chrome"
                        aria-hidden="true"
                      >
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>

                      <div className="preview-device-container preview-viewport preview-viewport--desktop">
                        <ComboPreview
                          config={config}
                          device={previewDevice}
                          products={shopifyProducts}
                          collections={collections}
                          activeTab={activeTab}
                          setActiveTab={setActiveTab}
                          isLoading={productsLoading}
                          stepProductsLoading={stepProductsLoading}
                          activeDiscounts={localActiveDiscounts}
                          selectedVariants={selectedVariants}
                          setSelectedVariants={setSelectedVariants}
                          allStepProducts={allStepProducts}
                          setAllStepProducts={setAllStepProducts}
                        />
                        {config.custom_css && (
                          <style
                            dangerouslySetInnerHTML={{
                              __html: `.preview-viewport { ${config.custom_css} }`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="preview-device-container preview-viewport preview-viewport--mobile-classic">
                    <ComboPreview
                      config={config}
                      device={previewDevice}
                      products={shopifyProducts}
                      collections={collections}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isLoading={productsLoading}
                      stepProductsLoading={stepProductsLoading}
                      activeDiscounts={localActiveDiscounts}
                      selectedVariants={selectedVariants}
                      setSelectedVariants={setSelectedVariants}
                      allStepProducts={allStepProducts}
                      setAllStepProducts={setAllStepProducts}
                    />
                    {config.custom_css && (
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `.preview-viewport { ${config.custom_css} }`,
                        }}
                      />
                    )}
                  </div>
                )}
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
              { id: 'mobile_view', label: 'Mobile View', icon: MobileIcon },
              { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
            ].map((cat) => {
              const isActive =
                (cat.id === 'layout' && activeCategory === 'layout') ||
                (cat.id === 'style' &&
                  activeCategory === 'style' &&
                  styleDevice === 'desktop') ||
                (cat.id === 'mobile_view' &&
                  activeCategory === 'style' &&
                  styleDevice === 'mobile') ||
                (cat.id === 'advanced' && activeCategory === 'advanced');

              const handleClick = () => {
                if (cat.id === 'layout') {
                  setActiveCategory('layout');
                } else if (cat.id === 'style') {
                  setActiveCategory('style');
                  setStyleDevice('desktop');
                  setPreviewDevice('desktop');
                } else if (cat.id === 'mobile_view') {
                  setActiveCategory('style');
                  setStyleDevice('mobile');
                  setPreviewDevice('mobile');
                } else if (cat.id === 'advanced') {
                  setActiveCategory('advanced');
                }
              };

              return (
                <div
                  key={cat.id}
                  onClick={handleClick}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    borderBottom: isActive
                      ? '3px solid #000000'
                      : '3px solid transparent',
                    color: isActive ? '#000000' : '#6d7175',
                    transition: 'all 0.2s ease',
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  <div
                    style={{
                      color: isActive ? '#000000' : '#8c9196',
                    }}
                  >
                    <Icon
                      source={cat.icon}
                      color={isActive ? 'brand' : 'subdued'}
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
              );
            })}
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
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
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
                        <TextField
                          label="Combo Size (Number of Collections)"
                          type="number"
                          value={String(config.max_selections || 3)}
                          onChange={(v) =>
                            updateConfig(
                              'max_selections',
                              Math.max(1, Number(v))
                            )
                          }
                          autoComplete="off"
                          helpText={
                            <span style={{ fontSize: 11 }}>
                              How many collection steps appear in the bundle
                              builder.
                            </span>
                          }
                        />
                        <TextField
                          label="Total Products Customer Can Add"
                          type="number"
                          value={String(config.max_products || 5)}
                          onChange={(v) => {
                            updateConfig(
                              'max_products',
                              Math.max(1, Number(v))
                            );
                            if (maxProductsError) setMaxProductsError('');
                          }}
                          autoComplete="off"
                          error={maxProductsError}
                          helpText={
                            <span style={{ fontSize: 11 }}>
                              Maximum total products a customer can pick across
                              all collections combined.
                            </span>
                          }
                        />
                      </div>

                      {[...Array(Number(config.max_selections || 3))].map(
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
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 12,
                                }}
                              >
                                <TextField
                                  label="Title"
                                  value={config[`step_${step}_title`] || ''}
                                  onChange={(v) =>
                                    updateConfig(`step_${step}_title`, v)
                                  }
                                  autoComplete="off"
                                  placeholder={`e.g. ${step === 1 ? 'Cleanser' : step === 2 ? 'Toner' : 'Product'}`}
                                  connectedRight={
                                    <Tooltip content="Generate text">
                                      <Button
                                        size="slim"
                                        variant="secondary"
                                        icon={MagicIcon}
                                        accessibilityLabel="Generate title text"
                                        style={{
                                          borderColor: '#00c9a7',
                                          background:
                                            'linear-gradient(180deg, #ffffff 0%, #ebfff8 100%)',
                                          boxShadow:
                                            '0 0 0 1px rgba(0, 201, 167, 0.35), 0 0 10px rgba(0, 201, 167, 0.55), inset 0 0 8px rgba(0, 201, 167, 0.18)',
                                        }}
                                        loading={
                                          !!stepFieldAiLoading[`${step}_title`]
                                        }
                                        disabled={
                                          !!stepFieldAiLoading[
                                            `${step}_title`
                                          ] ||
                                          !!stepFieldAiLoading[
                                            `${step}_subtitle`
                                          ]
                                        }
                                        onClick={() =>
                                          generateStepFieldSuggestion(
                                            step,
                                            'title'
                                          )
                                        }
                                      />
                                    </Tooltip>
                                  }
                                />
                                <TextField
                                  label="Subtitle"
                                  value={config[`step_${step}_subtitle`] || ''}
                                  onChange={(v) =>
                                    updateConfig(`step_${step}_subtitle`, v)
                                  }
                                  autoComplete="off"
                                  placeholder="e.g. Select one"
                                  connectedRight={
                                    <Tooltip content="Generate text">
                                      <Button
                                        size="slim"
                                        variant="secondary"
                                        icon={MagicIcon}
                                        accessibilityLabel="Generate subtitle text"
                                        style={{
                                          borderColor: '#00c9a7',
                                          background:
                                            'linear-gradient(180deg, #ffffff 0%, #ebfff8 100%)',
                                          boxShadow:
                                            '0 0 0 1px rgba(0, 201, 167, 0.35), 0 0 10px rgba(0, 201, 167, 0.55), inset 0 0 8px rgba(0, 201, 167, 0.18)',
                                        }}
                                        loading={
                                          !!stepFieldAiLoading[
                                            `${step}_subtitle`
                                          ]
                                        }
                                        disabled={
                                          !!stepFieldAiLoading[
                                            `${step}_title`
                                          ] ||
                                          !!stepFieldAiLoading[
                                            `${step}_subtitle`
                                          ]
                                        }
                                        onClick={() =>
                                          generateStepFieldSuggestion(
                                            step,
                                            'subtitle'
                                          )
                                        }
                                      />
                                    </Tooltip>
                                  }
                                />
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
                                  onChange={(v) => {
                                    updateConfig(`step_${step}_collection`, v);
                                    if (stepErrors[`step_${step}_collection`]) {
                                      setStepErrors((p) => ({
                                        ...p,
                                        [`step_${step}_collection`]: undefined,
                                      }));
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!config[`step_${step}_collection`]) {
                                      setStepErrors((p) => ({
                                        ...p,
                                        [`step_${step}_collection`]:
                                          'Please select a collection',
                                      }));
                                    }
                                  }}
                                  error={stepErrors[`step_${step}_collection`]}
                                />
                                <TextField
                                  label="Selection Limit"
                                  type="number"
                                  value={
                                    config[`step_${step}_limit`] === '' ||
                                    config[`step_${step}_limit`] == null
                                      ? ''
                                      : String(config[`step_${step}_limit`])
                                  }
                                  onChange={(v) =>
                                    updateConfig(
                                      `step_${step}_limit`,
                                      v === '' ? '' : Math.max(1, Number(v))
                                    )
                                  }
                                  autoComplete="off"
                                  min={1}
                                  placeholder="Unlimited"
                                  helpText="Leave blank for unlimited selections"
                                />
                              </div>
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
                      <div
                        style={{
                          background: '#f4f6f8',
                          padding: '16px',
                          borderRadius: '8px',
                          marginBottom: '20px',
                          border: '1px solid #e1e3e5',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
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
                        <TextField
                          label="Combo Size (Number of Collections)"
                          type="number"
                          value={String(config.tab_count || 4)}
                          onChange={(v) =>
                            updateConfig('tab_count', Math.max(1, Number(v)))
                          }
                          autoComplete="off"
                          helpText={
                            <span style={{ fontSize: 11 }}>
                              How many collection steps appear in the bundle
                              builder.
                            </span>
                          }
                        />
                        <TextField
                          label="Total Products Customer Can Add"
                          type="number"
                          value={String(config.max_products || 5)}
                          onChange={(v) => {
                            updateConfig(
                              'max_products',
                              Math.max(1, Number(v))
                            );
                            if (maxProductsError) setMaxProductsError('');
                          }}
                          autoComplete="off"
                          error={maxProductsError}
                          helpText={
                            <span style={{ fontSize: 11 }}>
                              Maximum total products a customer can pick across
                              all collections combined.
                            </span>
                          }
                        />
                      </div>
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
                                  onChange={(v) =>
                                    updateConfig('auto_reset_timer', v)
                                  }
                                />
                                <Checkbox
                                  label="Change Bundle on Timer End"
                                  checked={!!config.change_bundle_on_timer_end}
                                  onChange={(v) =>
                                    updateConfig(
                                      'change_bundle_on_timer_end',
                                      v
                                    )
                                  }
                                />
                              </div>
                              {(config.change_bundle_on_timer_end ||
                                config.auto_reset_timer) && (
                                <div style={{ marginTop: 12 }}>
                                  <TextField
                                    label="Bundle Titles (CSV)"
                                    value={config.bundle_titles || ''}
                                    onChange={(v) =>
                                      updateConfig('bundle_titles', v)
                                    }
                                    autoComplete="off"
                                    helpText="Alternative titles for rotation (e.g. Mega Deal, Super Offer)"
                                  />
                                  <TextField
                                    label="Bundle Subtitles (CSV)"
                                    value={config.bundle_subtitles || ''}
                                    onChange={(v) =>
                                      updateConfig('bundle_subtitles', v)
                                    }
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
                        <div
                          style={{
                            background: '#f4f6f8',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #e1e3e5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
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
                          <TextField
                            label="Combo Size (Number of Collections)"
                            type="number"
                            value={String(config.col_count || 4)}
                            onChange={(v) =>
                              updateConfig('col_count', Math.max(1, Number(v)))
                            }
                            autoComplete="off"
                            helpText={
                              <span style={{ fontSize: 11 }}>
                                How many collection steps appear in the bundle
                                builder.
                              </span>
                            }
                          />
                          <TextField
                            label="Total Products Customer Can Add"
                            type="number"
                            value={String(config.max_products || 5)}
                            onChange={(v) => {
                              updateConfig(
                                'max_products',
                                Math.max(1, Number(v))
                              );
                              if (maxProductsError) setMaxProductsError('');
                            }}
                            autoComplete="off"
                            error={maxProductsError}
                            helpText={
                              <span style={{ fontSize: 11 }}>
                                Maximum total products a customer can pick
                                across all collections combined.
                              </span>
                            }
                          />
                        </div>
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
                              onChange={(v) =>
                                updateConfig(
                                  `col_${i}_limit`,
                                  Math.max(1, Number(v))
                                )
                              }
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
                      title="Bundle Rule"
                      expanded={expandedSections.general}
                      onToggle={() => toggleSection('general')}
                    >
                      <FormLayout>
                        <div
                          style={{
                            background: '#f4f6f8',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #e1e3e5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
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
                          <TextField
                            label="Combo Size (Number of Collections)"
                            type="number"
                            value={String(config.combo_size || 1)}
                            onChange={(v) =>
                              updateConfig('combo_size', Math.max(1, Number(v)))
                            }
                            autoComplete="off"
                            helpText={
                              <span style={{ fontSize: 11 }}>
                                How many collection steps appear in the bundle
                                builder.
                              </span>
                            }
                          />
                          <TextField
                            label="Total Products Customer Can Add"
                            type="number"
                            value={String(config.max_products || 5)}
                            onChange={(v) => {
                              updateConfig(
                                'max_products',
                                Math.max(1, Number(v))
                              );
                              if (maxProductsError) setMaxProductsError('');
                            }}
                            autoComplete="off"
                            error={maxProductsError}
                            helpText={
                              <span style={{ fontSize: 11 }}>
                                Maximum total products a customer can pick
                                across all collections combined.
                              </span>
                            }
                          />
                        </div>
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
                {/* AI Mode */}
                <CollapsibleCard
                  title="AI Settings"
                  expanded={expandedSections.banner}
                  onToggle={() => toggleSection('banner')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Enable AI Suggestions for Customers"
                      checked={!!config.ai_mode}
                      onChange={(v) => updateConfig('ai_mode', v)}
                      helpText="When enabled, AI will suggest products and collections to customers on the storefront"
                    />
                  </FormLayout>
                </CollapsibleCard>

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
                                onChange={(v) =>
                                  updateConfig('enable_banner_slider', v)
                                }
                              />
                              {config.enable_banner_slider && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    padding: 12,
                                    background: '#f9f9f9',
                                    borderRadius: 8,
                                  }}
                                >
                                  <RangeSlider
                                    label="Auto-Rotation Speed (Seconds)"
                                    value={config.slider_speed || 5}
                                    onChange={(v) =>
                                      updateConfig('slider_speed', v)
                                    }
                                    min={2}
                                    max={15}
                                    output
                                  />
                                  {[1, 2, 3].map((i) => (
                                    <div
                                      key={i}
                                      style={{
                                        marginTop: 12,
                                        paddingTop: 12,
                                        borderTop:
                                          i > 1 ? '1px solid #ddd' : 'none',
                                      }}
                                    >
                                      <Text variant="headingSm" as="h6">
                                        Banner {i}
                                      </Text>
                                      <TextField
                                        label="Image URL"
                                        value={config[`banner_${i}_image`]}
                                        onChange={(v) =>
                                          updateConfig(`banner_${i}_image`, v)
                                        }
                                        autoComplete="off"
                                      />
                                      <TextField
                                        label="Title"
                                        value={config[`banner_${i}_title`]}
                                        onChange={(v) =>
                                          updateConfig(`banner_${i}_title`, v)
                                        }
                                        autoComplete="off"
                                      />
                                      <TextField
                                        label="Subtitle"
                                        value={config[`banner_${i}_subtitle`]}
                                        onChange={(v) =>
                                          updateConfig(
                                            `banner_${i}_subtitle`,
                                            v
                                          )
                                        }
                                        autoComplete="off"
                                      />
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
                    <Checkbox
                      label="Show sold out products"
                      checked={!!config.show_sold_out_products}
                      onChange={(checked) =>
                        updateConfig('show_sold_out_products', checked)
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

                        {config.grid_layout_type === 'slider' && (
                          <div
                            style={{
                              gridColumn: '1 / -1',
                              marginTop: '16px',
                              padding: '16px',
                              background: '#f9fafb',
                              borderRadius: '12px',
                              border: '1px solid #e1e3e5',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
                            }}
                          >
                            <div style={{ marginBottom: '16px' }}>
                              <Text variant="headingMd" as="h5">
                                Slider Customization
                              </Text>
                            </div>

                            <FormLayout>
                              {/* Navigation Group */}
                              <div style={{ marginBottom: '16px' }}>
                                <Text
                                  variant="headingSm"
                                  as="h6"
                                  color="subdued"
                                >
                                  Navigation
                                </Text>
                                <div style={{ marginTop: '10px' }}>
                                  <Checkbox
                                    label="Show Navigation Arrows"
                                    checked={!!config.show_nav_arrows}
                                    onChange={(v) =>
                                      updateConfig('show_nav_arrows', v)
                                    }
                                  />
                                  {config.show_nav_arrows && (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #eee',
                                      }}
                                    >
                                      <ColorPickerField
                                        label="Icon Color"
                                        value={config.arrow_color || '#ffffff'}
                                        onChange={(v) =>
                                          updateConfig('arrow_color', v)
                                        }
                                      />
                                      <ColorPickerField
                                        label="Background"
                                        value={
                                          config.arrow_bg_color || '#000000'
                                        }
                                        onChange={(v) =>
                                          updateConfig('arrow_bg_color', v)
                                        }
                                      />
                                      <PxField
                                        label="Size"
                                        value={config.arrow_size || 40}
                                        onChange={(v) =>
                                          updateConfig('arrow_size', v)
                                        }
                                      />
                                      <PxField
                                        label="Radius (%)"
                                        value={config.arrow_border_radius || 50}
                                        onChange={(v) =>
                                          updateConfig('arrow_border_radius', v)
                                        }
                                        suffix="%"
                                        max={50}
                                      />
                                      <div style={{ gridColumn: 'span 2' }}>
                                        <RangeSlider
                                          label="Opacity"
                                          value={config.arrow_opacity ?? 0.9}
                                          onChange={(v) =>
                                            updateConfig('arrow_opacity', v)
                                          }
                                          min={0}
                                          max={1}
                                          step={0.1}
                                          output
                                        />
                                      </div>
                                      <div style={{ gridColumn: 'span 2' }}>
                                        <Select
                                          label="Arrow Position"
                                          options={[
                                            {
                                              label: 'Inside Slider',
                                              value: 'inside',
                                            },
                                            {
                                              label: 'Outside Slider',
                                              value: 'outside',
                                            },
                                          ]}
                                          value={
                                            config.arrow_position || 'inside'
                                          }
                                          onChange={(v) =>
                                            updateConfig('arrow_position', v)
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Interaction Group */}
                              <div style={{ marginBottom: '16px' }}>
                                <Text
                                  variant="headingSm"
                                  as="h6"
                                  color="subdued"
                                >
                                  Interaction
                                </Text>
                                <div style={{ marginTop: '10px' }}>
                                  <Checkbox
                                    label="Enable Touch/Swipe"
                                    checked={
                                      config.enable_touch_swipe !== false
                                    }
                                    onChange={(v) =>
                                      updateConfig('enable_touch_swipe', v)
                                    }
                                  />
                                  {config.enable_touch_swipe !== false && (
                                    <div
                                      style={{
                                        marginTop: '8px',
                                        padding: '12px',
                                        background: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #eee',
                                      }}
                                    >
                                      <RangeSlider
                                        label="Sensitivity"
                                        value={config.swipe_sensitivity || 5}
                                        onChange={(v) =>
                                          updateConfig('swipe_sensitivity', v)
                                        }
                                        min={1}
                                        max={10}
                                        output
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Appearance Group */}
                              <div>
                                <Text
                                  variant="headingSm"
                                  as="h6"
                                  color="subdued"
                                >
                                  Appearance
                                </Text>
                                <div style={{ marginTop: '10px' }}>
                                  <Checkbox
                                    label="Show Scrollbar"
                                    checked={!!config.show_scrollbar}
                                    onChange={(v) =>
                                      updateConfig('show_scrollbar', v)
                                    }
                                  />
                                  {config.show_scrollbar && (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #eee',
                                      }}
                                    >
                                      <ColorPickerField
                                        label="Scroll Color"
                                        value={
                                          config.scrollbar_color || '#dddddd'
                                        }
                                        onChange={(v) =>
                                          updateConfig('scrollbar_color', v)
                                        }
                                      />
                                      <PxField
                                        label="Thickness"
                                        value={config.scrollbar_thickness || 4}
                                        onChange={(v) =>
                                          updateConfig('scrollbar_thickness', v)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </FormLayout>
                          </div>
                        )}
                        <Select
                          label="Mobile Columns"
                          options={[
                            { label: '1', value: '1' },
                            { label: '2', value: '2' },
                          ]}
                          value={config.mobile_columns}
                          onChange={(v) => updateConfig('mobile_columns', v)}
                        />
                        <Select
                          label="Image Ratio"
                          options={[
                            { label: 'Portrait (3:4)', value: 'portrait' },
                            { label: 'Square (1:1)', value: 'square' },
                            { label: 'Rectangle (4:3)', value: 'rectangle' },
                          ]}
                          value={config.product_image_ratio || 'square'}
                          onChange={(v) =>
                            updateConfig('product_image_ratio', v)
                          }
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
                    title="Theme Specific Styles"
                    expanded={expandedSections.designFourStyles}
                    onToggle={() => toggleSection('designFourStyles')}
                  >
                    <FormLayout>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                        }}
                      >
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
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '4px',
                        }}
                      >
                        This discount percentage is used for calculating the
                        "You Save" badge.
                      </p>
                    </FormLayout>
                  </CollapsibleCard>
                )}

                {config.layout === 'layout2' && (
                  <CollapsibleCard
                    title="Collection Tabs Premium Styles"
                    expanded={expandedSections.collectionTabsStyles}
                    onToggle={() => toggleSection('collectionTabsStyles')}
                  >
                    <FormLayout>
                      <Select
                        label="Tab Navigation"
                        options={[
                          { label: 'Scroll', value: 'scroll' },
                          { label: 'Next / Prev Arrows', value: 'arrows' },
                          { label: 'Slide Touch', value: 'slide_touch' },
                        ]}
                        value={config.tab_navigation_mode || 'scroll'}
                        onChange={(v) => updateConfig('tab_navigation_mode', v)}
                      />
                      <Select
                        label="Alignment"
                        options={[
                          { label: 'Left', value: 'left' },
                          { label: 'Center', value: 'center' },
                          { label: 'Right', value: 'right' },
                        ]}
                        value={config.tab_alignment || 'left'}
                        onChange={(v) => updateConfig('tab_alignment', v)}
                      />
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <PxField
                          label="Text Size"
                          value={config.tab_font_size}
                          onChange={(v) => updateConfig('tab_font_size', v)}
                          min={10}
                          max={40}
                        />
                        <PxField
                          label="Corner Radius"
                          value={config.tab_border_radius}
                          onChange={(v) => updateConfig('tab_border_radius', v)}
                          min={0}
                          max={50}
                        />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <PxField
                          label="Horizontal Padding"
                          value={config.tab_padding_horizontal}
                          onChange={(v) =>
                            updateConfig('tab_padding_horizontal', v)
                          }
                          min={5}
                          max={100}
                        />
                        <PxField
                          label="Vertical Padding"
                          value={config.tab_padding_vertical}
                          onChange={(v) =>
                            updateConfig('tab_padding_vertical', v)
                          }
                          min={5}
                          max={100}
                        />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 10,
                        }}
                      >
                        <PxField
                          label="Margin Top"
                          value={config.tab_margin_top}
                          onChange={(v) => updateConfig('tab_margin_top', v)}
                          min={0}
                          max={200}
                        />
                        <PxField
                          label="Margin Bottom"
                          value={config.tab_margin_bottom}
                          onChange={(v) => updateConfig('tab_margin_bottom', v)}
                          min={0}
                          max={300}
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid #eee',
                        }}
                      >
                        <Text variant="headingSm" as="h6">
                          Inactive Tab Colors
                        </Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            marginTop: 8,
                          }}
                        >
                          <ColorPickerField
                            label="Background"
                            value={config.tab_bg_color}
                            onChange={(v) => updateConfig('tab_bg_color', v)}
                          />
                          <ColorPickerField
                            label="Text Color"
                            value={config.tab_text_color}
                            onChange={(v) => updateConfig('tab_text_color', v)}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid #eee',
                        }}
                      >
                        <Text variant="headingSm" as="h6">
                          Active Tab Colors
                        </Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            marginTop: 8,
                          }}
                        >
                          <ColorPickerField
                            label="Background"
                            value={
                              config.tab_active_bg_color ||
                              config.selection_highlight_color
                            }
                            onChange={(v) =>
                              updateConfig('tab_active_bg_color', v)
                            }
                          />
                          <ColorPickerField
                            label="Text Color"
                            value={config.tab_active_text_color}
                            onChange={(v) =>
                              updateConfig('tab_active_text_color', v)
                            }
                          />
                        </div>
                      </div>
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
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              variant="bodyMd"
                              as="span"
                              fontWeight="medium"
                            >
                              Collection Title
                            </Text>
                          </div>
                          <TextField
                            label="Collection Title"
                            labelHidden
                            value={config.collection_title}
                            onChange={(v) =>
                              updateConfig('collection_title', v)
                            }
                            connectedRight={
                              <Tooltip content="Generate text">
                                <Button
                                  size="slim"
                                  variant="secondary"
                                  icon={MagicIcon}
                                  accessibilityLabel="Generate collection title text"
                                  style={{
                                    borderColor: '#00c9a7',
                                    background:
                                      'linear-gradient(180deg, #ffffff 0%, #ebfff8 100%)',
                                    boxShadow:
                                      '0 0 0 1px rgba(0, 201, 167, 0.35), 0 0 10px rgba(0, 201, 167, 0.55), inset 0 0 8px rgba(0, 201, 167, 0.18)',
                                  }}
                                  loading={generatingTitle}
                                  disabled={
                                    generatingTitle || generatingDescription
                                  }
                                  onClick={() => generateAiSuggestion('title')}
                                />
                              </Tooltip>
                            }
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
                              value={
                                config[getStyleKey('heading_align')] || 'left'
                              }
                              onChange={(v) =>
                                updateConfig(getStyleKey('heading_align'), v)
                              }
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
                                config[getStyleKey('heading_font_weight')] ||
                                  config.heading_font_weight ||
                                  '700'
                              )}
                              onChange={(v) =>
                                updateConfig(
                                  getStyleKey('heading_font_weight'),
                                  v
                                )
                              }
                            />
                            <PxField
                              label="Title Size"
                              value={
                                config[getStyleKey('heading_size')] ??
                                config.heading_size
                              }
                              onChange={(v) =>
                                updateConfig(getStyleKey('heading_size'), v)
                              }
                            />
                            <ColorPickerField
                              label="Title Color"
                              value={
                                config[getStyleKey('heading_color')] ||
                                config.heading_color
                              }
                              onChange={(v) =>
                                updateConfig(getStyleKey('heading_color'), v)
                              }
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
                                value={
                                  config[
                                    getStyleKey('title_container_padding_top')
                                  ] ?? config.title_container_padding_top
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey('title_container_padding_top'),
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
                                label="Right"
                                value={
                                  config[
                                    getStyleKey('title_container_padding_right')
                                  ] ?? config.title_container_padding_right
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'title_container_padding_right'
                                    ),
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
                                value={
                                  config[
                                    getStyleKey(
                                      'title_container_padding_bottom'
                                    )
                                  ] ?? config.title_container_padding_bottom
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'title_container_padding_bottom'
                                    ),
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
                                value={
                                  config[
                                    getStyleKey('title_container_padding_left')
                                  ] ?? config.title_container_padding_left
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey('title_container_padding_left'),
                                    v
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <Text
                              variant="bodySm"
                              as="span"
                              style={{ fontWeight: 500 }}
                            >
                              Title Margin (px)
                            </Text>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 12,
                                marginTop: 6,
                              }}
                            >
                              <PxField
                                label="Top"
                                value={
                                  config[
                                    getStyleKey('title_container_margin_top')
                                  ] ?? config.title_container_margin_top
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey('title_container_margin_top'),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Bottom"
                                value={
                                  config[
                                    getStyleKey('title_container_margin_bottom')
                                  ] ?? config.title_container_margin_bottom
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'title_container_margin_bottom'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Left"
                                value={
                                  config[
                                    getStyleKey('title_container_margin_left')
                                  ] ?? config.title_container_margin_left
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey('title_container_margin_left'),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Right"
                                value={
                                  config[
                                    getStyleKey('title_container_margin_right')
                                  ] ?? config.title_container_margin_right
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey('title_container_margin_right'),
                                    v
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Spacer to prevent overlap */}
                        <div style={{ height: '24px' }}></div>

                        {/* Description Text Field */}
                        <div style={{ paddingBottom: '12px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              variant="bodyMd"
                              as="span"
                              fontWeight="medium"
                            >
                              Collection Description
                            </Text>
                          </div>
                          <TextField
                            label="Collection Description"
                            labelHidden
                            value={config.collection_description}
                            onChange={(v) =>
                              updateConfig('collection_description', v)
                            }
                            multiline={3}
                            connectedRight={
                              <Tooltip content="Generate text">
                                <Button
                                  size="slim"
                                  variant="secondary"
                                  icon={MagicIcon}
                                  accessibilityLabel="Generate collection description text"
                                  style={{
                                    borderColor: '#00c9a7',
                                    background:
                                      'linear-gradient(180deg, #ffffff 0%, #ebfff8 100%)',
                                    boxShadow:
                                      '0 0 0 1px rgba(0, 201, 167, 0.35), 0 0 10px rgba(0, 201, 167, 0.55), inset 0 0 8px rgba(0, 201, 167, 0.18)',
                                  }}
                                  loading={generatingDescription}
                                  disabled={
                                    generatingTitle || generatingDescription
                                  }
                                  onClick={() =>
                                    generateAiSuggestion('description')
                                  }
                                />
                              </Tooltip>
                            }
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
                              value={
                                config[getStyleKey('description_align')] ||
                                'left'
                              }
                              onChange={(v) =>
                                updateConfig(
                                  getStyleKey('description_align'),
                                  v
                                )
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
                                config[
                                  getStyleKey('description_font_weight')
                                ] ||
                                  config.description_font_weight ||
                                  '400'
                              )}
                              onChange={(v) =>
                                updateConfig(
                                  getStyleKey('description_font_weight'),
                                  v
                                )
                              }
                            />
                            <PxField
                              label="Description Size"
                              value={
                                config[getStyleKey('description_size')] ??
                                config.description_size
                              }
                              onChange={(v) =>
                                updateConfig(getStyleKey('description_size'), v)
                              }
                            />
                            <ColorPickerField
                              label="Description Color"
                              value={
                                config[getStyleKey('description_color')] ||
                                config.description_color
                              }
                              onChange={(v) =>
                                updateConfig(
                                  getStyleKey('description_color'),
                                  v
                                )
                              }
                            />
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <Text
                              variant="bodySm"
                              as="span"
                              style={{ fontWeight: 500 }}
                            >
                              Description Padding (px)
                            </Text>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 12,
                                marginTop: 6,
                              }}
                            >
                              <PxField
                                label="Top"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_padding_top'
                                    )
                                  ] ?? config.description_container_padding_top
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_padding_top'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Bottom"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_padding_bottom'
                                    )
                                  ] ??
                                  config.description_container_padding_bottom
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_padding_bottom'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Left"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_padding_left'
                                    )
                                  ] ?? config.description_container_padding_left
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_padding_left'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Right"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_padding_right'
                                    )
                                  ] ??
                                  config.description_container_padding_right
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_padding_right'
                                    ),
                                    v
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <Text
                              variant="bodySm"
                              as="span"
                              style={{ fontWeight: 500 }}
                            >
                              Description Margin (px)
                            </Text>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 12,
                                marginTop: 6,
                              }}
                            >
                              <PxField
                                label="Top"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_margin_top'
                                    )
                                  ] ?? config.description_container_margin_top
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_margin_top'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Bottom"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_margin_bottom'
                                    )
                                  ] ??
                                  config.description_container_margin_bottom
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_margin_bottom'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Left"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_margin_left'
                                    )
                                  ] ?? config.description_container_margin_left
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_margin_left'
                                    ),
                                    v
                                  )
                                }
                              />
                              <PxField
                                label="Right"
                                value={
                                  config[
                                    getStyleKey(
                                      'description_container_margin_right'
                                    )
                                  ] ?? config.description_container_margin_right
                                }
                                onChange={(v) =>
                                  updateConfig(
                                    getStyleKey(
                                      'description_container_margin_right'
                                    ),
                                    v
                                  )
                                }
                              />
                            </div>
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

                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid #eee',
                      }}
                    >
                      <Checkbox
                        label="Enable Product Hover Effect"
                        checked={!!config.enable_product_hover}
                        onChange={(v) =>
                          updateConfig('enable_product_hover', v)
                        }
                      />
                      {config.enable_product_hover && (
                        <div style={{ marginTop: 10 }}>
                          <Select
                            label="Hover Mode"
                            options={[
                              {
                                label: 'Show Product Description',
                                value: 'description',
                              },
                              {
                                label: 'Show Second Product Image',
                                value: 'second_image',
                              },
                            ]}
                            value={config.product_hover_mode || 'second_image'}
                            onChange={(v) =>
                              updateConfig('product_hover_mode', v)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </FormLayout>
                </CollapsibleCard>

                {/* Variants & Actions Section */}
                <CollapsibleCard
                  title="Hover, Variants & Actions"
                  expanded={expandedSections.variants}
                  onToggle={() => toggleSection('variants')}
                >
                  <FormLayout>
                    <Checkbox
                      label="Enable Product Card Hover Effect"
                      checked={!!config.enable_product_hover}
                      onChange={(v) => updateConfig('enable_product_hover', v)}
                    />
                    {config.enable_product_hover && (
                      <Select
                        label="Hover Trigger Action"
                        options={[
                          { label: 'Show Second Image', value: 'second_image' },
                          { label: 'Show Description', value: 'description' },
                        ]}
                        value={config.product_hover_mode || 'second_image'}
                        onChange={(v) => updateConfig('product_hover_mode', v)}
                      />
                    )}
                    <Select
                      label="Preview Icon Visibility"
                      options={[
                        { label: 'Show On Hover', value: 'hover' },
                        { label: 'Always Visible', value: 'static' },
                      ]}
                      value={config.preview_icon_visibility || 'hover'}
                      onChange={(v) =>
                        updateConfig('preview_icon_visibility', v)
                      }
                    />
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

                    {config.product_card_variants_display === 'static' && (
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: '1px solid #eee',
                        }}
                      >
                        <Text variant="headingSm" as="h6">
                          Variant Dropdown Styling
                        </Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          <ColorPickerField
                            label="Background"
                            value={config.variant_select_bg || '#f9f9f9'}
                            onChange={(v) =>
                              updateConfig('variant_select_bg', v)
                            }
                          />
                          <ColorPickerField
                            label="Border Color"
                            value={
                              config.variant_select_border_color || '#e0e0e0'
                            }
                            onChange={(v) =>
                              updateConfig('variant_select_border_color', v)
                            }
                          />
                          <ColorPickerField
                            label="Text Color"
                            value={
                              config.variant_select_text_color || '#333333'
                            }
                            onChange={(v) =>
                              updateConfig('variant_select_text_color', v)
                            }
                          />
                          <PxField
                            label="Border Radius"
                            value={config.variant_select_border_radius ?? 8}
                            onChange={(v) =>
                              updateConfig('variant_select_border_radius', v)
                            }
                            min={0}
                            max={30}
                          />
                          <PxField
                            label="Font Size"
                            value={
                              config[getStyleKey('variant_select_font_size')] ||
                              13
                            }
                            onChange={(v) =>
                              updateConfig(
                                getStyleKey('variant_select_font_size'),
                                v
                              )
                            }
                            min={10}
                            max={20}
                          />
                          <PxField
                            label="Padding V"
                            value={config.variant_select_padding_vertical || 9}
                            onChange={(v) =>
                              updateConfig('variant_select_padding_vertical', v)
                            }
                            min={4}
                            max={20}
                          />
                          <PxField
                            label="Padding H"
                            value={
                              config.variant_select_padding_horizontal || 12
                            }
                            onChange={(v) =>
                              updateConfig(
                                'variant_select_padding_horizontal',
                                v
                              )
                            }
                            min={4}
                            max={30}
                          />
                          <PxField
                            label="Margin Top"
                            value={config.variant_select_margin_top || 10}
                            onChange={(v) =>
                              updateConfig('variant_select_margin_top', v)
                            }
                            min={0}
                            max={30}
                          />
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <TextField
                            label="Placeholder Text"
                            value={
                              config.variant_select_placeholder ||
                              '— Select a variant —'
                            }
                            onChange={(v) =>
                              updateConfig('variant_select_placeholder', v)
                            }
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                {/* Button Customization - New Section */}
                <CollapsibleCard
                  title="Button Customization"
                  expanded={expandedSections.buttonCustomization}
                  onToggle={() => toggleSection('buttonCustomization')}
                >
                  <FormLayout>
                    <Text variant="headingSm" as="h6">
                      Add Button
                    </Text>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                      }}
                    >
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
                      <PxField
                        label="Font Size"
                        value={
                          config.add_btn_font_size ||
                          config.product_add_btn_font_size
                        }
                        onChange={(v) => updateConfig('add_btn_font_size', v)}
                      />
                      <Select
                        label="Font Weight"
                        options={[
                          { label: 'Normal (400)', value: 400 },
                          { label: 'Medium (500)', value: 500 },
                          { label: 'Semi-Bold (600)', value: 600 },
                          { label: 'Bold (700)', value: 700 },
                          { label: 'Extra Bold (800)', value: 800 },
                        ]}
                        value={
                          config.add_btn_font_weight ||
                          config.product_add_btn_font_weight ||
                          600
                        }
                        onChange={(v) => updateConfig('add_btn_font_weight', v)}
                      />
                      <PxField
                        label="Border Radius"
                        value={config.add_btn_border_radius ?? 8}
                        onChange={(v) =>
                          updateConfig('add_btn_border_radius', v)
                        }
                      />
                    </div>

                    {config.layout === 'layout4' && (
                      <>
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Preview Bar - Checkout Button
                          </Text>
                          <Checkbox
                            label="Show Checkout Button in Preview"
                            checked={config.show_preview_checkout_btn !== false}
                            onChange={(checked) =>
                              updateConfig('show_preview_checkout_btn', checked)
                            }
                          />
                          <TextField
                            label="Text"
                            value={
                              config.preview_checkout_btn_text ||
                              config.checkout_btn_text ||
                              'Checkout'
                            }
                            onChange={(v) =>
                              updateConfig('preview_checkout_btn_text', v)
                            }
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Background"
                              value={
                                config.preview_checkout_btn_bg ||
                                config.checkout_btn_bg ||
                                '#000'
                              }
                              onChange={(v) =>
                                updateConfig('preview_checkout_btn_bg', v)
                              }
                            />
                            <ColorPickerField
                              label="Text Color"
                              value={
                                config.preview_checkout_btn_text_color ||
                                config.checkout_btn_text_color ||
                                '#fff'
                              }
                              onChange={(v) =>
                                updateConfig(
                                  'preview_checkout_btn_text_color',
                                  v
                                )
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Preview Bar - Add to Cart Button
                          </Text>
                          <Checkbox
                            label="Show Add to Cart Button in Preview"
                            checked={!!config.show_preview_add_to_cart_btn}
                            onChange={(checked) =>
                              updateConfig(
                                'show_preview_add_to_cart_btn',
                                checked
                              )
                            }
                          />
                          <TextField
                            label="Text"
                            value={
                              config.preview_add_to_cart_btn_text ||
                              'Add to Cart'
                            }
                            onChange={(v) =>
                              updateConfig('preview_add_to_cart_btn_text', v)
                            }
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Background"
                              value={
                                config.preview_add_to_cart_btn_bg || '#fff'
                              }
                              onChange={(v) =>
                                updateConfig('preview_add_to_cart_btn_bg', v)
                              }
                            />
                            <ColorPickerField
                              label="Text Color"
                              value={
                                config.preview_add_to_cart_btn_text_color ||
                                '#000'
                              }
                              onChange={(v) =>
                                updateConfig(
                                  'preview_add_to_cart_btn_text_color',
                                  v
                                )
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                {/* Preview Bar - Tab 4 */}

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
                    <Checkbox
                      label="Make Inline Preview Sticky"
                      checked={!!config.inline_preview_sticky}
                      onChange={(checked) =>
                        updateConfig('inline_preview_sticky', checked)
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
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Bar Header (Title & Motivation)
                          </Text>
                          <TextField
                            label="Bar Title"
                            value={config.preview_bar_title}
                            onChange={(v) =>
                              updateConfig('preview_bar_title', v)
                            }
                            autoComplete="off"
                            placeholder="e.g. Your Bundle Summary"
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Title Color"
                              value={config.preview_bar_title_color}
                              onChange={(v) =>
                                updateConfig('preview_bar_title_color', v)
                              }
                            />
                            <PxField
                              label="Title Size"
                              value={config.preview_bar_title_size}
                              onChange={(v) =>
                                updateConfig('preview_bar_title_size', v)
                              }
                              min={10}
                              max={40}
                            />
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <TextField
                              label="Motivation Text (Incomplete)"
                              value={config.preview_motivation_text}
                              onChange={(v) =>
                                updateConfig('preview_motivation_text', v)
                              }
                              autoComplete="off"
                              helpText="Use {{remaining}} for items left."
                              placeholder="Add {{remaining}} more for discount!"
                            />
                            <TextField
                              label="Motivation Text (Unlocked)"
                              value={config.preview_motivation_unlocked_text}
                              onChange={(v) =>
                                updateConfig(
                                  'preview_motivation_unlocked_text',
                                  v
                                )
                              }
                              autoComplete="off"
                              placeholder="Discount Unlocked! 🎉"
                            />
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 10,
                                marginTop: 8,
                              }}
                            >
                              <ColorPickerField
                                label="Motivation Color"
                                value={config.preview_motivation_color}
                                onChange={(v) =>
                                  updateConfig('preview_motivation_color', v)
                                }
                              />
                              <PxField
                                label="Motivation Size"
                                value={config.preview_motivation_size}
                                onChange={(v) =>
                                  updateConfig('preview_motivation_size', v)
                                }
                                min={10}
                                max={30}
                              />
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Overall Styling
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Background"
                              value={config.preview_bar_bg}
                              onChange={(v) =>
                                updateConfig('preview_bar_bg', v)
                              }
                            />
                            <ColorPickerField
                              label="Default Text Color"
                              value={config.preview_bar_text_color}
                              onChange={(v) =>
                                updateConfig('preview_bar_text_color', v)
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Price Styling
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <PxField
                              label="Original Price Size"
                              value={config.original_price_size}
                              onChange={(v) =>
                                updateConfig('original_price_size', v)
                              }
                              min={10}
                              max={40}
                            />
                            <ColorPickerField
                              label="Original Price Color"
                              value={config.preview_original_price_color}
                              onChange={(v) =>
                                updateConfig('preview_original_price_color', v)
                              }
                            />
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <PxField
                              label="Discounted Price Size"
                              value={config.discounted_price_size}
                              onChange={(v) =>
                                updateConfig('discounted_price_size', v)
                              }
                              min={10}
                              max={40}
                            />
                            <ColorPickerField
                              label="Discounted Price Color"
                              value={config.preview_discount_price_color}
                              onChange={(v) =>
                                updateConfig('preview_discount_price_color', v)
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Checkout Button
                          </Text>
                          <Checkbox
                            label="Show Checkout Button"
                            checked={config.show_preview_checkout_btn !== false}
                            onChange={(v) =>
                              updateConfig('show_preview_checkout_btn', v)
                            }
                          />
                          <TextField
                            label="Checkout Text"
                            value={
                              config.preview_checkout_btn_text ||
                              'Proceed to Checkout'
                            }
                            onChange={(v) =>
                              updateConfig('preview_checkout_btn_text', v)
                            }
                            autoComplete="off"
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Background"
                              value={config.preview_checkout_btn_bg}
                              onChange={(v) =>
                                updateConfig('preview_checkout_btn_bg', v)
                              }
                            />
                            <ColorPickerField
                              label="Text Color"
                              value={config.preview_checkout_btn_text_color}
                              onChange={(v) =>
                                updateConfig(
                                  'preview_checkout_btn_text_color',
                                  v
                                )
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Reset Button
                          </Text>
                          <Checkbox
                            label="Show Reset Button"
                            checked={config.show_reset_btn !== false}
                            onChange={(v) => updateConfig('show_reset_btn', v)}
                          />
                          <TextField
                            label="Reset Text"
                            value={
                              config.preview_reset_btn_text || 'Reset Combo'
                            }
                            onChange={(v) =>
                              updateConfig('preview_reset_btn_text', v)
                            }
                            autoComplete="off"
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Background"
                              value={config.preview_reset_btn_bg}
                              onChange={(v) =>
                                updateConfig('preview_reset_btn_bg', v)
                              }
                            />
                            <ColorPickerField
                              label="Text Color"
                              value={config.preview_reset_btn_text_color}
                              onChange={(v) =>
                                updateConfig('preview_reset_btn_text_color', v)
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Dimensions & Layout
                          </Text>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <PxField
                              label="Height (px)"
                              value={config.preview_bar_height}
                              onChange={(v) =>
                                updateConfig('preview_bar_height', v)
                              }
                              min={40}
                              max={200}
                            />
                            <PxField
                              label="Padding (px)"
                              value={config.preview_bar_padding}
                              onChange={(v) =>
                                updateConfig('preview_bar_padding', v)
                              }
                              min={0}
                              max={80}
                            />
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <PxField
                              label="Border Radius (px)"
                              value={config.preview_border_radius || 0}
                              onChange={(v) =>
                                updateConfig('preview_border_radius', v)
                              }
                              min={0}
                              max={50}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid #eee',
                          }}
                        >
                          <Text variant="headingSm" as="h6">
                            Product Shapes
                          </Text>
                          <Select
                            label="Shape Style"
                            options={[
                              { label: 'Rectangle', value: 'rectangle' },
                              { label: 'Circle', value: 'circle' },
                            ]}
                            value={config.preview_item_shape || 'rectangle'}
                            onChange={(v) =>
                              updateConfig('preview_item_shape', v)
                            }
                          />
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <PxField
                              label="Shape Size (px)"
                              value={config.preview_item_size}
                              onChange={(v) =>
                                updateConfig('preview_item_size', v)
                              }
                              min={24}
                              max={120}
                            />
                            <PxField
                              label="Shape Padding (px)"
                              value={config.preview_item_padding}
                              onChange={(v) =>
                                updateConfig('preview_item_padding', v)
                              }
                              min={0}
                              max={40}
                            />
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10,
                              marginTop: 8,
                            }}
                          >
                            <ColorPickerField
                              label="Shape BG"
                              value={config.preview_item_color}
                              onChange={(v) =>
                                updateConfig('preview_item_color', v)
                              }
                            />
                            <ColorPickerField
                              label="Border Color"
                              value={config.preview_item_border_color}
                              onChange={(v) =>
                                updateConfig('preview_item_border_color', v)
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </FormLayout>
                </CollapsibleCard>

                {/* Sticky Checkout Button customization removed as requested */}

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
                      <div
                        style={{
                          marginBottom: 12,
                          paddingBottom: 12,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <Text
                          variant="headingSm"
                          as="h6"
                          style={{ marginBottom: 8 }}
                        >
                          Width Control (%)
                        </Text>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <PxField
                            label="Container"
                            value={config.container_width}
                            onChange={(v) => updateConfig('container_width', v)}
                            min={50}
                            max={100}
                            suffix="%"
                          />
                          <PxField
                            label="Title"
                            value={config.title_width}
                            onChange={(v) => updateConfig('title_width', v)}
                            min={20}
                            max={100}
                            suffix="%"
                          />
                          <PxField
                            label="Banner"
                            value={config.banner_width}
                            onChange={(v) => updateConfig('banner_width', v)}
                            min={20}
                            max={100}
                            suffix="%"
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
                    {config.layout === 'layout4' && (
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
                          onChange={(v) =>
                            updateConfig('preview_item_shape', v)
                          }
                        />
                      </div>
                    )}
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
                      <Button
                        onClick={() => {
                          resetDiscountForm();
                          setCreateDiscountModalOpen(true);
                        }}
                      >
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
                        label="Limit Reached Message"
                        value={config.limit_reached_message}
                        onChange={(v) =>
                          updateConfig('limit_reached_message', v)
                        }
                        autoComplete="off"
                        helpText={
                          <span style={{ fontSize: 11, lineHeight: '1.5' }}>
                            Use &#123;&#123;limit&#125;&#125; as a placeholder
                            for the max selections number.
                          </span>
                        }
                      />
                      <TextField
                        label="Discount Motivation Text"
                        value={config.discount_motivation_text}
                        onChange={(v) =>
                          updateConfig('discount_motivation_text', v)
                        }
                        autoComplete="off"
                        helpText={
                          <span style={{ fontSize: 11, lineHeight: '1.5' }}>
                            Use &#123;&#123;remaining&#125;&#125; as a
                            placeholder for the items left to unlock discount.
                          </span>
                        }
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
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <ColorPickerField
                            label="Progress Bar Color"
                            value={config.progress_bar_color}
                            onChange={(v) =>
                              updateConfig('progress_bar_color', v)
                            }
                          />
                          <ColorPickerField
                            label="Success/Unlocked Color"
                            value={config.progress_success_color}
                            onChange={(v) =>
                              updateConfig('progress_success_color', v)
                            }
                          />
                          <ColorPickerField
                            label="Progress Text Color"
                            value={config.progress_text_color}
                            onChange={(v) =>
                              updateConfig('progress_text_color', v)
                            }
                          />
                          <ColorPickerField
                            label="Container Background"
                            value={config.progress_container_bg}
                            onChange={(v) =>
                              updateConfig('progress_container_bg', v)
                            }
                          />
                        </div>
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

                {/* Custom CSS Section */}
                <CollapsibleCard
                  title="Custom CSS"
                  expanded={expandedSections.customCss}
                  onToggle={() => toggleSection('customCss')}
                >
                  <FormLayout>
                    <div style={{ marginBottom: '12px', marginTop: '12px' }}>
                      <Text variant="headingSm" as="h6">
                        Custom CSS
                      </Text>
                      <p
                        style={{
                          fontSize: '13px',
                          color: '#6d7175',
                          marginBottom: '8px',
                          marginTop: '4px',
                        }}
                      >
                        Add your own CSS to further customize the design. These
                        styles will be applied to the storefront.
                      </p>
                      <TextField
                        multiline={10}
                        value={config.custom_css || ''}
                        onChange={(v) => updateConfig('custom_css', v)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="/* Enter your custom CSS here */&#10;#combo-builder-root .cdo-card {&#10;  /* Your styles */&#10;}"
                        monospaced
                      />
                    </div>
                  </FormLayout>
                </CollapsibleCard>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Discount Type Modal (Level 1) */}
      <Modal
        open={createDiscountModalOpen}
        onClose={() => setCreateDiscountModalOpen(false)}
        title="Select discount type"
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setCreateDiscountModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discountTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => openDiscountConfiguration(opt.value)}
                style={{
                  border: '1px solid #D2D5D9',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#202223',
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#6D7175',
                        marginTop: 2,
                        lineHeight: 1.35,
                      }}
                    >
                      {opt.description}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 16, color: '#8C9196', marginLeft: 8 }}
                    aria-hidden="true"
                  >
                    ›
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Modal.Section>
      </Modal>

      {/* Discount Configuration Modal (Level 2) */}
      <Modal
        open={configureDiscountModalOpen}
        onClose={() => {
          setConfigureDiscountModalOpen(false);
          resetDiscountForm();
        }}
        title={selectedDiscountTypeMeta?.title || 'Create Discount'}
        primaryAction={{
          content: 'Create discount',
          onAction: handleCreateDiscount,
          loading: discountFetcher.state === 'submitting',
        }}
        secondaryActions={[
          {
            content: 'Back',
            onAction: () => {
              setConfigureDiscountModalOpen(false);
              setCreateDiscountModalOpen(true);
            },
          },
          {
            content: 'Cancel',
            onAction: () => {
              setConfigureDiscountModalOpen(false);
              resetDiscountForm();
            },
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Title"
              value={dTitle}
              onChange={(v) => {
                setDTitle(v);
                if (dErrors.title)
                  setDErrors((p) => ({ ...p, title: undefined }));
              }}
              autoComplete="off"
              helpText="For internal use. Customers may see this in cart or checkout."
              error={dErrors.title}
              placeholder="Summer Sale 20% Off"
            />

            <TextField
              label="Discount code"
              value={dCode}
              onChange={(v) => setDCode(v.toUpperCase())}
              autoComplete="off"
              helpText="Customers must enter this code at checkout."
              placeholder="SAVE10WINTER"
              suffix={
                <Button
                  variant="plain"
                  onClick={() =>
                    setDCode(
                      Math.random().toString(36).substring(2, 10).toUpperCase()
                    )
                  }
                >
                  Generate random code
                </Button>
              }
            />

            {selectedDiscountType !== 'free_shipping' &&
              selectedDiscountType !== 'buy_x_get_y' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <Select
                    label="Value type"
                    options={[
                      { label: 'Percentage off (%)', value: 'percentage' },
                      { label: 'Fixed amount off', value: 'fixed_amount' },
                    ]}
                    value={dValueType}
                    onChange={setDValueType}
                  />
                  <TextField
                    label="Discount value"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={dValue}
                    onChange={(v) => {
                      setDValue(v);
                      if (dErrors.value)
                        setDErrors((p) => ({ ...p, value: undefined }));
                    }}
                    suffix={dValueType === 'percentage' ? '%' : '₹'}
                    autoComplete="off"
                    error={dErrors.value}
                    placeholder={dValueType === 'percentage' ? '10' : '20'}
                  />
                </div>
              )}

            {selectedDiscountType === 'free_shipping' && (
              <div
                style={{
                  padding: 12,
                  background: '#F6F6F7',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#202223',
                }}
              >
                Free shipping discounts apply shipping benefit only. Minimum
                requirement, usage limits, dates, and combinations can still be
                configured below.
              </div>
            )}

            {selectedDiscountType === 'buy_x_get_y' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <TextField
                    label="Customer buys quantity"
                    type="number"
                    min="1"
                    value={dBuyQuantity}
                    onChange={(v) => {
                      setDBuyQuantity(v);
                      if (dErrors.buyQuantity)
                        setDErrors((p) => ({ ...p, buyQuantity: undefined }));
                    }}
                    autoComplete="off"
                    error={dErrors.buyQuantity}
                  />
                  <TextField
                    label="Customer gets quantity"
                    type="number"
                    min="1"
                    value={dGetQuantity}
                    onChange={(v) => {
                      setDGetQuantity(v);
                      if (dErrors.getQuantity)
                        setDErrors((p) => ({ ...p, getQuantity: undefined }));
                    }}
                    autoComplete="off"
                    error={dErrors.getQuantity}
                  />
                  <Select
                    label="Get value type"
                    options={[
                      { label: 'Percentage off', value: 'percentage' },
                      { label: 'Fixed amount off', value: 'fixed_amount' },
                      { label: 'Free', value: 'free' },
                    ]}
                    value={dGetValueType}
                    onChange={(v) => {
                      setDGetValueType(v);
                      if (v === 'free') setDGetValue('100');
                    }}
                  />
                  <TextField
                    label="Get value"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={dGetValue}
                    disabled={dGetValueType === 'free'}
                    onChange={(v) => {
                      setDGetValue(v);
                      if (dErrors.getValue)
                        setDErrors((p) => ({ ...p, getValue: undefined }));
                    }}
                    suffix={dGetValueType === 'percentage' ? '%' : '₹'}
                    autoComplete="off"
                    error={dErrors.getValue}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111',
                      marginBottom: 6,
                    }}
                  >
                    Customer buys from
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <Select
                      label="Buy target type"
                      options={[
                        { label: 'Specific products', value: 'products' },
                        { label: 'Specific collections', value: 'collections' },
                      ]}
                      value={dBuyTargetType}
                      onChange={(v) => {
                        setDBuyTargetType(v);
                        setDBuyTargetIds([]);
                        if (dErrors.buyTargets)
                          setDErrors((p) => ({ ...p, buyTargets: undefined }));
                      }}
                    />
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          color: '#6D7175',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        Select buy targets (multiple)
                      </label>
                      <select
                        multiple
                        value={dBuyTargetIds}
                        onChange={(e) => {
                          const values = Array.from(
                            e.target.selectedOptions
                          ).map((opt) => opt.value);
                          setDBuyTargetIds(values);
                          if (dErrors.buyTargets)
                            setDErrors((p) => ({
                              ...p,
                              buyTargets: undefined,
                            }));
                        }}
                        style={{
                          width: '100%',
                          minHeight: 96,
                          border: `1px solid ${dErrors.buyTargets ? '#d72c0d' : '#c9cccf'}`,
                          borderRadius: 8,
                          padding: 6,
                          background: '#fff',
                        }}
                      >
                        {(dBuyTargetType === 'products'
                          ? bxgyProductOptions
                          : bxgyCollectionOptions
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {dErrors.buyTargets && (
                        <div
                          style={{
                            color: '#d72c0d',
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {dErrors.buyTargets}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 6 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111',
                      marginBottom: 6,
                    }}
                  >
                    Customer gets from
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <Select
                      label="Get target type"
                      options={[
                        { label: 'All products', value: 'all' },
                        { label: 'Specific products', value: 'products' },
                        { label: 'Specific collections', value: 'collections' },
                      ]}
                      value={dGetTargetType}
                      onChange={(v) => {
                        setDGetTargetType(v);
                        setDGetTargetIds([]);
                        if (dErrors.getTargets)
                          setDErrors((p) => ({ ...p, getTargets: undefined }));
                      }}
                    />
                    <div>
                      {dGetTargetType === 'all' ? (
                        <div
                          style={{
                            minHeight: 96,
                            border: '1px solid #c9cccf',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 12,
                            color: '#6D7175',
                            background: '#f6f6f7',
                          }}
                        >
                          Applies to all products.
                        </div>
                      ) : (
                        <>
                          <label
                            style={{
                              fontSize: 12,
                              color: '#6D7175',
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Select get targets (multiple)
                          </label>
                          <select
                            multiple
                            value={dGetTargetIds}
                            onChange={(e) => {
                              const values = Array.from(
                                e.target.selectedOptions
                              ).map((opt) => opt.value);
                              setDGetTargetIds(values);
                              if (dErrors.getTargets)
                                setDErrors((p) => ({
                                  ...p,
                                  getTargets: undefined,
                                }));
                            }}
                            style={{
                              width: '100%',
                              minHeight: 96,
                              border: `1px solid ${dErrors.getTargets ? '#d72c0d' : '#c9cccf'}`,
                              borderRadius: 8,
                              padding: 6,
                              background: '#fff',
                            }}
                          >
                            {(dGetTargetType === 'products'
                              ? bxgyProductOptions
                              : bxgyCollectionOptions
                            ).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {dErrors.getTargets && (
                            <div
                              style={{
                                color: '#d72c0d',
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {dErrors.getTargets}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111',
                  marginBottom: 8,
                }}
              >
                Minimum purchase requirements
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { value: 'none', label: 'No minimum requirements' },
                  { value: 'amount', label: 'Minimum purchase amount (₹)' },
                  { value: 'quantity', label: 'Minimum quantity of items' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      checked={dMinRequirementType === opt.value}
                      onChange={() => setDMinRequirementType(opt.value)}
                    />
                    <span style={{ fontSize: 13 }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              {(dMinRequirementType === 'amount' ||
                dMinRequirementType === 'quantity') && (
                <div style={{ marginTop: 8, maxWidth: 200 }}>
                  <TextField
                    type="number"
                    value={dMinRequirementValue}
                    onChange={(v) => {
                      setDMinRequirementValue(v);
                      if (dErrors.minRequirementValue)
                        setDErrors((p) => ({
                          ...p,
                          minRequirementValue: undefined,
                        }));
                    }}
                    placeholder={
                      dMinRequirementType === 'amount' ? '0.00' : '0'
                    }
                    autoComplete="off"
                    error={dErrors.minRequirementValue}
                  />
                </div>
              )}
            </div>

            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111',
                  marginBottom: 8,
                }}
              >
                Maximum discount uses
              </p>
              <Checkbox
                label="Limit number of times this discount can be used in total"
                checked={dLimitUsage}
                onChange={setDLimitUsage}
              />
              {dLimitUsage && (
                <div style={{ marginTop: 8, maxWidth: 200 }}>
                  <TextField
                    type="number"
                    value={dMaxUsageLimit}
                    onChange={(v) => {
                      setDMaxUsageLimit(v);
                      if (dErrors.maxUsage)
                        setDErrors((p) => ({ ...p, maxUsage: undefined }));
                    }}
                    autoComplete="off"
                    error={dErrors.maxUsage}
                  />
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <Checkbox
                  label="Limit to one use per customer"
                  checked={dOncePerCustomer}
                  onChange={setDOncePerCustomer}
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111',
                  marginBottom: 4,
                }}
              >
                Combinations
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                This discount can be combined with:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Checkbox
                  label="Product discounts"
                  checked={dCombinations.product}
                  onChange={(v) =>
                    setDCombinations((p) => ({ ...p, product: v }))
                  }
                />
                <Checkbox
                  label="Order discounts"
                  checked={dCombinations.order}
                  onChange={(v) =>
                    setDCombinations((p) => ({ ...p, order: v }))
                  }
                />
                <Checkbox
                  label="Shipping discounts"
                  checked={dCombinations.shipping}
                  onChange={(v) =>
                    setDCombinations((p) => ({ ...p, shipping: v }))
                  }
                />
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#111',
                  marginBottom: 8,
                }}
              >
                Active dates
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <TextField
                  label="Start date"
                  type="date"
                  value={dStartsAt?.split('T')[0] || ''}
                  onChange={(v) => {
                    setDStartsAt(
                      v + 'T' + (dStartsAt?.split('T')[1] || '00:00')
                    );
                    if (dErrors.startsAt)
                      setDErrors((p) => ({ ...p, startsAt: undefined }));
                  }}
                  autoComplete="off"
                  error={dErrors.startsAt}
                />
                <TextField
                  label="Start time"
                  type="time"
                  value={dStartsAt?.split('T')[1] || ''}
                  onChange={(v) =>
                    setDStartsAt((dStartsAt?.split('T')[0] || '') + 'T' + v)
                  }
                  autoComplete="off"
                />
              </div>
              <Checkbox
                label="Set end date"
                checked={dHasEndDate}
                onChange={setDHasEndDate}
              />
              {dHasEndDate && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  <TextField
                    label="End date"
                    type="date"
                    value={dEndsAt?.split('T')[0] || ''}
                    onChange={(v) => {
                      setDEndsAt(v + 'T' + (dEndsAt?.split('T')[1] || '23:59'));
                      if (dErrors.endsAt)
                        setDErrors((p) => ({ ...p, endsAt: undefined }));
                    }}
                    autoComplete="off"
                    error={dErrors.endsAt}
                  />
                  <TextField
                    label="End time"
                    type="time"
                    value={dEndsAt?.split('T')[1] || ''}
                    onChange={(v) =>
                      setDEndsAt((dEndsAt?.split('T')[0] || '') + 'T' + v)
                    }
                    autoComplete="off"
                  />
                </div>
              )}
            </div>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
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
  setSelectedVariants = () => {},
  allStepProducts = {},
  setAllStepProducts = () => {},
  stepProductsLoading = false,
}) {
  const isMobile = device === 'mobile';
  const sliderRef = useRef(null);
  const tabScrollRef = useRef(null);

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
    .cdo-slider-horizontal.cdo-tabs-scroll-visible {
      scrollbar-width: thin;
      -ms-overflow-style: auto;
    }
    .cdo-slider-horizontal.cdo-tabs-scroll-visible::-webkit-scrollbar {
      display: block !important;
      height: 6px;
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
    @keyframes combo-spin {
      to { transform: rotate(360deg); }
    }
    .combo-spinner-new {
      width: 44px;
      height: 44px;
      border: 4px solid rgba(0,0,0,0.05);
      border-top: 4px solid ${config.selection_highlight_color || '#008060'};
      border-radius: 50%;
      animation: combo-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes combo-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
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

  // const previewItemSize = config.preview_item_size; // unused
  const productTitleSize = isMobile
    ? config.product_title_size_mobile || 12
    : config.product_title_size_desktop || 15;
  const productPriceSize = isMobile
    ? config.product_price_size_mobile || 12
    : config.product_price_size_desktop || 15;

  const headingSize = isMobile
    ? (config.heading_size_mobile ?? config.heading_size ?? 22)
    : (config.heading_size ?? 28);
  const descriptionSize = isMobile
    ? (config.description_size_mobile ?? config.description_size ?? 13)
    : (config.description_size ?? 15);

  const headingColor = isMobile
    ? config.heading_color_mobile || config.heading_color
    : config.heading_color;
  const descriptionColor = isMobile
    ? config.description_color_mobile || config.description_color
    : config.description_color;

  const headingFontWeight = isMobile
    ? config.heading_font_weight_mobile || config.heading_font_weight || 700
    : config.heading_font_weight || 700;
  const descriptionFontWeight = isMobile
    ? config.description_font_weight_mobile ||
      config.description_font_weight ||
      400
    : config.description_font_weight || 400;

  const headingAlign = isMobile
    ? config.heading_align_mobile || config.heading_align || 'left'
    : config.heading_align || 'left';
  const descriptionAlign = isMobile
    ? config.description_align_mobile || config.description_align || 'left'
    : config.description_align || 'left';

  // Padding & Margins
  const titlePadding = {
    top: isMobile
      ? (config.title_container_padding_top_mobile ??
        config.title_container_padding_top)
      : config.title_container_padding_top,
    right: isMobile
      ? (config.title_container_padding_right_mobile ??
        config.title_container_padding_right)
      : config.title_container_padding_right,
    bottom: isMobile
      ? (config.title_container_padding_bottom_mobile ??
        config.title_container_padding_bottom)
      : config.title_container_padding_bottom,
    left: isMobile
      ? (config.title_container_padding_left_mobile ??
        config.title_container_padding_left)
      : config.title_container_padding_left,
    marginTop: isMobile
      ? (config.title_container_margin_top_mobile ??
        config.title_container_margin_top)
      : config.title_container_margin_top,
    marginRight: isMobile
      ? (config.title_container_margin_right_mobile ??
        config.title_container_margin_right)
      : config.title_container_margin_right,
    marginBottom: isMobile
      ? (config.title_container_margin_bottom_mobile ??
        config.title_container_margin_bottom)
      : config.title_container_margin_bottom,
    marginLeft: isMobile
      ? (config.title_container_margin_left_mobile ??
        config.title_container_margin_left)
      : config.title_container_margin_left,
  };

  const descriptionPadding = {
    top: isMobile
      ? (config.description_container_padding_top_mobile ??
        config.description_container_padding_top)
      : config.description_container_padding_top,
    right: isMobile
      ? (config.description_container_padding_right_mobile ??
        config.description_container_padding_right)
      : config.description_container_padding_right,
    bottom: isMobile
      ? (config.description_container_padding_bottom_mobile ??
        config.description_container_padding_bottom)
      : config.description_container_padding_bottom,
    left: isMobile
      ? (config.description_container_padding_left_mobile ??
        config.description_container_padding_left)
      : config.description_container_padding_left,
    marginTop: isMobile
      ? (config.description_container_margin_top_mobile ??
        config.description_container_margin_top)
      : config.description_container_margin_top,
    marginRight: isMobile
      ? (config.description_container_margin_right_mobile ??
        config.description_container_margin_right)
      : config.description_container_margin_right,
    marginBottom: isMobile
      ? (config.description_container_margin_bottom_mobile ??
        config.description_container_margin_bottom)
      : config.description_container_margin_bottom,
    marginLeft: isMobile
      ? (config.description_container_margin_left_mobile ??
        config.description_container_margin_left)
      : config.description_container_margin_left,
  };

  const productCardPadding = config.product_card_padding ?? 10;
  const viewportWidth = '100%';
  const columns = isMobile ? config.mobile_columns : config.desktop_columns;
  const numericColumns = Math.max(1, Number(columns) || 1);
  const gridGap = Number(config.products_gap ?? 12);
  const effectiveColumns = numericColumns;
  // const cardHeight = isMobile
  //   ? config.card_height_mobile
  //   : config.card_height_desktop; // unused
  const productImageHeight = isMobile
    ? config.product_image_height_mobile
    : config.product_image_height_desktop;
  const productImageRatio = config.product_image_ratio || 'square';
  const productImageAspectRatio =
    productImageRatio === 'portrait'
      ? '3 / 4'
      : productImageRatio === 'rectangle'
        ? '4 / 3'
        : '1 / 1';
  const supportsAspectRatio =
    typeof window !== 'undefined' &&
    window.CSS &&
    typeof window.CSS.supports === 'function' &&
    window.CSS.supports('aspect-ratio: 1 / 1');
  // const cardHeight = isMobile
  //   ? config.card_height_mobile
  //   : config.card_height_desktop; // unused

  // Title & Description renderer
  const renderTitleDescription = () => (
    <div style={{ width: `${config.title_width || 100}%`, margin: '0 auto' }}>
      <div
        style={{
          paddingTop: titlePadding.top,
          paddingRight: titlePadding.right,
          paddingBottom: titlePadding.bottom,
          paddingLeft: titlePadding.left,
          marginTop: titlePadding.marginTop,
          marginRight: titlePadding.marginRight,
          marginBottom: titlePadding.marginBottom,
          marginLeft: titlePadding.marginLeft,
          textAlign: headingAlign,
        }}
      >
        <h1
          style={{
            fontSize: `${headingSize}px`,
            marginBottom: 4,
            color: headingColor,
            fontWeight: headingFontWeight,
            textAlign: headingAlign,
          }}
        >
          {config.collection_title}
        </h1>
      </div>
      {config.collection_description && (
        <div
          style={{
            paddingTop: descriptionPadding.top,
            paddingRight: descriptionPadding.right,
            paddingBottom: descriptionPadding.bottom,
            paddingLeft: descriptionPadding.left,
            marginTop: descriptionPadding.marginTop,
            marginRight: descriptionPadding.marginRight,
            marginBottom: descriptionPadding.marginBottom,
            marginLeft: descriptionPadding.marginLeft,
            textAlign: descriptionAlign,
          }}
        >
          <p
            style={{
              fontSize: `${descriptionSize}px`,
              color: descriptionColor,
              fontWeight: descriptionFontWeight,
              textAlign: descriptionAlign,
            }}
          >
            {config.collection_description}
          </p>
        </div>
      )}
    </div>
  );

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
  const banners = useMemo(
    () =>
      [
        {
          image: config.banner_1_image,
          title: config.banner_1_title,
          subtitle: config.banner_1_subtitle,
        },
        {
          image: config.banner_2_image,
          title: config.banner_2_title,
          subtitle: config.banner_2_subtitle,
        },
        {
          image: config.banner_3_image,
          title: config.banner_3_title,
          subtitle: config.banner_3_subtitle,
        },
      ].filter((b) => b.image),
    [
      config.banner_1_image,
      config.banner_1_title,
      config.banner_1_subtitle,
      config.banner_2_image,
      config.banner_2_title,
      config.banner_2_subtitle,
      config.banner_3_image,
      config.banner_3_title,
      config.banner_3_subtitle,
    ]
  );

  useEffect(() => {
    if (!config.enable_banner_slider || banners.length <= 1) return;
    const interval = setInterval(
      () => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      },
      (config.slider_speed || 5) * 1000
    );
    return () => clearInterval(interval);
  }, [config.enable_banner_slider, config.slider_speed, banners.length]);

  // --- Advanced Timer Logic ---
  const [bundleIndex, setBundleIndex] = useState(0);
  const titles = useMemo(
    () => (config.bundle_titles || '').split(',').filter((t) => t.trim()),
    [config.bundle_titles]
  );
  const subtitles = useMemo(
    () => (config.bundle_subtitles || '').split(',').filter((t) => t.trim()),
    [config.bundle_subtitles]
  );

  const [timeLeft, setTimeLeft] = useState(() => {
    return (
      Number(config.timer_hours || 0) * 3600 +
      Number(config.timer_minutes || 0) * 60 +
      Number(config.timer_seconds || 0)
    );
  });

  useEffect(() => {
    const totalSeconds =
      Number(config.timer_hours || 0) * 3600 +
      Number(config.timer_minutes || 0) * 60 +
      Number(config.timer_seconds || 0);
    setTimeLeft(totalSeconds);
  }, [config.timer_hours, config.timer_minutes, config.timer_seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (config.auto_reset_timer) {
        const totalSeconds =
          Number(config.timer_hours || 0) * 3600 +
          Number(config.timer_minutes || 0) * 60 +
          Number(config.timer_seconds || 0);
        setTimeLeft(totalSeconds);
        if (config.change_bundle_on_timer_end && titles.length > 0) {
          setBundleIndex((prev) => (prev + 1) % titles.length);
        }
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [
    timeLeft,
    config.auto_reset_timer,
    config.change_bundle_on_timer_end,
    titles.length,
    config.timer_hours,
    config.timer_minutes,
    config.timer_seconds,
  ]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  };
  const time = formatTime(timeLeft);
  const totalItems = selectedProducts.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0),
    0
  );
  const discountThreshold = parseInt(config.max_products) || 5;

  // Shared design tokens (moved here so totalItems is in scope)
  const primaryColor = (
    config.primary_color ||
    config.selection_highlight_color ||
    '#008060'
  ).trim();
  const successColor = (config.progress_success_color || '#28a745').trim();
  const barBgColor =
    totalItems >= discountThreshold
      ? successColor
      : (config.progress_bar_color || primaryColor).trim();

  const handleQtyChange = (pid, val, source = 'all') => {
    const qty = Math.max(0, parseInt(val) || 0);
    const maxSel = parseInt(config.max_products) || 5;

    if (qty === 0) {
      handleRemoveProduct(pid, source);
      return;
    }

    setSelectedProducts((selected) => {
      const item = selected.find(
        (p) => String(p.id) === String(pid) && p.source === source
      );
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
      const finalAllowed = Math.max(
        1,
        Math.min(qty, allowedByGlobal, allowedBySource)
      );

      if (finalAllowed < qty) {
        shopify.toast.show(
          `Limit reached! Max allowed here is ${finalAllowed}`,
          { isError: true }
        );
      }

      setCardQtys((prev) => ({ ...prev, [pid]: finalAllowed }));
      return selected.map((p) =>
        String(p.id) === String(pid) && p.source === source
          ? { ...p, quantity: finalAllowed }
          : p
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
      shopify.toast.show(
        `Limit reached for this category! (Max ${sourceLimit} items)`,
        { isError: true }
      );
      return;
    }

    const currentTotalQty = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const maxThreshold = parseInt(config.max_products) || 5;

    if (!isSelected) {
      if (currentTotalQty >= maxThreshold) {
        shopify.toast.show(
          `Global limit reached! You can only add up to ${maxThreshold} items.`,
          { isError: true }
        );
        return;
      }
      handleAddProduct(product, 1, variant, source);
    } else {
      handleQtyChange(pid, (cardQtys[pid] || 0) + 1, source);

      // Motivation/Unlocked Toast Notification
      const nextTotal = currentTotalQty + 1;
      if (nextTotal >= discountThreshold) {
        shopify.toast.show(
          config.discount_unlocked_text || 'Discount Unlocked! 🎉'
        );
      } else {
        const remaining = discountThreshold - nextTotal;
        const motivation = (
          config.discount_motivation_text ||
          'Add {{remaining}} more items to unlock the discount!'
        ).replace('{{remaining}}', remaining);
        shopify.toast.show(motivation);
      }
    }
  };

  const handleDec = (pid, source = 'all') => {
    const isSelected = selectedProducts.some(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    if (!isSelected) return;
    const item = selectedProducts.find(
      (p) => String(p.id) === String(pid) && p.source === source
    );
    const currentQty =
      cardQtys[pid] !== undefined ? cardQtys[pid] : item?.quantity;
    handleQtyChange(pid, currentQty - 1, source);
  };

  const handleAddProduct = (
    product,
    initialQty,
    variant = null,
    source = 'all'
  ) => {
    const qty = initialQty || cardQtys[product.id] || 1;
    const selectedVariant =
      variant ||
      (product.variants || []).find(
        (v) => String(v.id) === String(selectedVariants[product.id])
      ) ||
      (product.variants && product.variants[0]);
    if (!selectedVariant) return;

    const currentTotalQty = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const maxThreshold = parseInt(config.max_products) || 5;

    if (currentTotalQty + Number(qty) > maxThreshold) {
      shopify.toast.show(
        `Global limit reached! You can only add up to ${maxThreshold} items.`,
        { isError: true }
      );
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
      shopify.toast.show(
        `Limit reached for this category! (Max ${sourceLimit} items)`,
        { isError: true }
      );
      return;
    }

    const newItem = {
      id: product.id,
      variantId: selectedVariant.id,
      image:
        selectedVariant.image?.src ||
        selectedVariant.image?.url ||
        product.image?.src ||
        product.featuredMedia?.preview?.image?.url ||
        'https://placehold.co/100x100',
      price: parseFloat(selectedVariant.price || 0),
      quantity: Number(qty),
      source: source,
    };

    setSelectedProducts([...selectedProducts, newItem]);
    setCardQtys((prev) => ({ ...prev, [product.id]: Number(qty) }));

    // Motivation/Unlocked Toast Notification (only for initial adds, handleInc handles others)
    const nextTotal = currentTotalQty + Number(qty);
    if (nextTotal >= discountThreshold) {
      shopify.toast.show(
        config.discount_unlocked_text || 'Discount Unlocked! 🎉'
      );
    } else {
      const remaining = discountThreshold - nextTotal;
      const motivation = (
        config.discount_motivation_text ||
        'Add {{remaining}} more items to unlock the discount!'
      ).replace('{{remaining}}', remaining);
      shopify.toast.show(motivation);
    }
  };

  const handleRemoveProduct = (productId, source = 'all') => {
    setSelectedProducts(
      selectedProducts.filter(
        (p) => !(String(p.id) === String(productId) && p.source === source)
      )
    );
    setCardQtys((prev) => ({ ...prev, [productId]: 0 }));
  };

  const totalPrice = selectedProducts.reduce(
    (sum, p) => sum + p.price * (p.quantity || 0),
    0
  );

  const selectedDiscount =
    config.has_discount_offer && config.selected_discount_id
      ? activeDiscounts.find(
          (d) => String(d.id) === String(config.selected_discount_id)
        )
      : null;

  const discountType = selectedDiscount
    ? selectedDiscount.valueType || selectedDiscount.type
    : config.discount_selection; // 'percentage' or 'fixed'
  const discountVal = selectedDiscount
    ? parseFloat(selectedDiscount.value)
    : parseFloat(config.discount_amount) || 0;
  const hasDiscount =
    !!discountType && !Number.isNaN(discountVal) && discountVal > 0;
  const discountedPrice =
    String(discountType).toLowerCase() === 'percentage'
      ? totalPrice * (1 - discountVal / 100)
      : Math.max(0, totalPrice - discountVal);
  const finalPrice = hasDiscount ? discountedPrice : totalPrice;

  const renderTabs = () => {
    if (config.layout !== 'layout2') return null;
    const tabNavigationMode = config.tab_navigation_mode || 'scroll';
    const showTabArrows = tabNavigationMode === 'arrows';

    const scrollTabsBy = (delta) => {
      const el = tabScrollRef.current;
      if (!el) return;
      el.scrollBy({ left: delta, behavior: 'smooth' });
    };

    const tabContainerStyles = {
      padding: '12px 20px',
      display: 'flex',
      justifyContent: config.tab_alignment || 'left',
      gap: '10px',
      overflowX: showTabArrows ? 'hidden' : 'auto',
      borderBottom: '1px solid #eee',
      background: '#fff',
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth',
      touchAction: tabNavigationMode === 'slide_touch' ? 'pan-x' : 'auto',
      scrollbarWidth: tabNavigationMode === 'scroll' ? 'thin' : 'none',
      msOverflowStyle: tabNavigationMode === 'scroll' ? 'auto' : 'none',
    };

    const tabs = [];
    if (config.show_tab_all !== false) {
      tabs.push({ label: config.tab_all_label || 'Collections', value: 'all' });
    }
    for (let i = 1; i <= (config.tab_count || 8); i++) {
      const handle = config[`col_${i}`];
      if (handle) {
        const col = (collections || []).find((c) => c.handle === handle);
        tabs.push({
          label: col ? col.title : config[`step_${i}_title`] || handle,
          value: handle,
        });
      }
    }
    if (tabs.length === 0) return null;

    return (
      <div
        style={{
          width: `${config.tabs_width || 100}%`,
          margin: '0 auto',
          marginTop: `${config.tab_margin_top ?? 0}px`,
          marginBottom: `${config.tab_margin_bottom ?? 24}px`,
          position: 'relative',
        }}
      >
        {showTabArrows && (
          <button
            type="button"
            className="cdo-arrow-btn"
            aria-label="Scroll tabs left"
            onClick={() => scrollTabsBy(-220)}
            style={{ left: 6 }}
          >
            ←
          </button>
        )}
        <div
          ref={tabScrollRef}
          style={tabContainerStyles}
          className={`cdo-slider-horizontal ${tabNavigationMode === 'scroll' ? 'cdo-tabs-scroll-visible' : ''}`}
        >
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.value;
            const activeBg =
              config.tab_active_bg_color ||
              config.selection_highlight_color ||
              '#5e1c5f';
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  padding: `${config.tab_padding_vertical || 8}px ${config.tab_padding_horizontal || 18}px`,
                  borderRadius: `${config.tab_border_radius ?? 25}px`,
                  border: `1px solid ${isActive ? activeBg : config.tab_border_color || '#eee'}`,
                  background: isActive
                    ? activeBg
                    : config.tab_bg_color || '#fff',
                  color: isActive
                    ? config.tab_active_text_color || '#fff'
                    : config.tab_text_color || '#444',
                  fontSize: `${config.tab_font_size || 13}px`,
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
        {showTabArrows && (
          <button
            type="button"
            className="cdo-arrow-btn"
            aria-label="Scroll tabs right"
            onClick={() => scrollTabsBy(220)}
            style={{ right: 6 }}
          >
            →
          </button>
        )}
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!config.show_progress_bar) return null;
    const percent =
      discountThreshold > 0
        ? Math.min(100, Math.round((totalItems / discountThreshold) * 100))
        : 0;
    const remaining = Math.max(0, discountThreshold - totalItems);
    const rawColor = (config.progress_bar_color || '#1a6644').trim();
    const successColor = config.progress_success_color || '#28a745';
    const textColor = config.progress_text_color || '#000';
    const barColor = rawColor;

    return (
      <div
        style={{
          width: `${config.progress_bar_width || 100}%`,
          margin: '15px auto 25px',
          background: 'transparent',
          padding: '0 5px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '12px',
          }}
        >
          <div>
            {totalItems >= discountThreshold ? (
              <span
                style={{
                  fontWeight: 700,
                  color: successColor,
                  textTransform: 'uppercase',
                }}
              >
                {config.discount_unlocked_text || 'DISCOUNT UNLOCKED!'}
              </span>
            ) : (
              <span
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: textColor,
                  letterSpacing: '0.5px',
                }}
              >
                ADD {remaining} MORE FOR {config.discount_text || 'DISCOUNT'}
              </span>
            )}
          </div>
          <div style={{ color: barColor, fontWeight: 800 }}>{percent}%</div>
        </div>
        <div
          style={{
            height: '12px',
            borderRadius: '12px',
            width: '100%',
            boxSizing: 'border-box',
            background: '#e0e0e0',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: barColor,
              borderRadius: '12px',
              transition:
                'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'translateX(-100%)',
                animation: 'combo-shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewBar = () => (
    <CdoPreviewBar
      config={config}
      selectedProducts={selectedProducts}
      totalPrice={totalPrice}
      finalPrice={finalPrice}
      isMobile={isMobile}
    />
  );

  const handleVariantChange = (productId, variantId) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }));
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(productId)) {
          const prod = products.find((p) => String(p.id) === String(productId));
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
    const [showPreviewModal, setShowPreviewModal] = useState(false);

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
    const previewVisibility = config.preview_icon_visibility || 'static';
    const showPreviewIcon =
      previewVisibility === 'static' || isHovered || isMobile;
    const previewImages = (product.images?.nodes || [])
      .slice(1, 4)
      .map((img) => img?.url)
      .filter(Boolean);

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
            aspectRatio: productImageAspectRatio,
            height: supportsAspectRatio ? 'auto' : productImageHeight,
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
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              transform:
                isHovered && config.enable_product_hover
                  ? 'scale(1.05)'
                  : 'scale(1)',
              opacity: isHovered && config.enable_product_hover ? 0 : 1,
            }}
          />

          {showPreviewIcon && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPreviewModal(true);
              }}
              title="Preview Product"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 34,
                height: 34,
                border: 'none',
                borderRadius: '999px',
                background: 'rgba(17,17,17,0.82)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 5,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: 18, height: 18, fill: 'currentColor' }}
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            </button>
          )}

          {/* Product Hover Overlay Elements */}
          {config.enable_product_hover && isHovered && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                boxSizing: 'border-box',
                textAlign: 'center',
                zIndex: 1,
              }}
            >
              {config.product_hover_mode === 'second_image' &&
              product.secondImageSrc ? (
                <img
                  src={product.secondImageSrc}
                  alt="Hover view"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : config.product_hover_mode === 'description' &&
                product.descriptionHtml ? (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#333',
                    lineHeight: 1.5,
                    fontWeight: 500,
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              ) : null}
            </div>
          )}

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

        <Modal
          open={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={product.title || 'Product Preview'}
          large
        >
          <Modal.Section>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {previewImages.length ? (
                  previewImages.map((src, idx) => (
                    <div
                      key={`${product.id}-preview-${idx}`}
                      style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#f6f6f7',
                        minHeight: 100,
                      }}
                    >
                      <img
                        src={src}
                        alt={`${product.title} preview ${idx + 2}`}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      border: '1px dashed #c9cccf',
                      borderRadius: 8,
                      padding: 16,
                      textAlign: 'center',
                      color: '#6d7175',
                    }}
                  >
                    Additional product images are not available.
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {product.title}
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}
                >
                  Rs.{selectedVariant?.price || 0}
                </div>
                <div
                  style={{ fontSize: 13, lineHeight: 1.6, color: '#3d3d3d' }}
                  dangerouslySetInnerHTML={{
                    __html:
                      product.descriptionHtml || 'No description available.',
                  }}
                />
              </div>
            </div>
          </Modal.Section>
        </Modal>

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
                  onChange={(e) =>
                    handleQtyChange(product.id, e.target.value, source)
                  }
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
                    : config.add_btn_bg ||
                      config.product_add_btn_color ||
                      '#000',
                  color: isSelected
                    ? '#fff'
                    : config.add_btn_text_color ||
                      config.product_add_btn_text_color ||
                      '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: config.add_btn_border_radius ?? 8,
                  cursor: 'pointer',
                  fontWeight:
                    config.add_btn_font_weight ||
                    config.product_add_btn_font_weight ||
                    600,
                  fontSize:
                    config.add_btn_font_size ||
                    config.product_add_btn_font_size ||
                    14,
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
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="combo-spinner-new"></div>
          <p style={{ marginTop: '20px', color: '#6d7175', fontWeight: '500' }}>
            {config.loading_text || 'Loading products...'}
          </p>
        </div>
      );
    }

    const isSlider = config.grid_layout_type === 'slider';
    let filteredProducts = filterPreviewProductsByStock(products || [], config);

    // Apply collection filtering if possible
    const currentHandle =
      activeTab === 'all' ? config.collection_handle || '' : activeTab;
    if (currentHandle && currentHandle !== '') {
      const collectionFiltered = filterPreviewProductsByStock(
        products || [],
        config
      ).filter((p) =>
        (p.collections || []).some((c) => c.handle === currentHandle)
      );
      // If we found products for this collection, use them.
      // Otherwise fallback to showing some products for preview purposes
      if (collectionFiltered.length > 0) {
        filteredProducts = collectionFiltered;
      }
    }

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
                  sliderRef.current?.scrollBy({
                    left: -300,
                    behavior: 'smooth',
                  })
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
    // For Combo Design Two: Banner → Progress → Title → Tabs → Preview → Products
    sectionOrder = [
      renderBanner,
      ...progressSec,
      renderTitleDescription,
      renderTabs,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option2') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option3') {
    sectionOrder = [
      ...progressSec,
      renderProductsGrid,
      renderBanner,
      renderTabs,
      renderTitleDescription,
    ];
  } else if (config.new_option_dropdown === 'option4') {
    sectionOrder = [
      ...progressSec,
      renderTitleDescription,
      renderBanner,
      renderTabs,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option5') {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option6' ||
    config.new_option_dropdown === 'option7' ||
    config.layout === 'layout3'
  ) {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (
    config.new_option_dropdown === 'option8' ||
    config.layout === 'layout4'
  ) {
    sectionOrder = [
      renderBanner,
      ...progressSec,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else if (config.new_option_dropdown === 'option9') {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTitleDescription,
      renderProductsGrid,
    ];
  } else {
    sectionOrder = [
      ...progressSec,
      renderBanner,
      renderTabs,
      renderTitleDescription,
      renderProductsGrid,
    ];
  }

  const renderGlobalStickyBar = () => {
    // Sticky Preview Bar has been removed per user request
    return null;
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
          fontFamily: 'inherit',
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
                    position: 'relative',
                  }}
                >
                  {config.enable_banner_slider && banners.length > 1 ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
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
                            zIndex: currentSlide === idx ? 1 : 0,
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
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background:
                                'linear-gradient(transparent, rgba(0,0,0,0.7))',
                              padding: '10px 15px',
                              color: 'white',
                            }}
                          >
                            <div
                              style={{ fontWeight: 'bold', fontSize: '14px' }}
                            >
                              {banner.title}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>
                              {banner.subtitle}
                            </div>
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
                    {titles[bundleIndex] ||
                      config.hero_title ||
                      'Mega Breakfast Bundle'}
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
                  {subtitles[bundleIndex] ||
                    config.hero_subtitle ||
                    'Milk, Bread, Eggs, Cereal & Juice'}
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
          {config.show_progress_bar &&
            (() => {
              return (
                <div
                  style={{
                    padding: '0 20px 15px',
                    background: 'transparent',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      fontSize: '13px',
                      fontWeight: '700',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      {totalItems >= discountThreshold ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: successColor,
                            textTransform: 'uppercase',
                          }}
                        >
                          {config.discount_unlocked_text ||
                            'DISCOUNT UNLOCKED!'}
                        </span>
                      ) : (
                        <span
                          style={{
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: textColor,
                            letterSpacing: '0.5px',
                          }}
                        >
                          ADD {Math.max(0, discountThreshold - totalItems)} MORE
                          FOR {config.discount_text || 'DISCOUNT'}
                        </span>
                      )}
                    </div>
                    <div style={{ color: barBgColor, fontWeight: 800 }}>
                      {totalItems} / {discountThreshold} (
                      {Math.min(
                        100,
                        Math.round((totalItems / discountThreshold) * 100)
                      )}
                      %)
                    </div>
                  </div>
                  <div
                    style={{
                      height: '12px',
                      borderRadius: '12px',
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (totalItems / discountThreshold) * 100)}%`,
                        background: barBgColor || primaryColor || '#008060',
                        borderRadius: '12px',
                        transition:
                          'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 0 10px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Shimmer effect in preview */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background:
                            'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          transform: 'translateX(-100%)',
                          animation: 'combo-shimmer 2s infinite',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: textColor,
                      opacity: 0.7,
                      textAlign: 'center',
                      fontStyle: 'italic',
                      letterSpacing: '0.2px',
                    }}
                  >
                    {totalItems >= discountThreshold
                      ? '🎉 Fantastic! You have unlocked the best discount!'
                      : (
                          config.discount_motivation_text ||
                          'Keep going! Add {{remaining}} more for a special deal!'
                        ).replace(
                          '{{remaining}}',
                          Math.max(0, discountThreshold - totalItems)
                        )}
                  </div>
                </div>
              );
            })()}
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
                title:
                  config[`title_${i}`] ||
                  (i === 1 ? 'All Packs' : `Category ${i}`),
              }))
              .filter((t) => t.handle || t.title)
              .map((tab, idx) => {
                const isActive =
                  activeTab ===
                  (idx === 0 && config.show_tab_all !== false
                    ? 'all'
                    : tab.handle);
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setActiveTab(
                        idx === 0 && config.show_tab_all !== false
                          ? 'all'
                          : tab.handle
                      )
                    }
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '8px 20px',
                      borderRadius: '20px',
                      backgroundColor: isActive
                        ? config.selection_highlight_color || primaryColor
                        : '#fff',
                      border: `1px solid ${isActive ? config.selection_highlight_color || primaryColor : '#eee'}`,
                      fontSize: '12px',
                      fontWeight: '600',
                      color: isActive ? '#fff' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive
                        ? '0 4px 10px rgba(0,0,0,0.1)'
                        : 'none',
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

        {renderPreviewBar()}
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
    const discountThreshold = parseInt(config.max_products) || 5;
    const percent =
      discountThreshold > 0
        ? Math.min(100, Math.round((totalItems / discountThreshold) * 100))
        : 0;

    return (
      <div
        style={{
          background: '#fff',
          fontFamily: 'inherit',
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
                  color: config.progress_bar_color || '#1a6644',
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
                background: '#e0e0e0',
                height: '8px',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  backgroundColor: config.progress_bar_color || '#1a6644',
                  height: '100%',
                  width: `${percent}%`,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  minWidth: percent > 0 ? '4px' : '0',
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
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transform: 'translateX(-100%)',
                    animation: 'combo-shimmer 2s infinite',
                  }}
                />
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
                      background: `${config.progress_bar_color || '#1a6644'}15`,
                      borderRadius: '50%',
                      textAlign: 'center',
                      lineHeight: '16px',
                      fontSize: '10px',
                      color: config.progress_bar_color || '#1a6644',
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
                    <strong>
                      {config.discount_text ||
                        config.progress_text ||
                        'Bundle Discount'}
                    </strong>
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
          <div style={{ padding: '24px 20px' }}>
            <div
              style={{
                width: isMobile ? '100%' : `${config.title_width || 100}%`,
                textAlign: headingAlign,
                paddingTop: config.title_container_padding_top || 0,
                paddingRight: config.title_container_padding_right || 0,
                paddingBottom: config.title_container_padding_bottom || 0,
                paddingLeft: config.title_container_padding_left || 0,
                marginTop: config.title_container_margin_top || 0,
                marginRight: config.title_container_margin_right || 0,
                marginBottom: config.title_container_margin_bottom || 0,
                marginLeft: config.title_container_margin_left || 0,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: `${isMobile ? parseInt(config.heading_size || 28) * 0.8 : config.heading_size || 28}px`,
                  color: config.heading_color || '#333',
                  fontWeight: config.heading_font_weight || '700',
                  lineHeight: 1.2,
                }}
              >
                {config.collection_title || 'Create Your Combo'}
              </h1>
            </div>
            <div
              style={{
                width: isMobile ? '100%' : `${config.title_width || 100}%`,
                textAlign: descriptionAlign,
                paddingTop: config.description_container_padding_top || 0,
                paddingRight: config.description_container_padding_right || 0,
                paddingBottom: config.description_container_padding_bottom || 0,
                paddingLeft: config.description_container_padding_left || 0,
                marginTop: config.description_container_margin_top || 0,
                marginRight: config.description_container_margin_right || 0,
                marginBottom: config.description_container_margin_bottom || 0,
                marginLeft: config.description_container_margin_left || 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: `${descriptionSize}px`,
                  color: config.description_color || '#666',
                  fontWeight: config.description_font_weight || '400',
                  lineHeight: 1.5,
                }}
              >
                {config.collection_description ||
                  'Select items to build your perfect bundle.'}
              </p>
            </div>
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

            const stepColl = config[`step_${step}_collection`];
            let stepViewProducts = allStepProducts[stepColl] || [];

            // If we don't have dynamic products for this step yet, try to find them in the loader data
            if (stepViewProducts.length === 0 && stepColl) {
              stepViewProducts = products.filter((p) =>
                (p.collections || []).some((c) => c.handle === stepColl)
              );
            }

            if (stepViewProducts.length > 0) {
              stepViewProducts = filterPreviewProductsByStock(
                stepViewProducts,
                config
              );
              stepViewProducts = stepViewProducts.slice(0, 12);
            }

            if (!stepColl) return null;

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

                {!stepColl ? (
                  <div
                    style={{
                      padding: '32px 16px',
                      textAlign: 'center',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #e1e3e5',
                      color: '#8c9196',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      📦
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      No collection selected
                    </div>
                    <div>
                      Choose a collection for Collection {step} to preview
                      products here.
                    </div>
                  </div>
                ) : stepViewProducts.length === 0 ? (
                  <div
                    style={{
                      padding: '32px 16px',
                      textAlign: 'center',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #e1e3e5',
                      color: '#8c9196',
                      fontSize: '13px',
                    }}
                  >
                    {stepProductsLoading ? (
                      <>
                        <div
                          className="combo-spinner-new"
                          style={{ margin: '0 auto 8px' }}
                        />
                        <div style={{ fontWeight: '600' }}>
                          Loading products...
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                          🔍
                        </div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          No products found
                        </div>
                        <div>The selected collection has no products.</div>
                      </>
                    )}
                  </div>
                ) : config.grid_layout_type === 'slider' ? (
                  /* Slider Preview */
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        paddingBottom: config.show_scrollbar ? '10px' : '0',
                        scrollbarWidth: config.show_scrollbar ? 'auto' : 'none',
                        msOverflowStyle: config.show_scrollbar
                          ? 'auto'
                          : 'none',
                        scrollBehavior: 'smooth',
                      }}
                      className="preview-slider-track"
                    >
                      <style>{`
                        .preview-slider-track::-webkit-scrollbar {
                          display: ${config.show_scrollbar ? 'block' : 'none'};
                          height: ${config.scrollbar_thickness || 4}px;
                        }
                        .preview-slider-track::-webkit-scrollbar-thumb {
                          background: ${config.scrollbar_color || '#dddddd'};
                          border-radius: 10px;
                        }
                      `}</style>
                      {stepViewProducts.map((p) => (
                        <div
                          key={p.id}
                          style={{ minWidth: '160px', width: '160px' }}
                        >
                          <ProductCardItem
                            product={p}
                            source={`step_${step}`}
                          />
                        </div>
                      ))}
                    </div>
                    {config.show_nav_arrows && (
                      <>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const track =
                              e.currentTarget.parentElement.querySelector(
                                '.preview-slider-track'
                              );
                            if (track)
                              track.scrollBy({
                                left: -250,
                                behavior: 'smooth',
                              });
                          }}
                          style={{
                            position: 'absolute',
                            left:
                              config.arrow_position === 'outside'
                                ? '-22px'
                                : '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: `${config.arrow_size || 36}px`,
                            height: `${config.arrow_size || 36}px`,
                            background: config.arrow_bg_color || '#000',
                            color: config.arrow_color || '#fff',
                            borderRadius: `${config.arrow_border_radius || 50}${config.arrow_border_radius === 50 ? '%' : 'px'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            cursor: 'pointer',
                            opacity: config.arrow_opacity ?? 0.9,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const track =
                              e.currentTarget.parentElement.querySelector(
                                '.preview-slider-track'
                              );
                            if (track)
                              track.scrollBy({ left: 250, behavior: 'smooth' });
                          }}
                          style={{
                            position: 'absolute',
                            right:
                              config.arrow_position === 'outside'
                                ? '-22px'
                                : '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: `${config.arrow_size || 36}px`,
                            height: `${config.arrow_size || 36}px`,
                            background: config.arrow_bg_color || '#000',
                            color: config.arrow_color || '#fff',
                            borderRadius: `${config.arrow_border_radius || 50}${config.arrow_border_radius === 50 ? '%' : 'px'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            cursor: 'pointer',
                            opacity: config.arrow_opacity ?? 0.9,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </>
                    )}
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
                    {stepViewProducts.map((p) => (
                      <ProductCardItem
                        key={p.id}
                        product={p}
                        source={`step_${step}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {renderGlobalStickyBar()}
        {renderPreviewBar()}
      </div>
    );
  }

  return (
    <div style={{ background: '#eef1f5', padding: 16 }}>
      <div
        style={{
          fontFamily: 'inherit',
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
        {sectionOrder.map((Section, idx) => Section())}
        {renderGlobalStickyBar()}
        {renderPreviewBar()}
      </div>
    </div>
  );
}
