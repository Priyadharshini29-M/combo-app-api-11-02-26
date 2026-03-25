/* ===================== PRODUCT CARD ===================== */
function renderProductCard(cfg, product) {
  const viewport   = window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile   = viewport < 768;
  const isTablet   = viewport >= 768 && viewport < 1024;
  const titleSize  = isMobile ? (cfg.product_title_size_mobile  || 13) : (cfg.product_title_size_desktop  || 15);
  const priceSize  = isMobile ? (cfg.product_price_size_mobile  || 13) : (cfg.product_price_size_desktop  || 15);
  const imgRatio = getProductImageRatio(cfg);
  const cardPad    = cfg.product_card_padding ?? 10;
  const borderColor= cfg.preview_item_border_color || '#f0f0f0';
  const addBtnText = cfg.add_btn_text || cfg.product_add_btn_text || 'Add';
  const addBtnBg   = cfg.add_btn_bg || cfg.product_add_btn_color || '#000';
  const addBtnColor= cfg.add_btn_text_color || cfg.product_add_btn_text_color || '#fff';
  const addBtnSize = isMobile
    ? Math.min(cfg.add_btn_font_size || cfg.product_add_btn_font_size || 14, 14)
    : (cfg.add_btn_font_size || cfg.product_add_btn_font_size || 14);
  const addBtnW    = cfg.add_btn_font_weight || cfg.product_add_btn_font_weight || 600;
  const addBtnRadius = cfg.add_btn_border_radius ?? 8;
  const showQty    = cfg.show_quantity_selector !== false;
  const showTick   = cfg.show_selection_tick !== false;
  const hlColor    = cfg.selection_highlight_color || cfg.primary_color || '#000';
  const soldOut    = !isProductInStock(product);
  
  const variants = product.variants || [];
  const hasVariants = variants.length > 1;
  const displayMode = cfg.product_card_variants_display || 'static';
  
  let defaultVariant = null;
  const initialPrice = product.price;
  const initialImage = product.image || '';
  
  let allVariantsSoldOut = false;
  if (hasVariants) {
    allVariantsSoldOut = variants.every(v => v.available === false || (typeof v.inventory_quantity !== 'undefined' && parseInt(v.inventory_quantity, 10) <= 0));
  }
  let productId = (product.id || '').replace('gid://shopify/Product/', '');
  if (product.variants && product.variants.length === 1) {
    productId = (product.variants[0].id || '').replace('gid://shopify/ProductVariant/', '');
  }
  
  let variantsHtml = '';
  if (hasVariants && displayMode === 'hover') {
    variantsHtml = `
    <div class="cdo-variant-hover-popup">
      ${variants.map(v => {
        const vId = (v.id || '').replace('gid://shopify/ProductVariant/', '');
        const vAvailable = v.available !== false && (typeof v.inventory_quantity === 'undefined' || parseInt(v.inventory_quantity, 10) > 0);
        return `<div class="cdo-variant-swatch${!vAvailable ? ' cdo-variant-soldout' : ''}" data-variant-id="${vId}" data-price="${v.price}" data-image="${v.image || product.image || ''}" title="${v.title}">
          ${v.title}${!vAvailable ? ' (Sold Out)' : ''}
        </div>`;
      }).join('')}
    </div>`;
  } else if (hasVariants && displayMode === 'static') {
    const selectBg        = cfg.variant_select_bg || '#f9f9f9';
    const selectBorder    = cfg.variant_select_border_color || '#e0e0e0';
    const selectText      = cfg.variant_select_text_color || cfg.text_color || '#333';
    const selectRadius    = cfg.variant_select_border_radius ?? 8;
    const selectFontSize  = cfg.variant_select_font_size || 13;
    const selectPadV      = cfg.variant_select_padding_vertical || 9;
    const selectPadH      = cfg.variant_select_padding_horizontal || 12;
    const selectMarginT   = cfg.variant_select_margin_top || 10;
    const selectMarginB   = cfg.variant_select_margin_bottom || 12;
    const focusColor      = cfg.selection_highlight_color || cfg.add_btn_bg || '#000';

    variantsHtml = `
      <div class="cdo-variant-select-wrap" style="margin:${selectMarginT}px 0 ${selectMarginB}px;position:relative;">
        <select class="cdo-variant-static-select" style="
          width:100%;
          padding:${selectPadV}px ${parseInt(selectPadH)+24}px ${selectPadV}px ${selectPadH}px;
          border-radius:${selectRadius}px;
          border:1.5px solid ${selectBorder};
          background:${selectBg};
          font-size:${selectFontSize}px;
          font-weight:600;
          color:${selectText};
          appearance:none;
          -webkit-appearance:none;
          cursor:pointer;
          outline:none;
          transition:border-color 0.2s,box-shadow 0.2s;
          box-shadow:0 1px 3px rgba(0,0,0,0.06);
        ">
          <option value="" disabled selected style="color:#aaa;">${cfg.variant_select_placeholder || '— Select a variant —'}</option>
          ${variants.map(v => {
            const vId = (v.id || '').replace('gid://shopify/ProductVariant/', '');
            const vAvailable = v.available !== false && (typeof v.inventory_quantity === 'undefined' || parseInt(v.inventory_quantity, 10) > 0);
            return `<option value="${vId}" data-price="${v.price}" data-image="${v.image || product.image || ''}"${!vAvailable ? ' disabled ' : ''}>${v.title}${!vAvailable ? ' (Sold Out)' : ''}</option>`;
          }).join('')}
        </select>
        <div style="pointer-events:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="${selectText}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;
  }

  return `
  <div class="cdo-card ${soldOut ? 'cdo-sold-out' : ''}" data-id="${productId}" data-price="${product.price}" data-image="${product.image || ''}" data-step="${product.step || 1}" data-steplimit="${product.step_limit || ''}" data-collection="${product.collection_handle || ''}" data-soldout="${soldOut ? '1' : '0'}"
       style="border:2px solid ${borderColor};border-radius:12px;padding:${cardPad}px;background:#fff;display:flex;flex-direction:column;transition:border-color 0.2s;overflow:hidden;">
    ${soldOut ? '<div class="cdo-soldout-pill">Sold Out</div>' : ''}
    ${showTick ? '<div class="cdo-tick" style="white-space:nowrap;background:'+hlColor+';">✓</div>' : ''}
    <div class="cdo-img-wrapper" style="--cdo-image-ratio:${imgRatio.cssRatio};--cdo-image-ratio-fallback:${imgRatio.fallbackPadding};">
      <img src="${initialImage}" alt="${product.title || ''}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
      ${displayMode === 'hover' ? variantsHtml : ''}
    </div>
    ${displayMode === 'static' ? variantsHtml : ''}
    <div style="font-size:${titleSize}px;font-weight:700;margin-bottom:4px;color:${cfg.text_color||'#111'};line-height:1.3;">${product.title || ''}</div>
    <div style="font-weight:800;font-size:${priceSize}px;color:${cfg.primary_color||cfg.add_btn_bg||'#000'};margin-bottom:10px;" class="cdo-card-price">${formatMoney(initialPrice)}</div>
    <div class="cdo-card-actions" style="margin-top:auto;display:flex;align-items:center;gap:6px;${showQty && isMobile ? 'flex-wrap:wrap;' : ''}">
      ${showQty ? `
      <div class="cdo-qty-wrap" style="display:flex;align-items:center;${isMobile ? 'width:100%;' : ''}">
        <button type="button" class="cdo-qty-btn decrement-btn" style="border-radius:6px 0 0 6px;">−</button>
        <input type="number" class="cdo-qty-value" value="0" readonly>
        <button type="button" class="cdo-qty-btn increment-btn" style="border-radius:0 6px 6px 0;">+</button>
      </div>` : ''}
      <button type="button" class="cdo-add-btn"
        style="flex:1;background:${addBtnBg};color:${addBtnColor};border:none;padding:${isMobile ? 10 : 8}px 12px;border-radius:${addBtnRadius}px;font-weight:${addBtnW};font-size:${addBtnSize}px;cursor:pointer;min-height:40px;${(soldOut || allVariantsSoldOut || (hasVariants && displayMode !== 'popup')) ? 'opacity:0.7;cursor:not-allowed;' : ''}"
        ${(soldOut || allVariantsSoldOut || (hasVariants && displayMode !== 'popup')) ? 'disabled' : ''}>
        ${addBtnText}
      </button>
    </div>
  </div>`;
}

/* ===================== PREVIEW BAR HTML ===================== */
function getPreviewBarHtml(cfg) {
  if (cfg.show_preview_bar === false) return '';
  const viewport = window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const max      = parseInt(cfg.max_products) || 5;
  const shape    = cfg.preview_item_shape === 'circle' ? '50%' : (cfg.preview_border_radius || 8) + 'px';
  const baseItemSize = cfg.preview_item_size || 56;
  const itemSize = isMobile ? Math.min(baseItemSize, 44) : (isTablet ? Math.min(baseItemSize, 50) : baseItemSize);
  const borderColor = cfg.preview_item_border_color || 'rgba(0,0,0,0.2)';
  const padTop   = cfg.preview_bar_padding_top    ?? cfg.preview_bar_padding ?? 16;
  const padBot   = cfg.preview_bar_padding_bottom ?? cfg.preview_bar_padding ?? 16;
  const padH     = isMobile ? 12 : (isTablet ? 14 : 16);
  const fullW    = cfg.preview_bar_full_width !== false;
  const radius   = cfg.preview_border_radius || 0;

  let slotsHtml = '';
  for (let i = 1; i <= max; i++) {
    slotsHtml += `<div id="cdo-slot-${i}" style="width:${itemSize}px;height:${itemSize}px;border:2px dashed ${borderColor};border-radius:${shape};display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,0.3);font-size:18px;flex-shrink:0;overflow:hidden;transition:all 0.3s;">+</div>`;
  }

  const motivHtml = `<div id="cdo-motiv" style="font-size:${cfg.preview_motivation_size || 13}px;color:${cfg.preview_motivation_color || cfg.preview_bar_text_color || '#666'};margin:0;display:none;"></div>`;

  const showCheckout = cfg.show_preview_checkout_btn !== false;
  const showATC      = cfg.show_preview_add_to_cart_btn === true;
  const showReset    = cfg.show_reset_btn !== false;

  const buttonBasis = isMobile ? 'flex:1 1 calc(50% - 4px);min-width:120px;' : (isTablet ? 'flex:0 1 auto;' : '');
  const checkoutBtnStyle = `background:${cfg.preview_checkout_btn_bg || cfg.checkout_btn_bg || '#000'};color:${cfg.preview_checkout_btn_text_color || cfg.checkout_btn_text_color || '#fff'};border:none;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;
  const atcBtnStyle = `background:${cfg.preview_add_to_cart_btn_bg || '#fff'};color:${cfg.preview_add_to_cart_btn_text_color || '#000'};border:1px solid #e0e0e0;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;
  const resetBtnStyle = `background:${cfg.preview_reset_btn_bg || '#ff4d4d'};color:${cfg.preview_reset_btn_text_color || '#fff'};border:none;padding:10px 18px;border-radius:${radius}px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:44px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;${buttonBasis}${isMobile ? 'text-align:center;' : ''}`;

  const rowStyle = isMobile ? 'display:flex;align-items:stretch;justify-content:space-between;gap:12px;flex-direction:column;' : (isTablet ? 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;' : 'display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap;');
  const rightColStyle = isMobile ? 'display:flex;align-items:center;gap:10px;margin-left:0;flex-wrap:wrap;width:100%;flex-direction:column;' : (isTablet ? 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-left:0;flex-wrap:wrap;width:100%;' : 'display:flex;align-items:center;gap:12px;margin-left:auto;flex-wrap:nowrap;');
  const priceStyle = isMobile ? 'display:flex;flex-direction:column;align-items:center;line-height:1.3;width:100%;' : (isTablet ? 'display:flex;flex-direction:column;align-items:flex-start;line-height:1.3;' : 'display:flex;flex-direction:column;align-items:flex-end;line-height:1.3;');
  const buttonsStyle = isMobile ? 'display:flex;gap:8px;flex-wrap:wrap;width:100%;justify-content:stretch;' : (isTablet ? 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;' : 'display:flex;gap:8px;flex-wrap:nowrap;');

  const checkoutBtnHtml = showCheckout ? `<button id="cdo-checkout-btn" type="button" style="${checkoutBtnStyle}">${cfg.preview_checkout_btn_text || cfg.checkout_btn_text || 'Checkout'}</button>` : '';
  const atcBtnHtml = showATC ? `<button id="cdo-preview-atc-btn" type="button" style="${atcBtnStyle}">${cfg.preview_add_to_cart_btn_text || 'Add to Cart'}</button>` : '';
  const resetBtnHtml = showReset ? `<button id="cdo-reset-btn" type="button" style="${resetBtnStyle}">${cfg.preview_reset_btn_text || 'Reset'}</button>` : '';
  const titleHtml = cfg.preview_bar_title ? `<div style="font-size:${cfg.preview_bar_title_size || 14}px;font-weight:700;color:${cfg.preview_bar_title_color || cfg.preview_bar_text_color || '#000'};margin-bottom:8px;">${cfg.preview_bar_title}</div>` : '';

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

/* ===================== BANNER HTML ===================== */
function getBannerHtml(cfg) {
  if (cfg.show_banner === false) return '';
  const desktopUrl = cfg.banner_image_url || '';
  if (!desktopUrl) return '';
  const isMobile  = window.innerWidth < 768;
  const mobileUrl = cfg.banner_image_mobile_url || desktopUrl;
  const src  = isMobile ? mobileUrl : desktopUrl;
  const fit  = cfg.banner_fit_mode === 'adapt' ? 'contain' : (cfg.banner_fit_mode || 'cover');
  const h    = cfg.banner_fit_mode === 'adapt' ? 'auto' : ((isMobile ? (cfg.banner_height_mobile || 120) : (cfg.banner_height_desktop || 180)) + 'px');
  const wPct = isMobile ? (cfg.banner_width_mobile || 100) : (cfg.banner_width_desktop || 100);
  const full = cfg.banner_full_width === true;
  return `<div style="width:${full ? '100%' : wPct + '%'};margin:0 auto;overflow:hidden;">
    <img src="${src}" style="width:100%;height:${h};object-fit:${fit};display:block;" loading="lazy">
  </div>`;
}

function initBannerSlider(cfg) {
  const slider = document.getElementById('cdo-banner-slider');
  if (!slider) return;
  const track = document.getElementById('cdo-slider-track');
  const dots  = slider.querySelectorAll('.cdo-slider-dot');
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
  const tpad = `${cfg.title_container_padding_top||0}px ${cfg.title_container_padding_right||0}px ${cfg.title_container_padding_bottom||0}px ${cfg.title_container_padding_left||0}px`;
  const tmar = `${cfg.title_container_margin_top||0}px ${cfg.title_container_margin_right||0}px ${cfg.title_container_margin_bottom||0}px ${cfg.title_container_margin_left||0}px`;
  const dpad = `${cfg.description_container_padding_top||0}px ${cfg.description_container_padding_right||0}px ${cfg.description_container_padding_bottom||0}px ${cfg.description_container_padding_left||0}px`;
  const dmar = `${cfg.description_container_margin_top||0}px ${cfg.description_container_margin_right||0}px ${cfg.description_container_margin_bottom||0}px ${cfg.description_container_margin_left||0}px`;
  return `
  <div style="width:${w}%;box-sizing:border-box;">
    <div style="padding:${tpad};margin:${tmar};text-align:${cfg.heading_align || 'left'};">
      <h1 style="font-size:${cfg.heading_size||28}px;font-weight:${cfg.heading_font_weight||700};color:${cfg.heading_color||'#333'};margin:0;">${cfg.collection_title||'Create Your Combo'}</h1>
    </div>
    ${cfg.collection_description ? `<div style="padding:${dpad};margin:${dmar};text-align:${cfg.description_align||'left'};"><p style="font-size:${cfg.description_size||15}px;font-weight:${cfg.description_font_weight||400};color:${cfg.description_color||'#666'};line-height:1.5;margin:0;">${cfg.collection_description}</p></div>` : ''}
  </div>`;
}

/* ===================== PROGRESS BAR HTML ===================== */
function getProgressHtml(cfg) {
  if (!cfg.show_progress_bar) return '';
  const viewport = window.innerWidth || document.documentElement.clientWidth || 1024;
  const isMobile = viewport < 768;
  const isTablet = viewport >= 768 && viewport < 1024;
  const w = cfg.progress_bar_width || 100;
  const pad = isMobile ? '12px 12px' : (isTablet ? '14px 16px' : '16px 20px');
  const labelSize = isMobile ? 10 : 11;
  const unlockSize = isMobile ? 12 : 13;
  return `
  <div style="background:${cfg.progress_container_bg||'#fff'};padding:${pad};border-bottom:1px solid #eee;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
    <div style="max-width:${w}%;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:${labelSize}px;font-weight:800;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;gap:8px;flex-wrap:wrap;">
        <span style="color:${cfg.progress_text_color||cfg.progress_bar_color||'#000'};">${cfg.progress_text||'Bundle Progress'}</span>
        <span id="cdo-progress-text" style="color:${cfg.progress_text_color||'#5c5f62'};">0%</span>
      </div>
       <div id="cdo-progress-track" style="--cdo-progress-color:${cfg.progress_bar_color || '#1a6644'};position:relative;overflow:hidden;border-radius:10px;background:#e0e0e0;height:10px;width:100%;">
    <div id="cdo-progress-bar" style="position:absolute;top:0;left:0;height:100%;width:100%;transform-origin:left center;transform:scaleX(0);transition:transform 0.55s cubic-bezier(0.4,0,0.2,1), background-color 0.35s ease;
    background:var(--cdo-progress-color, #1a6644);">
      <div id="cdo-progress-bar-fill" style="position:absolute;inset:0;background:var(--cdo-progress-color, #1a6644);border-radius:10px;transition:background-color 0.35s ease;"></div>
    </div>
  </div>
      <div id="cdo-unlock-msg" style="margin-top:${isMobile ? 8 : 10}px;font-size:${unlockSize}px;color:#6d7175;"></div>
    </div>
  </div>`;
}
