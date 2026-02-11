import { useState, useEffect } from "react";
import { AppProvider, Select } from "@shopify/polaris";
import { useSearchParams } from "@remix-run/react";

// Simplified function since we can't easily import from polaris in a standalone route without proper setup?
// Actually we are in Remix app, so normal imports work.

export default function PreviewPage() {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState(null);
    const [device, setDevice] = useState("desktop");

    useEffect(() => {
        // Listen for messages from parent
        const handleMessage = (event) => {
            if (event.data && event.data.type === "UPDATE_PREVIEW") {
                setConfig(event.data.config);
                setDevice(event.data.device);
            }
        };
        window.addEventListener("message", handleMessage);

        // Initial config from URL if small enough (optional, mostly rely on postMessage)
        // Send READY message
        if (window.parent) {
            window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
        }

        return () => window.removeEventListener("message", handleMessage);
    }, []);

    if (!config) {
        return <div style={{ padding: 20 }}>Loading preview...</div>;
    }

    return (
        <AppProvider i18n={{}}>
            <ComboPreview config={config} device={device} />
        </AppProvider>
    );
}

// Copied ComboPreview logic
function ComboPreview({ config, device }) {
    const isMobile = device === "mobile";
    const paddingTop = isMobile
        ? config.container_padding_top_mobile
        : config.container_padding_top_desktop;
    const paddingRight = isMobile
        ? config.container_padding_right_mobile
        : config.container_padding_right_desktop;
    const paddingBottom = isMobile
        ? config.container_padding_bottom_mobile
        : config.container_padding_bottom_desktop;
    const paddingLeft = isMobile
        ? config.container_padding_left_mobile
        : config.container_padding_left_desktop;
    const bannerWidth = isMobile
        ? (config.banner_width_mobile || config.banner_width_desktop || 100)
        : (config.banner_width_desktop || 100);
    const bannerHeight = isMobile
        ? (config.banner_height_mobile || config.banner_height_desktop || 120)
        : (config.banner_height_desktop || 180);

    const finalBannerHeight = config.banner_fit_mode === 'adapt' ? 'auto' : `${bannerHeight}px`;
    const bannerObjectFit = (config.banner_fit_mode === 'cover' || config.banner_fit_mode === 'contain')
        ? config.banner_fit_mode
        : 'initial';
    const previewAlignment = isMobile
        ? config.preview_alignment_mobile
        : config.preview_alignment;
    const previewJustify = previewAlignment;
    const previewGap = config.preview_item_gap ?? 12;
    const previewShape = config.preview_item_shape || "circle";
    const previewItemSize = config.preview_item_size;
    const previewAlignItems = config.preview_align_items || "center";
    const previewFontWeight = config.preview_font_weight || 600;
    const viewportWidth = "100%";
    const columns = isMobile ? config.mobile_columns : config.desktop_columns;
    const numericColumns = Math.max(1, Number(columns) || 1);
    const gridGap = Number(config.products_gap ?? 12);
    const effectiveColumns = numericColumns;
    const cardHeight = isMobile
        ? config.card_height_mobile
        : config.card_height_desktop;
    const productImageHeight = isMobile
        ? config.product_image_height_mobile
        : config.product_image_height_desktop;
    const headingAlign = config.heading_align || "left";
    const descriptionAlign = config.description_align || "left";

    const maxSel = Number(config.max_selections) || 3;
    const baseSizeDesktop = maxSel > 3 ? Math.max(30, 56 - (maxSel - 3) * 8) : 56;
    const baseSizeMobile = maxSel > 3 ? Math.max(24, 44 - (maxSel - 3) * 6) : 44;
    const baseSize = isMobile ? baseSizeMobile : baseSizeDesktop;

    const shapeStyles = (size) => {
        if (previewShape === "circle")
            return { width: size, height: size, borderRadius: "50%" };
        if (previewShape === "rectangle")
            return {
                width: size * 1.4,
                height: size * 0.8,
                borderRadius: config.preview_border_radius,
            };
        return {
            width: size,
            height: size,
            borderRadius: config.preview_border_radius,
        };
    };

    // Section rendering functions
    const renderBanner = () => {
        if (config.show_banner === false) return null;
        const bannerUrl = (isMobile && config.banner_image_mobile_url)
            ? config.banner_image_mobile_url
            : config.banner_image_url;

        return (
            <div
                style={{
                    width: config.banner_full_width ? `calc(100% + ${paddingLeft + paddingRight}px)` : `${bannerWidth}%`,
                    height: finalBannerHeight,
                    background: bannerUrl ? "none" : "#e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: config.banner_padding_top,
                    paddingBottom: config.banner_padding_bottom,
                    margin: config.banner_full_width ? `0 -${paddingLeft}px` : "0 auto",
                    overflow: "hidden"
                }}
            >
                {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" style={{ width: "100%", height: config.banner_fit_mode === 'adapt' ? 'auto' : '100%', objectFit: bannerObjectFit, display: 'block' }} />
                ) : (
                    <span style={{ color: "#999" }}>Banner Image</span>
                )}
            </div>
        );
    };

    const renderPreviewBar = () => {
        const isLayout4 = config.layout === "layout4";
        return (
            <div
                style={{
                    background: isLayout4 ? "rgba(255, 255, 255, 0.7)" : (config.preview_bg_color || "#fff"),
                    backdropFilter: isLayout4 ? "blur(10px)" : "none",
                    WebkitBackdropFilter: isLayout4 ? "blur(10px)" : "none",
                    color: config.preview_text_color,
                    borderRadius: config.preview_border_radius || 12,
                    padding: config.preview_padding || 16,
                    minHeight: config.preview_height || 70,
                    fontSize: config.preview_font_size,
                    fontWeight: previewFontWeight,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: previewAlignItems,
                    gap: 12,
                    paddingTop: config.preview_bar_padding_top ?? config.preview_padding_top,
                    paddingBottom: config.preview_bar_padding_bottom ?? config.preview_padding_bottom,
                    marginTop: config.preview_margin_top,
                    marginBottom: config.preview_margin_bottom,
                    border: isLayout4 ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
                    boxShadow: isLayout4 ? "0 8px 32px 0 rgba(31, 38, 135, 0.07)" : "0 4px 12px rgba(0,0,0,0.05)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: previewGap,
                        flexWrap: "nowrap",
                        width: "auto",
                        maxWidth: "100%",
                        justifyContent: previewJustify,
                        overflow: "hidden",
                    }}
                >
                    {[...Array(maxSel)].map((_, i) => {
                        const shape = shapeStyles(baseSize);
                        return (
                            <div
                                key={i}
                                style={{
                                    ...shape,
                                    background: config.preview_item_color,
                                    border: `2px solid ${config.preview_item_border_color}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    padding: config.preview_item_padding,
                                    paddingTop: config.preview_item_padding_top,
                                    flexShrink: 0,
                                }}
                            >
                                +
                            </div>
                        );
                    })}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: previewJustify, width: "100%" }}>
                    <span
                        style={{
                            fontSize: config.preview_original_price_size,
                            color: config.preview_original_price_color,
                            textDecoration: "line-through",
                        }}
                    >
                        Rs.100.00
                    </span>
                    <span
                        style={{
                            fontSize: config.preview_discount_price_size,
                            color: config.preview_discount_price_color,
                            fontWeight: 800,
                        }}
                    >
                        Rs.80.00
                    </span>
                    {isLayout4 && (
                        <div style={{
                            background: "#4CAF50",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                        }}>
                            You Save Rs.20.00
                        </div>
                    )}
                    <button
                        style={{
                            background: config.buy_btn_color,
                            color: config.buy_btn_text_color,
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontWeight: config.buy_btn_font_weight,
                            fontSize: config.buy_btn_font_size,
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                    >
                        {config.buy_btn_text}
                    </button>
                </div>
            </div>
        );
    };

    const renderTitleDescription = () => (
        <div
            style={{
                paddingTop: config.title_container_padding_top,
                paddingRight: config.title_container_padding_right,
                paddingBottom: config.title_container_padding_bottom,
                paddingLeft: config.title_container_padding_left,
                textAlign: headingAlign,
            }}
        >
            <h1
                style={{
                    fontSize: config.heading_size,
                    marginBottom: 4,
                    color: config.heading_color,
                    fontWeight: config.heading_font_weight || 700,
                    textAlign: headingAlign,
                }}
            >
                {config.collection_title}
            </h1>
            <p
                style={{
                    fontSize: config.description_size,
                    color: config.description_color,
                    fontWeight: config.description_font_weight || 400,
                    textAlign: descriptionAlign,
                }}
            >
                {config.collection_description}
            </p>
        </div>
    );

    // Mock products for preview to avoid authentication issues in standard iframe
    const shopifyProducts = [
        { id: "1", title: "Snowboard", variants: [{ id: "1", title: "Default", price: "100.00" }] },
        { id: "2", title: "Ski Goggles", variants: [{ id: "2", title: "Blue", price: "50.00" }] },
        { id: "3", title: "Winter Hat", variants: [{ id: "3", title: "Red", price: "25.00" }] },
        { id: "4", title: "Gloves", variants: [{ id: "4", title: "L", price: "30.00" }] },
    ];
    const [selectedVariants, setSelectedVariants] = useState({});

    const handleVariantChange = (productId, variantId) => {
        setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }));
    };

    const renderProductsGrid = () => (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${effectiveColumns}, minmax(20px, 1fr))`,
                gap: gridGap,
                paddingTop: config.products_padding_top,
                paddingBottom: config.products_padding_bottom,
                width: "100%",
                maxWidth: 1000,
                marginLeft: "auto",
                marginRight: "auto",
                boxSizing: "border-box",
                alignItems: "start",
                justifyItems: "center",
                marginTop: config.products_margin_top,
                marginBottom: config.products_margin_bottom,
            }}
        >
            {shopifyProducts.map((product) => {
                const hasVariants = product.variants && product.variants.length > 1;
                const selectedVariantId =
                    selectedVariants[product.id] ||
                    (product.variants && product.variants[0]?.id);
                const selectedVariant =
                    (product.variants || []).find((v) => v.id === selectedVariantId) ||
                    (product.variants && product.variants[0]);
                return (
                    <div
                        key={product.id}
                        style={{
                            border: "2px solid #eee",
                            borderRadius: config.card_border_radius,
                            overflow: "hidden",
                            background: "white",
                            width: "100%",

                            margin: 0,
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                width: "100%",
                                height: productImageHeight,
                                background: "#f5f5f5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 8,
                                border: "1.5px dashed #bbb",
                                marginBottom: 8,
                                overflow: "hidden",
                            }}
                        >
                            <span style={{ color: "#bbb", fontWeight: 500, fontSize: 13 }}>
                                Product Image
                            </span>
                        </div>
                        <div style={{ padding: 10 }}>
                            <div
                                style={{
                                    fontWeight: 500,
                                    marginBottom: 4,
                                    fontSize: isMobile ? 13 : 15,
                                }}
                            >
                                {product.title}
                            </div>
                            {hasVariants && (
                                <div style={{ marginBottom: 6 }}>
                                    <Select
                                        label="Variant"
                                        options={product.variants.map((v) => ({
                                            label: v.title,
                                            value: String(v.id),
                                        }))}
                                        value={selectedVariantId ? String(selectedVariantId) : ""}
                                        onChange={(v) => handleVariantChange(product.id, v)}
                                    />
                                </div>
                            )}
                            <div
                                style={{
                                    fontWeight: 600,
                                    marginBottom: 8,
                                    fontSize: isMobile ? 13 : 15,
                                }}
                            >
                                Rs.{selectedVariant?.price || 0}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: 6,
                                    borderTop: "1px solid #eee",
                                    flexWrap: "wrap",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div style={{ display: "flex", gap: 4 }}>
                                    <button
                                        style={{
                                            width: 28,
                                            height: 28,
                                            border: "1px solid #ddd",
                                            background: "white",
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            fontSize: 14,
                                        }}
                                    >
                                        −
                                    </button>
                                    <div
                                        style={{
                                            minWidth: 18,
                                            textAlign: "center",
                                            fontWeight: 500,
                                            fontSize: 14,
                                        }}
                                    >
                                        0
                                    </div>
                                    <button
                                        style={{
                                            width: 28,
                                            height: 28,
                                            border: "1px solid #ddd",
                                            background: "white",
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            fontSize: 14,
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    style={{
                                        background: config.product_add_btn_color,
                                        color: config.product_add_btn_text_color,
                                        border: "none",
                                        padding: "6px 10px",
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        fontWeight: config.product_add_btn_font_weight,
                                        fontSize: 13,
                                        marginLeft: 4,
                                    }}
                                >
                                    {config.product_add_btn_text}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Section order logic based on dropdown (copied)
    let sectionOrder = [
        renderBanner,
        renderPreviewBar,
        renderTitleDescription,
        renderProductsGrid,
    ];
    if (config.new_option_dropdown === "option2" || config.layout === "layout2") {
        sectionOrder = [
            renderTitleDescription,
            renderBanner,
            renderPreviewBar,
            renderProductsGrid,
        ];
    } else if (config.new_option_dropdown === "option3") {
        sectionOrder = [
            renderProductsGrid,
            renderBanner,
            renderPreviewBar,
            renderTitleDescription,
        ];
    } else if (config.new_option_dropdown === "option4") {
        sectionOrder = [
            renderTitleDescription,
            renderBanner,
            renderPreviewBar,
            renderProductsGrid,
        ];
    } else if (config.new_option_dropdown === "option5") {
        sectionOrder = [
            renderBanner,
            renderTitleDescription,
            renderProductsGrid,
            renderPreviewBar,
        ];
    } else if (config.new_option_dropdown === "option6") {
        sectionOrder = [
            renderPreviewBar,
            renderBanner,
            renderTitleDescription,
            renderProductsGrid,
        ];
    } else if (config.new_option_dropdown === "option7" || config.layout === "layout3") {
        sectionOrder = [
            renderPreviewBar,
            renderBanner,
            renderTitleDescription,
            renderProductsGrid,
        ];
    } else if (config.new_option_dropdown === "option8" || config.layout === "layout4") {
        sectionOrder = [
            renderBanner,
            renderTitleDescription,
            renderProductsGrid,
            renderPreviewBar,
        ];
    } else if (config.new_option_dropdown === "option9") {
        sectionOrder = [
            renderPreviewBar,
            renderBanner,
            renderTitleDescription,
            renderProductsGrid,
        ];
    } else if (
        !config.new_option_dropdown ||
        config.new_option_dropdown === "option1" ||
        config.layout === "layout1"
    ) {
        sectionOrder = [
            renderBanner,
            renderPreviewBar,
            renderTitleDescription,
            renderProductsGrid,
        ];
    }

    return (
        <div style={{ background: "#eef1f5", padding: 0, minHeight: "100vh" }}>
            <div
                style={{
                    fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    paddingTop: paddingTop,
                    paddingRight: paddingRight,
                    paddingBottom: paddingBottom,
                    paddingLeft: paddingLeft,
                    background: "#f9f9f9",
                    maxWidth: viewportWidth,
                    margin: "0 auto",
                    minHeight: "100vh",
                    boxSizing: "border-box",
                }}
            >
                {sectionOrder.map((Section, idx) => (
                    <div key={idx}>{Section()}</div>
                ))}
            </div>
        </div>
    );
}
