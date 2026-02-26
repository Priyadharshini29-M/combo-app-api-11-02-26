
import { Button, ButtonGroup } from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

/**
 * EnableThemeButton - A smart component that handles app enabling/disabling
 * and provides a link to the Shopify theme editor.
 * 
 * @param {Object} props
 * @param {string} props.shopName - The shop name without .myshopify.com
 * @param {boolean} props.isEnabled - Current enabled state of the app
 * @param {string} [props.children] - Text for the Theme Editor link
 */
export function EnableThemeButton({
    shopName,
    isEnabled = false,
    onToggle, // Legacy prop, kept for compatibility but unused
    children = "Manage App in Theme Editor"
}) {
    const themeEditorUrl = `https://admin.shopify.com/store/${shopName}/themes/current/editor?context=apps`;

    return (
        <Button
            variant="primary"
            url={themeEditorUrl}
            external
            target="_blank"
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
