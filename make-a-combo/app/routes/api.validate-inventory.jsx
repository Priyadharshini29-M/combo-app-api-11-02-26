import { json } from '@remix-run/node';
import shopify from '../shopify.server';

/**
 * POST /api/validate-inventory
 * Body: { items: [{ id: variantId, quantity: number }, ...] }
 * Returns: { ok: boolean, unavailable: [variantId, ...] }
 */
export const action = async ({ request }) => {
  try {
    const { items, shop } = await request.json();
    if (!Array.isArray(items) || !shop) {
      return json(
        { ok: false, error: 'Missing items or shop' },
        { status: 400 }
      );
    }
    // Get an admin session for the shop
    const session = await shopify.sessionStorage.findSessionByShop(shop);
    if (!session) {
      return json({ ok: false, error: 'No session for shop' }, { status: 401 });
    }
    // Validate each variant's inventory
    const unavailable = [];
    for (const item of items) {
      const res = await fetch(
        `https://${shop}/admin/api/2024-01/variants/${item.id}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) {
        unavailable.push(item.id);
        continue;
      }
      const data = await res.json();
      const variant = data && data.variant;
      if (
        !variant ||
        !variant.available ||
        (variant.inventory_quantity !== null &&
          variant.inventory_quantity < item.quantity)
      ) {
        unavailable.push(item.id);
      }
    }
    if (unavailable.length > 0) {
      return json({ ok: false, unavailable });
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
};
