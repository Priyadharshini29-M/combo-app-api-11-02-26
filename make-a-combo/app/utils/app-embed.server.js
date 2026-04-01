const THEME_ASSET_API_VERSION = '2025-01';
const SETTINGS_ASSET_KEY = 'config/settings_data.json';
const DEFAULT_DYNAMIC_EMBED_HINTS = [
  'combo_builder',
  'combo-builder',
  'combo builder',
];

function normalizeThemeId(themeGidOrId) {
  if (!themeGidOrId) return null;
  return String(themeGidOrId).split('/').pop();
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'enabled';
  }
  return Boolean(value);
}

export function getThemeEditorAppsUrl(shopDomain) {
  const shopName = String(shopDomain || '').replace('.myshopify.com', '');
  return `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`;
}

export async function getActiveTheme(admin) {
  const res = await admin.graphql(`
    query {
      themes(first: 5, roles: [MAIN]) {
        nodes { id name role }
      }
    }
  `);
  const json = await res.json();
  const mainTheme = json.data?.themes?.nodes?.[0];
  if (!mainTheme) return null;
  return {
    id: normalizeThemeId(mainTheme.id),
    name: mainTheme.name,
    role: mainTheme.role,
  };
}

async function readSettingsDataAsset({ shop, accessToken, themeId }) {
  const assetUrl = `https://${shop}/admin/api/${THEME_ASSET_API_VERSION}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(SETTINGS_ASSET_KEY)}`;
  const res = await fetch(assetUrl, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asset read failed (${res.status}): ${text}`);
  }

  const body = await res.json();
  const assetValue = body.asset?.value;
  if (!assetValue) {
    throw new Error('settings_data.json returned without asset value');
  }

  return JSON.parse(assetValue);
}

async function writeSettingsDataAsset({
  shop,
  accessToken,
  themeId,
  settingsData,
}) {
  const assetUrl = `https://${shop}/admin/api/${THEME_ASSET_API_VERSION}/themes/${themeId}/assets.json`;
  const res = await fetch(assetUrl, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      asset: {
        key: SETTINGS_ASSET_KEY,
        value: JSON.stringify(settingsData),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asset write failed (${res.status}): ${text}`);
  }

  return res.json();
}

function findEmbedBlock(blocks, { extensionUuid, blockHints = [] } = {}) {
  const allHints = [...blockHints].filter(Boolean);

  const keys = Object.keys(blocks || {});
  const candidates = keys
    .map((key) => {
      const type = String(blocks[key]?.type || '');
      if (!type) return null;

      const hasExtensionMatch =
        Boolean(extensionUuid) && type.includes(extensionUuid);
      const hintIndex = allHints.findIndex(
        (hint) => Boolean(hint) && type.includes(hint)
      );

      if (!hasExtensionMatch && hintIndex === -1) return null;

      return {
        key,
        type,
        hasExtensionMatch,
        hintIndex: hintIndex === -1 ? Number.MAX_SAFE_INTEGER : hintIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.hasExtensionMatch !== b.hasExtensionMatch) {
        return a.hasExtensionMatch ? -1 : 1;
      }
      return a.hintIndex - b.hintIndex;
    });

  const matched = candidates[0] || null;
  const matchedKey = matched?.key;

  if (!matchedKey) {
    return { key: null, block: null, type: null };
  }

  return {
    key: matchedKey,
    block: blocks[matchedKey],
    type: blocks[matchedKey]?.type || null,
  };
}

export async function readAppEmbedState({
  admin,
  session,
  extensionUuid,
  blockHints,
}) {
  const theme = await getActiveTheme(admin);
  if (!theme?.id) {
    return {
      ok: false,
      reason: 'NO_ACTIVE_THEME',
      isEnabled: false,
      foundBlock: false,
      theme: null,
    };
  }

  const settingsData = await readSettingsDataAsset({
    shop: session.shop,
    accessToken: session.accessToken,
    themeId: theme.id,
  });
  const blocks = settingsData.current?.blocks || {};
  const match = findEmbedBlock(blocks, {
    extensionUuid,
    blockHints: blockHints?.length ? blockHints : DEFAULT_DYNAMIC_EMBED_HINTS,
  });
  const foundBlock = Boolean(match.key);
  const isEnabled = foundBlock ? blocks[match.key].disabled !== true : false;

  return {
    ok: true,
    reason: foundBlock ? 'OK' : 'EMBED_BLOCK_NOT_FOUND',
    isEnabled,
    foundBlock,
    blockKey: match.key,
    blockType: match.type,
    theme,
  };
}

export async function setAppEmbedState({
  admin,
  session,
  enabled,
  extensionUuid,
  blockHints,
}) {
  const desiredEnabled = toBoolean(enabled);
  const theme = await getActiveTheme(admin);
  if (!theme?.id) {
    return {
      ok: false,
      reason: 'NO_ACTIVE_THEME',
      desiredEnabled,
      isEnabled: false,
      foundBlock: false,
      theme: null,
    };
  }

  const settingsData = await readSettingsDataAsset({
    shop: session.shop,
    accessToken: session.accessToken,
    themeId: theme.id,
  });

  const currentBlocks = settingsData.current?.blocks || {};
  const match = findEmbedBlock(currentBlocks, {
    extensionUuid,
    blockHints: blockHints?.length ? blockHints : DEFAULT_DYNAMIC_EMBED_HINTS,
  });
  if (!match.key) {
    return {
      ok: false,
      reason: 'EMBED_BLOCK_NOT_FOUND',
      desiredEnabled,
      isEnabled: false,
      foundBlock: false,
      theme,
    };
  }

  const currentEnabled = currentBlocks[match.key].disabled !== true;
  if (currentEnabled !== desiredEnabled) {
    if (!settingsData.current) settingsData.current = {};
    if (!settingsData.current.blocks) settingsData.current.blocks = {};
    if (!settingsData.current.blocks[match.key]) {
      settingsData.current.blocks[match.key] = currentBlocks[match.key];
    }
    settingsData.current.blocks[match.key].disabled = !desiredEnabled;

    await writeSettingsDataAsset({
      shop: session.shop,
      accessToken: session.accessToken,
      themeId: theme.id,
      settingsData,
    });
  }

  const verifiedState = await readAppEmbedState({
    admin,
    session,
    extensionUuid,
    blockHints,
  });

  return {
    ...verifiedState,
    ok: verifiedState.ok,
    desiredEnabled,
    changed: currentEnabled !== desiredEnabled,
  };
}
