/* ===================== SHARED LOGIC ===================== */
function bindStandardLogic({ cfg, products }) {
  const selected     = {};
  const maxSel       = parseInt(cfg.max_products) || 5;
  const discountPc   = parseFloat(cfg.discount_percentage) || 0;
  const limitMsg     = (cfg.limit_reached_message || 'Limit reached!').replace(/\{\{limit\}\}|__LIMIT__/g, maxSel);
  const hl           = cfg.selection_highlight_color || cfg.primary_color || '#000';
  const rootUrl      = (window.Shopify?.routes?.root) || '/';

  function toSafeNumber(val, fallback = 0) { const n = parseFloat(val); return Number.isFinite(n) ? n : fallback; }
  function toSafeImage(val) { if (typeof val !== 'string') return ''; const s = val.trim(); if (!s || s === 'undefined' || s === 'null') return ''; return s; }
  function getCardSelectionQty(cardId) { return Object.values(selected).filter(i => i.cardId === cardId || i.id === cardId).reduce((s, i) => s + (parseInt(i.qty, 10) || 0), 0); }
  function normalizeVariantId(gidOrId) { return String(gidOrId || '').replace('gid://shopify/ProductVariant/', '').trim(); }
  function normalizeProductId(gidOrId) { return String(gidOrId || '').replace('gid://shopify/Product/', '').trim(); }
  function getProductByCardId(cardId) { return products.find(p => { const pId = normalizeProductId(p.id); if (pId === cardId) return true; return (p.variants || []).some(v => normalizeVariantId(v.id) === cardId); }) || null; }

  function buildValidLineItems() {
    const grouped = {};
    Object.values(selected).forEach(i => {
      let variantId = String(i.id || '').trim();
      const cardId = String(i.cardId || '').trim();
      const qty = parseInt(i.qty, 10) || 0;
      if (!/^[0-9]+$/.test(variantId)) {
        const product = getProductByCardId(cardId);
        if (product && Array.isArray(product.variants) && product.variants.length > 0) { variantId = normalizeVariantId(product.variants[0].id); }
        else { return; }
      }
      if (!/^[0-9]+$/.test(variantId) || qty <= 0) return;
      grouped[variantId] = (grouped[variantId] || 0) + qty;
    });
    return Object.keys(grouped).map(variantId => ({ id: variantId, quantity: grouped[variantId] }));
  }

  function updateAll() {
    const items = Object.values(selected); const totalQty = items.reduce((s, i) => s + i.qty, 0); const total = items.reduce((s, i) => s + (toSafeNumber(i.price) * (parseInt(i.qty, 10) || 0)), 0);
    let disc = total; const origEl = document.getElementById('cdo-original-total'); const discEl = document.getElementById('cdo-discounted-total'); const motivEl = document.getElementById('cdo-motiv');
    if (totalQty >= maxSel && discountPc > 0) {
      disc = total * (1 - discountPc / 100); if (origEl) { origEl.style.display = 'inline'; origEl.textContent = formatMoney(total * 100); }
      if (motivEl) { motivEl.style.display = 'block'; motivEl.textContent = cfg.preview_motivation_unlocked_text || cfg.discount_unlocked_text || '🎉 Discount Unlocked!'; }
    } else {
      if (origEl) origEl.style.display = 'none';
      if (motivEl && totalQty > 0 && totalQty < maxSel) { const rem = maxSel - totalQty; motivEl.style.display = 'block'; motivEl.textContent = (cfg.preview_motivation_text || cfg.discount_motivation_text || 'Add __REMAINING__ more!').replace(/\{\{remaining\}\}|__REMAINING__/g, rem); }
      else if (motivEl && totalQty === 0) { motivEl.style.display = 'none'; }
    }
    if (discEl) discEl.textContent = formatMoney(Math.round(disc * 100));
    const pct = Math.min(100, Math.round((totalQty / maxSel) * 100));
    const progressColor = cfg.progress_bar_color || '#1a6644'; const bar = document.getElementById('cdo-progress-bar'); const ptxt = document.getElementById('cdo-progress-text'); const umsg = document.getElementById('cdo-unlock-msg'); const track = document.getElementById('cdo-progress-track');
    if (bar) { bar.style.transform = 'scaleX(' + (pct / 100) + ')'; bar.style.backgroundColor = progressColor; const fillEl = document.getElementById('cdo-progress-bar-fill'); if (fillEl) fillEl.style.backgroundColor = progressColor; }
    if (track) { track.style.setProperty('--cdo-progress-color', progressColor); track.style.backgroundColor = '#e0e0e0'; }
    if (ptxt) ptxt.textContent = pct + '%';
    if (umsg) { if (totalQty >= maxSel) { umsg.innerHTML = `<span style="color:${cfg.progress_success_color||'#008060'};font-weight:700;">🎉 ${cfg.discount_unlocked_text||'Discount Unlocked!'}</span>`; } else { const rem = maxSel - totalQty; umsg.textContent = (cfg.discount_motivation_text || 'Add __REMAINING__ more items to unlock the discount!').replace(/\{\{remaining\}\}|__REMAINING__/g, rem); } }
    const flat = []; items.forEach(i => { for (let q = 0; q < i.qty; q++) flat.push(i); });
    for (let i = 1; i <= maxSel; i++) { const slot = document.getElementById(`cdo-slot-${i}`); if (!slot) continue; const item = flat[i - 1]; const img = item ? toSafeImage(item.image) : ''; if (item && img) { slot.innerHTML = `<img class="cdo-preview-image preview-image" src="${img}" style="width:100%;height:100%;object-fit:cover;object-position:center;border-radius:inherit;display:block;">`; slot.style.border = `2px solid ${hl}`; } else { slot.innerHTML = '+'; slot.style.border = '2px dashed rgba(0,0,0,0.2)'; } }
  }

  document.querySelectorAll('.cdo-card').forEach(card => {
    const id = card.dataset.id; const price = toSafeNumber(card.dataset.price); const image = toSafeImage(card.dataset.image); const product = getProductByCardId(id);
    function updateCard() { const qty = getCardSelectionQty(id); const qtyEl = card.querySelector('.cdo-qty-value'); if (qtyEl) qtyEl.value = qty; card.style.border = qty > 0 ? `2px solid ${hl}` : `2px solid ${cfg.preview_item_border_color||'#f0f0f0'}`; const addBtn = card.querySelector('.cdo-add-btn'); if (addBtn) addBtn.textContent = qty > 0 ? (cfg.product_add_btn_text||'Added') : (cfg.product_add_btn_text||cfg.add_btn_text||'Add'); const tick = card.querySelector('.cdo-tick'); if (tick) tick.classList.toggle('visible', qty > 0); updateAll(); }
    const onInc = (overrideVariant) => {
      if (card.dataset.soldout === '1') { showToast('This product is sold out.'); return; }
      const total = Object.values(selected).reduce((s,i) => s+i.qty, 0); if (total >= maxSel) { showToast(limitMsg); return; }
      const displayMode = cfg.product_card_variants_display || 'popup';
      if (overrideVariant) {
        let key = String(overrideVariant.id || '').trim(); const vPrice = toSafeNumber(overrideVariant.price, price); const vImage = toSafeImage(overrideVariant.image) || image;
        if (!/^\d+$/.test(key)) { const fallbackVariant = product && (product.variants || []).length > 0 ? normalizeVariantId(product.variants[0].id) : ''; key = fallbackVariant; }
        if (!/^\d+$/.test(key)) { showToast('Please select a valid variant.'); return; }
        if (!selected[key]) selected[key] = { id: key, price: vPrice, image: vImage, qty: 1, cardId: id }; else selected[key].qty++;
        updateCard(); return;
      }
      if (displayMode === 'popup' && product && (product.variants || []).length > 1) { if (document.getElementById('cdo-variant-overlay')) { openVariantPopup(card, product); return; } }
      let variantId = id; let variantPrice = price; let variantImage = image; const activeSwatch = card.querySelector('.cdo-variant-swatch.active');
      if (activeSwatch && activeSwatch.dataset.variantId) { variantId = String(activeSwatch.dataset.variantId).trim(); variantPrice = toSafeNumber(activeSwatch.dataset.price, price); variantImage = toSafeImage(activeSwatch.dataset.image) || image; }
      else if (product && (product.variants || []).length > 0) { const firstVariant = product.variants[0]; variantId = normalizeVariantId(firstVariant.id) || variantId; variantPrice = toSafeNumber(firstVariant.price, price); variantImage = toSafeImage(firstVariant.image) || image; }
      if (!/^\d+$/.test(String(variantId || '').trim())) { showToast('Please select a valid variant.'); return; }
      if (!selected[variantId]) selected[variantId] = { id: variantId, price: variantPrice, image: variantImage, qty: 1, cardId: id }; else selected[variantId].qty++;
      updateCard();
    };
    const onDec = () => { let key = null; if (selected[id]) { key = id; } else { const activeSwatch = card.querySelector('.cdo-variant-swatch.active'); const activeVariantId = activeSwatch ? activeSwatch.dataset.variantId : null; if (activeVariantId && selected[activeVariantId]) key = activeVariantId; if (!key) key = Object.keys(selected).find(k => selected[k].cardId === id); } if (key) { selected[key].qty--; if (selected[key].qty <= 0) delete selected[key]; updateCard(); } };
    const incBtn = card.querySelector('.increment-btn'); const decBtn = card.querySelector('.decrement-btn'); const addBtn = card.querySelector('.cdo-add-btn');
    if (incBtn) incBtn.addEventListener('click', onInc); if (decBtn) decBtn.addEventListener('click', onDec); if (addBtn) addBtn.addEventListener('click', onInc);
    card.querySelectorAll('.cdo-variant-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => { e.stopPropagation(); const vId = swatch.dataset.variantId; const vPrice = toSafeNumber(swatch.dataset.price, price); const vImg = toSafeImage(swatch.dataset.image) || image; card.querySelectorAll('.cdo-variant-swatch').forEach(s => s.classList.remove('active')); swatch.classList.add('active'); const mainImg = card.querySelector('img'); if (mainImg) mainImg.src = vImg; const priceDiv = card.querySelector('.cdo-card-price'); if (priceDiv) priceDiv.textContent = formatMoney(vPrice * 100); onInc({ id: vId, price: vPrice, image: vImg }); });
    });
  });
  const resetBtn = document.getElementById('cdo-reset-btn'); const checkoutBtn = document.getElementById('cdo-checkout-btn'); const previewATC = document.getElementById('cdo-preview-atc-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => { Object.keys(selected).forEach(k => delete selected[k]); document.querySelectorAll('.cdo-card').forEach(c => { const qty = 0; const qtyEl = c.querySelector('.cdo-qty-value'); if (qtyEl) qtyEl.value = 0; c.style.border = `2px solid ${cfg.preview_item_border_color||'#f0f0f0'}`; const addBtn = c.querySelector('.cdo-add-btn'); if (addBtn) addBtn.textContent = cfg.add_btn_text || cfg.product_add_btn_text || 'Add'; const tick = c.querySelector('.cdo-tick'); if (tick) tick.classList.remove('visible'); }); updateAll(); });
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
    const items = buildValidLineItems(); if (!items.length) { showToast('Please add at least one valid product.'); return; }
    try { var templateName = (typeof template !== 'undefined' && template.name) ? template.name : (window.comboTemplateName || ''); var templateId = (typeof template !== 'undefined' && template.id) ? template.id : (window.comboTemplateId || ''); var templateUrl = (typeof template !== 'undefined' && template.url) ? template.url : window.location.href; var pageUrl = window.location.href; var shopDomain = (window.Shopify && window.Shopify.shop) ? window.Shopify.shop : window.location.hostname; var visitorId = sessionStorage.getItem('cdo_uid') || ''; if (!visitorId) { visitorId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('cdo_uid', visitorId); } var trackingData = { template_name: templateName, template_id: templateId, template_url: templateUrl, page_url: pageUrl, shop_domain: shopDomain, visitor_id: visitorId }; var url = 'https://darkblue-dotterel-303283.hostingersite.com/clicks.php'; var payload = JSON.stringify(trackingData); if (navigator.sendBeacon) { var blob = new Blob([payload], { type: 'application/json' }); navigator.sendBeacon(url, blob); } else { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){}); } } catch (e) { }
    const checkoutItems = items.map(item => `${item.id}:${item.quantity}`).join(','); window.location.assign(rootUrl + 'cart/' + checkoutItems + '?checkout');
  });
  if (previewATC) previewATC.addEventListener('click', async () => { const items = buildValidLineItems(); if (!items.length) { showToast('Please add at least one valid product.'); return; } await fetch(rootUrl+'cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})}); showToast('Added to cart!'); });
  updateAll();
}

/* ===================== MAIN BOOTSTRAP ===================== */
document.addEventListener('DOMContentLoaded', async function() {
  const shopDomain = (window.Shopify && window.Shopify.shop) ? window.Shopify.shop : window.location.hostname;
  const root = document.getElementById('combo-builder-root');
  if (!root) return;

  let slug = '';
  const pathMatch = window.location.pathname.match(/\/pages\/([^/?#]+)/);
  if (pathMatch && pathMatch[1]) slug = pathMatch[1];
  if (!slug) { root.style.display = 'block'; root.innerHTML = '<div style="color:red;text-align:center;padding:40px;">Combo page not found.</div>'; return; }

  try {
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    const proxyEndpoint = `/apps/combo/templates.php?shop=${encodeURIComponent(shopDomain)}&handle=${encodeURIComponent(slug)}${isPreview ? '&preview=1' : ''}`;
    const response = await fetch(proxyEndpoint); if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const result = await response.json(); const templates = result.templates || result.data || [];

    if (result.success && templates.length > 0) {
      const template = isPreview ? templates[0] : (templates.find(t => t.active) || null);
      if (!template) return;
      const cfg = template.config || {};
      if (typeof cfg.show_sold_out_products === 'undefined') { cfg.show_sold_out_products = String(root?.dataset?.showSoldOutProducts || '').toLowerCase() === 'true'; }
      const layout = cfg.layout || 'layout1';
      let products = [];
      try {
        const collectionHandles = new Set();
        if (layout === 'layout1') { const numSteps = parseInt(cfg.max_selections || 3); for (let i = 1; i <= numSteps; i++) { if (cfg[`step_${i}_collection`]) { collectionHandles.add(cfg[`step_${i}_collection`]); } } }
        else if (layout === 'layout2') { const tabCount = parseInt(cfg.tab_count || 4); for (let i = 1; i <= tabCount; i++) { if (cfg[`col_${i}`]) collectionHandles.add(cfg[`col_${i}`]); } }
        else if (layout === 'layout3') { for (let i = 1; i <= 4; i++) { if (cfg[`col_${i}`]) collectionHandles.add(cfg[`col_${i}`]); } }
        else { if (cfg.collection_handle) collectionHandles.add(cfg.collection_handle); }
        const fetchPromises = [...collectionHandles].map(handle => fetch(`/collections/${handle}/products.json?limit=50`).then(r => r.json()).then(data => (data.products || []).map(p => ({ id: `gid://shopify/Product/${p.id}`, title: p.title, handle: p.handle, price: p.variants?.[0]?.price || '0.00', image: p.images?.[0]?.src || '', available: p.available, inventory_quantity: (p.variants || []).reduce((s, v) => s + (parseInt(v.inventory_quantity) || 0), 0), collection_handle: handle, step: [...collectionHandles].indexOf(handle) + 1, step_limit: cfg[`step_${[...collectionHandles].indexOf(handle) + 1}_limit`] || null, variants: (p.variants || []).map(v => ({ id: `gid://shopify/ProductVariant/${v.id}`, title: v.title, price: v.price, available: v.available, inventory_quantity: v.inventory_quantity, image: v.featured_image?.src || null })) }))));
        const results = await Promise.all(fetchPromises); products = results.flat();
      } catch(fetchErr) { console.error('[Combo] Failed to fetch fresh products:', fetchErr); root.style.display = 'block'; root.innerHTML = '<div style="color:red;text-align:center;padding:40px;">Failed to load live products. Please refresh or contact support.</div>'; return; }
      products = filterProductsByStock(products, cfg); trackVisit(template.name || slug);
      const mainContent = document.querySelector('main') || document.querySelector('#MainContent') || document.querySelector('.main-content') || document.querySelector('[role="main"]');
      if (mainContent) { mainContent.innerHTML = ''; mainContent.appendChild(root); }
      root.style.display = 'block';
      if (isPreview && !template.active) { const banner = document.createElement('div'); banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:99999;background:#ff6b00;color:#fff;text-align:center;padding:10px 16px;font-size:14px;font-weight:700;'; banner.innerHTML = '🔒 Preview Mode — This combo is <strong>inactive</strong>. <a href="' + window.location.href.split('?')[0] + '" style="color:#fff;text-decoration:underline;margin-left:8px;">Exit Preview</a>'; document.body.prepend(banner); document.body.style.paddingTop = '44px'; }
      if (layout === 'layout1') renderLayout1(cfg, products, root); else if (layout === 'layout2') renderLayout2(cfg, products, root, template); else if (layout === 'layout3') renderLayout3(cfg, products, root, template); else renderLayoutGrid(cfg, products, root);
    }
  } catch (err) { console.error('[Combo Builder] Failed to load:', err); if (root) { root.style.display = 'block'; root.innerHTML = '<div style="text-align:center;padding:40px;color:red;">Failed to load combo builder.</div>'; } }
});
