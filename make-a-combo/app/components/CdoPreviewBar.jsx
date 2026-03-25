import React, { useRef, useEffect } from 'react';
import { Text } from '@shopify/polaris';

export const CdoPreviewBar = ({
  config,
  selectedProducts,
  totalPrice,
  finalPrice,
  isMobile,
  loading,
}) => {
  if (!config.show_preview_bar) return null;

  const maxSel = parseInt(config.max_products) || 5;
  const previewGap = config.preview_item_gap ?? 12;
  const previewShape = config.preview_item_shape || 'circle';
  const previewFontWeight = config.preview_font_weight || 600;

  const shapeStyles = (size) => ({
    width: size,
    height: size,
    borderRadius: previewShape === 'circle' ? '50%' : '8px',
    border: `2px solid ${config.preview_item_border_color || '#eee'}`,
    background: config.preview_item_color || '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    flexShrink: 0,
    overflow: 'hidden',
  });

  const baseSize = config.preview_item_size || (isMobile ? 40 : 48);
  const hasDiscount = finalPrice < totalPrice;

  return (
    <div
      style={{
        width: `${config.preview_bar_width || 100}%`,
        margin: '40px auto 10px',
        position: config.inline_preview_sticky ? 'sticky' : 'relative',
        bottom: config.inline_preview_sticky ? 10 : 'auto',
        zIndex: config.inline_preview_sticky ? 999 : 1,
      }}
    >
      <div
        style={{
          background:
            config.layout === 'layout4'
              ? 'rgba(255, 255, 255, 0.7)'
              : config.preview_bar_bg || '#fff',
          backdropFilter:
            config.layout === 'layout4' || config.inline_preview_sticky
              ? 'blur(10px)'
              : 'none',
          WebkitBackdropFilter:
            config.layout === 'layout4' || config.inline_preview_sticky
              ? 'blur(10px)'
              : 'none',
          color: config.preview_bar_text_color || '#333',
          borderRadius: config.preview_border_radius || 12,
          padding: config.preview_bar_padding || 20,
          minHeight: config.preview_bar_height || 90,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          border:
            config.layout === 'layout4' || config.inline_preview_sticky
              ? '1px solid rgba(0, 0, 0, 0.05)'
              : '1px solid #eee',
          boxShadow: config.inline_preview_sticky
            ? '0 -8px 30px rgba(0,0,0,0.12)'
            : '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 18 }}>Loading...</span>
          </div>
        )}
        <div
          className={`cdo-preview-bar-inner ${isMobile ? 'is-mobile' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            gap: isMobile ? '12px' : '15px',
            position: 'relative',
          }}
        >
          {/* Header Row: Title & Motivation */}
          {(config.preview_bar_title || config.preview_motivation_text) && (
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'center' : 'flex-end',
                width: '100%',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                paddingBottom: '10px',
                marginBottom: '5px',
              }}
            >
              {config.preview_bar_title && (
                <div
                  style={{
                    fontSize: config.preview_bar_title_size || 16,
                    color:
                      config.preview_bar_title_color ||
                      config.preview_bar_text_color ||
                      '#333',
                    fontWeight: '800',
                    textAlign: isMobile ? 'center' : 'left',
                  }}
                >
                  {config.preview_bar_title}
                </div>
              )}
              {(() => {
                const totalItems = selectedProducts.reduce(
                  (sum, p) => sum + (p.quantity || 0),
                  0
                );
                const remaining = Math.max(0, maxSel - totalItems);
                const isUnlocked = totalItems >= maxSel;

                const motivationText = isUnlocked
                  ? config.preview_motivation_unlocked_text ||
                    'Discount Unlocked! 🎉'
                  : (
                      config.preview_motivation_text ||
                      'Add {{remaining}} more for discount!'
                    ).replace('{{remaining}}', remaining);

                return (
                  <div
                    style={{
                      fontSize: config.preview_motivation_size || 13,
                      color:
                        config.preview_motivation_color ||
                        (isUnlocked ? '#28a745' : '#666'),
                      fontWeight: '600',
                      textAlign: isMobile ? 'center' : 'right',
                    }}
                  >
                    {motivationText}
                  </div>
                );
              })()}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: isMobile ? '20px' : '15px',
            }}
          >
            {/* Column 1: Product Images */}
            <div
              className="cdo-preview-bar-shapes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: previewGap,
                flexShrink: 0,
                maxWidth: '100%',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                justifyContent: isMobile ? 'center' : 'flex-start',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              {(() => {
                const flattenedProducts = selectedProducts.flatMap((p) =>
                  Array(p.quantity || 0).fill(p)
                );
                return [...Array(maxSel)].map((_, i) => {
                  const item = flattenedProducts[i];
                  const shape = shapeStyles(baseSize);
                  return (
                    <div
                      key={i}
                      className={!item ? 'cdo-preview-bar-shape-empty' : ''}
                      style={{
                        ...shape,
                        border: item
                          ? `2px solid ${config.preview_item_border_color || '#000'}`
                          : '2px dashed #ccc',
                        boxShadow: item ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transform: item ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      {item ? (
                        <img
                          src={item.image}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 'inherit',
                          }}
                          alt="selected"
                        />
                      ) : (
                        <span
                          style={{ fontSize: baseSize * 0.5, color: '#bbb' }}
                        >
                          +
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Column 2: Price and Buttons */}
            <div
              className="cdo-preview-bar-info"
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? '15px' : '20px',
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <div
                className="cdo-preview-bar-prices"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMobile ? 'center' : 'flex-start',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                {hasDiscount && (
                  <span
                    style={{
                      fontSize: config.original_price_size || 14,
                      color: config.preview_original_price_color || '#999',
                      textDecoration: 'line-through',
                      lineHeight: 1,
                    }}
                  >
                    Total: Rs.{totalPrice.toFixed(2)}
                  </span>
                )}
                <span
                  style={{
                    fontSize: config.discounted_price_size || 18,
                    color:
                      config.preview_discount_price_color ||
                      config.selection_highlight_color ||
                      '#000',
                    fontWeight: 800,
                    marginTop: hasDiscount ? '4px' : '0',
                    lineHeight: 1,
                  }}
                >
                  Final: Rs.{finalPrice.toFixed(2)}
                </span>
              </div>

              <div
                className="cdo-preview-bar-buttons"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '10px',
                  alignItems: 'center',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'space-between' : 'flex-end',
                }}
              >
                {config.show_reset_btn !== false && (
                  <button
                    type="button"
                    style={{
                      flex: isMobile ? 1 : 'none',
                      width: isMobile ? '100%' : 'auto',
                      background: config.preview_reset_btn_bg || '#ff4d4d',
                      color: config.preview_reset_btn_text_color || '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: config.preview_border_radius || 6,
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      minHeight: isMobile ? '48px' : 'auto',
                      fontSize: isMobile ? '13px' : 'inherit',
                      opacity: loading ? 0.6 : 1,
                    }}
                    disabled={loading}
                  >
                    {config.preview_reset_btn_text || 'Reset Combo'}
                  </button>
                )}
                {config.show_preview_checkout_btn !== false && (
                  <button
                    type="button"
                    style={{
                      flex: isMobile ? 1 : 'none',
                      width: isMobile ? '100%' : 'auto',
                      background:
                        config.preview_checkout_btn_bg ||
                        config.checkout_btn_bg ||
                        '#000',
                      color:
                        config.preview_checkout_btn_text_color ||
                        config.checkout_btn_text_color ||
                        '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: config.preview_border_radius || 6,
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      minHeight: isMobile ? '48px' : 'auto',
                      fontSize: isMobile ? '13px' : 'inherit',
                      opacity: loading ? 0.6 : 1,
                    }}
                    disabled={loading}
                  >
                    {config.preview_checkout_btn_text || 'Checkout'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
