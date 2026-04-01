import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { sendToPhp, formatToIST } from '../utils/api-helpers';
import {
  getThemeEditorAppsUrl,
  setAppEmbedState,
} from '../utils/app-embed.server';

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
  }
  return Boolean(value);
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
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
  } catch (e) {
    return json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const enabled = toBoolean(body.enabled);
  const rawAppUrl = process.env.SHOPIFY_APP_URL || '';
  const APP_URL = rawAppUrl.replace(/\/$/, ''); // Normalize: remove trailing slash

  try {
    const shopQuery = `
      query {
        shop { id name myshopifyDomain primaryDomain { host } plan { displayName } }
        currentAppInstallation { activeSubscriptions { name status } }
      }
    `;
    const shopRes = await admin.graphql(shopQuery);
    const shopDataJson = await shopRes.json();
    const shopData = shopDataJson.data?.shop || {};
    const numericShopId = shopData.id ? shopData.id.split('/').pop() : null;
    const subscriptions =
      shopDataJson.data?.currentAppInstallation?.activeSubscriptions || [];
    const appPlan = subscriptions.length > 0 ? subscriptions[0].name : 'Free';

    const embedResult = await setAppEmbedState({
      admin,
      session,
      enabled,
      blockHints: ['combo_builder', 'combo-builder', 'combo builder'],
    });

    if (!embedResult.ok && embedResult.reason === 'EMBED_BLOCK_NOT_FOUND') {
      return json(
        {
          success: false,
          error:
            'App Embed block was not found in the active theme. Open Theme Editor and add the Make-a-combo app embed first.',
          reason: embedResult.reason,
          themeEditorUrl: getThemeEditorAppsUrl(shop),
          data: {
            status: 'disabled',
            theme_name: embedResult.theme?.name || 'N/A',
          },
        },
        { status: 409 }
      );
    }

    if (!embedResult.ok) {
      return json(
        {
          success: false,
          error: `Unable to update App Embed state (${embedResult.reason || 'UNKNOWN_ERROR'})`,
        },
        { status: 500 }
      );
    }

    // Keep legacy metafield in sync for storefront loader behavior.
    try {
      const shopId = shopData.id;
      if (shopId) {
        await admin.graphql(
          `#graphql
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields { id key value }
                userErrors { field message }
              }
            }
          `,
          {
            variables: {
              metafields: [
                {
                  namespace: 'make_a_combo',
                  key: 'app_url',
                  type: 'single_line_text_field',
                  value: embedResult.isEnabled ? APP_URL : 'DISABLED',
                  ownerId: shopId,
                },
              ],
            },
          }
        );
      }
    } catch (mfErr) {
      console.error(`[Toggle API] ⚠️ Metafield sync failed: ${mfErr.message}`);
    }

    const canonicalStatus = embedResult.isEnabled ? 'enabled' : 'disabled';
    const payload = {
      shop_id: numericShopId || shopData.myshopifyDomain || shop,
      domain: shopData.myshopifyDomain,
      primary_domain: shopData.primaryDomain?.host || null,
      store_name: shopData.name,
      status: canonicalStatus,
      app_plan: appPlan,
      shopify_plan: shopData.plan?.displayName || 'N/A',
      theme_name: embedResult.theme?.name || 'N/A',
      updated_at: formatToIST(),
      source: 'manual_toggle',
    };

    try {
      const dbResult = await sendToPhp(
        {
          event: 'shop_sync',
          resource: 'shop',
          shop: shop,
          data: payload,
        },
        'shop.php'
      );
      console.log('[Toggle API] ✅ MySQL Shop Sync Result:', dbResult);
    } catch (dbErr) {
      console.error('[Toggle API] MySQL Shop Sync Error:', dbErr.message);
    }

    return json(
      {
        success: true,
        status: canonicalStatus,
        data: payload,
        embed: {
          foundBlock: embedResult.foundBlock,
          blockKey: embedResult.blockKey,
          blockType: embedResult.blockType,
          changed: embedResult.changed,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Toggle API] ❌ Critical Error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export const loader = () => json({ message: 'Use POST to toggle app' });
