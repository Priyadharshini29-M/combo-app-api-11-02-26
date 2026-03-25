
import { authenticate } from '../shopify.server';

/**
 * Registers a ScriptTag on the Shopify store to inject your JS/CSS into the storefront.
 * @param {string} shop - The shop domain (e.g., 'your-shop.myshopify.com')
 * @param {string} accessToken - The shop's access token
 * @param {string} scriptUrl - The public URL of your JS file
 * @returns {Promise<object>} Shopify ScriptTag API response
 */
  const axios = (await import('axios')).default;
  const apiVersion = '2023-10';
  const endpoint = `https://${shop}/admin/api/${apiVersion}/script_tags.json`;
  const payload = {
    script_tag: {
      event: 'onload',
      src: scriptUrl,
    },
  };
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };
  const response = await axios.post(endpoint, payload, { headers });
  return response.data;
}
