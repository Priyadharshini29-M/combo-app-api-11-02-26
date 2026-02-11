import { useState, useEffect } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { getDb, saveDb, sendToPhp } from "../utils/api-helpers";

import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  Checkbox,
  Modal,
  FormLayout,
  Text,
  Box,
  BlockStack,
  InlineStack,
  Badge,
  EmptyState,
  Divider,
  IndexTable,
  useIndexResourceState,
  Popover,
  ActionList,
  Avatar,
  Icon,
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
  ChevronDownIcon,
  DiscountIcon,
} from '@shopify/polaris-icons';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../shopify.server';

// --- Fake API Helper ---
const FAKE_DB_PATH = path.join(process.cwd(), 'public', 'fake_db.json');

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

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const discounts = getFakeDiscounts();
  // Ensure we return an array
  return json({ discounts: Array.isArray(discounts) ? discounts : [] });
};


export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const method = request.method;
  const discounts = getFakeDiscounts();
  const formData = await request.formData();

  // Distinguish usage: The component uses fetcher.submit with different intents
  const intent = formData.get('intent') || 'create';

  try {
    if (method === 'POST' && intent === 'create') {
      const title = formData.get('title');
      const code =
        formData.get('code') || `CODE-${Math.floor(Math.random() * 1000)}`;
      const type = formData.get('type');
      const value = formData.get('value');


      // --- Shopify GraphQL Logic ---
      let shopifyDiscountId = null;

      // Only attempt Shopify creation for Basic types (Percentage/Fixed) and All Products for now
      // (Expansion to Buy X Get Y or Specific Products requires real Product IDs)
      if (['percentage', 'fixed', 'amount'].includes(type) && (!formData.get('conditions') || formData.get('conditions') === 'all_products')) {
        try {
          const isPercentage = type === 'percentage';
          const discountValue = parseFloat(value);

          const mutation = `#graphql
            mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
              discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                codeDiscountNode {
                  id
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      title
                      codes(first: 1) {
                        nodes {
                          code
                        }
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          // Parse new fields
          const minReqType = formData.get('minRequirementType');
          const minReqValue = formData.get('minRequirementValue');
          const combinationsStr = formData.get('combinations');
          const combinations = combinationsStr ? JSON.parse(combinationsStr) : {};

          let minimumRequirement = null;
          if (minReqType === 'amount' && minReqValue) {
            minimumRequirement = { subtotal: { greaterThanOrEqualToSubtotal: parseFloat(minReqValue) } };
          } else if (minReqType === 'quantity' && minReqValue) {
            minimumRequirement = { quantity: { greaterThanOrEqualToQuantity: parseInt(minReqValue) } };
          }

          const variables = {
            basicCodeDiscount: {
              title: title,
              code: code,
              startsAt: new Date().toISOString(),
              endsAt: formData.get('endsAt') ? new Date(formData.get('endsAt')).toISOString() : null,
              customerGets: {
                value: isPercentage
                  ? { percentage: discountValue / 100 }
                  : { discountAmount: { amount: discountValue, appliesOnEachItem: false } },
                items: {
                  all: true
                }
              },
              customerSelection: {
                all: true
              },
              usageLimit: formData.get('maxUsage') ? parseInt(formData.get('maxUsage')) : null,
              appliesOncePerCustomer: formData.get('oncePerCustomer') === 'true',
              minimumRequirement: minimumRequirement,
              combinesWith: {
                orderDiscounts: combinations.order || false,
                productDiscounts: combinations.product || false,
                shippingDiscounts: combinations.shipping || false
              }
            }
          };

          const response = await admin.graphql(mutation, { variables });
          const responseJson = await response.json();

          if (responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
            console.error("❌ Shopify Discount Creation Errors:", JSON.stringify(responseJson.data.discountCodeBasicCreate.userErrors, null, 2));
            return json({
              error: `Shopify Error: ${responseJson.data.discountCodeBasicCreate.userErrors.map(e => e.message).join(', ')}`
            }, { status: 400 });
          } else if (responseJson.data?.discountCodeBasicCreate?.codeDiscountNode) {
            shopifyDiscountId = responseJson.data.discountCodeBasicCreate.codeDiscountNode.id;
            console.log("✅ Created in Shopify:", shopifyDiscountId);
          }
        } catch (err) {
          console.error("❌ Failed to create discount in Shopify (Network/System):", err);
          return json({ error: "Failed to sync with Shopify: " + err.message }, { status: 500 });
        }
      }

      const newDiscount = {
        id: Math.max(...discounts.map((d) => d.id), 0) + 1,
        shopifyId: shopifyDiscountId, // Store the real ID
        title,
        code,
        type,
        value,
        status: 'active',
        usage: '0 / ' + (formData.get('maxUsage') || 'Unlimited'),
        eligibility: formData.get('eligibility'),
        minRequirementType: formData.get('minRequirementType'),
        minRequirementValue: formData.get('minRequirementValue'),
        combinations: formData.get('combinations') ? JSON.parse(formData.get('combinations')) : {},
        oncePerCustomer: formData.get('oncePerCustomer') === 'true',
        created: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        buyQuantity: formData.get('buyQuantity'),
        getQuantity: formData.get('getQuantity'),
        getProduct: formData.get('getProduct'),
        autoApply: formData.get('autoApply') === 'true',
      };

      discounts.push(newDiscount);
      saveFakeDiscounts(discounts);

      console.log(
        `[Combo App Console] Success Notification: Discount '${title}' created.`
      );

      // Send to PHP Webhook
      await sendToPhp({
        event: "create",
        resource: "discounts",
        shop,
        data: newDiscount
      });

      return json({
        success: true,
        discount: newDiscount,
        message: 'Discount created successfully',
      });
    } else if (method === 'POST' && intent === 'update') {
      const id = formData.get('id');
      const title = formData.get('title');
      const value = formData.get('value');
      const type = formData.get('type');
      const status = formData.get('status');

      const index = discounts.findIndex((d) => String(d.id) === String(id));
      if (index > -1) {
        discounts[index] = {
          ...discounts[index],
          title,
          value,
          type,
          status,
          buyQuantity: formData.get('buyQuantity'),
          getQuantity: formData.get('getQuantity'),
          getProduct: formData.get('getProduct'),
          autoApply: formData.get('autoApply') === 'true',
        };
        saveFakeDiscounts(discounts);
        console.log(
          `[Combo App Console] Success Notification: Discount updated.`
        );

        // Send to PHP Webhook
        await sendToPhp({
          event: "update",
          resource: "discounts",
          shop,
          data: discounts[index]
        });

        return json({
          success: true,
          discount: discounts[index],
          message: 'Discount updated successfully',
        });
      }
      return json({ error: 'Discount not found' }, { status: 404 });
    } else if (
      method === 'DELETE' ||
      (method === 'POST' && intent === 'delete')
    ) {
      // fetcher might use POST for delete
      const id = formData.get('id');
      const initialLength = discounts.length;
      const filtered = discounts.filter((d) => String(d.id) !== String(id));

      if (filtered.length < initialLength) {
        saveFakeDiscounts(filtered);
        console.log(
          `[Combo App Console] Success Notification: Discount deleted.`
        );

        // Send to PHP Webhook
        await sendToPhp({
          event: "delete",
          resource: "discounts",
          shop,
          id
        });

        return json({ success: true, message: 'Discount deleted successfully' });
      }
      return json({ error: 'Discount not found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`[Combo App Console] Error Notification: ${error.message}`);
    return json({ error: error.message }, { status: 500 });
  }

  return json({ error: 'Invalid action' });
};

export default function DiscountEngine() {
  // Mocked product list - replace with Shopify API call for real data
  const shopifyProducts = [
    { label: 'T-shirt', value: 'prod_1' },
    { label: 'Mug', value: 'prod_2' },
    { label: 'Hat', value: 'prod_3' },
    { label: 'Bag', value: 'prod_4' },
  ];
  const shopify = useAppBridge();
  const { discounts: initialDiscounts } = useLoaderData();
  const fetcher = useFetcher();
  const [discounts, setDiscounts] = useState(initialDiscounts);

  useEffect(() => {
    setDiscounts(initialDiscounts);
  }, [initialDiscounts]);

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [popoverActive, setPopoverActive] = useState(null);

  // Shopify Code Form state
  const [dTitle, setDTitle] = useState('');
  const [dCode, setDCode] = useState('');
  const [dType, setDType] = useState('percentage');
  const [dValue, setDValue] = useState('');
  const [dBuyQuantity, setDBuyQuantity] = useState('');
  const [dGetQuantity, setDGetQuantity] = useState('');
  const [dGetProduct, setDGetProduct] = useState('');
  const [dStartsAt, setDStartsAt] = useState('');
  const [dEndsAt, setDEndsAt] = useState('');
  const [dOncePerCustomer, setDOncePerCustomer] = useState(false);

  // New State for Advanced Options
  const [dEligibility, setDEligibility] = useState('all'); // all, segments, customers
  const [dMinRequirementType, setDMinRequirementType] = useState('none'); // none, amount, quantity
  const [dMinRequirementValue, setDMinRequirementValue] = useState('');
  const [dLimitUsage, setDLimitUsage] = useState(false);
  const [dMaxUsageLimit, setDMaxUsageLimit] = useState('');
  const [dCombinations, setDCombinations] = useState({
    product: false,
    order: false,
    shipping: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'percentage',
    value: '',
    buyQuantity: '',
    buyProduct: '',
    getQuantity: '',
    getProduct: '',
    conditions: 'all_products',
    minPurchase: '',
    maxUsage: '',
    startDate: '',
    endDate: '',
    active: true,
  });

  const handleCreateDiscount = () => {
    setEditingDiscount(null);
    setFormData({
      title: '',
      description: '',
      type: 'percentage',
      value: '',
      buyQuantity: '',
      getQuantity: '',
      getProduct: '',
      conditions: 'all_products',
      minPurchase: '',
      maxUsage: '',
      startDate: '',
      endDate: '',
      active: true,
    });
    setDiscountModalOpen(true);
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      title: discount.title,
      description: '',
      type: discount.type,
      value: discount.value,
      buyQuantity: discount.buyQuantity || '',
      getQuantity: discount.getQuantity || '',
      getProduct: discount.getProduct || '',
      conditions: 'all_products',
      minPurchase: '',
      maxUsage: '',
      startDate: '',
      endDate: '',
      active: discount.status === 'active',
    });
    setDiscountModalOpen(true);
  };

  const handleSaveDiscount = () => {
    if (
      !formData.title ||
      (formData.type === 'buyxgety'
        ? !formData.buyQuantity || !formData.getQuantity || !formData.getProduct
        : !formData.value)
    ) {
      shopify.toast.show('Please fill in all required fields', {
        isError: true,
      });
      return;
    }

    const payload = {
      title: formData.title,
      value: formData.value,
      type: formData.type,
      buyQuantity: formData.buyQuantity,
      getQuantity: formData.getQuantity,
      getProduct: formData.getProduct,
      autoApply: formData.autoApply,
      status: formData.active ? 'active' : 'inactive',
    };

    if (editingDiscount) {
      fetcher.submit(
        { ...payload, id: editingDiscount.id, intent: 'update' },
        { method: 'post' }
      );
    } else {
      fetcher.submit({ ...payload, intent: 'create' }, { method: 'post' });
    }

    setDiscountModalOpen(false);
  };

  const handleDeleteDiscount = (id) => {
    fetcher.submit({ id, intent: 'delete' }, { method: 'post' });
    setPopoverActive(null);
  };

  const handleDuplicateDiscount = (discount) => {
    const newDiscount = {
      ...discount,
      id: Math.max(...discounts.map((d) => d.id), 0) + 1,
      title: `${discount.title} (Copy)`,
    };
    setDiscounts([...discounts, newDiscount]);
    setPopoverActive(null);
    shopify.toast.show('Discount duplicated');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'success', label: 'Active' },
      inactive: { color: 'attention', label: 'Inactive' },
      scheduled: { color: 'warning', label: 'Scheduled' },
      expired: { color: 'subdued', label: 'Expired' },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return <Badge tone={config.color}>{config.label}</Badge>;
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      percentage: '% Discount',
      fixed: '₹ Fixed',
      bogo: 'Buy One Get One',
      buyxgety: 'Buy X Get Y',
      volume: 'Volume Discount',
    };
    return typeMap[type] || type;
  };

  const activeDiscounts = discounts.filter((d) => d.status === 'active').length;
  const totalDiscounts = discounts.length;

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      discounts.map((discount) => ({
        ...discount,
        id: `discount-${discount.id}`,
      }))
    );

  return (
    <Page
      title="Discount Engine"
      titleMetadata={
        <div style={{ width: 40 }}>
          <Icon source={DiscountIcon} tone="base" />
        </div>
      }
    >
      <div
        style={{
          background: '#000',
          padding: '32px 24px',
          marginBottom: '32px',
          borderRadius: '12px',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1
            style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}
          >
            Discount Engine
          </h1>
          <p style={{ fontSize: '14px', opacity: '0.9', margin: '0' }}>
            Manage and create discount codes for your Shopify store
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Stats Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6B7280',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Active Discounts
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111',
                marginBottom: '4px',
              }}
            >
              {activeDiscounts}
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
              out of {totalDiscounts} total
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6B7280',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Total Usage
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111',
                marginBottom: '4px',
              }}
            >
              {discounts.reduce((sum, d) => {
                const usage = parseInt(d.usage.split(' / ')[0]) || 0;
                return sum + usage;
              }, 0)}
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
              across all discounts
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6B7280',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Shopify Codes
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#111',
                marginBottom: '4px',
              }}
            >
              0
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
              synced with store
            </div>
          </div>
        </div>

        {/* Create Discount Code Section */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '28px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111',
                  margin: '0 0 4px 0',
                }}
              >
                Create Shopify Discount Code
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0' }}>
                Create and publish discount codes directly to your Shopify store
              </p>
            </div>
          </div>

          <fetcher.Form method="post">
            {/* Hidden fields for Buy X Get Y if selected */}
            {dType === 'buyxgety' && (
              <>
                <input type="hidden" name="buyQuantity" value={dBuyQuantity} />
                <input type="hidden" name="getQuantity" value={dGetQuantity} />
                <input type="hidden" name="getProduct" value={dGetProduct} />
              </>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Title *
                </span>
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
                  name="title"
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
                  onFocus={(e) => (e.target.style.borderColor = '#000')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="Summer Sale 20% Off"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Code *
                </span>
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
                  name="code"
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
                  onFocus={(e) => (e.target.style.borderColor = '#000')}
                  onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
                  placeholder="SAVE10WINTER"
                />
              </label>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Type *
                </span>
                <select
                  name="type"
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
                  <option value="buyxgety">Buy X Get Y</option>
                </select>
              </label>

              {dType === 'buyxgety' ? (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#111',
                        marginBottom: '8px',
                      }}
                    >
                      Buy Quantity *
                    </span>
                    <input
                      name="buyQuantity"
                      type="number"
                      min="1"
                      required
                      value={
                        typeof dBuyQuantity !== 'undefined' ? dBuyQuantity : ''
                      }
                      onChange={(e) => setDBuyQuantity(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                      placeholder="e.g., 2"
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#111',
                        marginBottom: '8px',
                      }}
                    >
                      Get Quantity *
                    </span>
                    <input
                      name="getQuantity"
                      type="number"
                      min="1"
                      required
                      value={
                        typeof dGetQuantity !== 'undefined' ? dGetQuantity : ''
                      }
                      onChange={(e) => setDGetQuantity(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                      placeholder="e.g., 1"
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#111',
                        marginBottom: '8px',
                      }}
                    >
                      Get Product/Collection (ID or Name) *
                    </span>
                    <input
                      name="getProduct"
                      type="text"
                      required
                      value={
                        typeof dGetProduct !== 'undefined' ? dGetProduct : ''
                      }
                      onChange={(e) => setDGetProduct(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                      placeholder="e.g., Product ID or Collection Name"
                    />
                  </label>
                </>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#111',
                      marginBottom: '8px',
                    }}
                  >
                    Value *
                  </span>
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
                    name="value"
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
                </label>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Starts at *
                </span>
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
                  name="startsAt"
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
              </label>

              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  Ends at (optional)
                </span>
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
                  name="endsAt"
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
              </label>
            </div>

            {/* Eligibility */}
            <div style={{ marginBottom: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111' }}>
                Eligibility
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                Available on all sales channels
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="eligibility"
                    value="all"
                    checked={dEligibility === 'all'}
                    onChange={() => setDEligibility('all')}
                  />
                  <span style={{ fontSize: '14px' }}>All customers</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="eligibility"
                    value="segments"
                    checked={dEligibility === 'segments'}
                    onChange={() => setDEligibility('segments')}
                  />
                  <span style={{ fontSize: '14px' }}>Specific customer segments</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="eligibility"
                    value="customers"
                    checked={dEligibility === 'customers'}
                    onChange={() => setDEligibility('customers')}
                  />
                  <span style={{ fontSize: '14px' }}>Specific customers</span>
                </label>
              </div>
            </div>

            {/* Minimum Purchase Requirements */}
            <div style={{ marginBottom: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111' }}>
                Minimum purchase requirements
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="minRequirementType"
                    value="none"
                    checked={dMinRequirementType === 'none'}
                    onChange={() => setDMinRequirementType('none')}
                  />
                  <span style={{ fontSize: '14px' }}>No minimum requirements</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="minRequirementType"
                    value="amount"
                    checked={dMinRequirementType === 'amount'}
                    onChange={() => setDMinRequirementType('amount')}
                  />
                  <span style={{ fontSize: '14px' }}>Minimum purchase amount (INR)</span>
                </label>
                {dMinRequirementType === 'amount' && (
                  <input
                    type="number"
                    value={dMinRequirementValue}
                    onChange={(e) => setDMinRequirementValue(e.target.value)}
                    placeholder="0.00"
                    style={{ marginLeft: '24px', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', width: '150px' }}
                  />
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="minRequirementType"
                    value="quantity"
                    checked={dMinRequirementType === 'quantity'}
                    onChange={() => setDMinRequirementType('quantity')}
                  />
                  <span style={{ fontSize: '14px' }}>Minimum quantity of items</span>
                </label>
                {dMinRequirementType === 'quantity' && (
                  <input
                    type="number"
                    value={dMinRequirementValue}
                    onChange={(e) => setDMinRequirementValue(e.target.value)}
                    placeholder="1"
                    style={{ marginLeft: '24px', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', width: '150px' }}
                  />
                )}
              </div>
            </div>

            {/* Maximum Discount Uses */}
            <div style={{ marginBottom: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111' }}>
                Maximum discount uses
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dLimitUsage}
                    onChange={(e) => setDLimitUsage(e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Limit number of times each code can be used in total</span>
                </label>
                {dLimitUsage && (
                  <input
                    type="number"
                    name="maxUsage"
                    value={dMaxUsageLimit}
                    onChange={(e) => setDMaxUsageLimit(e.target.value)}
                    placeholder="e.g. 100"
                    style={{ marginLeft: '24px', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', width: '150px' }}
                  />
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    name="oncePerCustomer"
                    type="checkbox"
                    checked={dOncePerCustomer}
                    onChange={(e) => setDOncePerCustomer(e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Limit to one use per customer</span>
                </label>
              </div>
            </div>

            {/* Combinations */}
            <div style={{ marginBottom: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111' }}>
                Combinations
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>This discount can be combined with:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dCombinations.product}
                    onChange={(e) => setDCombinations({ ...dCombinations, product: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Product discounts</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dCombinations.order}
                    onChange={(e) => setDCombinations({ ...dCombinations, order: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Order discounts</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dCombinations.shipping}
                    onChange={(e) => setDCombinations({ ...dCombinations, shipping: e.target.checked })}
                  />
                  <span style={{ fontSize: '14px' }}>Shipping discounts</span>
                </label>
              </div>
            </div>

            {/* Hidden Inputs for Form Submission */}
            <input type="hidden" name="combinations" value={JSON.stringify(dCombinations)} />
            <input type="hidden" name="minRequirementType" value={dMinRequirementType} />
            <input type="hidden" name="minRequirementValue" value={dMinRequirementValue} />
            <input type="hidden" name="autoApply" value="false" />
            {/* Note: I removed Auto Apply from UI as it wasn't in the requested screenshot design, 
                but keeping hidden field false or re-adding if essential. 
                Assuming user wants to match Shopify UI which doesn't always show Auto Apply for codes.
            */}

            {fetcher.data?.error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#991B1B',
                    fontWeight: '500',
                  }}
                >
                  ⚠️ {fetcher.data.error}
                </span>
              </div>
            )}

            {fetcher.data?.success && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: '500',
                  }}
                >
                  ✓ {fetcher.data.message}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                disabled={fetcher.state === 'submitting'}
                style={{
                  padding: '10px 24px',
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor:
                    fetcher.state === 'submitting' ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  opacity: fetcher.state === 'submitting' ? 0.7 : 1,
                }}
                onMouseOver={(e) =>
                  !fetcher.state === 'submitting' &&
                  (e.target.style.background = '#5568d3')
                }
                onMouseOut={(e) => (e.target.style.background = '#667eea')}
              >
                {fetcher.state === 'submitting'
                  ? 'Creating...'
                  : 'Create in Shopify'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDTitle('');
                  setDCode('');
                  setDType('percentage');
                  setDValue('');
                  setDStartsAt('');
                  setDEndsAt('');
                  setDOncePerCustomer(false);
                }}
                style={{
                  padding: '10px 24px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                Clear
              </button>
            </div>
          </fetcher.Form>
        </div>

        {/* Discounts Table */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #F3F4F6',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111',
                  margin: '0 0 4px 0',
                }}
              >
                Internal Discounts
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0' }}>
                Manage your internal discount collection
              </p>
            </div>
            <Button size="slim" onClick={handleCreateDiscount}>
              + New Discount
            </Button>
          </div>

          {discounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111',
                  margin: '0 0 8px 0',
                }}
              >
                No discounts yet
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: '0 0 16px 0',
                }}
              >
                Create your first discount to get started
              </p>
              <Button variant="primary" onClick={handleCreateDiscount}>
                Create Discount
              </Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #E5E7EB',
                      background: '#F9FAFB',
                    }}
                  >
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Discount
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Value
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Usage
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Created
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((item, index) => {
                    const rowId = `discount-${item.id}`;
                    return (
                      <tr
                        key={rowId}
                        style={{
                          borderBottom: '1px solid #E5E7EB',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background = '#F9FAFB')
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = '#fff')
                        }
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            style={{
                              fontWeight: '600',
                              color: '#111',
                              fontSize: '14px',
                              marginBottom: '4px',
                            }}
                          >
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            {item.description || 'No description'}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#111',
                          }}
                        >
                          <span
                            style={{
                              background: '#EEF2FF',
                              color: '#3730A3',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {getTypeLabel(item.type)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#111',
                          }}
                        >
                          {item.value}
                          {item.type === 'percentage' ? '%' : ''}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#6B7280',
                          }}
                        >
                          {item.usage}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {getStatusBadge(item.status)}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#6B7280',
                          }}
                        >
                          {item.created}
                        </td>
                        <td
                          style={{ padding: '14px 16px', textAlign: 'center' }}
                        >
                          <Popover
                            active={popoverActive === rowId}
                            activator={
                              <Button
                                icon={ChevronDownIcon}
                                variant="plain"
                                size="slim"
                                onClick={() =>
                                  setPopoverActive(
                                    popoverActive === rowId ? null : rowId
                                  )
                                }
                                aria-label="Actions"
                              />
                            }
                            onClose={() => setPopoverActive(null)}
                            preferredAlignment="right"
                          >
                            <ActionList
                              items={[
                                {
                                  content: 'Edit',
                                  icon: EditIcon,
                                  onAction: () => handleEditDiscount(item),
                                },
                                {
                                  content: 'Duplicate',
                                  icon: DuplicateIcon,
                                  onAction: () => {
                                    handleDuplicateDiscount(item);
                                  },
                                },
                                {
                                  content: 'Delete',
                                  icon: DeleteIcon,
                                  onAction: () => {
                                    handleDeleteDiscount(item.id);
                                  },
                                  destructive: true,
                                },
                              ]}
                            />
                          </Popover>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Discount Modal */}
      <Modal
        open={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        title={editingDiscount ? 'Edit Discount' : 'Create Discount'}
        primaryAction={{
          content: 'Save',
          onAction: handleSaveDiscount,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDiscountModalOpen(false),
          },
        ]}
        size="large"
      >
        <Modal.Section>
          <FormLayout>
            {/* General Section */}
            <BlockStack gap="400">
              <Box borderBottomWidth="1" paddingBlockEnd="400">
                <Text as="h3" variant="headingMd">
                  General
                </Text>
              </Box>

              <TextField
                label="Discount Title"
                placeholder="e.g., Summer Sale 20% Off"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
              />

              <TextField
                label="Description"
                placeholder="Add a description (optional)"
                multiline={2}
                value={formData.description}
                onChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
              />

              <Checkbox
                label="Active"
                checked={formData.active}
                onChange={(value) =>
                  setFormData({ ...formData, active: value })
                }
              />
            </BlockStack>

            <Divider />

            {/* Discount Type Section */}
            <BlockStack gap="400">
              <Box borderBottomWidth="1" paddingBlockEnd="400">
                <Text as="h3" variant="headingMd">
                  Discount Details
                </Text>
              </Box>

              <Select
                label="Discount Type"
                options={[
                  { label: 'Percentage (%)', value: 'percentage' },
                  { label: 'Fixed Amount (₹)', value: 'fixed' },
                  { label: 'Buy One Get One', value: 'bogo' },
                  { label: 'Buy X Get Y', value: 'buyxgety' },
                  { label: 'Volume Discount', value: 'volume' },
                ]}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
              />

              {formData.type === 'buyxgety' ? (
                <>
                  <TextField
                    label="Buy Quantity"
                    placeholder="e.g., 2"
                    type="number"
                    value={formData.buyQuantity || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, buyQuantity: value })
                    }
                  />
                  <Select
                    label="Buy Product"
                    options={shopifyProducts}
                    value={formData.buyProduct || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, buyProduct: value })
                    }
                  />
                  <TextField
                    label="Get Quantity"
                    placeholder="e.g., 1"
                    type="number"
                    value={formData.getQuantity || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, getQuantity: value })
                    }
                  />
                  <Select
                    label="Get Product"
                    options={shopifyProducts}
                    value={formData.getProduct || ''}
                    onChange={(value) =>
                      setFormData({ ...formData, getProduct: value })
                    }
                  />
                </>
              ) : (
                <TextField
                  label={
                    formData.type === 'percentage'
                      ? 'Discount Percentage'
                      : formData.type === 'fixed'
                        ? 'Discount Amount (₹)'
                        : 'Discount Value'
                  }
                  placeholder="0"
                  type="number"
                  value={formData.value}
                  onChange={(value) =>
                    setFormData({ ...formData, value: value })
                  }
                  suffix={formData.type === 'percentage' ? '%' : '₹'}
                />
              )}

              <TextField
                label="Minimum Purchase Amount"
                placeholder="0"
                type="number"
                value={formData.minPurchase}
                onChange={(value) =>
                  setFormData({ ...formData, minPurchase: value })
                }
                suffix="₹"
              />
            </BlockStack>

            <Divider />

            {/* Conditions Section */}
            <BlockStack gap="400">
              <Box borderBottomWidth="1" paddingBlockEnd="400">
                <Text as="h3" variant="headingMd">
                  Conditions
                </Text>
              </Box>

              <Select
                label="Apply to"
                options={[
                  { label: 'All Products', value: 'all_products' },
                  { label: 'Specific Collection', value: 'collection' },
                  { label: 'Specific Products', value: 'products' },
                  { label: 'Specific Customer', value: 'customer' },
                ]}
                value={formData.conditions}
                onChange={(value) =>
                  setFormData({ ...formData, conditions: value })
                }
              />

              <TextField
                label="Max Usage Count"
                placeholder="Leave empty for unlimited"
                type="number"
                value={formData.maxUsage}
                onChange={(value) =>
                  setFormData({ ...formData, maxUsage: value })
                }
              />
            </BlockStack>

            <Divider />

            {/* Schedule Section */}
            <BlockStack gap="400">
              <Box borderBottomWidth="1" paddingBlockEnd="400">
                <Text as="h3" variant="headingMd">
                  Schedule
                </Text>
              </Box>

              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(value) =>
                  setFormData({ ...formData, startDate: value })
                }
              />

              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(value) =>
                  setFormData({ ...formData, endDate: value })
                }
              />
            </BlockStack>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
