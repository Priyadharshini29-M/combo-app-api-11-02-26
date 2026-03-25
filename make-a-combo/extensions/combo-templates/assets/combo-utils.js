sessionStorage.removeItem('cdo_products');
localStorage.removeItem('cdo_products');

document.addEventListener('DOMContentLoaded', async function() {
  // --- Static Variant Selector Logic ---
  document.body.addEventListener('change', function(e) {
    if (e.target.classList.contains('cdo-variant-static-select')) {
      const card = e.target.closest('.cdo-card');
      if (!card) return;
      const selectedOption = e.target.options[e.target.selectedIndex];
      // Store selected variant on card for later use
      card.dataset.selectedVariantId = selectedOption.value;
      card.dataset.selectedVariantPrice = selectedOption.getAttribute('data-price');
      card.dataset.selectedVariantImage = selectedOption.getAttribute('data-image');
      // Optionally update price/image
      const priceEl = card.querySelector('.cdo-card-price');
      if (priceEl && selectedOption.getAttribute('data-price')) {
        priceEl.textContent = formatMoney(selectedOption.getAttribute('data-price'));
      }
      const imgEl = card.querySelector('img');
      if (imgEl && selectedOption.getAttribute('data-image')) {
        imgEl.src = selectedOption.getAttribute('data-image');
      }
      
      const addBtn = card.querySelector('.cdo-add-btn');
      if (addBtn && (!card.dataset.soldout || card.dataset.soldout === '0')) {
        if (!selectedOption.disabled && selectedOption.value) {
          addBtn.disabled = false;
          addBtn.style.opacity = '1';
          addBtn.style.cursor = 'pointer';
        } else {
          addBtn.disabled = true;
          addBtn.style.opacity = '0.7';
          addBtn.style.cursor = 'not-allowed';
        }
      }
    }
  });

});

/* ===================== UTILITIES ===================== */
function formatMoney(cents) {
  const num = parseFloat(cents);
  let currency = '₹';
  if (typeof window !== 'undefined' && window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$', CNY: '¥', RUB: '₽', BRL: 'R$', ZAR: 'R', TRY: '₺', IDR: 'Rp', THB: '฿', MYR: 'RM', PHP: '₱', VND: '₫', KRW: '₩', NGN: '₦', MXN: '$', PLN: 'zł', CZK: 'Kč', SEK: 'kr', DKK: 'kr', NOK: 'kr', HUF: 'Ft', CHF: 'Fr', NZD: 'NZ$', TWD: 'NT$', SAR: '﷼', AED: 'د.إ', ILS: '₪' };
    currency = symbols[window.Shopify.currency.active] || window.Shopify.currency.active;
  }
  if (!Number.isFinite(num)) return `${currency}0.00`;
  if (typeof cents === 'string' && cents.includes('.')) return `${currency}${num.toFixed(2)}`;
  return `${currency}${(num / 100).toFixed(2)}`;
}

function showToast(msg) {
  let t = document.getElementById('combo-toast');
  if (!t) { t = document.createElement('div'); t.id = 'combo-toast'; t.className = 'cdo-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
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
    shop_domain: window.Shopify && window.Shopify.shop ? window.Shopify.shop : 'unknown.myshopify.com',
    page_url: window.location.href,
    visitor_id: userId
  };
  fetch('https://darkblue-dotterel-303283.hostingersite.com/clicks.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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
  return variants.some(variant => {
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

function getProductImageRatio(cfg) {
  const ratio = (cfg && cfg.product_image_ratio) || 'square';
  if (ratio === 'portrait') return { cssRatio: '3 / 4', fallbackPadding: '133.3333%' };
  if (ratio === 'rectangle') return { cssRatio: '4 / 3', fallbackPadding: '75%' };
  return { cssRatio: '1 / 1', fallbackPadding: '100%' };
}
