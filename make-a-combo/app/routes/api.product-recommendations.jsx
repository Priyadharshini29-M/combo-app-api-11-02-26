import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import { sendToPhp } from '../utils/api-helpers';

/* ── Helper: push current state to PHP so app proxy can serve it ── */
async function syncToPhp(shop, enabled, rules) {
  try {
    await sendToPhp(
      {
        event: 'upsert',
        resource: 'recommendations',
        shop,
        data: { shop, enabled, rules },
      },
      'recommendations.php'
    );
  } catch (e) {
    console.warn('[Recommendations] PHP sync failed (non-fatal):', e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC LOADER  (no Shopify auth – called from storefront JS)
   GET /api/product-recommendations?shop=mystore.myshopify.com
───────────────────────────────────────────────────────────── */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return json({ success: false, error: 'shop param required' }, { status: 400 });
  }

  try {
    const [settings, rules] = await Promise.all([
      prisma.shopSettings.findUnique({ where: { shop } }),
      prisma.productRecommendation.findMany({
        where: { shop, active: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return json(
      {
        success: true,
        enabled: settings?.recommendation_popup_enabled ?? false,
        rules: rules.map((r) => ({
          id: r.id,
          triggerProductId: r.triggerProductId,
          triggerProductHandle: r.triggerProductHandle,
          recommendedProductId: r.recommendedProductId,
          recommendedProductHandle: r.recommendedProductHandle,
          recommendedProductTitle: r.recommendedProductTitle,
          recommendedProductImage: r.recommendedProductImage,
          popupTitle: r.popupTitle,
          ctaText: r.ctaText,
          dismissText: r.dismissText,
        })),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('[Recommendations API] Loader error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

/* ─────────────────────────────────────────────────────────────
   ADMIN ACTION  (Shopify-authenticated – called from admin UI)
   POST /api/product-recommendations
   Body: { intent: 'toggle'|'create'|'delete'|'update', ...fields }
───────────────────────────────────────────────────────────── */
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  let body = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    }
  } catch {
    return json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { intent } = body;

  /* ── Helper: get current rules + settings for a shop (for PHP sync) ── */
  const getCurrentState = async () => {
    const [settings, rules] = await Promise.all([
      prisma.shopSettings.findUnique({ where: { shop } }),
      prisma.productRecommendation.findMany({ where: { shop, active: true } }),
    ]);
    return {
      enabled: settings?.recommendation_popup_enabled ?? false,
      rules: rules.map((r) => ({
        id: r.id,
        triggerProductId: r.triggerProductId,
        triggerProductHandle: r.triggerProductHandle,
        recommendedProductId: r.recommendedProductId,
        recommendedProductHandle: r.recommendedProductHandle,
        recommendedProductTitle: r.recommendedProductTitle,
        recommendedProductImage: r.recommendedProductImage,
        popupTitle: r.popupTitle,
        ctaText: r.ctaText,
        dismissText: r.dismissText,
      })),
    };
  };

  try {
    /* ── Toggle global enable/disable ── */
    if (intent === 'toggle') {
      const enabled = body.enabled === true || body.enabled === 'true';
      const settings = await prisma.shopSettings.upsert({
        where: { shop },
        update: { recommendation_popup_enabled: enabled },
        create: { shop, recommendation_popup_enabled: enabled },
      });
      // Sync full state to PHP for app proxy access
      const state = await getCurrentState();
      await syncToPhp(shop, settings.recommendation_popup_enabled, state.rules);
      return json({ success: true, enabled: settings.recommendation_popup_enabled });
    }

    /* ── Create new recommendation rule ── */
    if (intent === 'create') {
      const rule = await prisma.productRecommendation.create({
        data: {
          shop,
          triggerProductId: String(body.triggerProductId || ''),
          triggerProductTitle: String(body.triggerProductTitle || ''),
          triggerProductHandle: body.triggerProductHandle || null,
          triggerProductImage: body.triggerProductImage || null,
          recommendedProductId: String(body.recommendedProductId || ''),
          recommendedProductTitle: String(body.recommendedProductTitle || ''),
          recommendedProductHandle: body.recommendedProductHandle || null,
          recommendedProductImage: body.recommendedProductImage || null,
          popupTitle: body.popupTitle || 'You might also like',
          ctaText: body.ctaText || 'Add to Combo',
          dismissText: body.dismissText || 'No thanks',
        },
      });
      // Sync full state to PHP for app proxy access
      const state = await getCurrentState();
      await syncToPhp(shop, state.enabled, state.rules);
      return json({ success: true, rule });
    }

    /* ── Delete a rule ── */
    if (intent === 'delete') {
      await prisma.productRecommendation.deleteMany({
        where: { id: parseInt(body.id, 10), shop },
      });
      // Sync full state to PHP for app proxy access
      const state = await getCurrentState();
      await syncToPhp(shop, state.enabled, state.rules);
      return json({ success: true });
    }

    /* ── Update popup text for a rule ── */
    if (intent === 'update') {
      const rule = await prisma.productRecommendation.updateMany({
        where: { id: parseInt(body.id, 10), shop },
        data: {
          popupTitle: body.popupTitle,
          ctaText: body.ctaText,
          dismissText: body.dismissText,
          active: body.active !== 'false' && body.active !== false,
        },
      });
      // Sync full state to PHP for app proxy access
      const state = await getCurrentState();
      await syncToPhp(shop, state.enabled, state.rules);
      return json({ success: true, rule });
    }

    return json({ success: false, error: 'Unknown intent' }, { status: 400 });
  } catch (error) {
    console.error('[Recommendations API] Action error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
