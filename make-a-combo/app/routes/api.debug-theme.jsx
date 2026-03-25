import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

// Debug route: GET /api/debug-theme
// Shows raw blocks from settings_data.json so we can verify the exact block type string
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const themeRes = await admin.graphql(`
      query {
        themes(first: 5, roles: [MAIN]) {
          nodes { id name role }
        }
      }
    `);
    const themeJson = await themeRes.json();
    const activeTheme = themeJson.data?.themes?.nodes?.[0];

    if (!activeTheme) {
      return json({ error: 'No active theme found' });
    }

    const themeId = activeTheme.id.split('/').pop();

    const assetRes = await admin.rest.get({
      path: `themes/${themeId}/assets`,
      query: { 'asset[key]': 'config/settings_data.json' },
    });

    if (!assetRes.ok) {
      return json({ error: `REST failed: ${assetRes.status}` });
    }

    const assetBody = await assetRes.json();
    const assetValue = assetBody.asset?.value;

    if (!assetValue) {
      return json({ error: 'No asset value returned' });
    }

    const settingsData = JSON.parse(assetValue);
    const blocks = settingsData.current?.blocks || {};

    const blockSummary = Object.entries(blocks).map(([key, block]) => ({
      key,
      type: block.type,
      disabled: block.disabled ?? false,
    }));

    return json({
      shop,
      theme: { id: themeId, name: activeTheme.name },
      total_blocks: blockSummary.length,
      blocks: blockSummary,
    });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};
