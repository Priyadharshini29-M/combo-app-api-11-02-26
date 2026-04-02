/* ===================== LAYOUT 1 — Multi-Step ===================== */
function renderLayout1(cfg, products, root) {
  const visibleProducts = filterProductsByStock(products, cfg);
  const isMobile = window.innerWidth < 768;
  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = isMobile ? cfg.products_gap_mobile || 10 : cfg.products_gap || 16;
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
          <span class="cdo-step-check" data-step="${step}" style="color:${cfg.progress_success_color || '#008060'};font-weight:bold;display:none;">✓</span>
        </div>
        <p style="font-size:13px;color:#888;margin:4px 0 0;">${stepSubtitle}${stepLimit ? ` (Choose up to ${stepLimit})` : ''}</p>
      </div>
      <div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}">
        ${
          cfg.grid_layout_type === 'slider'
            ? `
          <button class="cdo-nav-btn prev" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:-300,behavior:'smooth'})">←</button>
          <button class="cdo-nav-btn next" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:300,behavior:'smooth'})">→</button>
        `
            : ''
        }
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
  root.innerHTML = `<div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};position:relative;">${getProgressHtml(cfg)}${getBannerHtml(cfg)}<div style="padding:${padTop}px ${padR}px 0 ${padL}px;">${getTitleHtml(cfg)}</div><div style="padding:0 ${padR}px ${padBot}px ${padL}px;margin-top:20px;">${stepsHtml}</div>${getPreviewBarHtml(cfg)}</div>
  <div id="cdo-variant-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:flex-end;justify-content:center;">
    <div id="cdo-variant-popup" style="background:#fff;width:100%;max-width:480px;border-radius:16px 16px 0 0;padding:24px;box-sizing:border-box;max-height:80vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 id="cdo-variant-title" style="margin:0;font-size:16px;font-weight:700;"></h3><button id="cdo-variant-close" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button></div>
      <div id="cdo-variant-options" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;"></div>
      <button id="cdo-variant-add" style="width:100%;background:${cfg.product_add_btn_color || cfg.add_btn_bg || '#000'};color:${cfg.product_add_btn_text_color || cfg.add_btn_text_color || '#fff'};border:none;padding:14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:16px;">Add to Bundle</button>
    </div>
  </div>`;
  bindLayout1Logic(cfg, visibleProducts);
}

function bindLayout1Logic(cfg, products) {
  if (!window.comboSelected) window.comboSelected = {};
  const selected = window.comboSelected;
  const maxTotal = parseInt(cfg.max_products) || 5;
  const discountPc = parseFloat(cfg.discount_percentage) || 0;
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
  function toSafeImage(val) {
    if (typeof val !== 'string') return '';
    const s = val.trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s;
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
      const product = getProductByCardId(cardId);
      if (
        product &&
        Array.isArray(product.variants) &&
        product.variants.length
      ) {
        const productVariantIds = product.variants
          .map((v) => normalizeVariantId(v.id))
          .filter((id) => /^\d+$/.test(id));
        if (!productVariantIds.includes(variantId)) {
          if (productVariantIds.length === 1) variantId = productVariantIds[0];
          else return;
        }
      } else if (!/^\d+$/.test(variantId)) {
        return;
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
    const total = items.reduce(
      (s, i) => s + toSafeNumber(i.price) * (parseInt(i.qty, 10) || 0),
      0
    );
    let disc = total;
    const origEl = document.getElementById('cdo-original-total');
    const discEl = document.getElementById('cdo-discounted-total');
    const motivEl = document.getElementById('cdo-motiv');
    if (totalQty >= maxTotal && discountPc > 0) {
      disc = total * (1 - discountPc / 100);
      if (origEl) {
        origEl.style.display = 'inline';
        origEl.textContent = formatMoney(total * 100);
      }
      if (motivEl) {
        motivEl.style.display = 'block';
        motivEl.textContent =
          cfg.preview_motivation_unlocked_text ||
          cfg.discount_unlocked_text ||
          '🎉 Discount Unlocked!';
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
    if (discEl) discEl.textContent = formatMoney(Math.round(disc * 100));
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
        umsg.innerHTML = `<span style="color:${cfg.progress_success_color || '#008060'};font-weight:700;">🎉 ${cfg.discount_unlocked_text || 'Discount Unlocked!'}</span>`;
      } else {
        const rem = maxTotal - totalQty;
        umsg.textContent = (
          cfg.discount_motivation_text ||
          'Add __REMAINING__ more items to unlock the discount!'
        ).replace(/\{\{remaining\}\}|__REMAINING__/g, rem);
      }
    }
    document.querySelectorAll('.cdo-step-check').forEach((el) => {
      const step = el.dataset.step;
      const sp = products.filter((p) => String(p.step || 1) === String(step));
      const limit =
        sp[0]?.step_limit || parseInt(cfg[`step_${step}_limit`]) || null;
      el.style.display = limit && getStepQty(step) >= limit ? 'inline' : 'none';
    });
    const flat = [];
    Object.values(selected).forEach((item) => {
      for (let q = 0; q < item.qty; q++) flat.push(item);
    });
    for (let i = 1; i <= maxTotal; i++) {
      const slot = document.getElementById(`cdo-slot-${i}`);
      if (!slot) continue;
      const item = flat[i - 1];
      const img = item ? item.image : '';
      if (item && img) {
        slot.innerHTML = `<img class="cdo-preview-image preview-image" src="${img}" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;display:block;">`;
        slot.style.border = `2px solid ${hl}`;
      } else {
        slot.innerHTML = '+';
        slot.style.border = '2px dashed rgba(0,0,0,0.2)';
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
    const tick = card.querySelector('.cdo-tick');
    if (tick) tick.classList.toggle('visible', qty > 0);
    updateTotals();
  }
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
      if (varAddBtn) {
        delete varAddBtn.dataset.variantId;
        delete varAddBtn.dataset.price;
        delete varAddBtn.dataset.image;
        varAddBtn.disabled = true;
        varAddBtn.style.opacity = '0.55';
        varAddBtn.style.cursor = 'not-allowed';
      }
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
            varAddBtn.disabled = false;
            varAddBtn.style.opacity = '1';
            varAddBtn.style.cursor = 'pointer';
          }
        });
        varOptions.appendChild(btn);
      });
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
      if (!pendingCard) return;
      const variantId = varAddBtn.dataset.variantId;
      if (!/^\d+$/.test(String(variantId || '').trim())) {
        showToast('Please select a variant before adding to cart.');
        return;
      }
      const price = parseFloat(varAddBtn.dataset.price);
      const image = varAddBtn.dataset.image;
      const id = pendingCard.dataset.id;
      const step = pendingCard.dataset.step || '1';
      const stepLimit = parseInt(pendingCard.dataset.steplimit) || null;
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
      updateCardVisuals(pendingCard, id);
      if (overlay) overlay.style.display = 'none';
      pendingCard = null;
    });
  }
  document.querySelectorAll('.cdo-card').forEach((card) => {
    const id = card.dataset.id;
    const price = toSafeNumber(card.dataset.price);
    const image = card.dataset.image;
    const step = card.dataset.step || '1';
    const stepLimit = parseInt(card.dataset.steplimit) || null;
    const product = getProductByCardId(id);
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
      const displayMode = cfg.product_card_variants_display || 'static';

      // Fix: Check if overrideVariant is a real variant object (has id and is not an Event)
      const isOverride =
        overrideVariant &&
        typeof overrideVariant === 'object' &&
        !overrideVariant.preventDefault &&
        overrideVariant.id;

      if (isOverride) {
        let key = String(overrideVariant.id || '').trim();
        const vPrice = toSafeNumber(overrideVariant.price, price);
        const vImage = toSafeImage(overrideVariant.image) || image;
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
        return;
      }
      if (
        displayMode === 'popup' &&
        product &&
        (product.variants || []).length > 1
      ) {
        if (document.getElementById('cdo-variant-overlay')) {
          openVariantPopup(card, product);
          return;
        }
      }
      let variantId = id;
      let variantPrice = price;
      let variantImage = image;
      const activeSwatch = card.querySelector('.cdo-variant-swatch.active');
      const staticSelect = card.querySelector('.cdo-variant-static-select');
      if (staticSelect) {
        if (!staticSelect.value) {
          showToast('Please select a valid variant.');
          return;
        }
        variantId = staticSelect.value;
        const selOpt = staticSelect.options[staticSelect.selectedIndex];
        variantPrice = toSafeNumber(selOpt.dataset.price, price);
        variantImage = toSafeImage(selOpt.dataset.image) || image;
      } else if (activeSwatch && activeSwatch.dataset.variantId) {
        variantId = String(activeSwatch.dataset.variantId).trim();
        variantPrice = toSafeNumber(activeSwatch.dataset.price, price);
        variantImage = toSafeImage(activeSwatch.dataset.image) || image;
      } else if (product && (product.variants || []).length > 0) {
        if ((product.variants || []).length === 1) {
          const firstVariant = product.variants[0];
          variantId = normalizeVariantId(firstVariant.id) || variantId;
          variantPrice = toSafeNumber(firstVariant.price, price);
          variantImage = toSafeImage(firstVariant.image) || image;
        } else {
          showToast('Please select a valid variant.');
          return;
        }
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
          step,
          cardId: id,
        };
      else selected[variantId].qty++;
      updateCardVisuals(card, id);
    };
    const onDec = () => {
      let key = null;
      if (selected[id]) {
        key = id;
      } else {
        const activeSwatch = card.querySelector('.cdo-variant-swatch.active');
        const activeVariantId = activeSwatch
          ? activeSwatch.dataset.variantId
          : null;
        if (activeVariantId && selected[activeVariantId]) key = activeVariantId;
        if (!key)
          key = Object.keys(selected).find((k) => selected[k].cardId === id);
      }
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
    if (addBtn) addBtn.addEventListener('click', onInc);
    card.querySelectorAll('.cdo-variant-swatch').forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        const vId = swatch.dataset.variantId;
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
        const addBtn = card.querySelector('.cdo-add-btn');
        if (addBtn && card.dataset.soldout !== '1') {
          if (!swatch.classList.contains('cdo-variant-soldout')) {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
            addBtn.style.cursor = 'pointer';
          } else {
            addBtn.disabled = true;
            addBtn.style.opacity = '0.7';
            addBtn.style.cursor = 'not-allowed';
          }
        }
      });
    });
    // Initialize card visuals on load
    updateCardVisuals(card, id);
  });
  const resetBtn = document.getElementById('cdo-reset-btn');
  const checkoutBtn = document.getElementById('cdo-checkout-btn');
  const previewATC = document.getElementById('cdo-preview-atc-btn');
  if (resetBtn)
    resetBtn.addEventListener('click', () => {
      Object.keys(selected).forEach((k) => delete selected[k]);
      document.querySelectorAll('.cdo-card').forEach((c) => {
        const qty = 0;
        const qtyEl = c.querySelector('.cdo-qty-value');
        if (qtyEl) qtyEl.value = 0;
        c.style.border = `2px solid ${cfg.preview_item_border_color || '#f0f0f0'}`;
        const addBtn = c.querySelector('.cdo-add-btn');
        if (addBtn)
          addBtn.textContent =
            cfg.add_btn_text || cfg.product_add_btn_text || 'Add';
        const tick = c.querySelector('.cdo-tick');
        if (tick) tick.classList.remove('visible');
      });
      updateTotals();
    });
  if (checkoutBtn)
    checkoutBtn.addEventListener('click', async () => {
      const items = buildValidLineItems();
      if (!items.length) {
        showToast('Please add at least one valid product.');
        return;
      }

      const checkoutUrl =
        rootUrl +
        'cart/' +
        items.map((i) => `${i.id}:${i.quantity}`).join(',') +
        '?checkout';
      try {
        var templateName =
          typeof template !== 'undefined' && template.name
            ? template.name
            : window.comboTemplateName || '';
        var templateId =
          typeof template !== 'undefined' && template.id
            ? String(template.id)
            : window.comboTemplateId || '';
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
        var params = new URLSearchParams({
          template_name: templateName,
          template_id: templateId,
          page_url: pageUrl,
          shop_domain: shopDomain,
          visitor_id: visitorId,
          redirect_url: checkoutUrl,
        });
        window.location.href = '/apps/combo/clicks.php?' + params.toString();
      } catch (e) {
        window.location.assign(checkoutUrl);
      }
    });
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

/* ===================== LAYOUT 2 — Switching Tabs ===================== */
async function fetchStorefrontProducts(collectionHandle, signal) {
  const res = await fetch(
    `/collections/${collectionHandle}/products.json?limit=50`,
    { signal }
  );
  if (!res.ok) throw new Error(`Collection API error: ${res.status}`);
  const data = await res.json();
  return (data.products || []).map((p) => ({
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
  const tabs = [];
  for (let i = 1; i <= 10; i++) {
    if (cfg[`col_${i}`]) {
      const handle = cfg[`col_${i}`];
      const label =
        cfg[`col_${i}_label`] ||
        handle.replace(/-/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase());
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
      (tab, i) =>
        `<button type="button" class="cdo-tab" data-handle="${tab.handle}" id="cdo-tab-${tab.handle}" role="tab" aria-controls="cdo-products-panel" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" style="padding:${cfg.tab_padding_vertical || 10}px ${cfg.tab_padding_horizontal || 20}px;cursor:pointer;border-radius:${tabRadius}px;font-weight:600;font-size:${cfg.tab_font_size || 14}px;transition:all 0.2s;user-select:none;background:${i === 0 ? cfg.tab_active_bg_color || '#000' : cfg.tab_bg_color || '#eee'};color:${i === 0 ? cfg.tab_active_text_color || '#fff' : cfg.tab_text_color || '#333'};">${tab.label}</button>`
    )
    .join('');
  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = isMobile ? cfg.products_gap_mobile || 10 : cfg.products_gap || 20;
  const gridW = cfg.grid_width || 100;
  root.innerHTML = `<div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};">${getProgressHtml(cfg)}${cfg.header_title ? `<div style="padding:16px ${padR}px;background:${cfg.bg_color || '#fff'};border-bottom:1px solid #eee;"><span style="font-size:18px;font-weight:800;">${cfg.header_title}</span></div>` : ''}${getBannerHtml(cfg)}<div style="padding:${padT}px ${padR}px 0 ${padL}px;">${getTitleHtml(cfg)}<div style="width:${tabsW}%;margin-top:${tabMarginTop}px;margin-bottom:${tabMarginBottom}px;"><div class="cdo-tabs-wrap cdo-tabs-mode-${tabNavigationMode}">${showTabArrows ? '<button type="button" class="cdo-tabs-arrow prev" data-dir="prev" aria-label="Scroll tabs left">←</button>' : ''}<div class="cdo-tabs-viewport" aria-label="Collection tabs" tabindex="0"><div class="cdo-tab-row" role="tablist" aria-orientation="horizontal" style="justify-content:${cfg.tab_alignment || 'left'};">${tabsHtml}</div></div>${showTabArrows ? '<button type="button" class="cdo-tabs-arrow next" data-dir="next" aria-label="Scroll tabs right">→</button>' : ''}</div></div></div><div style="padding:0 ${padR}px ${padB}px ${padL}px;"><div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''} cdo-products-region" id="cdo-products-panel" role="tabpanel" aria-labelledby="cdo-tab-${initialHandle}">${cfg.grid_layout_type === 'slider' ? `<button class="cdo-nav-btn prev" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:-300,behavior:'smooth'})">←</button><button class="cdo-nav-btn next" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:300,behavior:'smooth'})">→</button>` : ''}<div id="cdo-products-grid" class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? `width:${gridW}%;margin-top:20px;` : `width:${gridW}%;margin-top:20px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}"></div></div></div>${getPreviewBarHtml(cfg)}</div>`;
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
      if (cachedList.length) bindStandardLogic({ cfg, products: products });
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
    if (list.length) bindStandardLogic({ cfg, products: products });
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

/* ===================== LAYOUT 3 — FMCG / Instamart ===================== */
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
  const cats = [];
  for (let i = 1; i <= 10; i++) {
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
      (c, i) =>
        `<button class="cdo-cat-pill" data-handle="${c.handle}" style="padding:8px 20px;border-radius:30px;border:none;cursor:pointer;font-weight:700;font-size:14px;white-space:nowrap;transition:all 0.2s;background:${i === 0 ? primary : '#eee'};color:${i === 0 ? '#fff' : '#333'};">${c.title}</button>`
    )
    .join('');
  const heroHtml = cfg.show_hero
    ? `<div style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">${cfg.hero_image_url ? `<img src="${cfg.hero_image_url}" style="width:${isMobile ? '100%' : '240px'};border-radius:10px;object-fit:cover;max-height:180px;" loading="lazy">` : ''}<div style="flex:1;min-width:200px;"><h2 style="font-size:${isMobile ? 20 : 28}px;font-weight:800;margin:0 0 6px;color:${cfg.text_color || '#111'};">${cfg.hero_title || 'Mega Bundle'}</h2><p style="color:#666;margin:0 0 12px;font-size:15px;">${cfg.hero_subtitle || ''}</p><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;"><span style="font-size:26px;font-weight:800;color:${primary};">${cfg.hero_price || ''}</span>${cfg.hero_compare_price ? `<span style="text-decoration:line-through;color:#999;font-size:16px;">${cfg.hero_compare_price}</span>` : ''}</div>${cfg.timer_hours !== undefined ? `<div style="margin-bottom:14px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px;">Deal ends in</div><div class="cdo-timer" style="justify-content:flex-start;"><div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-h" style="color:${primary};">00</span><span class="cdo-timer-label">hrs</span></div><span class="cdo-timer-sep" style="color:${primary};">:</span><div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-m" style="color:${primary};">00</span><span class="cdo-timer-label">min</span></div><span class="cdo-timer-sep" style="color:${primary};">:</span><div class="cdo-timer-unit"><span class="cdo-timer-val" id="t-s" style="color:${primary};">00</span><span class="cdo-timer-label">sec</span></div></div></div>` : ''}</div></div>`
    : '';
  const cols = isMobile ? cfg.mobile_columns || 2 : cfg.desktop_columns || 3;
  const gap = isMobile ? cfg.products_gap_mobile || 10 : cfg.products_gap || 16;
  root.innerHTML = `<div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};box-sizing:border-box;">${getProgressHtml(cfg)}<div style="padding:${padT}px ${padR}px ${padB}px ${padL}px;">${getBannerHtml(cfg)}${heroHtml}${getTitleHtml(cfg)}<div style="display:flex;gap:10px;margin:16px 0;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;">${catPillsHtml}</div><div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}">${cfg.grid_layout_type === 'slider' ? `<button class="cdo-nav-btn prev" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:-300,behavior:'smooth'})">←</button><button class="cdo-nav-btn next" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:300,behavior:'smooth'})">→</button>` : ''}<div id="cdo-products-grid" class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? `width:100%;margin-top:20px;` : `width:100%;margin-top:20px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}"></div></div></div>${getPreviewBarHtml(cfg)}</div>`;
  initBannerSlider(cfg);
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
    bindStandardLogic({ cfg, products: visibleProducts });
  }
  root.querySelectorAll('.cdo-cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.cdo-cat-pill').forEach((b) => {
        b.style.background = '#eee';
        b.style.color = '#333';
      });
      btn.style.background = primary;
      btn.style.color = '#fff';
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
  const gap = isMobile ? cfg.products_gap_mobile || 10 : cfg.products_gap || 20;
  const gridW = cfg.grid_width || 100;
  const productsHtml = visibleProducts
    .map((p) => renderProductCard(cfg, p))
    .join('');
  root.innerHTML = `<div style="max-width:${cfg.container_width || 1200}px;margin:0 auto;background:${cfg.bg_color || '#fff'};color:${cfg.text_color || '#000'};box-sizing:border-box;">${getProgressHtml(cfg)}<div style="padding:${padT}px ${padR}px ${padB}px ${padL}px;">${getBannerHtml(cfg)}${getTitleHtml(cfg)}<div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider-container' : ''}">${cfg.grid_layout_type === 'slider' ? `<button class="cdo-nav-btn prev" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:-300,behavior:'smooth'})">←</button><button class="cdo-nav-btn next" onclick="this.parentNode.querySelector('.cdo-layout-slider').scrollBy({left:300,behavior:'smooth'})">→</button>` : ''}<div class="${cfg.grid_layout_type === 'slider' ? 'cdo-layout-slider' : ''}" style="${cfg.grid_layout_type === 'slider' ? `width:${gridW}%;margin-top:20px;` : `width:${gridW}%;margin-top:20px;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`}">
    ${productsHtml}
  </div></div></div>${getPreviewBarHtml(cfg)}</div>`;
  bindStandardLogic({ cfg, products: visibleProducts });
}
