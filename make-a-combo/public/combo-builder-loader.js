(function() {
    // --- Dynamic Currency Conversion Utilities ---
    function formatCurrency(amount, currency) {
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount);
        } catch {
            return amount.toFixed(2) + ' ' + currency;
        }
    }

    function getConversionRate(base, target) {
        if (
            window.Shopify &&
            window.Shopify.currency &&
            window.Shopify.currency.rates &&
            window.Shopify.currency.rates[base] &&
            window.Shopify.currency.rates[target]
        ) {
            return window.Shopify.currency.rates[target] / window.Shopify.currency.rates[base];
        }
        return 1;
    }

    function getShopCurrency() {
        return (window.Shopify && window.Shopify.currency && window.Shopify.currency.shop_currency) || 'USD';
    }
    function getActiveCurrency() {
        return (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || getShopCurrency();
    }

    // --- Update all product card prices dynamically ---
    function updateProductCardPrices() {
        const shopCurrency = getShopCurrency();
        const activeCurrency = getActiveCurrency();
        const rate = getConversionRate(shopCurrency, activeCurrency);
        document.querySelectorAll('.combo-product-price').forEach((el) => {
            const basePrice = parseFloat(el.getAttribute('data-base-price'));
            if (isNaN(basePrice)) return;
            const converted = basePrice * rate;
            el.textContent = formatCurrency(converted, activeCurrency);
        });
    }

    document.addEventListener('shopify:currency-change', updateProductCardPrices);
    console.log(">>> Combo Builder: Script is LIVE! <<<");
    let root = document.getElementById('make-a-combo-app');
    const isShopifyPage = window.location.pathname.indexOf('/pages/') !== -1;
    const pathParts = window.location.pathname.split('/');
    const currentHandle = (pathParts[pathParts.length - 1] || "").toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = (urlParams.get('view') || "").toLowerCase();

    console.log("Combo Builder: Loader Data -> Path:", window.location.pathname, "Handle:", currentHandle);

    // 1. Robust appUrl Detection
    let appUrl = null;
    if (root) {
        const dUrl = root.getAttribute('data-app-url');
        if (dUrl && !dUrl.includes('your-app-domain')) appUrl = dUrl;
    }

    if (!appUrl) {
        const scripts = document.getElementsByTagName('script');
        for (let s of scripts) {
            if (s.src && (s.src.includes('combo-builder-loader.js'))) {
                const parts = s.src.split('/combo-builder-loader.js');
                if (parts.length > 1 && !parts[0].includes('your-app-domain')) {
                    appUrl = parts[0];
                    break;
                }
            }
        }
    }

    if (!appUrl || appUrl.includes('your-app-domain')) {
        console.warn("Combo Builder: Detected placeholder or missing appUrl. Falling back to current origin.");
        appUrl = window.location.origin;
    }

    // 2. Aggressive Injection for "Default" behavior
    async function start() {
        console.log("Combo Builder: Executing Start Sequence...");

        if (root || isShopifyPage) {
            if (!root) {
                root = document.createElement('div');
                root.id = 'make-a-combo-app';
                root.style.cssText = 'min-height: 50px; width: 100%; display: block; background: #f4f6f8; border: 1px dashed #5c6ac4; color: #5c6ac4; text-align: center; padding: 20px; font-family: sans-serif; margin: 20px 0;';
                root.innerHTML = '<b>Combo Builder:</b> Connecting to app server...';

                const target = document.querySelector('main') || document.querySelector('#MainContent') || document.body;
                if (target === document.body) target.appendChild(root);
                else target.prepend(root);
            }
        }

        if (!isShopifyPage && !root) {
            console.log("Combo Builder: Not a /pages/ URL and no root div found. Skipping.");
            return;
        }

        let fetchUrl;
        let lastConfigStr = "";

        try {
            let searchKey = currentHandle;
            if (viewParam && viewParam !== 'combo_builder' && viewParam !== 'page') {
                searchKey = viewParam;
            }

            const templateId = root.getAttribute('data-template-id');
            const isStorefront = window.location.hostname.includes('myshopify.com') || (window.Shopify && window.Shopify.shop);

            if (templateId && templateId !== "null") {
                fetchUrl = isStorefront ? `/apps/combo/templates.php?id=${templateId}` : `/api/templates.php?id=${templateId}`;
            } else {
                fetchUrl = isStorefront ? `/apps/combo/templates.php?handle=${searchKey.toLowerCase()}` : `/api/templates.php?handle=${searchKey.toLowerCase()}`;
            }

            const shopDomainForFallback = (window.Shopify && (window.Shopify.shop || window.Shopify.shop_domain)) || '';
            const fallbackBaseUrl = appUrl && !appUrl.includes('your-app-domain') ? appUrl : '';
            const fallbackTemplateUrl = (() => {
                if (!fallbackBaseUrl) return '';
                const params = new URLSearchParams();
                if (templateId && templateId !== 'null') {
                    params.set('id', templateId);
                } else {
                    params.set('handle', String(searchKey || '').toLowerCase());
                }
                if (shopDomainForFallback) params.set('shop', shopDomainForFallback);
                return `${fallbackBaseUrl}/api/templates?${params.toString()}`;
            })();

            console.log("Combo Builder: Fetching design from:", fetchUrl);

            const checkForUpdates = async (isPolling = false) => {
                try {
                    let response = await fetch(fetchUrl);
                    if (
                        !response.ok &&
                        isStorefront &&
                        fallbackTemplateUrl &&
                        (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 500)
                    ) {
                        console.warn(`Combo Builder: App proxy returned ${response.status}. Falling back to ${fallbackTemplateUrl}`);
                        response = await fetch(fallbackTemplateUrl, { credentials: 'omit' });
                    }

                    if (!response.ok) {
                        if (!isPolling) {
                            root.innerHTML = `<div style="color: red;"><b>Combo Builder Error:</b> Server returned ${response.status}. Please check your App Connection.</div>`;
                            throw new Error(`Server returned ${response.status}`);
                        }
                        return;
                    }

                    const result = await response.json();

                    if (result.success && result.data) {
                        if (result.data.active === false) {
                            console.warn("Combo Builder: This template is not yet Active. Hiding UI.");
                            if (root) root.style.display = 'none';
                            return;
                        }

                        const newConfigStr = JSON.stringify(result.data.config);

                        if (newConfigStr !== lastConfigStr) {
                            console.log(isPolling ? "Combo Builder: Update detected, refreshing..." : "Combo Builder: Configuration Found ->", result.data.title);

                            lastConfigStr = newConfigStr;
                            state.config = result.data.config;

                            if (root) root.style.display = 'block';

                            const collectionHandles = new Set();
                            if (state.config.collection_handle) collectionHandles.add(state.config.collection_handle);

                            for (let i = 1; i <= 8; i++) {
                                const handle = state.config[`col_${i}`];
                                if (handle) collectionHandles.add(handle);
                            }

                            for (let i = 1; i <= 10; i++) {
                                const handle = state.config[`step_${i}_collection`];
                                if (handle) collectionHandles.add(handle);
                            }

                            if (collectionHandles.size > 0) {
                                try {
                                    console.log("Combo Builder: Fetching products for collections:", Array.from(collectionHandles));

                                    const allProducts = [];
                                    const processedProducts = new Set();
                                    state.collectionProducts = {};

                                    for (const handle of collectionHandles) {
                                        const colRes = await fetch(`/collections/${handle}.json`);
                                        let colTitle = handle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        if (colRes.ok) {
                                            const colData = await colRes.json();
                                            if (colData.collection && colData.collection.title) colTitle = colData.collection.title;
                                        }
                                        state.collectionInfo = state.collectionInfo || {};
                                        state.collectionInfo[handle] = { title: colTitle };

                                        const prodRes = await fetch(`/collections/${handle}/products.json`);
                                        if (prodRes.ok) {
                                            const prodData = await prodRes.json();
                                            if (prodData.products && prodData.products.length > 0) {
                                                state.collectionProducts[handle] = prodData.products.map((p) => ({
                                                    ...p,
                                                    __collectionHandle: handle,
                                                }));
                                                prodData.products.forEach(p => {
                                                    if (!processedProducts.has("" + p.id)) {
                                                        const mapped = {
                                                            id: "" + p.id,
                                                            title: p.title,
                                                            handle: p.handle,
                                                            images: p.images || [],
                                                            featured_image: p.images && p.images.length > 0 ? p.images[0].src : null,
                                                            variants: p.variants.map(v => ({
                                                                id: "" + v.id,
                                                                title: v.title,
                                                                price: v.price
                                                            }))
                                                        };
                                                        allProducts.push(mapped);
                                                        processedProducts.add("" + p.id);
                                                    }
                                                });
                                            }
                                        }
                                    }

                                    if (allProducts.length > 0) {
                                        state.products = allProducts;
                                        console.log(`Combo Builder: Found ${allProducts.length} total products across all selected collections.`);
                                    } else {
                                        console.warn("Combo Builder: No products found in any of the selected collections.");
                                    }
                                } catch (err) {
                                    console.error("Combo Builder: Multi-collection fetch failed", err);
                                }
                            }

                            if (!isPolling) {
                                root.innerHTML = '';
                                root.style.cssText = 'min-height: 400px; width: 100%; display: block; clear: both; background: #fff; position: relative; z-index: 1;';
                            }

                            render();
                        }
                    } else if (!isPolling) {
                        root.style.display = 'none';
                        console.warn("Combo Builder: No matching template found for '" + searchKey + "'. Hide UI.");
                    }
                } catch (err) {
                    if (!isPolling) console.error("Combo Builder: Update Check Failed:", err);
                }
            };

            await checkForUpdates();
            setInterval(() => checkForUpdates(true), 10000);

        } catch (e) {
            console.error("Combo Builder: Connection Failed:", e);
            if (root) root.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;"><b>Combo Builder:</b> Could not reach the app server. If you are developing locally, ensure ngrok/cloudflare is running.</div>`;
        }
    }

    const mockProducts = [
        { id: "1", title: "Snowboard", variants: [{ id: "101", title: "Default", price: "100.00" }] },
        { id: "2", title: "Ski Goggles", variants: [{ id: "201", title: "Blue", price: "50.00" }, { id: "202", title: "Red", price: "55.00" }] },
        { id: "3", title: "Winter Hat", variants: [{ id: "301", title: "Red", price: "25.00" }] },
        { id: "4", title: "Gloves", variants: [{ id: "401", title: "L", price: "30.00" }] },
        { id: "5", title: "Snow Jacket", variants: [{ id: "501", title: "Blue", price: "150.00" }] },
        { id: "6", title: "Snow Pants", variants: [{ id: "601", title: "Black", price: "120.00" }] }
    ];

    let state = {
        config: null,
        selectedProducts: [],
        quantities: {},
        activeTab: 'all',
        collectionProducts: {},
        products: [],
        selectedVariantByProduct: {}
    };

    let isCartActionInFlight = false;

    function renderError(msg) {
        root.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">${msg}</div>`;
    }

    let renderTimeout = null;
    function debouncedRender() {
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => render(), 100);
    }

    function render() {
        console.log("Combo Builder: Applying configuration...");
        try {
            if (!state.config) {
                console.error("Combo Builder: Cannot render without config.");
                return;
            }
            const cfg = state.config;
            const isMobile = window.innerWidth <= 768;

            root.style.opacity = '1';
            root.style.visibility = 'visible';
            root.style.display = 'block';
            root.style.zIndex = '1';

            const paddingTop = isMobile ? (cfg.container_padding_top_mobile || 0) : (cfg.container_padding_top_desktop || 0);
            const paddingRight = isMobile ? (cfg.container_padding_right_mobile || 0) : (cfg.container_padding_right_desktop || 0);
            const paddingBottom = isMobile ? (cfg.container_padding_bottom_mobile || 0) : (cfg.container_padding_bottom_desktop || 0);
            const paddingLeft = isMobile ? (cfg.container_padding_left_mobile || 0) : (cfg.container_padding_left_desktop || 0);

            root.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
            root.style.background = "#fff";
            root.style.boxSizing = "border-box";
            root.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;

            if (!document.getElementById('combo-hover-styles')) {
                const style = document.createElement('style');
                style.id = 'combo-hover-styles';
                style.innerHTML = `
                    .combo-product-card {
                        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                        cursor: default;
                    }
                    .combo-product-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important;
                        border-color: #ddd !important;
                    }
                    .combo-tab {
                        padding: 8px 18px;
                        border-radius: 50px;
                        border: 1px solid #e1e3e5;
                        background: #fff;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    }
                    .combo-tab.active {
                        background: ${cfg.selection_highlight_color || '#000'};
                        color: #fff;
                        border-color: ${cfg.selection_highlight_color || '#000'};
                    }
                    .combo-qty-control {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        justify-content: center;
                        width: 100%;
                        background: #f9f9f9;
                        border-radius: 50px;
                        padding: 6px;
                    }
                    .combo-qty-btn-circle {
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 1px solid #ddd;
                        background: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.2s;
                    }
                    .combo-qty-btn-circle:hover {
                        background: #eee;
                    }
                    @keyframes combo-bar-fill {
                        from { width: 0%; }
                        to { width: var(--fill-width); }
                    }
                `;
                document.head.appendChild(style);
            }

            // ----------------------------------------------------------------
            // Section Renderers
            // ----------------------------------------------------------------
            const sections = {
                // FIX 1: Removed the duplicate titleDescription definition.
                // Only one definition is kept here (the more complete one with width/padding support).
                titleDescription: () => {
                    if (!cfg.show_title_description) return '';
                    const hAlign = cfg.heading_align || 'left';
                    const dAlign = cfg.description_align || 'left';
                    const hWeight = cfg.heading_font_weight || '700';
                    const dWeight = cfg.description_font_weight || '400';
                    const width = cfg.title_width || 100;

                    const pt = cfg.title_container_padding_top || 20;
                    const pr = cfg.title_container_padding_right || 0;
                    const pb = cfg.title_container_padding_bottom || 20;
                    const pl = cfg.title_container_padding_left || 0;

                    return `
                        <div class="combo-section" style="width: ${width}%; margin: 0 auto; padding: ${pt}px ${pr}px ${pb}px ${pl}px; text-align: ${hAlign}; box-sizing: border-box;">
                            <h1 style="font-size: ${cfg.heading_size || 28}px; margin-bottom: 8px; color: ${cfg.heading_color || '#333'}; font-weight: ${hWeight}; line-height: 1.2; margin-top: 0;">${cfg.collection_title || ''}</h1>
                            <p style="font-size: ${cfg.description_size || 15}px; color: ${cfg.description_color || '#666'}; font-weight: ${dWeight}; text-align: ${dAlign}; margin: 0; line-height: 1.5;">${cfg.collection_description || ''}</p>
                        </div>
                    `;
                },

                banner: () => {
                    if (!cfg.show_banner) return '';

                    const bannerWidth = isMobile ? (cfg.banner_width_mobile || 100) : (cfg.banner_width_desktop || 100);
                    const bannerHeight = isMobile ? (cfg.banner_height_mobile || 150) : (cfg.banner_height_desktop || 200);
                    const fit = cfg.banner_fit_mode || 'cover';
                    const finalHeight = fit === 'adapt' ? 'auto' : `${bannerHeight}px`;
                    const imageUrl = (isMobile && cfg.banner_image_mobile_url) ? cfg.banner_image_mobile_url : cfg.banner_image_url;
                    const bannerImage = imageUrl || 'https://cdn.shopify.com/s/files/1/0070/7032/files/fresh-vegetables-and-fruits.jpg?v=1614349455';

                    const objectFit = (fit === 'cover' || fit === 'contain') ? fit : 'cover';
                    const imgStyle = `width: 100%; height: ${fit === 'adapt' ? 'auto' : '100%'}; object-fit: ${objectFit}; display: block;`;

                    const isFullWidth = !!cfg.banner_full_width;
                    const pl = isMobile ? (cfg.container_padding_left_mobile || 0) : (cfg.container_padding_left_desktop || 0);
                    const pr = isMobile ? (cfg.container_padding_right_mobile || 0) : (cfg.container_padding_right_desktop || 0);

                    const containerBaseStyle = `
                        position: relative;
                        width: ${isFullWidth ? `calc(100% + ${Number(pl) + Number(pr)}px)` : bannerWidth + '%'};
                        height: ${finalHeight};
                        margin: ${isFullWidth ? `0 -${pr}px 20px -${pl}px` : '0 auto 20px'};
                        ${isFullWidth ? 'border-radius: 0;' : 'border-radius: 8px;'}
                        overflow: hidden;
                        padding-top: ${cfg.banner_padding_top || 0}px;
                        padding-bottom: ${cfg.banner_padding_bottom || 0}px;
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: ${imageUrl ? 'none' : '#e0e0e0'};
                    `;

                    if (cfg.layout === 'layout2') {
                        return `
                            <div class="combo-section" style="${containerBaseStyle}">
                                <img src="${bannerImage}" alt="Banner" style="${imgStyle}">
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.7) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 24px 20px; color: white; box-sizing: border-box; pointer-events: none;">
                                    <h1 style="font-size: 36px; font-weight: 800; margin: 0; color: #fff;">${cfg.banner_title || cfg.collection_title || ''}</h1>
                                    <p style="font-size: 14px; opacity: 0.9; margin: 5px 0 0;">${cfg.banner_subtitle || cfg.collection_description || ''}</p>
                                </div>
                            </div>
                        `;
                    }

                    return `
                        <div class="combo-section" style="${containerBaseStyle}">
                            <img src="${bannerImage}" alt="Banner" style="${imgStyle}">
                        </div>
                    `;
                },

                // FIX 2: Removed the stray dead-code block ("Disabled inline preview bar...return '';}}") 
                // that was injected inside previewBar, causing a broken early return in the inline branch.
                previewBar: () => {
                    const isSticky = !!cfg.show_sticky_preview_bar;
                    const isInline = !!cfg.show_preview_bar;

                    if (!isSticky && !isInline) return '';
                    if (state.selectedProducts.length === 0 && isSticky) return '';

                    const calculateTotalRaw = () => state.selectedProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);
                    const total = calculateTotalRaw();
                    const discounted = parseFloat(calculateDiscounted());
                    const savings = total - discounted;
                    const threshold = Number(cfg.discount_threshold) || 5;
                    const totalQty = state.selectedProducts.length;

                    if (isSticky) {
                        // Sticky bar intentionally returns '' (rendered separately via React/native element)
                        return '';
                    }

                    // Inline Version
                    const maxSel = Number(cfg.max_selections) || 3;
                    const alignment = isMobile ? (cfg.preview_alignment_mobile || 'center') : (cfg.preview_alignment || 'center');
                    const gap = cfg.preview_item_gap || 12;
                    const baseSize = isMobile ? (maxSel > 3 ? Math.max(24, 44 - (maxSel - 3) * 6) : 44) : (maxSel > 3 ? Math.max(30, 56 - (maxSel - 3) * 8) : 56);

                    let slotsHtml = '';
                    for (let i = 0; i < maxSel; i++) {
                        const item = state.selectedProducts[i];
                        const shape = cfg.preview_item_shape === "circle" ? "50%" : `${cfg.preview_border_radius || 0}px`;
                        const widthLimit = cfg.preview_item_shape === "rectangle" ? (baseSize * 1.4) : baseSize;
                        const heightLimit = cfg.preview_item_shape === "rectangle" ? (baseSize * 0.8) : baseSize;

                        const slotContent = item
                            ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: ${shape};" alt="selected">`
                            : '<span style="opacity: 0.5">+</span>';

                        slotsHtml += `
                            <div style="width: ${widthLimit}px; height: ${heightLimit}px; background: #eee; border: 1px solid #eee; border-radius: ${shape}; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; position: relative; overflow: hidden;">
                                ${slotContent}
                            </div>
                        `;
                    }

                    return `
                        <div class="combo-section" id="combo-preview-bar-inline" style="width: ${cfg.preview_bar_width || 100}%; margin: 20px auto; background: #fff; color: #333; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: ${alignment}; gap: 15px; border: 1px solid #eee; box-sizing: border-box;">
                            <div style="display: flex; gap: ${gap}px; flex-wrap: nowrap; overflow-x: auto; justify-content: ${alignment}; width: 100%;">
                                ${slotsHtml}
                            </div>
                            <div style="display: flex; gap: 20px; align-items: center; justify-content: ${alignment}; width: 100%; flex-wrap: wrap;">
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 13px; color: #999;">Total: <span style="text-decoration: line-through;">Rs.${total.toFixed(2)}</span></span>
                                    <span style="font-size: 18px; color: #000; font-weight: 800;">Final: Rs.${discounted.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button type="button" id="combo-add-to-cart-btn" style="background: ${cfg.add_to_cart_btn_color || '#fff'}; color: ${cfg.add_to_cart_btn_text_color || '#000'}; border: 1px solid #000; padding: 10px 20px; border-radius: 50px; font-weight: 700; cursor: pointer;">Add to Cart</button>
                                </div>
                            </div>
                        </div>
                    `;
                },

                tabs: () => {
                    if (cfg.layout !== 'layout2') return '';
                    const tabCount = cfg.tab_count || 4;
                    const showAll = cfg.show_tab_all !== false;
                    const allLabel = cfg.tab_all_label || 'Collections';
                    const active = state.activeTab;

                    let tabsHtml = '';
                    if (showAll) {
                        tabsHtml += `<button class="combo-tab ${active === 'all' ? 'active' : ''}" data-tab="all">${allLabel}</button>`;
                    }

                    for (let i = 1; i <= tabCount; i++) {
                        const colHandle = cfg[`col_${i}`];
                        if (!colHandle) continue;

                        const title = (state.collectionInfo && state.collectionInfo[colHandle])
                            ? state.collectionInfo[colHandle].title
                            : colHandle.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                        tabsHtml += `<button class="combo-tab ${active === colHandle ? 'active' : ''}" data-tab="${colHandle}">${title}</button>`;
                    }

                    return `
                        <div class="combo-section" style="width: ${cfg.tabs_width || 100}%; margin: 20px auto; border-bottom: 1px solid #eee; padding-bottom: 12px; display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; background: #fff; box-sizing: border-box;">
                            ${tabsHtml}
                        </div>
                    `;
                },

                progressBar: () => {
                    if (cfg.layout !== 'layout1' || !cfg.show_progress_bar) return '';
                    const totalQty = state.selectedProducts.length;
                    const threshold = Number(cfg.discount_threshold) || Number(cfg.step_count) || 5;
                    const percent = Math.min(100, Math.round((totalQty / threshold) * 100));
                    const label = cfg.progress_text || cfg.discount_text || 'Bundle Progress';
                    const barColor = cfg.progress_bar_color || '#008060';
                    const successColor = cfg.progress_success_color || '#008060';
                    const activeColor = (totalQty >= threshold) ? successColor : barColor;

                    return `
                        <div class="combo-section" style="margin: 20px 0; width: 100%; max-width: 600px; margin-left: auto; margin-right: auto; padding: 0 15px; box-sizing: border-box;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                                <span style="color: ${cfg.progress_text_color || activeColor};">${label}</span>
                                <span style="color: ${cfg.progress_text_color || '#5c5f62'};">${percent}%</span>
                            </div>
                            <div style="height: 10px; background: rgba(0,0,0,0.06); border-radius: 10px; overflow: hidden; position: relative; width: 100%;">
                                <div id="cdo-js-progress-bar" style="width: ${percent}%; --fill-width: ${percent}%; height: 100%; background-color: ${activeColor}; border-radius: 10px; animation: combo-bar-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; min-width: ${percent > 0 ? '4px' : '0'};"></div>
                            </div>
                        </div>
                    `;
                },

                productsGrid: () => {
                    if (cfg.show_products_grid === false) return '';
                    if (!state.products || state.products.length === 0) return `<div class="combo-section" style="padding: 40px; text-align: center; color: #999;">Loading products...</div>`;

                    const cols = isMobile ? Math.max(1, Number(cfg.mobile_columns) || 1) : Math.max(1, Number(cfg.desktop_columns) || 2);
                    const gap = cfg.products_gap || 12;
                    const cardPadding = cfg.product_card_padding || 12;
                    const titleSize = isMobile ? (cfg.product_title_size_mobile || 14) : (cfg.product_title_size_desktop || 16);
                    const priceSize = isMobile ? (cfg.product_price_size_mobile || 15) : (cfg.product_price_size_desktop || 18);

                    let cardsHtml = '';

                    let productsToRender = [];
                    if (cfg.layout === 'layout2' && state.activeTab !== 'all') {
                        productsToRender = state.collectionProducts[state.activeTab] || [];
                    } else if (cfg.layout === 'layout2' && state.activeTab === 'all') {
                        const handles = [];
                        for (let i = 1; i <= (cfg.tab_count || 4); i++) { if (cfg[`col_${i}`]) handles.push(cfg[`col_${i}`]); }
                        handles.forEach(h => { if (state.collectionProducts[h]) productsToRender.push(...state.collectionProducts[h]); });
                        const uniqueProducts = [];
                        const seenProductIds = new Set();
                        productsToRender.forEach((p) => {
                            const pid = String(p && p.id ? p.id : '').trim();
                            if (!pid || seenProductIds.has(pid)) return;
                            seenProductIds.add(pid);
                            uniqueProducts.push(p);
                        });
                        productsToRender = uniqueProducts;
                    } else {
                        productsToRender = state.products;
                    }

                    productsToRender.slice(0, 20).forEach(product => {
                        const selectedVariantId = String(state.selectedVariantByProduct[String(product.id)] || '').trim();
                        const instances = selectedVariantId
                            ? state.selectedProducts.filter((p) => String(p.variantId) === selectedVariantId)
                            : state.selectedProducts.filter((p) => String(p.id) === String(product.id));
                        const qty = instances.length;
                        const isSelected = qty > 0;
                        const variants = Array.isArray(product.variants) ? product.variants : [];
                        const selectedVariant = variants.find(v => String(v.id) === selectedVariantId) || variants[0] || null;
                        const price = selectedVariant?.price || "0.00";
                        const vendor = cfg.vendor || "Brand";
                        let imgSrc = product.images?.[0]?.src || product.featured_image || "https://placehold.co/300x300?text=No+Image";
                        const borderColor = isSelected ? (cfg.selection_highlight_color || '#000') : '#eee';
                        const hasVariantChoice = variants.length > 1;
                        const variantSelectHtml = hasVariantChoice
                            ? `
                                <select class="combo-variant-select" data-id="${product.id}" style="width:100%;margin-bottom:10px;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:12px;">
                                    <option value="">Select variant</option>
                                    ${variants.map(v => `<option value="${v.id}" ${String(v.id) === selectedVariantId ? 'selected' : ''}>${v.title || 'Variant'}</option>`).join('')}
                                </select>
                            `
                            : '';

                        cardsHtml += `
                            <div class="combo-product-card" style="border: 1px solid ${borderColor}; border-radius: ${cfg.card_border_radius || 12}px; background: #fff; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 8px; right: 8px; background: ${cfg.selection_highlight_color || '#000'}; color: #fff; font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 10px; z-index: 2;">-20%</div>
                                <div style="width: 100%; aspect-ratio: 1; background: #f9f9f9; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                    <img src="${imgSrc}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: contain;">
                                </div>
                                <div style="padding: ${cardPadding}px; flex-grow: 1; display: flex; flex-direction: column;">
                                    <div style="font-weight: 600; font-size: ${titleSize}px; line-height: 1.3; margin-bottom: 4px; color: #111;">${product.title}</div>
                                    <div style="font-size: 11px; color: #888; font-weight: 600; margin-bottom: 8px;">${vendor}</div>
                                    <div class="combo-product-price" data-base-price="${price}" style="font-weight: 800; font-size: ${priceSize}px; margin-bottom: 12px; color: #1a1a1a;"></div>
                                    ${variantSelectHtml}
                                    <div style="display: flex; align-items: center; min-height: 38px;">
                                        ${!isSelected ? `
                                            <button type="button" class="combo-add-btn" data-id="${product.id}" style="width: 100%; background: #eafff2; color: #1a1a1a; border: none; padding: 9px; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 11px; text-transform: uppercase;">Add to Cart</button>
                                        ` : `
                                            <div class="combo-qty-control" style="background: transparent; padding: 0; gap: 8px;">
                                                <button type="button" class="combo-qty-btn-circle" data-action="dec" data-id="${product.id}" style="flex: 1; background: ${cfg.selection_highlight_color || '#000'}; color: #fff; border: none; border-radius: 6px; height: 32px; cursor: pointer;">-</button>
                                                <span style="font-weight: 800; font-size: 13px; min-width: 20px; text-align: center;">${qty}</span>
                                                <button type="button" class="combo-qty-btn-circle" data-action="inc" data-id="${product.id}" style="flex: 1; background: ${cfg.selection_highlight_color || '#000'}; color: #fff; border: none; border-radius: 6px; height: 32px; cursor: pointer;">+</button>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `;
                    });

                    return `
                        <div class="combo-section" style="width: ${cfg.grid_width || 100}%; margin: 0 auto;">
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                                <h2 style="font-size: 18px; font-weight: 800; margin: 0;">Curated For You</h2>
                                <span style="font-size: 12px; color: ${cfg.selection_highlight_color || '#000'}; font-weight: 700; cursor: pointer;">View All</span>
                            </div>
                            <div id="combo-products-grid" style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}px; margin-bottom: 40px; box-sizing: border-box;">
                                ${cardsHtml}
                            </div>
                        </div>
                    `;
                }
            };

            // Determine Section Order
            const option = cfg.new_option_dropdown || 'option1';
            const layoutRef = cfg.layout || 'layout1';
            const progressSec = cfg.show_progress_bar ? [sections.progressBar] : [];

            let sectionOrder = [sections.banner, sections.titleDescription, sections.productsGrid, sections.previewBar];

            if (layoutRef === 'layout2') {
                sectionOrder = [...progressSec, sections.banner, sections.titleDescription, sections.tabs, sections.previewBar, sections.productsGrid];
            } else if (option === 'option2') {
                sectionOrder = [...progressSec, sections.titleDescription, sections.banner, sections.tabs, sections.previewBar, sections.productsGrid];
            } else if (option === 'option3') {
                sectionOrder = [...progressSec, sections.productsGrid, sections.banner, sections.tabs, sections.previewBar, sections.titleDescription];
            } else if (option === 'option4') {
                sectionOrder = [...progressSec, sections.titleDescription, sections.banner, sections.tabs, sections.previewBar, sections.productsGrid];
            } else if (layoutRef === 'layout1') {
                sectionOrder = [...progressSec, sections.titleDescription, sections.progressBar, sections.banner, sections.productsGrid, sections.previewBar];
            } else if (layoutRef === 'layout3' || option === 'option6' || option === 'option7' || option === 'option9') {
                sectionOrder = [...progressSec, sections.previewBar, sections.banner, sections.titleDescription, sections.productsGrid];
            } else if (layoutRef === 'layout4' || option === 'option8') {
                sectionOrder = [...progressSec, sections.banner, sections.titleDescription, sections.productsGrid, sections.previewBar];
            } else if (option === 'option5') {
                sectionOrder = [...progressSec, sections.banner, sections.titleDescription, sections.productsGrid, sections.previewBar];
            }

            if (!document.getElementById('combo-global-styles')) {
                const style = document.createElement('style');
                style.id = 'combo-global-styles';
                style.innerHTML = `
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                    #make-a-combo-app {
                        font-family: 'Outfit', sans-serif !important;
                    }
                    .combo-sticky-bar {
                        position: fixed !important;
                        bottom: 30px !important;
                        left: 50% !important;
                        transform: translateX(-50%) !important;
                        z-index: 2147483647 !important;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                        transition: all 0.3s ease !important;
                        padding-bottom: env(safe-area-inset-bottom) !important;
                        width: 95% !important;
                        max-width: 1100px !important;
                        border: none !important;
                        border-radius: 50px !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        display: flex !important;
                    }
                    .combo-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #1a1a1a;
                        color: #fff;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 14px;
                        z-index: 2147483647;
                        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                        transform: translateY(-20px);
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .combo-toast.show {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    .combo-toast-error {
                        background: #ff4d4d;
                    }
                    .layout4-title {
                        font-weight: 800 !important;
                        letter-spacing: -0.5px;
                    }
                `;
                document.head.appendChild(style);
            }

            let isLayout4 = cfg.layout === 'layout4';
            if (isLayout4) {
                root.style.backgroundColor = cfg.bg_color || '#ffffff';
                root.style.color = cfg.text_color || '#1a1a1a';
            }

            const renderedHtml = sectionOrder.map(s => s()).join('');
            root.innerHTML = renderedHtml;

            const bar = root.querySelector('#combo-preview-bar');
            if (bar && cfg.show_sticky_preview_bar) {
                bar.classList.add('combo-sticky-bar');
                root.style.paddingBottom = '140px';
            } else {
                root.style.paddingBottom = '40px';
            }

            if (isLayout4) {
                const h1 = root.querySelector('h1');
                if (h1) h1.classList.add('layout4-title');
            }

            attachEvents();
            updateProductCardPrices();
        } catch (error) {
            console.error("Combo Builder: Fatal error during render:", error);
        }
    }

    function calculateTotal() {
        return state.selectedProducts.reduce((sum, p) => sum + parseFloat(p.price), 0).toFixed(2);
    }

    function calculateDiscounted() {
        const total = parseFloat(calculateTotal());
        const discountType = state.config.discount_selection;
        const amount = parseFloat(state.config.discount_amount) || 0;

        if (discountType === 'percentage') {
            return (total * (1 - amount / 100)).toFixed(2);
        }
        return Math.max(0, total - amount).toFixed(2);
    }

    function showToast(message, isError = false) {
        let toast = document.getElementById('combo-toast-msg');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'combo-toast-msg';
            toast.className = 'combo-toast';
            document.body.appendChild(toast);
        }

        toast.innerText = message;
        toast.classList.toggle('combo-toast-error', isError);
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function attachEvents() {
        const getProductsListForActiveContext = () => {
            const cfg = state.config || {};
            if (cfg.layout === 'layout2' && state.activeTab !== 'all') {
                return state.collectionProducts[state.activeTab] || [];
            }
            if (cfg.layout === 'layout2' && state.activeTab === 'all') {
                const handles = [];
                for (let i = 1; i <= (cfg.tab_count || 4); i++) {
                    if (cfg[`col_${i}`]) handles.push(cfg[`col_${i}`]);
                }
                const merged = [];
                handles.forEach((h) => {
                    if (state.collectionProducts[h]) merged.push(...state.collectionProducts[h]);
                });
                return merged;
            }
            return state.products && state.products.length > 0 ? state.products : mockProducts;
        };

        const findProductById = (id) => {
            const activeProducts = getProductsListForActiveContext();
            const targetId = String(id || '').trim();
            let product = activeProducts.find((p) => String(p.id) === targetId);
            if (!product) {
                const fallbackProducts = state.products && state.products.length > 0 ? state.products : mockProducts;
                product = fallbackProducts.find((p) => String(p.id) === targetId);
            }
            return product || null;
        };

        const getSelectedVariantPayload = (product) => {
            const variants = Array.isArray(product?.variants) ? product.variants : [];
            if (!variants.length) return null;

            const productId = String(product.id);
            const selectedVariantId = String(state.selectedVariantByProduct[productId] || '').trim();
            const selectedVariant = variants.find(v => String(v.id) === selectedVariantId);

            if (variants.length > 1 && !selectedVariant) {
                showToast('Please select a variant before adding to cart.', true);
                return null;
            }

            const variant = selectedVariant || variants[0];
            return {
                variantId: String(variant.id),
                price: variant.price,
            };
        };

        root.querySelectorAll('.combo-variant-select').forEach(select => {
            select.onchange = (e) => {
                const productId = String(select.getAttribute('data-id') || '');
                state.selectedVariantByProduct[productId] = String(e.target.value || '').trim();
                render();
            };
        });

        // Tab Clicking
        root.querySelectorAll('.combo-tab').forEach(tab => {
            tab.onclick = () => {
                const target = tab.getAttribute('data-tab');
                state.activeTab = target;
                render();
            };
        });

        // Qty/Selection buttons
        root.querySelectorAll('.combo-qty-btn-circle').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const action = btn.getAttribute('data-action');
                const maxSel = Number(state.config.max_selections) || 3;

                if (action === 'inc') {
                    if (state.selectedProducts.length < maxSel) {
                        const product = findProductById(id);
                        if (product) {
                            const selectedVariantPayload = getSelectedVariantPayload(product);
                            if (!selectedVariantPayload) return;
                            state.selectedProducts.push({
                                id: product.id,
                                title: product.title,
                                price: selectedVariantPayload.price,
                                variantId: selectedVariantPayload.variantId,
                                image: product.images?.[0]?.src || product.featured_image || "https://placehold.co/100"
                            });
                        }
                    } else {
                        showToast(`Limit reached! Max ${maxSel} items.`);
                    }
                } else if (action === 'dec') {
                    let idx = -1;
                    const selectedVariantId = String(state.selectedVariantByProduct[String(id)] || '').trim();
                    if (selectedVariantId) {
                        idx = state.selectedProducts.findIndex(p => String(p.variantId) === selectedVariantId);
                    }
                    if (idx === -1) {
                        idx = state.selectedProducts.findIndex(p => String(p.id) === String(id));
                    }
                    if (idx > -1) {
                        state.selectedProducts.splice(idx, 1);
                    }
                }

                render();
            };
        });

        // Add to combo
        root.querySelectorAll('.combo-add-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const maxSel = Number(state.config.max_selections) || 3;

                if (state.selectedProducts.length < maxSel) {
                    const product = findProductById(id);
                    if (product) {
                        const selectedVariantPayload = getSelectedVariantPayload(product);
                        if (!selectedVariantPayload) return;
                        state.selectedProducts.push({
                            id: product.id,
                            title: product.title,
                            price: selectedVariantPayload.price,
                            variantId: selectedVariantPayload.variantId,
                            image: product.images?.[0]?.src || product.featured_image || "https://placehold.co/100"
                        });
                        render();
                    }
                } else {
                    showToast(`Limit reached! Max ${maxSel} items.`);
                }
            };
        });

        // Sticky Bar / Cart Actions
        const stickyBar = root.querySelector('#combo-preview-bar');
        if (stickyBar && state.config.show_sticky_preview_bar) {
            stickyBar.onclick = () => handleCartAction(false);
        }

        const inlineAddBtn = root.querySelector('#combo-add-to-cart-btn');
        if (inlineAddBtn) inlineAddBtn.onclick = () => handleCartAction(false);

        const buyNowBtn = root.querySelector('#combo-buy-now-btn');
        if (buyNowBtn) buyNowBtn.onclick = () => handleCartAction(true);

        // FIX 3: Removed the stray orphaned dead-code block ("Disabled inline preview bar... return ''; } }")
        // that was injected in the middle of handleCartAction, causing a SyntaxError / broken closure.
        const handleCartAction = async (isBuyNow) => {
            if (isCartActionInFlight) {
                return;
            }

            const maxSel = Number(state.config.max_selections) || 3;
            if (state.selectedProducts.length < maxSel) {
                showToast(`Please select at least ${maxSel} products to complete the combo.`, true);
                return;
            }

            isCartActionInFlight = true;

            const btn = isBuyNow ? root.querySelector('#combo-buy-now-btn') : root.querySelector('#combo-add-to-cart-btn');
            if (btn) {
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
                btn.innerText = 'Processing...';
            }

            const cartItemsMap = state.selectedProducts.reduce((acc, p) => {
                acc[p.variantId] = (acc[p.variantId] || 0) + 1;
                return acc;
            }, {});

            const itemsArray = Object.entries(cartItemsMap).map(([id, quantity]) => ({
                id: parseInt(id),
                quantity: quantity
            }));

            // FIX 4: Restored the missing discount cache fetch logic that was gutted from the original.
            let discountCode = "";
            const CACHE_KEY = 'combo_discounts_cache';
            const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

            try {
                let discounts = null;
                const cached = sessionStorage.getItem(CACHE_KEY);

                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                        discounts = parsed.data;
                        console.log("Combo Builder: Using cached discounts.");
                    }
                }

                if (!discounts) {
                    const isStorefront = window.location.hostname.includes('myshopify.com') || (window.Shopify && window.Shopify.shop);
                    const discountUrl = isStorefront ? '/apps/combo/discounts.php' : '/api/discounts.php';
                    const res = await fetch(discountUrl);
                    if (res.ok) {
                        const data = await res.json();
                        discounts = data.discounts || data || [];
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: discounts }));
                    }
                }

                if (discounts) {
                    let matched = null;
                    if (state.config.selected_discount_id) {
                        matched = discounts.find(d => String(d.id) === String(state.config.selected_discount_id));
                    }

                    if (!matched) {
                        matched = discounts.find(d => d.autoApply === true);
                    }

                    if (matched && matched.code) {
                        discountCode = matched.code;
                        console.log("Combo Builder: Applying discount code:", discountCode);
                    }
                }
            } catch (e) {
                console.error("Combo Builder: Discount Fetch Error:", e);
            }

            if (isBuyNow) {
                const variantPath = Object.entries(cartItemsMap)
                    .map(([vid, qty]) => `${vid}:${qty}`)
                    .join(',');
                let checkoutUrl = `/cart/${variantPath}`;
                if (discountCode) checkoutUrl += `?discount=${discountCode}`;
                window.location.href = checkoutUrl;
            } else {
                try {
                    const addResponse = await fetch('/cart/add.js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: itemsArray })
                    });

                    if (!addResponse.ok) {
                        throw new Error(`Cart add failed with status ${addResponse.status}`);
                    }

                    if (discountCode) {
                        window.location.href = `/discount/${discountCode}?redirect=/cart`;
                    } else {
                        window.location.href = '/cart';
                    }
                } catch (e) {
                    console.error("Cart Add Error:", e);
                    showToast("There was an error adding items to the cart.", true);
                    if (btn) {
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                        btn.innerText = isBuyNow ? (state.config.buy_btn_text || 'Buy Now') : (state.config.add_to_cart_btn_text || 'Add to Cart');
                    }
                    isCartActionInFlight = false;
                }
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();