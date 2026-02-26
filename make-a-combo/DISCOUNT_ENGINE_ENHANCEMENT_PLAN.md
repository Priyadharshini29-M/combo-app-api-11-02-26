# Discount Engine Enhancement Plan

## Overview
Enhance the Discount Engine to properly save all conditions and add "Applies To" fields with Shopify API integration for browsing products and collections.

## Required Enhancements

### 1. Add "Applies To" Section
Add a new section between "Type/Value" and "Schedule" with the following options:
- **All Products** (default)
- **Specific Collections** (with collection browser)
- **Specific Products** (with product browser)

### 2. Shopify Resource Picker Integration
Use Shopify App Bridge's Resource Picker to allow merchants to:
- Browse and select products
- Browse and select collections
- Display selected items with remove option

### 3. Data Structure Updates

#### Current Structure (Missing):
```javascript
{
  title: "Summer Sale",
  code: "SAVE10",
  type: "percentage",
  value: "10"
  // Missing: appliesTo, selectedProducts, selectedCollections
}
```

#### Enhanced Structure:
```javascript
{
  title: "Summer Sale",
  code: "SAVE10",
  type: "percentage",
  value: "10",
  appliesTo: "all_products", // or "specific_collections" or "specific_products"
  selectedProducts: [
    {
      id: "gid://shopify/Product/123",
      title: "T-Shirt",
      image: "https://...",
      variants: [...]
    }
  ],
  selectedCollections: [
    {
      id: "gid://shopify/Collection/456",
      title: "Summer Collection",
      image: "https://..."
    }
  ],
  // All existing fields...
  eligibility: "all",
  minRequirementType: "none",
  combinations: {...}
}
```

### 4. GraphQL Mutation Updates

Update the Shopify discount creation to handle:
- `items.all: true` for all products
- `items.collections.add: [collectionIds]` for specific collections
- `items.products.add: [productIds]` for specific products

### 5. UI Components Needed

1. **Applies To Radio Group**
   - All products
   - Specific collections
   - Specific products

2. **Resource Picker Buttons**
   - "Browse Collections" button (when collections selected)
   - "Browse Products" button (when products selected)

3. **Selected Items Display**
   - Show selected products/collections as chips/cards
   - Allow removal of individual items

4. **State Management**
   - `appliesTo` state
   - `selectedProducts` state
   - `selectedCollections` state

## Implementation Steps

### Step 1: Add State Variables
```javascript
const [appliesTo, setAppliesTo] = useState('all_products');
const [selectedProducts, setSelectedProducts] = useState([]);
const [selectedCollections, setSelectedCollections] = useState([]);
```

### Step 2: Add Resource Picker Functions
```javascript
const selectProducts = async () => {
  const products = await shopify.resourcePicker({
    type: 'product',
    multiple: true
  });
  if (products) {
    setSelectedProducts(products);
  }
};

const selectCollections = async () => {
  const collections = await shopify.resourcePicker({
    type: 'collection',
    multiple: true
  });
  if (collections) {
    setSelectedCollections(collections);
  }
};
```

### Step 3: Add UI Section
Insert between lines 955-957 (after Type/Value, before Schedule):

```jsx
{/* Applies To Section */}
<div style={{ marginBottom: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
  <h3>Applies to</h3>
  
  <div>
    <label>
      <input type="radio" name="appliesTo" value="all_products" 
        checked={appliesTo === 'all_products'}
        onChange={() => setAppliesTo('all_products')} />
      All products
    </label>
    
    <label>
      <input type="radio" name="appliesTo" value="specific_collections"
        checked={appliesTo === 'specific_collections'}
        onChange={() => setAppliesTo('specific_collections')} />
      Specific collections
    </label>
    
    <label>
      <input type="radio" name="appliesTo" value="specific_products"
        checked={appliesTo === 'specific_products'}
        onChange={() => setAppliesTo('specific_products')} />
      Specific products
    </label>
  </div>
  
  {appliesTo === 'specific_collections' && (
    <div>
      <Button onClick={selectCollections}>Browse Collections</Button>
      {/* Display selected collections */}
    </div>
  )}
  
  {appliesTo === 'specific_products' && (
    <div>
      <Button onClick={selectProducts}>Browse Products</Button>
      {/* Display selected products */}
    </div>
  )}
</div>
```

### Step 4: Update Form Submission
Add hidden fields to send data:
```jsx
<input type="hidden" name="appliesTo" value={appliesTo} />
<input type="hidden" name="selectedProducts" value={JSON.stringify(selectedProducts)} />
<input type="hidden" name="selectedCollections" value={JSON.stringify(selectedCollections)} />
```

### Step 5: Update Server Action
Parse and save the new fields:
```javascript
const newDiscount = {
  // ... existing fields
  appliesTo: formData.get('appliesTo'),
  selectedProducts: JSON.parse(formData.get('selectedProducts') || '[]'),
  selectedCollections: JSON.parse(formData.get('selectedCollections') || '[]'),
};
```

### Step 6: Update GraphQL Mutation
```javascript
customerGets: {
  value: {...},
  items: appliesTo === 'all_products' 
    ? { all: true }
    : appliesTo === 'specific_collections'
    ? { collections: { add: selectedCollections.map(c => c.id) } }
    : { products: { add: selectedProducts.map(p => p.id) } }
}
```

## Files to Modify

1. **app/routes/app.discountengine.jsx**
   - Add state variables
   - Add Resource Picker functions
   - Add "Applies To" UI section
   - Update form submission
   - Update server action
   - Update GraphQL mutation

2. **app/routes/api.discounts.jsx**
   - Update to handle appliesTo field
   - Update GraphQL mutation for collections/products

3. **discount.php**
   - Update to store appliesTo, selectedProducts, selectedCollections in settings JSON

## Testing Checklist

- [ ] Can select "All Products" and create discount
- [ ] Can browse and select collections
- [ ] Can browse and select products
- [ ] Selected items display correctly
- [ ] Can remove selected items
- [ ] Form submission includes all data
- [ ] Data saves to database correctly
- [ ] Shopify discount created with correct scope
- [ ] Edit mode loads existing selections
- [ ] All existing fields still work

## Benefits

1. **Complete Feature Parity**: Matches Shopify's native discount creation
2. **Better UX**: Visual product/collection selection
3. **Data Integrity**: All conditions properly saved
4. **Shopify Sync**: Discounts created with correct scope in Shopify
5. **Flexibility**: Merchants can target specific products/collections
