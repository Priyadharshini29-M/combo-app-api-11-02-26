// Simple PxField component
function PxField({
    label,
    value,
    onChange,
    min = 0,
    max = 2000,
    step = 1,
    suffix = "px",
}) {
    const handle = (v) => {
        const num = Number(v);
        if (Number.isNaN(num)) {
            onChange(0);
            return;
        }
        const clamped = Math.max(min, Math.min(max, num));
        onChange(clamped);
    };
    return (
        <div className="compact-field">
            <div style={{ marginBottom: 4, fontSize: "12px", fontWeight: 500, color: "#444" }}>{label}</div>
            <TextField
                type="number"
                value={String(value ?? 0)}
                onChange={handle}
                suffix={suffix}
                autoComplete="off"
                inputMode="numeric"
            />
        </div>
    );
}

// Simple ColorPickerField component
function ColorPickerField({ label, value, onChange }) {
    const [visible, setVisible] = useState(false);
    const [color, setColor] = useState(value);

    useEffect(() => {
        setColor(value);
    }, [value]);

    const handleColorChange = (newColor) => {
        setColor(newColor);
        onChange(newColor);
    };

    const togglePopover = () => setVisible(!visible);

    const activator = (
        <div onClick={(e) => e.stopPropagation()} className="compact-field">
            <div style={{ marginBottom: 4, fontSize: "12px", fontWeight: 500, color: "#444" }}>{label}</div>
            <TextField
                value={value}
                onChange={onChange}
                autoComplete="off"
                prefix={
                    <div
                        role="button"
                        onClick={togglePopover}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            backgroundColor: value,
                            border: "1px solid #d3d4d5",
                            cursor: "pointer",
                        }}
                    />
                }
            />
        </div>
    );

    return (
        <Popover
            active={visible}
            activator={activator}
            onClose={togglePopover}
            preferredAlignment="left"
        >
            <div style={{ padding: "16px" }}>
                <ColorPicker onChange={handleColorChange} color={color} />
            </div>
        </Popover>
    );
}

// Helper component to sync config to iframe
function PreviewSync({ config, device }) {
    useEffect(() => {
        const frame = document.getElementById("preview-frame");
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage(
                { type: "UPDATE_PREVIEW", config, device },
                "*"
            );
        }
    }, [config, device]);
    return null;
}

const DEFAULT_COMBO_CONFIG = {
    layout: "layout1", // default layout
    product_add_btn_text: "Add",
    product_add_btn_color: "#000",
    product_add_btn_text_color: "#fff",
    product_add_btn_font_size: 14,
    product_add_btn_font_weight: 600,
    has_discount_offer: false,
    selected_discount_id: null,
    // Preview bar defaults
    desktop_columns: 2, // 2 columns by default for desktop
    mobile_columns: 2, // 2 columns by default for mobile
    container_padding_top_desktop: 24, // default container padding
    container_padding_right_desktop: 24,
    container_padding_bottom_desktop: 24,
    container_padding_left_desktop: 24,
    container_padding_top_mobile: 16,
    container_padding_right_mobile: 12,
    container_padding_bottom_mobile: 16,
    container_padding_left_mobile: 12,
    show_banner: true, // show banner by default
    banner_height_desktop: 180, // default desktop banner height for preview
    banner_height_mobile: 120, // default mobile banner height for preview
    preview_bg_color: "#f5f5dc", // beige default
    preview_text_color: "#222", // dark text default
    preview_item_border_color: "#e1e3e5",
    preview_height: 70,
    preview_font_size: 16,
    preview_font_weight: 600,
    preview_align_items: "center",
    preview_alignment: "center",
    preview_alignment_mobile: "center",
    preview_item_shape: "rectangle",
    preview_item_size: 56, // reduced size so all shapes fit in one line
    preview_item_padding: 12, // default padding in px
    preview_item_padding_top: 10, // default top padding in px
    preview_bar_padding_top: 16, // default top padding for preview bar container in px
    preview_item_color: "#000", // black shape color
    // preview_item_border_color: "#000", // black border color (removed duplicate)
    max_selections: 3, // default three shapes in preview bar
    preview_bar_padding_bottom: 16, // default bottom padding for preview bar container
    product_image_height_desktop: 10, // default product image height for desktop
    product_image_height_mobile: 150, // updated product image height for mobile
};
