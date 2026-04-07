/* ===================== UTILITIES ===================== */
function formatMoney(cents) {
  const num = parseFloat(cents);
  let currency = '\u20B9';
  if (
    typeof window !== 'undefined' &&
    window.Shopify &&
    window.Shopify.currency &&
    window.Shopify.currency.active
  ) {
    const symbols = {
      USD: '$',
      EUR: '\u20AC',
      GBP: '\u00A3',
      INR: '\u20B9',
      JPY: '\u00A5',
      AUD: 'A$',
      CAD: 'C$',
      SGD: 'S$',
      HKD: 'HK$',
      CNY: '\u00A5',
      RUB: '\u20BD',
      BRL: 'R$',
      ZAR: 'R',
      TRY: '\u20BA',
      IDR: 'Rp',
      THB: '\u0E3F',
      MYR: 'RM',
      PHP: '\u20B1',
      VND: '\u20AB',
      KRW: '\u20A9',
      NGN: '\u20A6',
      MXN: '$',
      PLN: 'zl',
      CZK: 'Kc',
      SEK: 'kr',
      DKK: 'kr',
      NOK: 'kr',
      HUF: 'Ft',
      CHF: 'Fr',
      NZD: 'NZ$',
      TWD: 'NT$',
      SAR: '\uFDFC',
      AED: 'AED',
      ILS: '\u20AA',
    };
    currency =
      symbols[window.Shopify.currency.active] || window.Shopify.currency.active;
  }
  if (!Number.isFinite(num)) return `${currency}0.00`;
  if (typeof cents === 'string' && cents.includes('.'))
    return `${currency}${num.toFixed(2)}`;
  return `${currency}${(num / 100).toFixed(2)}`;
}

function showToast(msg) {
  let t = document.getElementById('combo-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'combo-toast';
    t.className = 'cdo-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function ensureComboCssLoaded() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-cdo-style="combo-builder"]')) return;

  const currentScript =
    document.currentScript ||
    document.querySelector('script[src*="combo-extended.js"]');
  const src = currentScript && currentScript.src ? currentScript.src : '';
  if (!src) return;

  const cssHref = src.replace(
    /combo-extended\.js(?:\?.*)?$/i,
    'combo-builder.css'
  );
  if (!cssHref || cssHref === src) return;

  if (document.querySelector(`link[href="${cssHref}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref;
  link.setAttribute('data-cdo-style', 'combo-builder');
  document.head.appendChild(link);
}

function applySliderConfigCss(cfg) {
  if (!cfg) return;

  const pick = (keys, fallback) => {
    for (const key of keys) {
      const v = cfg[key];
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      return v;
    }
    return fallback;
  };
  const isValidColor = (value) => {
    if (typeof value !== 'string') return false;
    const s = value.trim();
    if (!s) return false;
    if (s.toLowerCase() === 'transparent') return false;
    const opt = new Option().style;
    opt.color = '';
    opt.color = s;
    return opt.color !== '';
  };

  const toBool = (val, fallback) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const norm = val.trim().toLowerCase();
      if (norm === 'true') return true;
      if (norm === 'false') return false;
    }
    return fallback;
  };
  const toNum = (val, fallback) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const showNavArrows = toBool(
    pick(['show_nav_arrows', 'showArrows'], true),
    true
  );
  const enableTouchSwipe = toBool(
    pick(['enable_touch_swipe', 'enableTouchSwipe'], true),
    true
  );
  const showScrollbar = toBool(
    pick(['show_scrollbar', 'showScrollbar'], false),
    false
  );
  const arrowColorRaw = pick(['arrow_color', 'arrowColor'], '#111111');
  const arrowBgColorRaw = pick(['arrow_bg_color', 'arrowBg'], '#ffffff');
  const arrowColor = isValidColor(String(arrowColorRaw))
    ? String(arrowColorRaw).trim()
    : '#111111';
  const arrowBgColor = isValidColor(String(arrowBgColorRaw))
    ? String(arrowBgColorRaw).trim()
    : '#ffffff';
  const arrowSize = clamp(
    Math.round(toNum(pick(['arrow_size', 'arrowSize'], 40), 40)),
    24,
    72
  );
  const arrowRadius = clamp(
    toNum(pick(['arrow_border_radius', 'arrowBorderRadius'], 50), 50),
    0,
    50
  );
  const arrowOpacity = clamp(
    toNum(pick(['arrow_opacity', 'arrowOpacity'], 1), 1),
    0.25,
    1
  );
  const arrowPosition = String(
    pick(['arrow_position', 'arrowPosition'], 'inside') || 'inside'
  ).toLowerCase();
  const scrollbarColorRaw = pick(
    ['scrollbar_color', 'scrollbarColor'],
    '#dddddd'
  );
  const scrollbarColor = isValidColor(String(scrollbarColorRaw))
    ? String(scrollbarColorRaw).trim()
    : '#dddddd';
  const scrollbarThickness = clamp(
    Math.round(
      toNum(pick(['scrollbar_thickness', 'scrollbarThickness'], 4), 4)
    ),
    2,
    16
  );
  const swipeSensitivity = clamp(
    Math.round(toNum(pick(['swipe_sensitivity', 'swipeSensitivity'], 5), 5)),
    1,
    10
  );

  const edgeOffset =
    arrowPosition === 'outside' ? -Math.round(arrowSize * 0.45) : 10;
  const snapType = swipeSensitivity >= 7 ? 'proximity' : 'mandatory';
  const touchAction = enableTouchSwipe ? 'pan-x pan-y' : 'pan-y';

  let styleEl = document.getElementById('cdo-slider-config-css');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'cdo-slider-config-css';
    const mountNode =
      document.getElementById('combo-builder-root') ||
      document.body ||
      document.documentElement;
    mountNode.appendChild(styleEl);
  }

  styleEl.textContent = `
    #combo-builder-root .cdo-layout-slider {
      touch-action: ${touchAction};
      scroll-snap-type: x ${snapType};
      -webkit-overflow-scrolling: touch;
    }
    #combo-builder-root .cdo-layout-slider .cdo-card {
      scroll-snap-align: start;
    }
    #combo-builder-root .cdo-layout-slider-container .cdo-nav-btn {
      display: ${showNavArrows ? 'flex' : 'none'} !important;
      width: ${arrowSize}px !important;
      height: ${arrowSize}px !important;
      border-radius: ${arrowRadius}% !important;
      color: ${arrowColor} !important;
      background: ${arrowBgColor} !important;
      border-color: ${arrowBgColor} !important;
      opacity: ${arrowOpacity} !important;
      pointer-events: auto !important;
      z-index: 60 !important;
    }
    #combo-builder-root .cdo-layout-slider-container .cdo-nav-btn.cdo-prev { left: ${edgeOffset}px !important; }
    #combo-builder-root .cdo-layout-slider-container .cdo-nav-btn.cdo-next { right: ${edgeOffset}px !important; }
    #combo-builder-root .cdo-layout-slider {
      scrollbar-width: ${showScrollbar ? 'thin' : 'none'};
      scrollbar-color: ${showScrollbar ? `${scrollbarColor} transparent` : 'auto'};
    }
    #combo-builder-root .cdo-layout-slider::-webkit-scrollbar {
      display: ${showScrollbar ? 'block' : 'none'};
      height: ${scrollbarThickness}px;
    }
    #combo-builder-root .cdo-layout-slider::-webkit-scrollbar-thumb {
      background: ${scrollbarColor};
      border-radius: 999px;
    }
    #combo-builder-root .cdo-layout-slider::-webkit-scrollbar-track {
      background: transparent;
    }
  `;
}

function getSliderNavButtonsHtml(cfg) {
  const toBool = (val, fallback) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const norm = val.trim().toLowerCase();
      if (norm === 'true') return true;
      if (norm === 'false') return false;
    }
    return fallback;
  };

  const toNum = (val, fallback) => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const showNavArrows = toBool(cfg?.show_nav_arrows, true);
  if (!showNavArrows) return '';

  const arrowSize = clamp(Math.round(toNum(cfg?.arrow_size, 40)), 24, 72);
  const arrowOpacity = clamp(toNum(cfg?.arrow_opacity, 0.9), 0.25, 1);
  const arrowRadius = clamp(toNum(cfg?.arrow_border_radius, 50), 0, 50);
  const arrowColor = String(cfg?.arrow_color || '#111111');
  const arrowBg = String(cfg?.arrow_bg_color || '#ffffff');
  const arrowPosition = String(cfg?.arrow_position || 'inside').toLowerCase();
  const edgeOffset =
    arrowPosition === 'outside' ? -Math.round(arrowSize * 0.45) : 10;

  const baseStyle = [
    'position:absolute',
    'top:50%',
    'transform:translateY(-50%)',
    `width:${arrowSize}px`,
    `height:${arrowSize}px`,
    `border-radius:${arrowRadius}%`,
    `color:${arrowColor}`,
    `background:${arrowBg}`,
    `border-color:${arrowBg}`,
    `opacity:${arrowOpacity}`,
    'z-index:60',
  ].join(';');

  return `
    <button class="cdo-nav-btn cdo-prev" style="${baseStyle};left:${edgeOffset}px" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:-300,behavior:'smooth'})">&larr;</button>
    <button class="cdo-nav-btn cdo-next" style="${baseStyle};right:${edgeOffset}px" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:300,behavior:'smooth'})">&rarr;</button>
  `;
}

function syncSliderArrowVisibility(scopeRoot) {
  const root = scopeRoot || document;
  root.querySelectorAll('.cdo-layout-slider-container').forEach((container) => {
    const slider = container.querySelector('.cdo-layout-slider');
    if (!slider) return;
    const configAllowsArrows =
      String(container.dataset.showNavArrows || 'true').toLowerCase() !==
      'false';
    const count = slider.querySelectorAll('.cdo-card').length;
    container.setAttribute('data-cdo-slide-count', String(count));
    container.querySelectorAll('.cdo-nav-btn').forEach((btn) => {
      btn.style.display = configAllowsArrows && count > 1 ? '' : 'none';
    });
  });
}

function setupSliderArrowObserver(root) {
  if (!root || root.dataset.cdoArrowObserverBound === '1') return;
  root.dataset.cdoArrowObserverBound = '1';
  const obs = new MutationObserver(() => syncSliderArrowVisibility(root));
  obs.observe(root, { childList: true, subtree: true });
  syncSliderArrowVisibility(root);
}

function openVariantPopupGlobal(card, product) {
  const overlay = document.getElementById('cdo-variant-overlay');
  const varTitle = document.getElementById('cdo-variant-title');
  const varOptions = document.getElementById('cdo-variant-options');
  const varAddBtn = document.getElementById('cdo-variant-add');
  const varClose = document.getElementById('cdo-variant-close');
  if (!overlay || !varOptions || !varAddBtn) return;

  window.__cdoPendingCard = card;
  if (varTitle)
    varTitle.textContent = (product && product.title) || 'Select variant';
  varOptions.innerHTML = '';

  ((product && product.variants) || []).forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent =
      v.title === 'Default Title'
        ? (product && product.title) || 'Default'
        : v.title || 'Variant';
    btn.dataset.variantId = String(v.id || '').replace(
      'gid://shopify/ProductVariant/',
      ''
    );
    btn.dataset.price = v.price;
    btn.dataset.image = v.image || (product && product.image) || '';
    btn.style.cssText =
      'padding:8px 16px;border:2px solid #e0e0e0;border-radius:6px;cursor:pointer;font-weight:600;background:#fff;';
    btn.addEventListener('click', () => {
      varOptions.querySelectorAll('button').forEach((b) => {
        b.style.borderColor = '#e0e0e0';
        b.style.background = '#fff';
      });
      btn.style.borderColor = '#000';
      btn.style.background = '#f5f5f5';
      varAddBtn.dataset.variantId = btn.dataset.variantId;
      varAddBtn.dataset.price = btn.dataset.price;
      varAddBtn.dataset.image = btn.dataset.image;
    });
    varOptions.appendChild(btn);
  });

  const first = varOptions.querySelector('button');
  if (first) first.click();
  overlay.style.display = 'flex';

  if (varClose && !varClose.dataset.cdoBound) {
    varClose.dataset.cdoBound = '1';
    varClose.addEventListener('click', () => {
      overlay.style.display = 'none';
      window.__cdoPendingCard = null;
    });
  }

  if (!overlay.dataset.cdoBound) {
    overlay.dataset.cdoBound = '1';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        window.__cdoPendingCard = null;
      }
    });
  }
}

/* ===================== VISITOR TRACKING ===================== */
function trackVisit(templateName) {
  if (!templateName) return;
  let userId = sessionStorage.getItem('cdo_uid');
  if (!userId) {
    userId = 'visitor-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('cdo_uid', userId);
  }
  const payload = {
    template_name: templateName,
    template_id: window.comboTemplateId || '123',
    shop_domain:
      window.Shopify && window.Shopify.shop
        ? window.Shopify.shop
        : 'unknown.myshopify.com',
    page_url: window.location.href,
    visitor_id: userId,
    discount_code: window.__cdoDiscountCode || null,
  };
  fetch('https://darkblue-dotterel-303283.hostingersite.com/clicks.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function trackCheckout(templateName) {
  if (!templateName) return;
  let userId = sessionStorage.getItem('cdo_uid');
  if (!userId) {
    userId = 'visitor-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('cdo_uid', userId);
  }
  const payload = {
    template_name: templateName,
    template_id: '123',
    shop_domain: window.Shopify && window.Shopify.shop ? window.Shopify.shop : 'unknown.myshopify.com',
    page_url: window.location.href,
    visitor_id: userId,
    action: 'checkout',
    type: 'checkout',
    discount_code: window.__cdoDiscountCode || null,
  };
  fetch('https://darkblue-dotterel-303283.hostingersite.com/clicks.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function isProductInStock(product) {
  if (!product || product.available === false) return false;
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (!variants.length) {
    const productInventory = parseInt(product.inventory_quantity, 10);
    if (Number.isFinite(productInventory)) return productInventory > 0;
    return product.available !== false;
  }

  return variants.some((variant) => {
    if (variant.available === false) return false;
    const inventory = parseInt(variant.inventory_quantity, 10);
    if (Number.isFinite(inventory)) return inventory > 0;
    return variant.available !== false;
  });
}

function filterProductsByStock(products, cfg) {
  const list = Array.isArray(products) ? products : [];
  if (cfg && cfg.show_sold_out_products === true) return list;
  return list.filter(isProductInStock);
}

function collectConfiguredHandles(cfg) {
  const handles = new Set();
  for (let i = 1; i <= 20; i++) {
    const stepHandle = String(cfg?.[`step_${i}_collection`] || '').trim();
    if (stepHandle) handles.add(stepHandle);

    const colHandle = String(cfg?.[`col_${i}`] || '').trim();
    if (colHandle) handles.add(colHandle);
  }

  const defaultHandle = String(cfg?.collection_handle || '').trim();
  if (defaultHandle) handles.add(defaultHandle);

  return handles;
}

async function fetchCollectionProductsPaginated(handle) {
  const all = [];
  const normalizedHandle = String(handle || '').trim();
  if (!normalizedHandle) return all;

  const limit = 250;
  let page = 1;
  const maxPages = 40;

  // Paginate collection products so large collections are fully loaded.
  while (page <= maxPages) {
    const res = await fetch(
      `/collections/${encodeURIComponent(normalizedHandle)}/products.json?limit=${limit}&page=${page}`
    );
    if (!res.ok) break;

    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    if (!products.length) break;

    all.push(...products);
    if (products.length < limit) break;
    page += 1;
  }

  return all;
}

function mapStorefrontProduct(rawProduct, collectionHandle, step, stepLimit) {
  return {
    id: `gid://shopify/Product/${rawProduct.id}`,
    title: rawProduct.title,
    handle: rawProduct.handle,
    price: rawProduct.variants?.[0]?.price || '0.00',
    image: rawProduct.images?.[0]?.src || '',
    available: rawProduct.available,
    inventory_quantity: (rawProduct.variants || []).reduce(
      (sum, variant) => sum + (parseInt(variant.inventory_quantity, 10) || 0),
      0
    ),
    collection_handle: collectionHandle,
    ...(Number.isInteger(step) ? { step } : {}),
    ...(stepLimit != null ? { step_limit: stepLimit } : {}),
    variants: (rawProduct.variants || []).map((variant) => ({
      id: `gid://shopify/ProductVariant/${variant.id}`,
      title: variant.title,
      price: variant.price,
      available: variant.available,
      inventory_quantity: variant.inventory_quantity,
      image: variant.featured_image?.src || null,
    })),
  };
}

async function buildLiveCollectionProducts(cfg, layout) {
  const handles = collectConfiguredHandles(cfg);
  if (!handles.size) return [];

  if (layout === 'layout1') {
    const hasStepCollections = Array.from({ length: 20 }, (_, idx) => {
      const step = idx + 1;
      return String(cfg?.[`step_${step}_collection`] || '').trim();
    }).some(Boolean);

    if (!hasStepCollections) {
      const allProducts = [];
      for (const handle of handles) {
        const products = await fetchCollectionProductsPaginated(handle);
        allProducts.push(
          ...products.map((p) => mapStorefrontProduct(p, handle))
        );
      }
      return allProducts;
    }

    const allProducts = [];
    for (let i = 1; i <= 20; i++) {
      const stepHandle = String(cfg?.[`step_${i}_collection`] || '').trim();
      if (!stepHandle) continue;

      const stepProducts = await fetchCollectionProductsPaginated(stepHandle);
      const stepLimitRaw = cfg?.[`step_${i}_limit`];
      const stepLimit =
        stepLimitRaw === undefined ||
        stepLimitRaw === null ||
        stepLimitRaw === ''
          ? null
          : stepLimitRaw;

      allProducts.push(
        ...stepProducts.map((p) =>
          mapStorefrontProduct(p, stepHandle, i, stepLimit)
        )
      );
    }
    return allProducts;
  }

  const allProducts = [];
  for (const handle of handles) {
    const products = await fetchCollectionProductsPaginated(handle);
    allProducts.push(...products.map((p) => mapStorefrontProduct(p, handle)));
  }

  return allProducts;
}

function getProductImageRatio(cfg) {
  const ratio = (cfg && cfg.product_image_ratio) || 'square';
  if (ratio === 'portrait')
    return { cssRatio: '3 / 4', fallbackPadding: '133.3333%' };
  if (ratio === 'rectangle')
    return { cssRatio: '4 / 3', fallbackPadding: '75%' };
  return { cssRatio: '1 / 1', fallbackPadding: '100%' };
}

/* ===================== PREVIEW MODAL ===================== */
function getPreviewModalHtml() {
  return `
  <div id="cdo-preview-modal-overlay" class="cdo-modal-overlay" style="display:none;" aria-hidden="true">
    <div class="cdo-modal-container" role="dialog" aria-modal="true" aria-label="Product preview" tabindex="-1">
      <button type="button" class="cdo-modal-close" id="cdo-preview-modal-close" aria-label="Close preview">&times;</button>
      <div id="cdo-preview-modal-body"></div>
    </div>
  </div>`;
}

const PREVIEW_MODAL_CLOSE_MS = 280;
let previewModalLastFocused = null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePreviewImages(images) {
  const allImages = Array.isArray(images) ? images : [];
  return allImages
    .map((img) => {
      if (!img) return '';
      if (typeof img === 'string') return img;
      if (typeof img === 'object') {
        return img.src || img.url || img.originalSrc || '';
      }
      return '';
    })
    .map((src) => String(src || '').trim())
    .filter(Boolean);
}

async function fetchPreviewProductData(handle) {
  const safeHandle = String(handle || '').trim();
  if (!safeHandle) throw new Error('Invalid product handle');

  const res = await fetch(`/products/${encodeURIComponent(safeHandle)}.js`);
  if (!res.ok) throw new Error('Product not found');
  const p = await res.json();

  return {
    title: p.title || 'Product',
    price: formatMoney(p.price),
    description: p.description || '',
    images: normalizePreviewImages(
      Array.isArray(p.images) && p.images.length
        ? p.images
        : p.featured_image
          ? [p.featured_image]
          : []
    ),
  };
}

const productHoverCache = new Map();

function stripHtmlTags(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchProductHoverData(handle) {
  const safeHandle = String(handle || '').trim();
  if (!safeHandle) throw new Error('Invalid product handle');
  if (productHoverCache.has(safeHandle))
    return productHoverCache.get(safeHandle);

  const res = await fetch(`/products/${encodeURIComponent(safeHandle)}.js`);
  if (!res.ok) throw new Error('Product not found');
  const p = await res.json();

  const payload = {
    title: p.title || 'Product',
    secondImage:
      (Array.isArray(p.images) && p.images[1]) || p.featured_image || '',
    descriptionText: stripHtmlTags(p.description || ''),
  };
  productHoverCache.set(safeHandle, payload);
  return payload;
}

function renderCardHoverOverlay(overlay, data) {
  if (!overlay) return;
  const text =
    data.descriptionText || 'Description is not available for this product.';
  overlay.innerHTML = `<div class="cdo-hover-desc">${escapeHtml(text)}</div>`;
}

function bindProductHoverEffects(cfg) {
  const hoverEnabled =
    cfg?.enable_product_hover === true ||
    String(cfg?.enable_product_hover || '').toLowerCase() === 'true';
  if (!hoverEnabled) return;

  const isTouchDevice =
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
    'ontouchstart' in window;

  document.querySelectorAll('.cdo-card.cdo-hover-enabled').forEach((card) => {
    if (card.dataset.hoverBound === '1') return;
    card.dataset.hoverBound = '1';

    const overlay = card.querySelector('.cdo-product-hover-overlay');
    const imageWrap = card.querySelector('.cdo-img-wrapper');
    const handle = card.dataset.handle || '';
    if (!overlay) return;

    let requestSeq = 0;
    const showOverlay = async () => {
      card.classList.add('cdo-hover-active');
      if (!handle || overlay.dataset.hoverLoaded === '1') return;

      const localSeq = ++requestSeq;
      overlay.innerHTML = '<div class="cdo-hover-loading">Loading...</div>';
      try {
        const data = await fetchProductHoverData(handle);
        if (localSeq !== requestSeq) return;
        renderCardHoverOverlay(overlay, data);
        overlay.dataset.hoverLoaded = '1';
      } catch (e) {
        if (localSeq !== requestSeq) return;
        overlay.innerHTML =
          '<div class="cdo-hover-desc">Unable to load hover preview.</div>';
      }
    };

    const hideOverlay = () => {
      card.classList.remove('cdo-hover-active');
    };

    if (!isTouchDevice) {
      card.addEventListener('mouseenter', showOverlay);
      card.addEventListener('mouseleave', hideOverlay);
    }
    card.addEventListener('focusin', showOverlay);
    card.addEventListener('focusout', (e) => {
      if (!card.contains(e.relatedTarget)) hideOverlay();
    });

    if (isTouchDevice && imageWrap) {
      imageWrap.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (card.classList.contains('cdo-hover-active')) hideOverlay();
        else showOverlay();
      });
    }
  });

  if (isTouchDevice && !document.body.dataset.cdoHoverOutsideBound) {
    document.body.dataset.cdoHoverOutsideBound = '1';
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest('.cdo-card.cdo-hover-enabled')) return;
      document
        .querySelectorAll('.cdo-card.cdo-hover-enabled.cdo-hover-active')
        .forEach((card) => card.classList.remove('cdo-hover-active'));
    });
  }
}

function setPreviewModalLoading(body) {
  body.innerHTML =
    '<div style="text-align:center;padding:80px;"><div class="cdo-spinner"></div><p style="margin-top:20px;color:#666;">Loading product details...</p></div>';
}

function renderPreviewModalContent(body, data, cfg) {
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const hasImages = images.length > 0;
  const mainImage = hasImages ? images[0] : '';
  const toNum = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const contentGap = Math.max(
    0,
    toNum(cfg && cfg.preview_modal_content_gap, 10)
  );
  const galleryRatio = Math.max(
    0.5,
    toNum(cfg && cfg.preview_modal_gallery_ratio, 1.45)
  );
  const infoRatio = Math.max(
    0.5,
    toNum(cfg && cfg.preview_modal_info_ratio, 0.85)
  );
  const galleryColumns = Math.max(
    1,
    Math.round(toNum(cfg && cfg.preview_modal_gallery_columns, 2))
  );
  const showImageArrows = (cfg && cfg.preview_modal_show_arrows) !== false;

  const imagesHtml = hasImages
    ? `
      <div class="cdo-modal-img-wrap">
        ${
          images.length > 1 && showImageArrows
            ? `<button type="button" class="cdo-modal-img-nav prev" aria-label="Previous image">
                 <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
               </button>
               <button type="button" class="cdo-modal-img-nav next" aria-label="Next image">
                 <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
               </button>`
            : ''
        }
        <img id="cdo-modal-main-image" src="${escapeHtml(mainImage)}" class="cdo-modal-img" alt="${escapeHtml(data.title)}" loading="lazy">
      </div>
      ${
        images.length > 1
          ? `<div class="cdo-modal-thumbs" role="list" aria-label="Product images">
              ${images
                .map(
                  (src, idx) => `
                <button
                  type="button"
                  class="cdo-modal-thumb ${idx === 0 ? 'is-active' : ''}"
                  data-cdo-thumb-src="${escapeHtml(src)}"
                  data-cdo-thumb-index="${idx}"
                  aria-label="View image ${idx + 1}"
                  ${idx === 0 ? 'aria-current="true"' : ''}
                >
                  <img src="${escapeHtml(src)}" alt="${escapeHtml(data.title)} image ${idx + 1}" loading="lazy">
                </button>
              `
                )
                .join('')}
            </div>`
          : ''
      }
    `
    : '<div class="cdo-modal-no-images">Product images are not available.</div>';

  body.innerHTML = `
    <div class="cdo-modal-content" style="grid-template-columns:minmax(0, ${galleryRatio}fr) minmax(0, ${infoRatio}fr);gap:${contentGap}px;">
      <div class="cdo-modal-gallery" style="grid-template-columns:repeat(${galleryColumns}, minmax(0, 1fr));">
        ${imagesHtml}
      </div>
      <div class="cdo-modal-info">
        <h2>${escapeHtml(data.title)}</h2>
        <div class="cdo-modal-price">${data.price}</div>
        <div class="cdo-modal-desc">${data.description || 'No description available.'}</div>
      </div>
    </div>
  `;

  const mainImageEl = body.querySelector('#cdo-modal-main-image');
  if (!mainImageEl) return;
  let activeIndex = 0;

  const syncActiveImage = (nextIndex) => {
    if (!images.length) return;
    activeIndex = ((nextIndex % images.length) + images.length) % images.length;
    mainImageEl.setAttribute('src', images[activeIndex]);

    body.querySelectorAll('.cdo-modal-thumb').forEach((btn) => {
      const idx = Number(btn.getAttribute('data-cdo-thumb-index'));
      const isActive = idx === activeIndex;
      btn.classList.toggle('is-active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  };

  body.querySelectorAll('.cdo-modal-thumb').forEach((thumbBtn) => {
    thumbBtn.addEventListener('click', () => {
      const idx = Number(thumbBtn.getAttribute('data-cdo-thumb-index'));
      if (!Number.isFinite(idx)) return;
      syncActiveImage(idx);
    });
  });

  const prevBtn = body.querySelector('.cdo-modal-img-nav.prev');
  const nextBtn = body.querySelector('.cdo-modal-img-nav.next');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => syncActiveImage(activeIndex - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => syncActiveImage(activeIndex + 1));
  }
}

function closePreviewModal() {
  const overlay = document.getElementById('cdo-preview-modal-overlay');
  if (!overlay || overlay.getAttribute('aria-hidden') === 'true') return;

  overlay.classList.remove('show');
  overlay.classList.add('closing');
  window.setTimeout(() => {
    overlay.classList.remove('closing');
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cdo-modal-open');
    if (
      previewModalLastFocused &&
      typeof previewModalLastFocused.focus === 'function'
    ) {
      previewModalLastFocused.focus();
    }
  }, PREVIEW_MODAL_CLOSE_MS);
}

function getPreviewModalFocusableElements(overlay) {
  if (!overlay) return [];
  return Array.from(
    overlay.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

function trapPreviewModalFocus(e) {
  if (e.key !== 'Tab') return;
  const overlay = document.getElementById('cdo-preview-modal-overlay');
  if (!overlay || overlay.getAttribute('aria-hidden') === 'true') return;

  const focusables = getPreviewModalFocusableElements(overlay);
  if (!focusables.length) {
    e.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
    return;
  }
  if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

async function openPreviewModal(handle, cfg) {
  const overlay = document.getElementById('cdo-preview-modal-overlay');
  const body = document.getElementById('cdo-preview-modal-body');
  if (!overlay || !body) return;

  previewModalLastFocused = document.activeElement;
  overlay.classList.remove('closing');
  overlay.style.display = 'block';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cdo-modal-open');
  window.requestAnimationFrame(() => overlay.classList.add('show'));
  setPreviewModalLoading(body);

  const closeBtn = document.getElementById('cdo-preview-modal-close');
  if (closeBtn) closeBtn.focus();

  try {
    const previewData = await fetchPreviewProductData(handle);
    renderPreviewModalContent(body, previewData, cfg);
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#b42318;">Failed to load product details.</div>`;
  }
}

function bindPreviewEvents(cfg) {
  document.querySelectorAll('.cdo-preview-btn').forEach((btn) => {
    if (btn.dataset.previewBound) return;
    btn.dataset.previewBound = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openPreviewModal(btn.dataset.handle, cfg);
    });
  });

  const closeBtn = document.getElementById('cdo-preview-modal-close');
  const overlay = document.getElementById('cdo-preview-modal-overlay');

  if (closeBtn && !closeBtn.dataset.previewBound) {
    closeBtn.dataset.previewBound = '1';
    closeBtn.addEventListener('click', closePreviewModal);
  }
  if (overlay && !overlay.dataset.previewBound) {
    overlay.dataset.previewBound = '1';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePreviewModal();
    });
  }
  if (!document.body.dataset.cdoPreviewEscBound) {
    document.body.dataset.cdoPreviewEscBound = '1';
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePreviewModal();
      trapPreviewModalFocus(e);
    });
  }

  bindProductHoverEffects(cfg);
}

/* ===================== PRODUCT CARD ===================== */
function renderProductCard(cfg, product) {
  const viewport =
    window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile = viewport < 768;
  const titleSize = isMobile
    ? cfg.product_title_size_mobile || 13
    : cfg.product_title_size_desktop || 15;
  const priceSize = isMobile
    ? cfg.product_price_size_mobile || 13
    : cfg.product_price_size_desktop || 15;
  const imgRatio = getProductImageRatio(cfg);
  const cardPad = cfg.product_card_padding ?? 10;
  const borderColor = cfg.preview_item_border_color || '#f0f0f0';
  const addBtnText = cfg.add_btn_text || cfg.product_add_btn_text || 'Add';
  const addBtnBg = cfg.add_btn_bg || cfg.product_add_btn_color || '#000';
  const addBtnColor =
    cfg.add_btn_text_color || cfg.product_add_btn_text_color || '#fff';
  const addBtnSize = isMobile
    ? Math.min(cfg.add_btn_font_size || cfg.product_add_btn_font_size || 14, 14)
    : cfg.add_btn_font_size || cfg.product_add_btn_font_size || 14;
  const addBtnW =
    cfg.add_btn_font_weight || cfg.product_add_btn_font_weight || 600;
  const addBtnRadius = cfg.add_btn_border_radius ?? 8;
  const showQty = cfg.show_quantity_selector !== false;
  const showTick = cfg.show_selection_tick !== false;
  const hlColor = cfg.selection_highlight_color || cfg.primary_color || '#000';
  const soldOut = !isProductInStock(product);
  const previewVisibility = cfg.preview_icon_visibility || 'static';
  const previewIconHtml = `
    <button type="button" class="cdo-preview-btn" data-handle="${product.handle}" title="Preview Product" aria-label="Preview product">
      <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
    </button>
  `;

  let productId = (product.id || '').replace('gid://shopify/Product/', '');
  // If only one variant, use variant ID for data-id
  if (product.variants && product.variants.length === 1) {
    productId = (product.variants[0].id || '').replace(
      'gid://shopify/ProductVariant/',
      ''
    );
  }

  const variants = product.variants || [];
  const hasVariants = variants.length > 1;
  const displayMode = cfg.product_card_variants_display || 'popup';
  const requiresVariantSelection = hasVariants && displayMode !== 'popup';
  const hoverEnabled =
    cfg.enable_product_hover === true ||
    String(cfg.enable_product_hover || '').toLowerCase() === 'true';
  const hoverMode = 'description';
  const useProductHoverOverlay = hoverEnabled && displayMode !== 'hover';

  let variantsHtml = '';
  if (hasVariants && displayMode === 'hover') {
    variantsHtml = `
    <div class="cdo-variant-hover-popup">
      ${variants
        .map((v) => {
          const vId = (v.id || '').replace('gid://shopify/ProductVariant/', '');
          return `<div class="cdo-variant-swatch" data-variant-id="${vId}" data-price="${v.price}" data-image="${v.image || product.image || ''}" title="${v.title}">
          ${v.title}
        </div>`;
        })
        .join('')}
    </div>`;
  }

  let staticVariantsHtml = '';
  if (hasVariants && displayMode === 'static') {
    const placeholder = cfg.variant_select_placeholder || 'Select a variant';
    staticVariantsHtml = `
    <div class="cdo-variant-select-wrap" style="margin-top:${cfg.variant_select_margin_top ?? 10}px;margin-bottom:${cfg.variant_select_margin_bottom ?? 12}px;">
      <select class="cdo-variant-select" style="width:100%;background:${cfg.variant_select_bg || '#f9f9f9'};border:1px solid ${cfg.variant_select_border_color || '#e0e0e0'};color:${cfg.variant_select_text_color || '#333333'};border-radius:${cfg.variant_select_border_radius ?? 8}px;font-size:${cfg.variant_select_font_size ?? 13}px;padding:${cfg.variant_select_padding_vertical ?? 9}px ${cfg.variant_select_padding_horizontal ?? 12}px;outline:none;">
        <option value="">${escapeHtml(placeholder)}</option>
        ${variants
          .map((v) => {
            const vId = (v.id || '').replace(
              'gid://shopify/ProductVariant/',
              ''
            );
            const vTitle =
              v.title === 'Default Title'
                ? (product && product.title) || 'Default'
                : v.title || 'Variant';
            return `<option value="${vId}" data-price="${v.price}" data-image="${v.image || product.image || ''}">${escapeHtml(vTitle)}</option>`;
          })
          .join('')}
      </select>
    </div>`;
  }

  const productHoverOverlayHtml = useProductHoverOverlay
    ? `<div class="cdo-product-hover-overlay"><div class="cdo-hover-loading">Loading...</div></div>`
    : '';
  const hoverFocusAttrs = useProductHoverOverlay
    ? `tabindex="0" aria-label="View product description for ${escapeHtml(product.title || 'product')}"`
    : '';

  return `
  <div class="cdo-card ${soldOut ? 'cdo-sold-out' : ''} ${previewVisibility === 'static' ? 'preview-static' : 'cdo-preview-hover'} ${useProductHoverOverlay ? `cdo-hover-enabled cdo-hover-${hoverMode}` : ''}" data-id="${productId}" data-price="${product.price}" data-image="${product.image || ''}" data-step="${product.step || 1}" data-steplimit="${product.step_limit || ''}" data-collection="${product.collection_handle || ''}" data-soldout="${soldOut ? '1' : '0'}" data-handle="${product.handle || ''}" data-hover-mode="${hoverMode}" ${hoverFocusAttrs}
       style="border:2px solid ${borderColor};border-radius:12px;padding:${cardPad}px;background:#fff;display:flex;flex-direction:column;transition:border-color 0.2s;overflow:hidden;position:relative;">
    ${soldOut ? `<div class="cdo-soldout-pill">Sold Out</div>` : ''}
    ${showTick ? `<div class="cdo-tick" style="background:${hlColor};">&#10003;</div>` : ''}
    <div class="cdo-img-wrapper" style="--cdo-image-ratio:${imgRatio.cssRatio};--cdo-image-ratio-fallback:${imgRatio.fallbackPadding};">
      <img src="${product.image || ''}" alt="${product.title || ''}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
      ${productHoverOverlayHtml}
      ${previewIconHtml}
      ${variantsHtml}
    </div>
    <div style="font-size:${titleSize}px;font-weight:700;margin-bottom:4px;color:${cfg.text_color || '#111'};line-height:1.3;">${product.title || ''}</div>
    <div style="font-weight:800;font-size:${priceSize}px;color:${cfg.primary_color || cfg.add_btn_bg || '#000'};margin-bottom:10px;" class="cdo-card-price">${formatMoney(product.price)}</div>
    ${staticVariantsHtml}
    <div class="cdo-card-actions" style="margin-top:auto;display:flex;align-items:center;gap:6px;${showQty && isMobile ? 'flex-wrap:wrap;' : ''}">
      ${
        showQty
          ? `
      <div class="cdo-qty-wrap" style="display:flex;align-items:center;${isMobile ? 'width:100%;' : ''}">
        <button type="button" class="cdo-qty-btn decrement-btn" style="border-radius:6px 0 0 6px;">-</button>
        <input type="number" class="cdo-qty-value" value="0" readonly>
        <button type="button" class="cdo-qty-btn increment-btn" style="border-radius:0 6px 6px 0;">+</button>
      </div>`
          : ''
      }
      <button type="button" class="cdo-add-btn"
        ${requiresVariantSelection ? 'disabled aria-disabled="true"' : ''}
        style="flex:1;background:${addBtnBg};color:${addBtnColor};border:none;padding:${isMobile ? 10 : 8}px 12px;border-radius:${addBtnRadius}px;font-weight:${addBtnW};font-size:${addBtnSize}px;cursor:${requiresVariantSelection ? 'not-allowed' : 'pointer'};opacity:${requiresVariantSelection ? 0.55 : 1};min-height:40px;">
        ${addBtnText}
      </button>
    </div>
  </div>`;
}

/* ===================== PREVIEW BAR HTML ===================== */
function getPreviewBarHtml(cfg) {
  if (cfg.show_preview_bar === false) return '';
  const viewport =
    window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const max = parseInt(cfg.max_products) || 5;
  const shape =
    cfg.preview_item_shape === 'circle'
      ? '50%'
      : (cfg.preview_border_radius || 8) + 'px';
  const baseItemSize = cfg.preview_item_size || 56;
  const itemSize = isMobile
    ? Math.min(baseItemSize, 44)
    : isTablet
      ? Math.min(baseItemSize, 50)
      : baseItemSize;
  const borderColor = cfg.preview_item_border_color || 'rgba(0,0,0,0.2)';
  const padTop = cfg.preview_bar_padding_top ?? cfg.preview_bar_padding ?? 16;
  const padBot =
    cfg.preview_bar_padding_bottom ?? cfg.preview_bar_padding ?? 16;
  const padH = isMobile ? 12 : isTablet ? 14 : 16;
  const fullW = cfg.preview_bar_full_width !== false;
  const radius = cfg.preview_border_radius || 0;

  let slotsHtml = '';
  for (let i = 1; i <= max; i++) {
    slotsHtml += `<div id="cdo-slot-${i}" style="width:${itemSize}px;height:${itemSize}px;border:2px dashed ${borderColor};border-radius:${shape};display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,0.3);font-size:18px;flex-shrink:0;overflow:hidden;transition:all 0.3s;">+</div>`;
  }

  const motivHtml = `<div id="cdo-motiv" style="font-size:${cfg.preview_motivation_size || 13}px;color:${cfg.preview_motivation_color || cfg.preview_bar_text_color || '#666'};margin:0;display:none;"></div>`;

  const showCheckout = cfg.show_preview_checkout_btn !== false;
  const showATC = cfg.show_preview_add_to_cart_btn === true;
  const showReset = cfg.show_reset_btn !== false;

  const buttonBasis = isMobile
    ? 'flex:1 1 calc(50% - 4px);min-width:120px;'
    : isTablet
      ? 'flex:0 1 auto;'
      : '';
  const checkoutBtnStyle = `background:${cfg.preview_checkout_btn_bg || cfg.checkout_btn_bg || '#000'};color:${cfg.preview_checkout_btn_text_color || cfg.checkout_btn_text_color || '#fff'};border:none;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;
  const atcBtnStyle = `background:${cfg.preview_add_to_cart_btn_bg || '#fff'};color:${cfg.preview_add_to_cart_btn_text_color || '#000'};border:1px solid #e0e0e0;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;
  const resetBtnStyle = `background:${cfg.preview_reset_btn_bg || '#ff4d4d'};color:${cfg.preview_reset_btn_text_color || '#fff'};border:none;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;

  const rowStyle = isMobile
    ? 'display:flex;align-items:stretch;justify-content:space-between;gap:12px;flex-direction:column;'
    : isTablet
      ? 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;'
      : 'display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap;';
  const rightColStyle = isMobile
    ? 'display:flex;align-items:center;gap:10px;margin-left:0;flex-wrap:wrap;width:100%;flex-direction:column;'
    : isTablet
      ? 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-left:0;flex-wrap:wrap;width:100%;'
      : 'display:flex;align-items:center;gap:12px;margin-left:auto;flex-wrap:nowrap;';
  const priceStyle = isMobile
    ? 'display:flex;flex-direction:column;align-items:center;line-height:1.3;width:100%;'
    : isTablet
      ? 'display:flex;flex-direction:column;align-items:flex-start;line-height:1.3;'
      : 'display:flex;flex-direction:column;align-items:flex-end;line-height:1.3;';
  const buttonsStyle = isMobile
    ? 'display:flex;gap:8px;flex-wrap:wrap;width:100%;justify-content:stretch;'
    : isTablet
      ? 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;'
      : 'display:flex;gap:8px;flex-wrap:nowrap;';

  const checkoutBtnHtml = showCheckout
    ? `
    <button id="cdo-checkout-btn" type="button" style="${checkoutBtnStyle};position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:44px;height:44px;">
      <span class="cdo-checkout-btn-text" style="display:block;transition:opacity 0.2s;z-index:1;width:100%;text-align:center;">${cfg.preview_checkout_btn_text || cfg.checkout_btn_text || 'Checkout'}</span>
      <span class="cdo-spinner" id="cdo-checkout-spinner" style="display:none;position:absolute;inset:0;margin:auto;width:24px;height:24px;border-width:3px;background:transparent;z-index:2;"></span>
    </button>`
    : '';

  const atcBtnHtml = showATC
    ? `
    <button id="cdo-preview-atc-btn" type="button" style="${atcBtnStyle}">
      ${cfg.preview_add_to_cart_btn_text || 'Add to Cart'}
    </button>`
    : '';

  const resetBtnHtml = showReset
    ? `
    <button id="cdo-reset-btn" type="button" style="${resetBtnStyle}">
      ${cfg.preview_reset_btn_text || 'Reset'}
    </button>`
    : '';

  const titleHtml = cfg.preview_bar_title
    ? `
    <div style="font-size:${cfg.preview_bar_title_size || 14}px;font-weight:700;color:${cfg.preview_bar_title_color || cfg.preview_bar_text_color || '#000'};margin-bottom:8px;">
      ${cfg.preview_bar_title}
    </div>`
    : '';

  return `
<div id="cdo-preview-bar" style="
  position:fixed; bottom:0; left:0; width:100%; z-index:999;
  background:${cfg.preview_bar_bg || '#fff'};
  border-top:1px solid rgba(0,0,0,0.08);
  box-shadow:0 -4px 20px rgba(0,0,0,0.1);
  padding:${padTop}px ${padH}px calc(${padBot}px + env(safe-area-inset-bottom, 0px));
  box-sizing:border-box;
">
  <div style="max-width:${fullW ? 'none' : (cfg.container_width || 1200) + 'px'};margin:0 auto;color:${cfg.preview_bar_text_color || '#222'};">
    ${titleHtml}
    <div style="${rowStyle}">
      <div id="cdo-slots" style="display:flex;gap:10px;align-items:center;overflow-x:auto;scrollbar-width:none;${isMobile ? 'width:100%;padding-bottom:2px;' : ''}${isTablet ? 'max-width:55%;' : 'flex-shrink:0;'}">
        ${slotsHtml}
      </div>
      <div style="${rightColStyle}">
        ${motivHtml}
        <div style="${priceStyle}">
          <span id="cdo-original-total" style="font-size:${cfg.original_price_size || 13}px;color:${cfg.preview_original_price_color || '#999'};text-decoration:line-through;display:none;"></span>
          <span id="cdo-discounted-total" style="font-size:${cfg.discounted_price_size || 18}px;font-weight:800;color:${cfg.preview_discount_price_color || '#000'};">Rs.0.00</span>
        </div>
        <div style="${buttonsStyle}">
          ${resetBtnHtml}
          ${atcBtnHtml}
          ${checkoutBtnHtml}
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/* ===================== BANNER HTML (static â€” layout1/2/4) ===================== */
function getBannerHtml(cfg) {
  if (cfg.show_banner === false) return '';
  const desktopUrl = cfg.banner_image_url || '';
  if (!desktopUrl) return '';
  const isMobile = window.innerWidth < 768;
  const mobileUrl = cfg.banner_image_mobile_url || desktopUrl;
  const src = isMobile ? mobileUrl : desktopUrl;
  const fit =
    cfg.banner_fit_mode === 'adapt'
      ? 'contain'
      : cfg.banner_fit_mode || 'cover';
  const h =
    cfg.banner_fit_mode === 'adapt'
      ? 'auto'
      : (isMobile
          ? cfg.banner_height_mobile || 120
          : cfg.banner_height_desktop || 180) + 'px';
  const wPct = isMobile
    ? cfg.banner_width_mobile || 100
    : cfg.banner_width_desktop || 100;
  const full = cfg.banner_full_width === true;
  return `<div style="width:${full ? '100%' : wPct + '%'};margin:0 auto;overflow:hidden;">
    <img src="${src}" style="width:100%;height:${h};object-fit:${fit};display:block;" loading="lazy">
  </div>`;
}

function initBannerSlider(cfg) {
  const slider = document.getElementById('cdo-banner-slider');
  if (!slider) return;
  const track = document.getElementById('cdo-slider-track');
  const dots = slider.querySelectorAll('.cdo-slider-dot');
  const count = track ? track.children.length : 0;
  if (count < 2) return;
  let cur = 0;
  const go = (idx) => {
    cur = (idx + count) % count;
    if (track) track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  };
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  const speed = (cfg.slider_speed || 5) * 1000;
  setInterval(() => go(cur + 1), speed);
}

/* ===================== TITLE + DESCRIPTION HTML ===================== */
function getTitleHtml(cfg) {
  if (cfg.show_title_description === false) return '';
  const w = cfg.title_width || 100;
  const tpad = `${cfg.title_container_padding_top || 0}px ${cfg.title_container_padding_right || 0}px ${cfg.title_container_padding_bottom || 0}px ${cfg.title_container_padding_left || 0}px`;
  const tmar = `${cfg.title_container_margin_top || 0}px ${cfg.title_container_margin_right || 0}px ${cfg.title_container_margin_bottom || 0}px ${cfg.title_container_margin_left || 0}px`;
  const dpad = `${cfg.description_container_padding_top || 0}px ${cfg.description_container_padding_right || 0}px ${cfg.description_container_padding_bottom || 0}px ${cfg.description_container_padding_left || 0}px`;
  const dmar = `${cfg.description_container_margin_top || 0}px ${cfg.description_container_margin_right || 0}px ${cfg.description_container_margin_bottom || 0}px ${cfg.description_container_margin_left || 0}px`;
  return `
  <div style="width:${w}%;box-sizing:border-box;">
    <div style="padding:${tpad};margin:${tmar};text-align:${cfg.heading_align || 'left'};">
      <h1 style="font-size:${cfg.heading_size || 28}px;font-weight:${cfg.heading_font_weight || 700};color:${cfg.heading_color || '#333'};margin:0;">${cfg.collection_title || 'Create Your Combo'}</h1>
    </div>
    ${
      cfg.collection_description
        ? `<div style="padding:${dpad};margin:${dmar};text-align:${cfg.description_align || 'left'};">
      <p style="font-size:${cfg.description_size || 15}px;font-weight:${cfg.description_font_weight || 400};color:${cfg.description_color || '#666'};line-height:1.5;margin:0;">${cfg.collection_description}</p>
    </div>`
        : ''
    }
  </div>`;
}

/* ===================== PROGRESS BAR HTML ===================== */
function getProgressHtml(cfg) {
  if (!cfg.show_progress_bar) return '';
  const viewport =
    window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const w = cfg.progress_bar_width || 100;
  const pad = isMobile ? '12px 12px' : isTablet ? '14px 16px' : '16px 20px';
  const labelSize = isMobile ? 10 : 11;
  const unlockSize = isMobile ? 12 : 13;
  return `
  <div style="background:${cfg.progress_container_bg || '#fff'};padding:${pad};border-bottom:1px solid #eee;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
    <div style="max-width:${w}%;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:${labelSize}px;font-weight:800;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;gap:8px;flex-wrap:wrap;">
        <span style="color:${cfg.progress_text_color || cfg.progress_bar_color || '#000'};">${cfg.progress_text || 'Bundle Progress'}</span>
        <span id="cdo-progress-text" style="color:${cfg.progress_text_color || '#5c5f62'};">0%</span>
      </div>
       <div id="cdo-progress-track" style="--cdo-progress-color:${cfg.progress_bar_color || '#1a6644'};position:relative;overflow:hidden;border-radius:10px;background:#e0e0e0;height:10px;width:100%;">
    <div id="cdo-progress-bar" style="position:absolute;top:0;left:0;height:100%;width:100%;transform-origin:left center;transform:scaleX(0);transition:transform 0.55s cubic-bezier(0.4,0,0.2,1), background-color 0.35s ease;background:var(--cdo-progress-color, #1a6644);">
      <div id="cdo-progress-bar-fill" style="position:absolute;inset:0;background:var(--cdo-progress-color, #1a6644);border-radius:10px;transition:background-color 0.35s ease;"></div>
    </div>
  </div>
      <div id="cdo-unlock-msg" style="margin-top:${isMobile ? 8 : 10}px;font-size:${unlockSize}px;color:#6d7175;"></div>
    </div>
  </div>`;
}

/* ===================== LAYOUT 1 â€” Multi-Step ===================== */
function renderLayout1(cfg, products, root) {
  const visibleProducts = filterProductsByStock(products, cfg);
  const isMobile = window.innerWidth < 768;
  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = cfg.products_gap || 16;

  // Group by step
  const stepMap = {};
  visibleProducts.forEach((p) => {
    const s = p.step || 1;
    if (!stepMap[s]) stepMap[s] = [];
    stepMap[s].push(p);
  });
  const steps = Object.keys(stepMap)
    .map(Number)
    .sort((a, b) => a - b);
  if (!steps.length) {
    stepMap[1] = visibleProducts;
    steps.push(1);
  }

  const stepsHtml = steps
    .map((step) => {
      const sp = stepMap[step];
      const stepTitle = cfg[`step_${step}_title`] || `Category ${step}`;
      const stepSubtitle = cfg[`step_${step}_subtitle`] || '';
      const stepLimit =
        sp[0]?.step_limit || parseInt(cfg[`step_${step}_limit`]) || null;
      return `
    <div class="cdo-step" data-step="${step}" style="margin-bottom:36px;">
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="font-size:17px;font-weight:700;margin:0;color:${cfg.heading_color || '#333'};">${stepTitle}</h3>
          <span class="cdo-step-check" data-step="${step}" style="color:${cfg.progress_success_color || '#008060'};font-weight:bold;display:none;">&#10003;</span>
        </div>
        <p style="font-size:13px;color:#888;margin:4px 0 0;">${stepSubtitle}${stepLimit ? ` (Choose up to ${stepLimit})` : ''}</p>
      </div>
      <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}" ${cfg.grid_layout_type === 'slider' ? `data-show-nav-arrows="${cfg.show_nav_arrows !== false}"` : ''}>
        ${cfg.grid_layout_type === 'slider' ? getSliderNavButtonsHtml(cfg) : ''}
        <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? '' : `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}">
          ${sp.map((p) => renderProductCard(cfg, p)).join('')}
        </div>
      </div>
    </div>`;
    })
    .join('');

  const padTop = isMobile
    ? cfg.container_padding_top_mobile || 16
    : cfg.container_padding_top_desktop || 24;
  const padR = isMobile
    ? cfg.container_padding_right_mobile || 12
    : cfg.container_padding_right_desktop || 24;
  const padBot = isMobile
    ? cfg.container_padding_bottom_mobile || 80
    : cfg.container_padding_bottom_desktop || 80;
  const padL = isMobile
    ? cfg.container_padding_left_mobile || 12
    : cfg.container_padding_left_desktop || 24;

  root.innerHTML = `
  <div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};position:relative;">
    ${getProgressHtml(cfg)}
    ${getBannerHtml(cfg)}
    <div style="padding:${padTop}px ${padR}px 0 ${padL}px;">${getTitleHtml(cfg)}</div>
    <div style="padding:0 ${padR}px ${padBot}px ${padL}px;margin-top:20px;">${stepsHtml}</div>
    ${getPreviewBarHtml(cfg)}
    ${getPreviewModalHtml()}
  </div>
  <!-- Variant Popup -->
  <div id="cdo-variant-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:flex-end;justify-content:center;">
    <div id="cdo-variant-popup" style="background:#fff;width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:24px;box-sizing:border-box;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 id="cdo-variant-title" style="margin:0;font-size:16px;font-weight:700;"></h3>
        <button id="cdo-variant-close" style="background:none;border:none;font-size:24px;cursor:pointer;">Ã—</button>
      </div>
      <div id="cdo-variant-options" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;"></div>
      <button id="cdo-variant-add" style="width:100%;background:${cfg.product_add_btn_color || cfg.add_btn_bg || '#000'};color:${cfg.product_add_btn_text_color || cfg.add_btn_text_color || '#fff'};border:none;padding:14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:16px;">Add to Bundle</button>
    </div>
  </div>`;

  bindLayout1Logic(cfg, visibleProducts);
  bindPreviewEvents(cfg);
}

function bindLayout1Logic(cfg, products) {
  const selected = {};
  const maxTotal = parseInt(cfg.max_products) || 5;
  const discountPc = window.__cdoDiscountCode ? (parseFloat(cfg.discount_percentage) || 0) : 0;
  const limitMsg = (
    cfg.limit_reached_message ||
    'Limit reached! You can only select __LIMIT__ items.'
  ).replace(/\{\{limit\}\}|__LIMIT__/g, maxTotal);
  const hl = cfg.selection_highlight_color || cfg.primary_color || '#000';
  const rootUrl = window.Shopify?.routes?.root || '/';

  function getTotalQty() {
    return Object.values(selected).reduce((s, i) => s + i.qty, 0);
  }
  function getStepQty(step) {
    return Object.values(selected)
      .filter((i) => String(i.step) === String(step))
      .reduce((s, i) => s + i.qty, 0);
  }

  function toSafeNumber(val, fallback = 0) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeVariantId(gidOrId) {
    return String(gidOrId || '')
      .replace('gid://shopify/ProductVariant/', '')
      .trim();
  }

  function normalizeProductId(gidOrId) {
    return String(gidOrId || '')
      .replace('gid://shopify/Product/', '')
      .trim();
  }

  function getProductByCardId(cardId) {
    return (
      products.find((p) => {
        const pId = normalizeProductId(p.id);
        if (pId === cardId) return true;
        return (p.variants || []).some(
          (v) => normalizeVariantId(v.id) === cardId
        );
      }) || null
    );
  }

  function buildValidLineItems() {
    const grouped = {};
    Object.values(selected).forEach((i) => {
      let variantId = String(i.id || '').trim();
      const cardId = String(i.cardId || '').trim();
      const qty = parseInt(i.qty, 10) || 0;

      // Always resolve to a variant ID, never a product ID
      if (!/^[0-9]+$/.test(variantId)) {
        const product = getProductByCardId(cardId);
        if (
          product &&
          Array.isArray(product.variants) &&
          product.variants.length > 0
        ) {
          // Use the first variant's ID as fallback
          variantId = normalizeVariantId(product.variants[0].id);
        } else {
          // If no variant found, skip this item
          return;
        }
      }

      if (!/^[0-9]+$/.test(variantId) || qty <= 0) return;
      grouped[variantId] = (grouped[variantId] || 0) + qty;
    });
    return Object.keys(grouped).map((variantId) => ({
      id: variantId,
      quantity: grouped[variantId],
    }));
  }

  function updateTotals() {
    const items = Object.values(selected);
    const totalQty = getTotalQty();
    const total = items.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
    let disc = total;

    const origEl = document.getElementById('cdo-original-total');
    const discEl = document.getElementById('cdo-discounted-total');
    const motivEl = document.getElementById('cdo-motiv');

    const discValueType = cfg._discount_value_type || 'percentage';
    const discFixed = window.__cdoDiscountCode ? (parseFloat(cfg._discount_fixed_value) || 0) : 0;
    const hasDiscount =
      !!window.__cdoDiscountCode && (discValueType === 'fixed' ? discFixed > 0 : discountPc > 0);

    if (totalQty >= maxTotal && hasDiscount) {
      disc =
        discValueType === 'fixed'
          ? Math.max(0, total - discFixed)
          : total * (1 - discountPc / 100);
      if (origEl) {
        origEl.style.display = 'inline';
        origEl.textContent = formatMoney(total * 100);
      }
      if (motivEl) {
        motivEl.style.display = 'block';
        motivEl.textContent =
          cfg.preview_motivation_unlocked_text ||
          cfg.discount_unlocked_text ||
          'Discount Unlocked!';
      }
    } else {
      if (origEl) origEl.style.display = 'none';
      if (motivEl && totalQty < maxTotal) {
        const rem = maxTotal - totalQty;
        motivEl.style.display = totalQty > 0 ? 'block' : 'none';
        motivEl.textContent = (
          cfg.preview_motivation_text ||
          cfg.discount_motivation_text ||
          'Add __REMAINING__ more to unlock discount!'
        ).replace(/\{\{remaining\}\}|__REMAINING__/g, rem);
      }
    }
    if (discEl) discEl.textContent = formatMoney(disc * 100);

    // Progress bar
    const pct = Math.min(100, Math.round((totalQty / maxTotal) * 100));
    const progressColor = cfg.progress_bar_color || '#1a6644';
    const bar = document.getElementById('cdo-progress-bar');
    const ptxt = document.getElementById('cdo-progress-text');
    const umsg = document.getElementById('cdo-unlock-msg');
    const track = document.getElementById('cdo-progress-track');

    if (bar) {
      bar.style.transform = 'scaleX(' + pct / 100 + ')';
      bar.style.backgroundColor = progressColor;
      const fillEl = document.getElementById('cdo-progress-bar-fill');
      if (fillEl) fillEl.style.backgroundColor = progressColor;
    }
    if (track) {
      track.style.setProperty('--cdo-progress-color', progressColor);
      track.style.backgroundColor = '#e0e0e0';
    }
    if (ptxt) ptxt.textContent = pct + '%';
    if (umsg) {
      if (totalQty >= maxTotal) {
        umsg.innerHTML = `<span style="color:${cfg.progress_success_color || '#008060'};font-weight:700;">${cfg.discount_unlocked_text || 'Discount Unlocked!'}</span>`;
      } else {
        const rem = maxTotal - totalQty;
        umsg.textContent = (
          cfg.discount_motivation_text ||
          'Add __REMAINING__ more items to unlock the discount!'
        ).replace(/\{\{remaining\}\}|__REMAINING__/g, rem);
      }
    }

    // Step checkmarks
    document.querySelectorAll('.cdo-step-check').forEach((el) => {
      const step = el.dataset.step;
      const sp = products.filter((p) => String(p.step || 1) === String(step));
      const limit =
        sp[0]?.step_limit || parseInt(cfg[`step_${step}_limit`]) || null;
      el.style.display = limit && getStepQty(step) >= limit ? 'inline' : 'none';
    });

    // Preview slots
    const flat = [];
    Object.values(selected).forEach((item) => {
      for (let q = 0; q < item.qty; q++) flat.push(item);
    });
    for (let i = 1; i <= maxTotal; i++) {
      const slot = document.getElementById(`cdo-slot-${i}`);
      if (!slot) continue;
      const item = flat[i - 1];
      if (item) {
        slot.innerHTML = `<img class="cdo-preview-image preview-image" src="${item.image}" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;display:block;">`;
        slot.style.border = `2px solid ${hl}`;
      } else {
        slot.innerHTML = '+';
        slot.style.border = `2px dashed rgba(0,0,0,0.2)`;
      }
    }
  }

  function updateCardVisuals(card, id) {
    const cardItems = Object.values(selected).filter(
      (i) => i.cardId === id || i.id === id
    );
    const qty = cardItems.reduce((s, i) => s + i.qty, 0);
    const qtyEl = card.querySelector('.cdo-qty-value');
    if (qtyEl) qtyEl.value = qty;
    card.style.border =
      qty > 0
        ? `2px solid ${hl}`
        : `2px solid ${cfg.preview_item_border_color || '#f0f0f0'}`;
    const addBtn = card.querySelector('.cdo-add-btn');
    if (addBtn)
      addBtn.textContent =
        qty > 0
          ? cfg.product_add_btn_text || 'Added'
          : cfg.product_add_btn_text || cfg.add_btn_text || 'Add';

    const product = getProductByCardId(id);
    const displayMode = cfg.product_card_variants_display || 'popup';
    const requiresSelection =
      product && (product.variants || []).length > 1 && displayMode !== 'popup';
    if (requiresSelection) {
      const pickedVariant = getSelectedVariantFromCard(card, 0, '');
      setCardAddEnabled(card, qty > 0 || !!pickedVariant);
    }

    const tick = card.querySelector('.cdo-tick');
    if (tick) tick.classList.toggle('visible', qty > 0);
    updateTotals();
  }

  function getSelectedVariantFromCard(card, fallbackPrice, fallbackImage) {
    const selectEl = card.querySelector('.cdo-variant-select');
    if (selectEl && String(selectEl.value || '').trim()) {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      return {
        id: String(selectEl.value).trim(),
        price: toSafeNumber(selectedOption?.dataset?.price, fallbackPrice),
        image: selectedOption?.dataset?.image || fallbackImage,
      };
    }

    const activeSwatch = card.querySelector('.cdo-variant-swatch.active');
    if (activeSwatch) {
      return {
        id: String(activeSwatch.dataset.variantId || '').trim(),
        price: toSafeNumber(activeSwatch.dataset.price, fallbackPrice),
        image: activeSwatch.dataset.image || fallbackImage,
      };
    }

    return null;
  }

  function setCardAddEnabled(card, enabled) {
    const addBtn = card.querySelector('.cdo-add-btn');
    if (!addBtn) return;
    addBtn.disabled = !enabled;
    addBtn.style.opacity = enabled ? '1' : '0.55';
    addBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  // Variant popup
  let pendingCard = null;
  const overlay = document.getElementById('cdo-variant-overlay');
  const varTitle = document.getElementById('cdo-variant-title');
  const varOptions = document.getElementById('cdo-variant-options');
  const varAddBtn = document.getElementById('cdo-variant-add');
  const varClose = document.getElementById('cdo-variant-close');

  function openVariantPopup(card, product) {
    pendingCard = card;
    if (varTitle) varTitle.textContent = product.title;
    if (varOptions) {
      varOptions.innerHTML = '';
      (product.variants || []).forEach((v) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = v.title === 'Default Title' ? product.title : v.title;
        btn.dataset.variantId = (v.id || '').replace(
          'gid://shopify/ProductVariant/',
          ''
        );
        btn.dataset.price = v.price;
        btn.dataset.image = v.image || product.image;
        btn.style.cssText = `padding:8px 16px;border:2px solid #e0e0e0;border-radius:6px;cursor:pointer;font-weight:600;background:#fff;`;
        btn.addEventListener('click', () => {
          varOptions.querySelectorAll('button').forEach((b) => {
            b.style.borderColor = '#e0e0e0';
            b.style.background = '#fff';
          });
          btn.style.borderColor = hl;
          btn.style.background = '#f5f5f5';
          if (varAddBtn) {
            varAddBtn.dataset.variantId = btn.dataset.variantId;
            varAddBtn.dataset.price = btn.dataset.price;
            varAddBtn.dataset.image = btn.dataset.image;
          }
        });
        varOptions.appendChild(btn);
      });
      const first = varOptions.querySelector('button');
      if (first) first.click();
    }
    if (overlay) overlay.style.display = 'flex';
  }

  if (varClose)
    varClose.addEventListener('click', () => {
      if (overlay) overlay.style.display = 'none';
      pendingCard = null;
    });
  if (overlay)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        pendingCard = null;
      }
    });

  if (varAddBtn) {
    varAddBtn.addEventListener('click', () => {
      const card = pendingCard || window.__cdoPendingCard;
      if (!card) return;
      const variantId = varAddBtn.dataset.variantId;
      const price = parseFloat(varAddBtn.dataset.price);
      const image = varAddBtn.dataset.image;
      const id = card.dataset.id;
      const step = card.dataset.step || '1';
      const stepLimit = parseInt(card.dataset.steplimit) || null;
      if (getTotalQty() >= maxTotal) {
        showToast(limitMsg);
        return;
      }
      if (stepLimit && getStepQty(step) >= stepLimit) {
        showToast(`Max ${stepLimit} item(s) from this category.`);
        return;
      }
      const key = variantId || id;
      if (!selected[key])
        selected[key] = {
          id: variantId || id,
          price,
          image,
          qty: 1,
          step,
          cardId: id,
        };
      else selected[key].qty++;
      updateCardVisuals(card, id);
      if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
      if (overlay) overlay.style.display = 'none';
      pendingCard = null;
      window.__cdoPendingCard = null;
    });
  }

  // Card events
  document.querySelectorAll('.cdo-card').forEach((card) => {
    const id = card.dataset.id;
    const price = toSafeNumber(card.dataset.price);
    const image = card.dataset.image;
    const step = card.dataset.step || '1';
    const stepLimit = parseInt(card.dataset.steplimit) || null;
    const product = getProductByCardId(id);
    const hasVariants = product && (product.variants || []).length > 1;

    const onInc = (overrideVariant) => {
      if (card.dataset.soldout === '1') {
        showToast('This product is sold out.');
        return;
      }
      if (getTotalQty() >= maxTotal) {
        showToast(limitMsg);
        return;
      }
      if (stepLimit && getStepQty(step) >= stepLimit) {
        showToast(`Max ${stepLimit} item(s) from this category.`);
        return;
      }
      const displayMode = cfg.product_card_variants_display || 'popup';

      // If hover display, we handle variants by potentially passing an overrideVariant
      if (overrideVariant) {
        let key = String(overrideVariant.id || '').trim();
        const vPrice = toSafeNumber(overrideVariant.price, price);
        const vImage = overrideVariant.image || image;
        if (!/^\d+$/.test(key)) {
          showToast('Please select a valid variant.');
          return;
        }
        if (!selected[key])
          selected[key] = {
            id: key,
            price: vPrice,
            image: vImage,
            qty: 1,
            step,
            cardId: id,
          };
        else selected[key].qty++;
        updateCardVisuals(card, id);
        if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
        return;
      }

      const vList = (product && product.variants) || [];
      const hasVariants = vList.length > 1;

      if (
        hasVariants &&
        displayMode === 'popup' &&
        document.getElementById('cdo-variant-overlay')
      ) {
        openVariantPopup(card, product);
        return;
      }

      if (hasVariants) {
        const pickedVariant = getSelectedVariantFromCard(card, price, image);
        if (!pickedVariant || !/^\d+$/.test(String(pickedVariant.id || ''))) {
          showToast('Please select a variant before adding to cart.');
          return;
        }
        let variantId = String(pickedVariant.id).trim();
        let variantPrice = toSafeNumber(pickedVariant.price, price);
        let variantImage = pickedVariant.image || image;
        if (!selected[variantId])
          selected[variantId] = {
            id: variantId,
            price: variantPrice,
            image: variantImage,
            qty: 1,
            step,
            cardId: id,
          };
        else selected[variantId].qty++;
        updateCardVisuals(card, id);
        if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
        return;
      }

      // No variants or only one variant
      let variantId = id;
      let variantPrice = price;
      let variantImage = image;
      if (!selected[variantId])
        selected[variantId] = {
          id: variantId,
          price: variantPrice,
          image: variantImage,
          qty: 1,
          step,
          cardId: id,
        };
      else selected[variantId].qty++;
      updateCardVisuals(card, id);
      if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
    };
    const onDec = () => {
      // Find by product id directly, or by cardId (for variant selections)
      const pickedVariant = getSelectedVariantFromCard(card, price, image);
      const pickedVariantId = String(pickedVariant?.id || '').trim();
      const key = selected[pickedVariantId]
        ? pickedVariantId
        : selected[id]
          ? id
          : Object.keys(selected).find((k) => selected[k].cardId === id);
      if (key) {
        selected[key].qty--;
        if (selected[key].qty <= 0) delete selected[key];
        updateCardVisuals(card, id);
      }
    };

    const incBtn = card.querySelector('.increment-btn');
    const decBtn = card.querySelector('.decrement-btn');
    const addBtn = card.querySelector('.cdo-add-btn');

    if (incBtn) incBtn.addEventListener('click', onInc);
    if (decBtn) decBtn.addEventListener('click', onDec);
    if (addBtn)
      addBtn.addEventListener('click', () => {
        const displayMode = cfg.product_card_variants_display || 'popup';
        if (hasVariants && displayMode !== 'popup') {
          const pickedVariant = getSelectedVariantFromCard(card, price, image);
          if (!pickedVariant || !/^\d+$/.test(String(pickedVariant.id || ''))) {
            showToast('Please select a variant before adding to cart.');
            return;
          }
        }
        onInc();
      });

    // Swatch events
    card.querySelectorAll('.cdo-variant-swatch').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        const vPrice = parseFloat(swatch.dataset.price);
        const vImg = swatch.dataset.image;

        // Visual feedback for swatch
        card
          .querySelectorAll('.cdo-variant-swatch')
          .forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');

        // Update card image and price
        const mainImg = card.querySelector('img');
        if (mainImg) mainImg.src = vImg;
        const priceDiv = card.querySelector('.cdo-card-price');
        if (priceDiv) priceDiv.textContent = formatMoney(vPrice * 100);
        setCardAddEnabled(card, true);
      });
    });

    const variantSelect = card.querySelector('.cdo-variant-select');
    if (variantSelect) {
      variantSelect.addEventListener('change', () => {
        const option = variantSelect.options[variantSelect.selectedIndex];
        const hasVariant = String(variantSelect.value || '').trim().length > 0;
        const vPrice = toSafeNumber(option?.dataset?.price, price);
        const vImg = option?.dataset?.image || image;

        const mainImg = card.querySelector('img');
        if (mainImg && vImg) mainImg.src = vImg;
        const priceDiv = card.querySelector('.cdo-card-price');
        if (priceDiv && hasVariant)
          priceDiv.textContent = formatMoney(vPrice * 100);

        setCardAddEnabled(card, hasVariant);
      });
    }
  });

  // Reset
  const resetBtn = document.getElementById('cdo-reset-btn');
  if (resetBtn)
    resetBtn.addEventListener('click', () => {
      Object.keys(selected).forEach((k) => delete selected[k]);
      document
        .querySelectorAll('.cdo-card')
        .forEach((c) => updateCardVisuals(c, c.dataset.id));
    });

  // Checkout
  let checkoutInProgress = false;
  const checkoutBtn = document.getElementById('cdo-checkout-btn');
  if (checkoutBtn)
    checkoutBtn.addEventListener('click', () => {
      if (checkoutBtn.disabled || checkoutInProgress) return;
      checkoutInProgress = true;
      const spinner = document.getElementById('cdo-checkout-spinner');
      const btnText = checkoutBtn.querySelector('.cdo-checkout-btn-text');
      checkoutBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (btnText) btnText.style.opacity = '0';
      const items = buildValidLineItems();
      if (!items.length) {
        showToast('Please add at least one valid product.');
        checkoutBtn.disabled = false;
        checkoutInProgress = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
        return;
      }
      // --- TRACK CHECKOUT CLICK ---
      try {
        let userId = sessionStorage.getItem('cdo_uid');
        if (!userId) {
          userId = 'visitor-' + Math.random().toString(36).substr(2, 9);
          sessionStorage.setItem('cdo_uid', userId);
        }
        const payload = {
          template_name: window.comboTemplateName || 'combo_template',
          template_id: window.comboTemplateId || '123',
          shop_domain:
            window.Shopify && window.Shopify.shop
              ? window.Shopify.shop
              : 'unknown.myshopify.com',
          page_url: window.location.href,
          visitor_id: userId,
          action: 'checkout',
          type: 'checkout',
          discount_code: window.__cdoDiscountCode || null,
        };
        const checkoutItems = items.map((item) => `${item.id}:${item.quantity}`).join(',');
        const discountCode = window.__cdoDiscountCode || null;
        const templateNameParam = encodeURIComponent(window.comboTemplateName || 'combo');
        const checkoutUrl = rootUrl + 'cart/' + checkoutItems + '?checkout' +
          (discountCode ? '&discount=' + encodeURIComponent(discountCode) : '') +
          '&note_attributes[combo_source]=combo-builder' +
          '&note_attributes[combo_template]=' + templateNameParam;
        // Fire-and-forget tracking (do NOT await)
        fetch('https://darkblue-dotterel-303283.hostingersite.com/clicks.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function () {});
        // Redirect immediately — no awaiting
        window.location.assign(checkoutUrl);
      } catch (e) {
        // Never block checkout
        const checkoutItems = items.map((item) => `${item.id}:${item.quantity}`).join(',');
        const discountCode = window.__cdoDiscountCode || null;
        window.location.assign(
          rootUrl + 'cart/' + checkoutItems + '?checkout' +
          (discountCode ? '&discount=' + encodeURIComponent(discountCode) : '')
        );
      }
      // --- END TRACKING ---
    });

  const previewATC = document.getElementById('cdo-preview-atc-btn');
  if (previewATC)
    previewATC.addEventListener('click', async () => {
      const items = buildValidLineItems();
      if (!items.length) {
        showToast('Please add at least one valid product.');
        return;
      }
      await fetch(rootUrl + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      showToast('Added to cart!');
    });

  updateTotals();
}

/* ===================== LAYOUT 2 â€” Switching Tabs ===================== */

// Live-fetch products from Shopify storefront collection API
async function fetchStorefrontProducts(collectionHandle, signal) {
  const allProducts = [];
  const limit = 250;
  const maxPages = 40;

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(
      `/collections/${collectionHandle}/products.json?limit=${limit}&page=${page}`,
      { signal }
    );
    if (!res.ok) throw new Error(`Collection API error: ${res.status}`);

    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];
    if (!products.length) break;

    allProducts.push(...products);
    if (products.length < limit) break;
  }

  return allProducts.map((p) => ({
    id: `gid://shopify/Product/${p.id}`,
    title: p.title,
    handle: p.handle,
    price: p.variants?.[0]?.price || '0.00',
    image: p.images?.[0]?.src || '',
    available: p.available,
    inventory_quantity: (p.variants || []).reduce(
      (sum, v) => sum + (parseInt(v.inventory_quantity, 10) || 0),
      0
    ),
    collection_handle: collectionHandle,
    variants: (p.variants || []).map((v) => ({
      id: `gid://shopify/ProductVariant/${v.id}`,
      title: v.title,
      price: v.price,
      available: v.available,
      inventory_quantity: v.inventory_quantity,
      image: v.featured_image?.src || null,
      options: v.option_values || [],
    })),
  }));
}

function renderLayout2(cfg, products, root, template) {
  const visibleProducts = filterProductsByStock(products, cfg);
  const isMobile = window.innerWidth < 768;
  const padR = isMobile
    ? cfg.container_padding_right_mobile || 12
    : cfg.container_padding_right_desktop || 24;
  const padL = isMobile
    ? cfg.container_padding_left_mobile || 12
    : cfg.container_padding_left_desktop || 24;
  const padT = isMobile
    ? cfg.container_padding_top_mobile || 16
    : cfg.container_padding_top_desktop || 24;
  const padB = isMobile
    ? cfg.container_padding_bottom_mobile || 80
    : cfg.container_padding_bottom_desktop || 80;
  const tabsW = cfg.tabs_width || 100;
  const tabNavigationMode = cfg.tab_navigation_mode || 'scroll';
  const showTabArrows = tabNavigationMode === 'arrows';
  const tabMarginTop = Number.isFinite(parseFloat(cfg.tab_margin_top))
    ? parseFloat(cfg.tab_margin_top)
    : 0;
  const tabMarginBottom = Number.isFinite(parseFloat(cfg.tab_margin_bottom))
    ? parseFloat(cfg.tab_margin_bottom)
    : 24;

  // Build tabs from tab_count + col_N keys
  const tabCount = parseInt(cfg.tab_count) || 3;
  const tabs = [];
  for (let i = 1; i <= tabCount; i++) {
    if (cfg[`col_${i}`]) {
      const handle = cfg[`col_${i}`];
      const label =
        cfg[`col_${i}_label`] ||
        handle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      tabs.push({ handle, label });
    }
  }
  if (cfg.show_tab_all === true && tabs.length > 0)
    tabs.unshift({ handle: 'all', label: cfg.tab_all_label || 'All' });
  if (!tabs.length)
    tabs.push({ handle: 'all', label: cfg.tab_all_label || 'All' });

  const initialHandle = tabs[0].handle;

  const tabRadius = cfg.tab_border_radius || 30;
  const tabsHtml = tabs
    .map(
      (tab, i) => `
    <button
      type="button"
      class="cdo-tab"
      data-handle="${tab.handle}"
      id="cdo-tab-${tab.handle}"
      role="tab"
      aria-controls="cdo-products-panel"
      aria-selected="${i === 0 ? 'true' : 'false'}"
      tabindex="${i === 0 ? '0' : '-1'}"
      style="padding:${cfg.tab_padding_vertical || 10}px ${cfg.tab_padding_horizontal || 20}px;cursor:pointer;border-radius:${tabRadius}px;font-weight:600;font-size:${cfg.tab_font_size || 14}px;transition:all 0.2s;user-select:none;background:${i === 0 ? cfg.tab_active_bg_color || '#000' : cfg.tab_bg_color || '#eee'};color:${i === 0 ? cfg.tab_active_text_color || '#fff' : cfg.tab_text_color || '#333'};"
    >
      ${tab.label}
    </button>`
    )
    .join('');

  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = cfg.products_gap || 20;
  const gridW = cfg.grid_width || 100;

  root.innerHTML = `
  <div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};">
    ${getProgressHtml(cfg)}
    ${cfg.header_title ? `<div style="padding:16px ${padR}px;background:${cfg.bg_color || '#fff'};border-bottom:1px solid #eee;"><span style="font-size:18px;font-weight:800;">${cfg.header_title}</span></div>` : ''}
    ${getBannerHtml(cfg)}
    <div style="padding:${padT}px ${padR}px 0 ${padL}px;">
      ${getTitleHtml(cfg)}
      <div style="width:${tabsW}%;margin-top:${tabMarginTop}px;margin-bottom:${tabMarginBottom}px;">
        <div class="cdo-tabs-wrap cdo-tabs-mode-${tabNavigationMode}">
          ${showTabArrows ? '<button type="button" class="cdo-tabs-arrow prev" data-dir="prev" aria-label="Scroll tabs left">&larr;</button>' : ''}
          <div class="cdo-tabs-viewport" aria-label="Collection tabs" tabindex="0">
            <div class="cdo-tab-row" role="tablist" aria-orientation="horizontal" style="justify-content:${cfg.tab_alignment || 'left'};">${tabsHtml}</div>
          </div>
          ${showTabArrows ? '<button type="button" class="cdo-tabs-arrow next" data-dir="next" aria-label="Scroll tabs right">&rarr;</button>' : ''}
        </div>
      </div>
    </div>
    <div style="padding:0 ${padR}px ${padB}px ${padL}px;">
      <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''} cdo-products-region" id="cdo-products-panel" role="tabpanel" aria-labelledby="cdo-tab-${initialHandle}" ${cfg.grid_layout_type === 'slider' ? `data-show-nav-arrows="${cfg.show_nav_arrows !== false}"` : ''}>
        ${cfg.grid_layout_type === 'slider' ? getSliderNavButtonsHtml(cfg) : ''}
        <div id="cdo-products-grid" class="cdo-products-grid ${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? `width:${gridW}%;min-height:200px;` : `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;width:${gridW}%;min-height:200px;`}"></div>
      </div>
    </div>
    ${getPreviewBarHtml(cfg)}
    ${getPreviewModalHtml()}
  </div>`;

  const productsCache = new Map();
  let activeHandle = initialHandle;
  let pendingController = null;
  let requestSerial = 0;
  const rootName = cfg.collection_title || 'combo';
  const panel = root.querySelector('#cdo-products-panel');

  function getSkeletonHtml() {
    const skeletonCount = Math.max(cols, 3);
    let html = '<div class="cdo-products-skeleton">';
    for (let i = 0; i < skeletonCount; i++) {
      html +=
        '<div class="cdo-skeleton-card"><div class="cdo-skeleton-img"></div><div class="cdo-skeleton-line"></div><div class="cdo-skeleton-line short"></div></div>';
    }
    html += '</div>';
    return html;
  }

  function renderGridState(html) {
    const grid = document.getElementById('cdo-products-grid');
    if (!grid) return null;
    grid.innerHTML = html;
    return grid;
  }

  function setTabVisualState(nextHandle, shouldFocus) {
    const allTabs = Array.from(root.querySelectorAll('.cdo-tab'));
    allTabs.forEach((tab) => {
      const isActive = tab.dataset.handle === nextHandle;
      tab.style.background = isActive
        ? cfg.tab_active_bg_color || '#000'
        : cfg.tab_bg_color || '#eee';
      tab.style.color = isActive
        ? cfg.tab_active_text_color || '#fff'
        : cfg.tab_text_color || '#333';
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        if (shouldFocus) tab.focus();
        tab.scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest',
          block: 'nearest',
        });
      }
    });

    if (panel) {
      panel.setAttribute('aria-labelledby', `cdo-tab-${nextHandle}`);
    }
  }

  function readLocalCollection(handle) {
    if (handle === 'all') return visibleProducts;
    return visibleProducts.filter((p) => p.collection_handle === handle);
  }

  // Render tab: uses local product_list first, then storefront API, with abort + cache.
  async function renderTabProducts(handle) {
    const requestId = ++requestSerial;
    const grid = document.getElementById('cdo-products-grid');
    if (!grid) return;

    activeHandle = handle;
    setTabVisualState(handle, false);

    if (productsCache.has(handle)) {
      const cachedList = productsCache.get(handle) || [];
      grid.classList.remove('is-loading');
      grid.innerHTML = cachedList.length
        ? cachedList.map((p) => renderProductCard(cfg, p)).join('')
        : `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;font-size:14px;">No products found.</div>`;

      if (cachedList.length) bindStandardLogic({ cfg, products: cachedList });
      return;
    }

    if (pendingController) pendingController.abort();
    pendingController = new AbortController();
    grid.classList.add('is-loading');
    renderGridState(getSkeletonHtml());

    let list;
    try {
      list = readLocalCollection(handle);
      if (handle !== 'all' && !list.length) {
        list = await fetchStorefrontProducts(handle, pendingController.signal);
      }
      list = filterProductsByStock(list, cfg);
      productsCache.set(handle, list);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (requestId !== requestSerial || activeHandle !== handle) return;
      grid.classList.remove('is-loading');
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#b42318;font-size:14px;">Unable to load products. Please try again.</div>`;
      return;
    }

    if (requestId !== requestSerial || activeHandle !== handle) return;
    grid.classList.remove('is-loading');
    grid.innerHTML = list.length
      ? list.map((p) => renderProductCard(cfg, p)).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;font-size:14px;">No products found.</div>`;

    if (list.length) bindStandardLogic({ cfg, products: list });
    trackVisit(rootName + '__tab__' + handle);
  }

  const tabElements = Array.from(root.querySelectorAll('.cdo-tab'));
  const tabsViewportEl = root.querySelector('.cdo-tabs-viewport');
  root.querySelectorAll('.cdo-tabs-arrow').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!tabsViewportEl) return;
      const delta = btn.dataset.dir === 'prev' ? -220 : 220;
      tabsViewportEl.scrollBy({ left: delta, behavior: 'smooth' });
    });
  });

  tabElements.forEach((tab) => {
    tab.addEventListener('click', () => {
      const handle = tab.dataset.handle;
      if (!handle || handle === activeHandle) return;
      renderTabProducts(handle);
    });

    tab.addEventListener('keydown', (event) => {
      const key = event.key;
      if (
        !['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(key)
      )
        return;

      event.preventDefault();
      const currentIndex = tabElements.indexOf(tab);
      let targetIndex = currentIndex;

      if (key === 'ArrowRight')
        targetIndex = (currentIndex + 1) % tabElements.length;
      if (key === 'ArrowLeft')
        targetIndex =
          (currentIndex - 1 + tabElements.length) % tabElements.length;
      if (key === 'Home') targetIndex = 0;
      if (key === 'End') targetIndex = tabElements.length - 1;

      if (key === 'Enter' || key === ' ') {
        const selectedHandle = tab.dataset.handle;
        if (selectedHandle && selectedHandle !== activeHandle)
          renderTabProducts(selectedHandle);
        return;
      }

      const targetTab = tabElements[targetIndex];
      if (!targetTab) return;
      setTabVisualState(targetTab.dataset.handle, true);
    });
  });

  // Seed cache from embedded product list to prevent duplicate API calls.
  tabs.forEach((tab) => {
    const localList = filterProductsByStock(
      readLocalCollection(tab.handle),
      cfg
    );
    if (localList.length || tab.handle === 'all') {
      productsCache.set(tab.handle, localList);
    }
  });

  setTabVisualState(initialHandle, false);
  renderTabProducts(initialHandle);
}

/* ===================== LAYOUT 3 â€” FMCG / Instamart ===================== */
function renderLayout3(cfg, products, root, template) {
  const visibleProducts = filterProductsByStock(products, cfg);
  const isMobile = window.innerWidth < 768;
  const primary = cfg.primary_color || '#000';
  const padR = isMobile
    ? cfg.container_padding_right_mobile || 12
    : cfg.container_padding_right_desktop || 24;
  const padL = isMobile
    ? cfg.container_padding_left_mobile || 12
    : cfg.container_padding_left_desktop || 24;
  const padT = isMobile
    ? cfg.container_padding_top_mobile || 16
    : cfg.container_padding_top_desktop || 24;
  const padB = isMobile
    ? cfg.container_padding_bottom_mobile || 80
    : cfg.container_padding_bottom_desktop || 80;

  // Build categories
  const cats = [];
  for (let i = 1; i <= 4; i++) {
    if (cfg[`col_${i}`])
      cats.push({
        handle: cfg[`col_${i}`],
        title: cfg[`title_${i}`] || `Category ${i}`,
        limit: parseInt(cfg[`col_${i}_limit`]) || null,
      });
  }
  if (!cats.length) cats.push({ handle: 'all', title: 'All', limit: null });
  cats.unshift({ handle: 'all', title: cfg.page_title || 'All' });

  const catPillsHtml = cats
    .map(
      (c, i) => `
    <button class="cdo-cat-pill" data-handle="${c.handle}"
      style="padding:8px 20px;border-radius:30px;border:none;cursor:pointer;font-weight:700;font-size:14px;white-space:nowrap;transition:all 0.2s;
        background:${i === 0 ? primary : '#eee'};color:${i === 0 ? '#fff' : '#333'};">
      ${c.title}
    </button>`
    )
    .join('');

  const heroHtml = cfg.show_hero
    ? `
  <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
    ${cfg.hero_image_url ? `<img src="${cfg.hero_image_url}" style="width:${isMobile ? '100%' : '240px'};border-radius:10px;object-fit:cover;max-height:180px;" loading="lazy">` : ''}
    <div style="flex:1;min-width:200px;">
      <h2 style="font-size:${isMobile ? 20 : 28}px;font-weight:800;margin:0 0 6px;color:${cfg.text_color || '#111'};">${cfg.hero_title || 'Mega Bundle'}</h2>
      <p style="color:#666;margin:0 0 12px;font-size:15px;">${cfg.hero_subtitle || ''}</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <span style="font-size:26px;font-weight:800;color:${primary};">${cfg.hero_price || ''}</span>
        ${cfg.hero_compare_price ? `<span style="text-decoration:line-through;color:#999;font-size:16px;">${cfg.hero_compare_price}</span>` : ''}
      </div>
      ${
        cfg.timer_hours !== undefined
          ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px;">Deal ends in</div>
        <div class="cdo-timer" style="justify-content:flex-start;">
          <div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-h" style="color:${primary};">00</span><span class="cdo-timer-label">hrs</span></div>
          <span class="cdo-timer-sep" style="color:${primary};">:</span>
          <div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-m" style="color:${primary};">00</span><span class="cdo-timer-label">min</span></div>
          <span class="cdo-timer-sep" style="color:${primary};">:</span>
          <div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-s" style="color:${primary};">00</span><span class="cdo-timer-label">sec</span></div>
        </div>
      </div>`
          : ''
      }
    </div>
  </div>`
    : '';

  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = cfg.products_gap || 16;

  root.innerHTML = `
  <div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};box-sizing:border-box;">
    ${getProgressHtml(cfg)}
    <div style="padding:${padT}px ${padR}px ${padB}px ${padL}px;">
      ${getBannerHtml(cfg)}
      ${heroHtml}
      ${getTitleHtml(cfg)}
    <div style="display:flex;gap:10px;margin:16px 0;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;">${catPillsHtml}</div>
    <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}" ${cfg.grid_layout_type === 'slider' ? `data-show-nav-arrows="${cfg.show_nav_arrows !== false}"` : ''}>
      ${cfg.grid_layout_type === 'slider' ? getSliderNavButtonsHtml(cfg) : ''}
      <div id="cdo-products-grid" class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? '' : `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}"></div>
    </div>
    </div>
    ${getPreviewBarHtml(cfg)}
    ${getPreviewModalHtml()}
  </div>`;

  initBannerSlider(cfg);

  // Timer
  if (cfg.show_hero && cfg.timer_hours !== undefined) {
    let total =
      (parseInt(cfg.timer_hours) || 0) * 3600 +
      (parseInt(cfg.timer_minutes) || 0) * 60 +
      (parseInt(cfg.timer_seconds) || 0);
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      if (total <= 0) {
        if (cfg.auto_reset_timer) {
          total =
            (parseInt(cfg.timer_hours) || 0) * 3600 +
            (parseInt(cfg.timer_minutes) || 0) * 60 +
            (parseInt(cfg.timer_seconds) || 0);
        } else return;
      }
      total--;
      const h = Math.floor(total / 3600),
        m = Math.floor((total % 3600) / 60),
        s = total % 60;
      const hEl = document.getElementById('t-h'),
        mEl = document.getElementById('t-m'),
        sEl = document.getElementById('t-s');
      if (hEl) hEl.textContent = pad(h);
      if (mEl) mEl.textContent = pad(m);
      if (sEl) sEl.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  function renderCatProducts(handle) {
    const grid = document.getElementById('cdo-products-grid');
    if (!grid) return;
    const filtered =
      handle === 'all'
        ? visibleProducts
        : visibleProducts.filter((p) => p.collection_handle === handle);
    grid.innerHTML = filtered.map((p) => renderProductCard(cfg, p)).join('');
    bindStandardLogic({ cfg, products: filtered });
  }

  root.querySelectorAll('.cdo-cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.cdo-cat-pill').forEach((b) => {
        b.style.background = '#eee';
        b.style.color = '#333';
      });
      btn.style.background = primary;
      btn.style.color = '#fff';
      const pageSlug =
        (window.location.pathname.match(/\/pages\/([^/?#]+)/) || [])[1] ||
        'combo';
      trackVisit(
        (cfg.collection_title || pageSlug) + '__cat__' + btn.dataset.handle
      );
      renderCatProducts(btn.dataset.handle);
    });
  });

  renderCatProducts('all');
}

/* ===================== LAYOUT 4 / GENERIC GRID ===================== */
function renderLayoutGrid(cfg, products, root) {
  const visibleProducts = filterProductsByStock(products, cfg);
  const isMobile = window.innerWidth < 768;
  const padR = isMobile
    ? cfg.container_padding_right_mobile || 12
    : cfg.container_padding_right_desktop || 24;
  const padL = isMobile
    ? cfg.container_padding_left_mobile || 12
    : cfg.container_padding_left_desktop || 24;
  const padT = isMobile
    ? cfg.container_padding_top_mobile || 16
    : cfg.container_padding_top_desktop || 24;
  const padB = isMobile
    ? cfg.container_padding_bottom_mobile || 80
    : cfg.container_padding_bottom_desktop || 80;
  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = cfg.products_gap || 20;
  const gridW = cfg.grid_width || 100;

  root.innerHTML = `
  <div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};box-sizing:border-box;">
    ${getProgressHtml(cfg)}
    <div style="padding:${padT}px ${padR}px ${padB}px ${padL}px;">
      ${getBannerHtml(cfg)}
      ${getTitleHtml(cfg)}
    <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}" ${cfg.grid_layout_type === 'slider' ? `data-show-nav-arrows="${cfg.show_nav_arrows !== false}"` : ''}>
      ${cfg.grid_layout_type === 'slider' ? getSliderNavButtonsHtml(cfg) : ''}
      <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? `width:${gridW}%;margin-top:20px;` : `width:${gridW}%;margin-top:20px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}">
        ${visibleProducts.map((p) => renderProductCard(cfg, p)).join('')}
      </div>
    </div>
    </div>
    ${getPreviewBarHtml(cfg)}
    ${getPreviewModalHtml()}
  </div>`;

  bindStandardLogic({ cfg, products: visibleProducts });
}

/* ===================== SHARED LOGIC ===================== */
/*
 * GLOBAL PERSISTENT SELECTION STATE
 * This object persists across tab/collection switches.
 * `bindStandardLogic()` reads and writes to this instead of creating a local copy.
 */
if (!window.__cdoSelected) window.__cdoSelected = {};

function bindStandardLogic({ cfg, products }) {
  // Use the global persistent selection state â€” NOT a new local object.
  const selected = window.__cdoSelected;
  const maxSel = parseInt(cfg.max_products) || 5;
  const discountPc = window.__cdoDiscountCode ? (parseFloat(cfg.discount_percentage) || 0) : 0;
  const limitMsg = (cfg.limit_reached_message || 'Limit reached!').replace(
    /\{\{limit\}\}|__LIMIT__/g,
    maxSel
  );
  const hl = cfg.selection_highlight_color || cfg.primary_color || '#000';
  const rootUrl = window.Shopify?.routes?.root || '/';

  // Store a reference to ALL products we've ever seen, for cross-tab variant lookups.
  if (!window.__cdoAllProducts) window.__cdoAllProducts = [];
  products.forEach((p) => {
    const pId = String(p.id || '')
      .replace('gid://shopify/Product/', '')
      .trim();
    if (
      !window.__cdoAllProducts.some(
        (existing) =>
          String(existing.id || '')
            .replace('gid://shopify/Product/', '')
            .trim() === pId
      )
    ) {
      window.__cdoAllProducts.push(p);
    }
  });
  // allProducts is the merged list for variant lookups
  const allProducts = window.__cdoAllProducts;

  function toSafeNumber(val, fallback = 0) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function toSafeImage(val) {
    if (typeof val !== 'string') return '';
    const s = val.trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s;
  }

  function getCardSelectionQty(cardId) {
    return Object.values(selected)
      .filter((i) => i.cardId === cardId || i.id === cardId)
      .reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0);
  }

  function normalizeVariantId(gidOrId) {
    return String(gidOrId || '')
      .replace('gid://shopify/ProductVariant/', '')
      .trim();
  }

  function normalizeProductId(gidOrId) {
    return String(gidOrId || '')
      .replace('gid://shopify/Product/', '')
      .trim();
  }

  function getProductByCardId(cardId) {
    // Search across ALL products we've seen (not just current tab's products)
    return (
      allProducts.find((p) => {
        const pId = normalizeProductId(p.id);
        if (pId === cardId) return true;
        return (p.variants || []).some(
          (v) => normalizeVariantId(v.id) === cardId
        );
      }) || null
    );
  }

  function buildValidLineItems() {
    const grouped = {};
    Object.values(selected).forEach((i) => {
      let variantId = String(i.id || '').trim();
      const cardId = String(i.cardId || '').trim();
      const qty = parseInt(i.qty, 10) || 0;

      // Always resolve to a variant ID, never a product ID
      if (!/^[0-9]+$/.test(variantId)) {
        const product = getProductByCardId(cardId);
        if (
          product &&
          Array.isArray(product.variants) &&
          product.variants.length > 0
        ) {
          // Use the first variant's ID as fallback
          variantId = normalizeVariantId(product.variants[0].id);
        } else {
          // If no variant found, skip this item
          return;
        }
      }

      if (!/^[0-9]+$/.test(variantId) || qty <= 0) return;
      grouped[variantId] = (grouped[variantId] || 0) + qty;
    });
    return Object.keys(grouped).map((variantId) => ({
      id: variantId,
      quantity: grouped[variantId],
    }));
  }

  function updateAll() {
    const items = Object.values(selected);
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce(
      (s, i) => s + toSafeNumber(i.price) * (parseInt(i.qty, 10) || 0),
      0
    );
    let disc = total;

    const origEl = document.getElementById('cdo-original-total');
    const discEl = document.getElementById('cdo-discounted-total');
    const motivEl = document.getElementById('cdo-motiv');

    const discValueType = cfg._discount_value_type || 'percentage';
    const discFixed = window.__cdoDiscountCode ? (parseFloat(cfg._discount_fixed_value) || 0) : 0;
    const hasDiscount =
      !!window.__cdoDiscountCode && (discValueType === 'fixed' ? discFixed > 0 : discountPc > 0);

    if (totalQty >= maxSel && hasDiscount) {
      disc =
        discValueType === 'fixed'
          ? Math.max(0, total - discFixed)
          : total * (1 - discountPc / 100);
      if (origEl) {
        origEl.style.display = 'inline';
        origEl.textContent = formatMoney(total * 100);
      }
      if (motivEl) {
        motivEl.style.display = 'block';
        motivEl.textContent =
          cfg.preview_motivation_unlocked_text ||
          cfg.discount_unlocked_text ||
          'Discount Unlocked!';
      }
    } else {
      if (origEl) origEl.style.display = 'none';
      if (motivEl && totalQty > 0 && totalQty < maxSel) {
        const rem = maxSel - totalQty;
        motivEl.style.display = 'block';
        motivEl.textContent = (
          cfg.preview_motivation_text ||
          cfg.discount_motivation_text ||
          'Add __REMAINING__ more!'
        ).replace(/\{\{remaining\}\}|__REMAINING__/g, rem);
      } else if (motivEl && totalQty === 0) {
        motivEl.style.display = 'none';
      }
    }
    if (discEl) discEl.textContent = formatMoney(Math.round(disc * 100));

    // Progress bar
    const pct = Math.min(100, Math.round((totalQty / maxSel) * 100));
    const progressColor = cfg.progress_bar_color || '#1a6644';
    const bar = document.getElementById('cdo-progress-bar');
    const ptxt = document.getElementById('cdo-progress-text');
    const umsg = document.getElementById('cdo-unlock-msg');
    const track = document.getElementById('cdo-progress-track');

    if (bar) {
      bar.style.transform = 'scaleX(' + pct / 100 + ')';
      bar.style.backgroundColor = progressColor;
      const fillEl = document.getElementById('cdo-progress-bar-fill');
      if (fillEl) fillEl.style.backgroundColor = progressColor;
    }
    if (track) {
      track.style.setProperty('--cdo-progress-color', progressColor);
      track.style.backgroundColor = '#e0e0e0';
    }
    if (ptxt) ptxt.textContent = pct + '%';
    if (umsg) {
      if (totalQty >= maxSel) {
        umsg.innerHTML = `<span style="color:${cfg.progress_success_color || '#008060'};font-weight:700;">${cfg.discount_unlocked_text || 'Discount Unlocked!'}</span>`;
      } else {
        const rem = maxSel - totalQty;
        umsg.textContent = (
          cfg.discount_motivation_text ||
          'Add __REMAINING__ more items to unlock the discount!'
        ).replace(/\{\{remaining\}\}|__REMAINING__/g, rem);
      }
    }

    // Slots
    const flat = [];
    items.forEach((i) => {
      for (let q = 0; q < i.qty; q++) flat.push(i);
    });
    for (let i = 1; i <= maxSel; i++) {
      const slot = document.getElementById(`cdo-slot-${i}`);
      if (!slot) continue;
      const item = flat[i - 1];
      const img = item ? toSafeImage(item.image) : '';
      if (item && img) {
        slot.innerHTML = `<img class="cdo-preview-image preview-image" src="${img}" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;display:block;">`;
        slot.style.border = `2px solid ${hl}`;
      } else {
        slot.innerHTML = '+';
        slot.style.border = '2px dashed rgba(0,0,0,0.2)';
      }
    }
  }

  function getSelectedVariantFromCard(card, fallbackPrice, fallbackImage) {
    const selectEl = card.querySelector('.cdo-variant-select');
    if (selectEl && String(selectEl.value || '').trim()) {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      return {
        id: String(selectEl.value).trim(),
        price: toSafeNumber(selectedOption?.dataset?.price, fallbackPrice),
        image: toSafeImage(selectedOption?.dataset?.image) || fallbackImage,
      };
    }

    const activeSwatch = card.querySelector('.cdo-variant-swatch.active');
    if (activeSwatch && String(activeSwatch.dataset.variantId || '').trim()) {
      return {
        id: String(activeSwatch.dataset.variantId).trim(),
        price: toSafeNumber(activeSwatch.dataset.price, fallbackPrice),
        image: toSafeImage(activeSwatch.dataset.image) || fallbackImage,
      };
    }

    return null;
  }

  function setCardAddEnabled(card, enabled) {
    const addBtn = card.querySelector('.cdo-add-btn');
    if (!addBtn) return;
    addBtn.disabled = !enabled;
    addBtn.style.opacity = enabled ? '1' : '0.55';
    addBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  // Bind events to newly rendered product cards
  document.querySelectorAll('.cdo-card').forEach((card) => {
    const id = card.dataset.id;
    const price = toSafeNumber(card.dataset.price);
    const image = toSafeImage(card.dataset.image);
    const product = getProductByCardId(id);

    function updateCard() {
      const qty = getCardSelectionQty(id);
      const qtyEl = card.querySelector('.cdo-qty-value');
      if (qtyEl) qtyEl.value = qty;
      card.style.border =
        qty > 0
          ? `2px solid ${hl}`
          : `2px solid ${cfg.preview_item_border_color || '#f0f0f0'}`;
      const addBtn = card.querySelector('.cdo-add-btn');
      if (addBtn)
        addBtn.textContent =
          qty > 0
            ? cfg.product_add_btn_text || 'Added'
            : cfg.product_add_btn_text || cfg.add_btn_text || 'Add';

      const displayMode = cfg.product_card_variants_display || 'popup';
      const requiresSelection =
        product &&
        (product.variants || []).length > 1 &&
        displayMode !== 'popup';
      if (requiresSelection) {
        const pickedVariant = getSelectedVariantFromCard(card, price, image);
        setCardAddEnabled(card, qty > 0 || !!pickedVariant);
      }

      const tick = card.querySelector('.cdo-tick');
      if (tick) tick.classList.toggle('visible', qty > 0);
      updateAll();
    }

    const onInc = (overrideVariant) => {
      if (card.dataset.soldout === '1') {
        showToast('This product is sold out.');
        return;
      }
      const total = Object.values(selected).reduce((s, i) => s + i.qty, 0);
      if (total >= maxSel) {
        showToast(limitMsg);
        return;
      }

      const displayMode = cfg.product_card_variants_display || 'popup';

      if (overrideVariant) {
        let key = String(overrideVariant.id || '').trim();
        const vPrice = toSafeNumber(overrideVariant.price, price);
        const vImage = toSafeImage(overrideVariant.image) || image;
        if (!/^\d+$/.test(key)) {
          const fallbackVariant =
            product && (product.variants || []).length > 0
              ? normalizeVariantId(product.variants[0].id)
              : '';
          key = fallbackVariant;
        }
        if (!/^\d+$/.test(key)) {
          showToast('Please select a valid variant.');
          return;
        }
        if (!selected[key])
          selected[key] = {
            id: key,
            price: vPrice,
            image: vImage,
            qty: 1,
            cardId: id,
          };
        else selected[key].qty++;
        updateCard();
        if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
        return;
      }

      if (displayMode === 'popup') {
        if (product && (product.variants || []).length > 1) {
          if (document.getElementById('cdo-variant-overlay')) {
            openVariantPopupGlobal(card, product);
            return;
          }
        }
      }

      if (
        product &&
        (product.variants || []).length > 1 &&
        displayMode !== 'popup'
      ) {
        const pickedVariant = getSelectedVariantFromCard(card, price, image);
        if (!pickedVariant || !/^\d+$/.test(String(pickedVariant.id || ''))) {
          showToast('Please select a variant before adding to cart.');
          return;
        }
      }

      // Always store variant IDs in selected so checkout/cart permalink is valid.
      let variantId = id;
      let variantPrice = price;
      let variantImage = image;
      const pickedVariant = getSelectedVariantFromCard(card, price, image);
      if (pickedVariant && pickedVariant.id) {
        variantId = String(pickedVariant.id).trim();
        variantPrice = toSafeNumber(pickedVariant.price, price);
        variantImage = toSafeImage(pickedVariant.image) || image;
      } else if (product && (product.variants || []).length > 0) {
        const firstVariant = product.variants[0];
        variantId = normalizeVariantId(firstVariant.id) || variantId;
        variantPrice = toSafeNumber(firstVariant.price, price);
        variantImage = toSafeImage(firstVariant.image) || image;
      }

      if (!/^\d+$/.test(String(variantId || '').trim())) {
        showToast('Please select a valid variant.');
        return;
      }

      if (!selected[variantId])
        selected[variantId] = {
          id: variantId,
          price: variantPrice,
          image: variantImage,
          qty: 1,
          cardId: id,
        };
      else selected[variantId].qty++;
      updateCard();
      if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(id);
    };
    const onDec = () => {
      let key = null;
      const pickedVariant = getSelectedVariantFromCard(card, price, image);
      const pickedVariantId = String(pickedVariant?.id || '').trim();
      if (pickedVariantId && selected[pickedVariantId]) {
        key = pickedVariantId;
      } else if (selected[id]) {
        key = id;
      } else {
        if (!key)
          key = Object.keys(selected).find((k) => selected[k].cardId === id);
      }
      if (key) {
        selected[key].qty--;
        if (selected[key].qty <= 0) delete selected[key];
        updateCard();
      }
    };

    const incBtn = card.querySelector('.increment-btn');
    const decBtn = card.querySelector('.decrement-btn');
    const addBtn = card.querySelector('.cdo-add-btn');

    if (incBtn) incBtn.addEventListener('click', onInc);
    if (decBtn) decBtn.addEventListener('click', onDec);
    if (addBtn) addBtn.addEventListener('click', onInc);

    // Swatch events
    card.querySelectorAll('.cdo-variant-swatch').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        const vPrice = toSafeNumber(swatch.dataset.price, price);
        const vImg = toSafeImage(swatch.dataset.image) || image;

        card
          .querySelectorAll('.cdo-variant-swatch')
          .forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');

        const mainImg = card.querySelector('img');
        if (mainImg) mainImg.src = vImg;
        const priceDiv = card.querySelector('.cdo-card-price');
        if (priceDiv) priceDiv.textContent = formatMoney(vPrice * 100);
        setCardAddEnabled(card, true);
      });
    });

    const variantSelect = card.querySelector('.cdo-variant-select');
    if (variantSelect) {
      variantSelect.addEventListener('change', () => {
        const option = variantSelect.options[variantSelect.selectedIndex];
        const hasVariant = String(variantSelect.value || '').trim().length > 0;
        const vPrice = toSafeNumber(option?.dataset?.price, price);
        const vImg = toSafeImage(option?.dataset?.image) || image;

        const mainImg = card.querySelector('img');
        if (mainImg && vImg) mainImg.src = vImg;
        const priceDiv = card.querySelector('.cdo-card-price');
        if (priceDiv && hasVariant)
          priceDiv.textContent = formatMoney(vPrice * 100);

        setCardAddEnabled(card, hasVariant);
      });
    }

    // SYNC: Restore visual state from persistent selection for this card
    // This is critical â€” when returning to a previously visited tab, cards must
    // reflect selections made earlier.
    const existingQty = getCardSelectionQty(id);
    if (existingQty > 0) {
      const qtyEl = card.querySelector('.cdo-qty-value');
      if (qtyEl) qtyEl.value = existingQty;
      card.style.border = `2px solid ${hl}`;
      const addBtnSync = card.querySelector('.cdo-add-btn');
      if (addBtnSync)
        addBtnSync.textContent = cfg.product_add_btn_text || 'Added';
      const tick = card.querySelector('.cdo-tick');
      if (tick) tick.classList.add('visible');
    }
  });

  const popupAddBtn = document.getElementById('cdo-variant-add');
  if (popupAddBtn && !popupAddBtn.dataset.cdoStandardBound) {
    popupAddBtn.dataset.cdoStandardBound = '1';
    popupAddBtn.addEventListener('click', () => {
      const pendingCard = window.__cdoPendingCard;
      if (!pendingCard) return;

      const total = Object.values(selected).reduce((s, i) => s + i.qty, 0);
      if (total >= maxSel) {
        showToast(limitMsg);
        return;
      }

      const variantId = String(popupAddBtn.dataset.variantId || '').trim();
      const price = toSafeNumber(popupAddBtn.dataset.price);
      const image =
        toSafeImage(popupAddBtn.dataset.image) || pendingCard.dataset.image;
      const cardId = String(pendingCard.dataset.id || '').trim();

      if (!/^\d+$/.test(variantId)) {
        showToast('Please select a valid variant.');
        return;
      }

      if (!selected[variantId]) {
        selected[variantId] = {
          id: variantId,
          price,
          image,
          qty: 1,
          cardId,
        };
      } else {
        selected[variantId].qty++;
      }

      const qty = getCardSelectionQty(cardId);
      const qtyEl = pendingCard.querySelector('.cdo-qty-value');
      if (qtyEl) qtyEl.value = qty;
      pendingCard.style.border = `2px solid ${hl}`;
      const addBtn = pendingCard.querySelector('.cdo-add-btn');
      if (addBtn) addBtn.textContent = cfg.product_add_btn_text || 'Added';
      const tick = pendingCard.querySelector('.cdo-tick');
      if (tick) tick.classList.add('visible');

      updateAll();

      const overlay = document.getElementById('cdo-variant-overlay');
      if (overlay) overlay.style.display = 'none';
      window.__cdoPendingCard = null;
      if (typeof window.onComboProductAdded === 'function') window.onComboProductAdded(cardId);
    });
  }

  // Guard against duplicate event listeners on persistent preview bar buttons.
  // These buttons survive tab switches (they're outside the products grid),
  // so we must only bind once.
  const resetBtn = document.getElementById('cdo-reset-btn');
  const checkoutBtn = document.getElementById('cdo-checkout-btn');
  const previewATC = document.getElementById('cdo-preview-atc-btn');

  if (resetBtn && !resetBtn.dataset.cdoBound) {
    resetBtn.dataset.cdoBound = '1';
    resetBtn.addEventListener('click', () => {
      Object.keys(selected).forEach((k) => delete selected[k]);
      document.querySelectorAll('.cdo-card').forEach((c) => {
        const qtyEl = c.querySelector('.cdo-qty-value');
        if (qtyEl) qtyEl.value = 0;
        c.style.border = `2px solid ${cfg.preview_item_border_color || '#f0f0f0'}`;
        const addBtn = c.querySelector('.cdo-add-btn');
        if (addBtn)
          addBtn.textContent =
            cfg.add_btn_text || cfg.product_add_btn_text || 'Add';

        const displayMode = cfg.product_card_variants_display || 'popup';
        const cardId = String(c.dataset.id || '').trim();
        const cardProduct = getProductByCardId(cardId);
        const requiresSelection =
          cardProduct &&
          (cardProduct.variants || []).length > 1 &&
          displayMode !== 'popup';
        if (requiresSelection) setCardAddEnabled(c, false);

        const tick = c.querySelector('.cdo-tick');
        if (tick) tick.classList.remove('visible');
      });
      updateAll();
    });
  }

  if (checkoutBtn && !checkoutBtn.dataset.cdoBound) {
    checkoutBtn.dataset.cdoBound = '1';
    checkoutBtn.addEventListener('click', () => {
      if (checkoutBtn.disabled) return;
      const spinner = document.getElementById('cdo-checkout-spinner');
      const btnText = checkoutBtn.querySelector('.cdo-checkout-btn-text');
      checkoutBtn.disabled = true;
      if (spinner) spinner.style.display = 'block';
      if (btnText) btnText.style.opacity = '0';
      const items = buildValidLineItems();
      if (!items.length) {
        showToast('Please add at least one valid product.');
        checkoutBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
        return;
      }
      // --- TRACK CHECKOUT CLICK ---
      try {
        // Gather tracking data
        var templateName = window.comboTemplateName || '';
        var templateId = window.comboTemplateId || '';
        var templateUrl = window.location.href;
        var pageUrl = window.location.href;
        var shopDomain =
          window.Shopify && window.Shopify.shop
            ? window.Shopify.shop
            : window.location.hostname;
        var visitorId = sessionStorage.getItem('cdo_uid') || '';
        if (!visitorId) {
          visitorId =
            'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          sessionStorage.setItem('cdo_uid', visitorId);
        }
        var trackingData = {
          template_name: templateName,
          template_id: templateId,
          template_url: templateUrl,
          page_url: pageUrl,
          shop_domain: shopDomain,
          visitor_id: visitorId,
          action: 'checkout',
          type: 'checkout',
          discount_code: window.__cdoDiscountCode || null,
          // timestamp handled by backend
        };
        var url =
          'https://darkblue-dotterel-303283.hostingersite.com/clicks.php';
        var payload = JSON.stringify(trackingData);
        if (navigator.sendBeacon) {
          var blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(function () {});
        }
      } catch (e) {
        /* Never block checkout */
      }
      // --- END TRACKING ---
      const checkoutItems = items.map((item) => `${item.id}:${item.quantity}`).join(',');
      const discountCode = window.__cdoDiscountCode || null;
      const templateNameParam = encodeURIComponent(window.comboTemplateName || templateName || 'combo');
      const checkoutUrl = rootUrl + 'cart/' + checkoutItems + '?checkout' +
        (discountCode ? '&discount=' + encodeURIComponent(discountCode) : '') +
        '&note_attributes[combo_source]=combo-builder' +
        '&note_attributes[combo_template]=' + templateNameParam;
      // Redirect immediately — no awaiting
      window.location.assign(checkoutUrl);
    });
  }

  if (previewATC && !previewATC.dataset.cdoBound) {
    previewATC.dataset.cdoBound = '1';
    previewATC.addEventListener('click', async () => {
      const items = buildValidLineItems();
      if (!items.length) {
        showToast('Please add at least one valid product.');
        return;
      }
      await fetch(rootUrl + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      showToast('Added to cart!');
    });
  }

  // Refresh preview bar and totals with current persistent state
  updateAll();
  bindPreviewEvents(cfg);
}

/* ===================== MAIN ===================== */
document.addEventListener('DOMContentLoaded', async function () {
  ensureComboCssLoaded();
  const shopDomain =
    window.Shopify && window.Shopify.shop
      ? window.Shopify.shop
      : window.location.hostname;

  const root = document.getElementById('combo-builder-root');

  let slug = '';
  const pathMatch = window.location.pathname.match(/\/pages\/([^/?#]+)/);
  if (pathMatch && pathMatch[1]) {
    slug = pathMatch[1];
  }
  // Debug log
  console.log(
    'Combo Builder: pathname:',
    window.location.pathname,
    'slug:',
    slug
  );
  if (!slug) {
    document.getElementById('combo-builder-root').style.display = 'block';
    document.getElementById('combo-builder-root').innerHTML =
      '<div style="color:red;text-align:center;padding:40px;">Combo page not found.<br>Please check your URL.</div>';
    return;
  }

  try {
    const isPreview = new URLSearchParams(window.location.search).has(
      'preview'
    );
    // ONLY use the Shopify App Proxy endpoint â€” /apps/combo/templates.php
    const proxyEndpoint = `/apps/combo/templates.php?shop=${encodeURIComponent(shopDomain)}&handle=${encodeURIComponent(slug)}${isPreview ? '&preview=1' : ''}`;
    const fallbackEndpoint = `https://darkblue-dotterel-303283.hostingersite.com/templates.php?shop=${encodeURIComponent(shopDomain)}&handle=${encodeURIComponent(slug)}${isPreview ? '&preview=1' : ''}`;

    let response = await fetch(proxyEndpoint);
    if (!response.ok && [401, 403, 404, 500].includes(response.status)) {
      console.warn(
        `[Combo Extended] Proxy returned ${response.status}. Falling back to direct templates endpoint.`
      );
      response = await fetch(fallbackEndpoint, { credentials: 'omit' });
    }

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const result = await response.json();
    // Support both 'templates' and 'data' keys from the backend
    const templates = result.templates || result.data || [];

    if (result.success && templates.length > 0) {
      // Show the template for this page â€” active OR inactive (if preview mode)
      const template = isPreview
        ? templates[0] // in preview, show any matched template
        : templates.find((t) => t.active) || null; // live: only active

      if (!template) {
        // Template exists but is inactive â€” don't show anything to customers
        return;
      }

      const cfg = template.config || {};
      window.__cdoDiscountCode = template.discount_code || null;

      // Fetch real discount details from discount.php and override cfg pricing
      if (template.discount_code) {
        try {
          const discRes = await fetch(
            `https://darkblue-dotterel-303283.hostingersite.com/discount.php?shop=${encodeURIComponent(shopDomain)}&shopdomain=${encodeURIComponent(shopDomain)}`
          );
          const discData = await discRes.json();
          const allDiscounts = discData.data || [];
          const matched = allDiscounts.find(
            (d) => d.code && d.code === template.discount_code
          );
          if (matched) {
            const valueType =
              matched.valueType ||
              matched.value_type ||
              (matched.settings && matched.settings.valueType) ||
              'percentage';
            const value = parseFloat(
              matched.value ||
              (matched.settings && matched.settings.value) ||
              0
            );
            if (valueType === 'percentage') {
              cfg.discount_percentage = value;
              cfg._discount_value_type = 'percentage';
            } else {
              cfg._discount_fixed_value = value;
              cfg._discount_value_type = 'fixed';
              cfg.discount_percentage = 0;
            }
          }
        } catch (e) {
          // Silently fail — cfg.discount_percentage from admin is the fallback
        }
      }

      applySliderConfigCss(cfg);
      const layout = cfg.layout || 'layout1';
      let products = Array.isArray(template.product_list)
        ? template.product_list
        : [];

      try {
        const liveProducts = await buildLiveCollectionProducts(cfg, layout);
        if (liveProducts.length) {
          products = liveProducts;
        }
      } catch (productFetchError) {
        console.warn(
          '[Combo Extended] Failed to fetch live collection products, using template product list fallback.',
          productFetchError
        );
      }

      products = filterProductsByStock(products, cfg);
      window.__cdoProducts = products; // store for AI recommendation

      trackVisit(template.name || slug); // â† ADD THIS

      // Only replace page content when a matching template exists
      const mainContent =
        document.querySelector('main') ||
        document.querySelector('#MainContent') ||
        document.querySelector('.main-content') ||
        document.querySelector('[role="main"]');
      if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.appendChild(root);
      }

      root.style.display = 'block';

      // Preview mode banner for inactive templates
      if (isPreview && !template.active) {
        const banner = document.createElement('div');
        banner.style.cssText =
          'position:fixed;top:0;left:0;width:100%;z-index:99999;background:#ff6b00;color:#fff;text-align:center;padding:10px 16px;font-size:14px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        banner.innerHTML =
          'Preview Mode - This combo is <strong>inactive</strong> and not visible to customers. <a href="' +
          window.location.href.split('?')[0] +
          '" style="color:#fff;text-decoration:underline;margin-left:8px;">Exit Preview</a>';
        document.body.prepend(banner);
        document.body.style.paddingTop = '44px';
      }

      if (layout === 'layout1') renderLayout1(cfg, products, root);
      else if (layout === 'layout2')
        renderLayout2(cfg, products, root, template);
      else if (layout === 'layout3')
        renderLayout3(cfg, products, root, template);
      else renderLayoutGrid(cfg, products, root);

      syncSliderArrowVisibility(root);
      setupSliderArrowObserver(root);

      // Initialize recommendation popup (fetches via app proxy + reads cfg)
      initRecommendationPopup(shopDomain, root, cfg);
    }
  } catch (err) {
    // Show error visibly for debugging (remove in production if desired)
    console.error('[Combo Builder] Failed to load:', err);
    if (root) {
      root.style.display = 'block';
      root.innerHTML =
        '<div style="text-align:center;padding:40px;color:red;font-size:15px;">Failed to load combo builder.</div>';
    }
  }
});

/* ===================== RECOMMENDATION POPUP ===================== */
async function initRecommendationPopup(shopDomain, root, cfg) {
  if (!shopDomain) return;

  try {
    const aiModeOn =
      cfg &&
      (cfg.ai_mode === true ||
        cfg.ai_mode === 'true' ||
        cfg.enable_recommendation_popup === true ||
        cfg.enable_recommendation_popup === 'true');

    const appUrl = (root && root.dataset && root.dataset.appUrl) || '';
    const useAI = aiModeOn && !!appUrl && appUrl !== 'DISABLED';

    let rules = [];
    let enabled = aiModeOn;

    // Fetch from PHP via Shopify app proxy
    try {
      const res = await fetch(
        `/apps/combo/recommendations.php?shop=${encodeURIComponent(shopDomain)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          enabled = data.enabled || aiModeOn;
          rules = Array.isArray(data.rules) ? data.rules : [];
        }
      }
    } catch (fetchErr) {
      // PHP file not uploaded yet — fall through to cfg fallback
    }

    // Fallback: rules embedded in template config
    if (!rules.length && cfg && Array.isArray(cfg.recommendation_rules)) {
      rules = cfg.recommendation_rules;
    }

    // Need either AI mode (with appUrl) or static rules to proceed
    if (!enabled && !useAI) return;
    if (!useAI && !rules.length) return;

    window.__cdoRecommendationRules = rules;

    if (!document.getElementById('cdo-rec-popup-overlay')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="cdo-rec-popup-overlay" style="display:none;" aria-hidden="true">
          <div id="cdo-rec-popup-card" role="dialog" aria-modal="true" aria-labelledby="cdo-rec-popup-title">
            <button id="cdo-rec-popup-close" type="button" class="cdo-rec-popup-close-btn" aria-label="Close">&times;</button>
            <div id="cdo-rec-popup-body"></div>
          </div>
        </div>
      `);
    }

    const maxProducts = parseInt(cfg.max_products) || 5;

    window.onComboProductAdded = async function (cardId) {
      // DOM-based selection detection — works for all layouts including layout1
      let totalQty = 0;
      const selectedHandles = new Set();
      const selectedProducts = [];
      const allProds = window.__cdoProducts || window.__cdoAllProducts || [];
      document.querySelectorAll('.cdo-card').forEach((card) => {
        const qtyVal = parseInt(card.querySelector('.cdo-qty-value')?.value || '0', 10);
        if (qtyVal > 0) {
          totalQty += qtyVal;
          const handle = String(card.dataset.handle || '');
          const cid = String(card.dataset.id || '');
          if (handle) selectedHandles.add(handle);
          const p = allProds.find(
            (p) => String(p.handle || '') === handle ||
                   String(p.id || '').replace('gid://shopify/Product/', '') === cid
          );
          selectedProducts.push(p
            ? { id: String(p.id || '').replace('gid://shopify/Product/', ''), title: p.title, handle: p.handle }
            : { id: cid, handle });
        }
      });

      if (totalQty >= maxProducts) return;

      if (useAI) {
        const skipped = window.__cdoSkippedHandles || new Set();
        const availableProducts = allProds
          .filter((p) => !skipped.has(String(p.handle || '')) && !selectedHandles.has(String(p.handle || '')))
          .map((p) => ({
            id: String(p.id || '').replace('gid://shopify/Product/', ''),
            title: p.title,
            handle: p.handle,
            image: p.image,
          }));
        if (!availableProducts.length) return;
        try {
          const res = await fetch(`${appUrl}/api/ai-recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedProducts, availableProducts, maxProducts, currentCount: totalQty }),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.recommended) {
            showRecommendationPopup({
              recommendedProductId: data.recommended.id,
              recommendedProductHandle: data.recommended.handle,
              recommendedProductTitle: data.recommended.title,
              recommendedProductImage: data.recommended.image,
              popupTitle: cfg.recommendation_popup_title || 'You might also like',
              ctaText: cfg.recommendation_cta_text || 'Add to Combo',
              dismissText: cfg.recommendation_dismiss_text || 'No thanks',
            });
          }
        } catch (e) {}
      } else {
        const normalizedCardId = String(cardId || '').replace('gid://shopify/Product/', '');
        const rule = (window.__cdoRecommendationRules || []).find((r) => {
          const trigId = String(r.triggerProductId || '').replace('gid://shopify/Product/', '');
          return trigId === normalizedCardId;
        });
        if (!rule) return;
        showRecommendationPopup(rule);
      }
    };
  } catch (e) {
    // Silently fail — popup is optional
  }
}
function showRecommendationPopup(rule) {
  const overlay = document.getElementById('cdo-rec-popup-overlay');
  if (!overlay) return;
  const body = document.getElementById('cdo-rec-popup-body');
  if (!body) return;

  const allProds = window.__cdoProducts || window.__cdoAllProducts || [];
  const recHandle = rule.recommendedProductHandle || '';
  const recIdNorm = String(rule.recommendedProductId || '').replace('gid://shopify/Product/', '');
  const productObj = allProds.find((p) => {
    if (recHandle && String(p.handle || '') === recHandle) return true;
    return String(p.id || '').replace('gid://shopify/Product/', '') === recIdNorm;
  });
  const variants = productObj && Array.isArray(productObj.variants) && productObj.variants.length > 1
    ? productObj.variants : [];

  let variantSelectorHtml = '';
  if (variants.length > 0) {
    const btns = variants.map((v, i) => {
      const vId = String(v.id || '').replace('gid://shopify/ProductVariant/', '');
      const vTitle = v.title === 'Default Title' ? (productObj.title || 'Default') : (v.title || 'Variant');
      return `<button type="button" class="cdo-rec-variant-btn${i === 0 ? ' selected' : ''}" ` +
             `data-variant-id="${escapeHtml(vId)}" data-price="${escapeHtml(String(v.price || '0'))}" ` +
             `data-image="${escapeHtml(v.image || (productObj && productObj.image) || '')}">` +
             `${escapeHtml(vTitle)}</button>`;
    }).join('');
    variantSelectorHtml = `<div class="cdo-rec-variant-selector" id="cdo-rec-variant-selector">${btns}</div>`;
  }

  const imgHtml = rule.recommendedProductImage
    ? `<img src="${escapeHtml(rule.recommendedProductImage)}" alt="${escapeHtml(rule.recommendedProductTitle)}" class="cdo-rec-popup-img" loading="lazy">`
    : '';

  body.innerHTML = `
    <p id="cdo-rec-popup-title" class="cdo-rec-popup-title">${escapeHtml(rule.popupTitle || 'You might also like')}</p>
    ${imgHtml}
    <p class="cdo-rec-popup-product-title">${escapeHtml(rule.recommendedProductTitle || '')}</p>
    ${variantSelectorHtml}
    <div class="cdo-rec-popup-actions">
      <button type="button" class="cdo-rec-popup-cta" id="cdo-rec-popup-cta">${escapeHtml(rule.ctaText || 'Add to Combo')}</button>
      <button type="button" class="cdo-rec-popup-dismiss" id="cdo-rec-popup-dismiss">${escapeHtml(rule.dismissText || 'No thanks')}</button>
    </div>`;

  let pickedVariantId = '';
  let pickedPrice = '';
  let pickedImage = '';
  const selectorEl = document.getElementById('cdo-rec-variant-selector');
  if (selectorEl) {
    const varBtns = selectorEl.querySelectorAll('.cdo-rec-variant-btn');
    const first = varBtns[0];
    if (first) {
      pickedVariantId = first.dataset.variantId || '';
      pickedPrice = first.dataset.price || '';
      pickedImage = first.dataset.image || '';
    }
    varBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        varBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        pickedVariantId = btn.dataset.variantId || '';
        pickedPrice = btn.dataset.price || '';
        pickedImage = btn.dataset.image || '';
      });
    });
  }

  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cdo-modal-open');

  const skipHandle = () => {
    if (!window.__cdoSkippedHandles) window.__cdoSkippedHandles = new Set();
    if (recHandle) window.__cdoSkippedHandles.add(recHandle);
  };

  const ctaBtn = document.getElementById('cdo-rec-popup-cta');
  if (ctaBtn) {
    ctaBtn.onclick = () => {
      closeRecommendationPopup();
      // Mark as skipped so it won't be recommended again
      if (!window.__cdoSkippedHandles) window.__cdoSkippedHandles = new Set();
      if (recHandle) window.__cdoSkippedHandles.add(recHandle);

      let card = recIdNorm ? document.querySelector(`.cdo-card[data-id="${recIdNorm}"]`) : null;
      if (!card && recHandle) card = document.querySelector(`.cdo-card[data-handle="${recHandle}"]`);
      if (card) {
        if (pickedVariantId) {
          const popupAddBtn = document.getElementById('cdo-variant-add');
          if (popupAddBtn) {
            window.__cdoPendingCard = card;
            popupAddBtn.dataset.variantId = pickedVariantId;
            popupAddBtn.dataset.price = pickedPrice;
            popupAddBtn.dataset.image = pickedImage || card.dataset.image || '';
            popupAddBtn.click();
          } else {
            const addBtn = card.querySelector('.cdo-add-btn');
            if (addBtn && !addBtn.disabled) addBtn.click();
          }
        } else {
          const addBtn = card.querySelector('.cdo-add-btn');
          if (addBtn && !addBtn.disabled) addBtn.click();
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
  }

  const dismissBtn = document.getElementById('cdo-rec-popup-dismiss');
  if (dismissBtn) dismissBtn.onclick = () => { skipHandle(); closeRecommendationPopup(); };

  const closeBtn = document.getElementById('cdo-rec-popup-close');
  if (closeBtn) closeBtn.onclick = () => { skipHandle(); closeRecommendationPopup(); };

  overlay.onclick = (e) => { if (e.target === overlay) { skipHandle(); closeRecommendationPopup(); } };
}
function closeRecommendationPopup() {
  const overlay = document.getElementById('cdo-rec-popup-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('cdo-modal-open');
}
