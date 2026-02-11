# Customization Features Added

## Overview
The Customize Template page now includes comprehensive backend-driven customization options for collections, products, and banner images.

## New Features

### 1. Collection & Products Selection
Located in the "Collection & Products" card on the customize page.

**Features:**
- **Collection Selector**: Dropdown populated with all collections from Shopify
  - Shows collection title and product count
  - Fetched via GraphQL from Shopify Admin API
  
- **Collection Handle**: Text field for entering the collection handle
  - Used in Liquid templates on the storefront
  - Example: `combo-products`
  
- **Individual Products**: Optional product ID field
  - Allows selecting specific products instead of a collection
  - Comma-separated product IDs
  - Overrides collection if provided

**Config Keys:**
- `selected_collection_id`: Shopify collection GID
- `collection_handle`: Collection handle string
- `selected_product_ids`: Comma-separated product GIDs

### 2. Banner Images
Located in the "Banner Images" card on the customize page.

**Features:**
- **Desktop Banner**: URL input with live preview
  - Recommended size: 1200x400px
  - Shows preview when URL is entered
  
- **Mobile Banner**: URL input with live preview
  - Recommended size: 800x300px
  - Optional - uses desktop banner if not provided
  - Preview limited to 375px width
  
- **Helpful Tips**: Guidance on uploading images to Shopify Files

**Config Keys:**
- `banner_image_url`: Desktop banner image URL
- `banner_image_mobile_url`: Mobile banner image URL

## Backend Implementation

### GraphQL Queries Added

**Collections Query:**
```graphql
query getCollections {
  collections(first: 50) {
    nodes {
      id
      title
      handle
      productsCount
    }
  }
}
```

**Products Query:**
```graphql
query getProducts {
  products(first: 50) {
    nodes {
      id
      title
      handle
      featuredImage {
        url
      }
      variants(first: 1) {
        nodes {
          price
        }
      }
    }
  }
}
```

### Loader Updates
The `app.customize.jsx` loader now fetches:
- Collections from Shopify
- Products from Shopify
- Pages (existing)
- Discounts (existing)

All data is passed to the component via `useLoaderData()`.

## Usage Instructions

### For Merchants:

1. **Setting Up Collections:**
   - Navigate to Customize Template page
   - Select a collection from the dropdown
   - Enter the collection handle (must match your Shopify collection)
   - Products from this collection will appear in the combo builder

2. **Adding Banner Images:**
   - Go to Shopify Admin > Content > Files
   - Upload your banner images
   - Copy the image URL
   - Paste into the Desktop/Mobile Banner fields
   - Preview will show immediately

3. **Using Individual Products:**
   - If you want specific products instead of a collection
   - Enter product IDs in the "Product IDs" field
   - Separate multiple IDs with commas
   - This will override the collection selection

## Next Steps

To fully integrate these features:

1. **Update `combo-builder-loader.js`** to use the new config values:
   - Read `banner_image_url` and `banner_image_mobile_url`
   - Fetch products based on `selected_collection_id` or `selected_product_ids`

2. **Update Liquid Templates** to use collection handle:
   - Use `config.collection_handle` in Liquid loops
   - Example: `{% for product in collections[config.collection_handle].products %}`

3. **Add File Upload** (optional enhancement):
   - Integrate Shopify File API for direct uploads
   - Remove need for manual URL copying

## Files Modified

- `app/routes/app.customize.jsx`:
  - Added GraphQL queries for collections and products
  - Added UI cards for Collection/Products and Banner Images
  - Updated loader to fetch and pass data
