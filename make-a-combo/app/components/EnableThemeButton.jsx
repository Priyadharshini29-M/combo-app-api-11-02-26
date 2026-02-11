import { Button } from "@shopify/polaris";

/**
 * EnableThemeButton - A reusable button component that redirects merchants
 * to the Shopify theme editor to enable the app extension.
 * 
 * @param {Object} props
 * @param {string} props.shopName - The shop name without .myshopify.com (e.g., "my-store")
 * @param {string} [props.variant="primary"] - Button variant (primary, secondary, etc.)
 * @param {string} [props.size="medium"] - Button size (small, medium, large)
 * @param {string} [props.children] - Custom button text
 * @returns {JSX.Element}
 */
export function EnableThemeButton({
    shopName,
    variant = "primary",
    size = "medium",
    children = "Enable App in Theme"
}) {
    const themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`;

    return (
        <Button
            variant={variant}
            size={size}
            url={themeEditorUrl}
            external
            target="_top"
        >
            {children}
        </Button>
    );
}

/**
 * Helper function to extract shop name from full shop domain
 * @param {string} shop - Full shop domain (e.g., "my-store.myshopify.com")
 * @returns {string} Shop name without domain
 */
export function getShopName(shop) {
    return shop.replace('.myshopify.com', '');
}
