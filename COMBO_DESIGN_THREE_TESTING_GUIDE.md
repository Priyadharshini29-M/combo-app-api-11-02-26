# Combo Design Three - Testing & Verification Guide

## 🎯 Overview
This guide will help you verify that all features in the `combo_design_three.liquid` template are working correctly.

## 📋 Features Implemented

### 1. ✅ Auto Banner Slider
- **What it does**: Automatically rotates through up to 3 banner images
- **How to test**:
  1. Open browser console (F12)
  2. Look for: `🎠 Slider initialized with X slides`
  3. Watch banners auto-rotate every 5 seconds (default)
  4. Click dots to manually change slides
  5. Look for: `🎯 Manual slide change to: X`

**Customization Options**:
- Enable/Disable slider
- Slider speed (2-10 seconds)
- 3 banner images with titles and subtitles
- Shows placeholder gradient if no images uploaded

### 2. ✅ Dynamic Timer with Bundle Rotation
- **What it does**: Countdown timer that can auto-reset and change bundle offers
- **How to test**:
  1. Check console for: `⏰ Timer started: Xh Xm Xs`
  2. Watch timer count down in real-time
  3. Enable "Change Bundle on Timer End" in settings
  4. Wait for timer to expire
  5. Look for: `🔄 Timer expired, changing bundle...`
  6. Watch hero title/subtitle fade and change

**Customization Options**:
- Enable/Disable timer
- Set hours, minutes, seconds
- Auto-reset toggle
- Dynamic bundle change toggle
- Comma-separated bundle titles
- Comma-separated bundle subtitles

### 3. ✅ Proper Product Grid Alignment
- **What it does**: Products display in a responsive, properly aligned grid
- **Features**:
  - 2-column grid on mobile
  - Auto-fill on larger screens
  - Equal height cards
  - Proper spacing and alignment

### 4. ✅ Preview Bar (Optional)
- **What it does**: Shows selected products with live pricing
- **How to test**:
  1. Toggle "Show Preview Bar" in settings
  2. Add products to cart
  3. Watch preview bar update with product images
  4. See total price and discount calculations

### 5. ✅ All Other Existing Features
- Hero deal card with product
- Category filter pills
- Add to cart functionality
- Quantity selectors
- Sticky cart footer
- Discount calculations

## 🔍 Console Debugging

When you load the page, you should see these console messages:

```
🚀 Combo Design Three - Initializing...
📊 Config: { sliderEnabled: true, sliderSpeed: 5, ... }
🎠 Slider found, initializing...
🎠 Slider initialized with 1 slides, speed: 5000ms
ℹ️ Only 1 slide, auto-rotation disabled
⏰ Timer found, starting countdown...
⏰ Timer started: 2h 45m 12s, autoReset: true, dynamicBundle: false
🛍️ Loaded X products
✅ Initialization complete!
```

## 🎨 Customization Settings Location

All settings are available in the Shopify theme customizer:

1. **Banner Slider** section
   - Enable/disable
   - Speed control
   - 3 banner images + titles/subtitles

2. **Hero Deal Card** section
   - Show/hide
   - Product selection
   - Custom text and pricing

3. **Timer & Dynamic Bundles** section
   - Enable timer
   - Time settings
   - Auto-reset
   - Bundle rotation

4. **Pricing & Discounts** section
   - Discount percentage
   - Preview bar toggle

5. **Collections** section
   - 4 collection selectors
   - Category titles

## 🐛 Troubleshooting

### Slider not showing?
- Check console for: `⚠️ Slider not found or disabled`
- Verify "Enable Banner Slider" is checked
- Upload at least one banner image OR check that placeholder shows

### Timer not working?
- Check console for: `⚠️ Timer not found or disabled`
- Verify "Enable Countdown Timer" is checked
- Check that timer elements have IDs: `timer-hours`, `timer-minutes`, `timer-seconds`

### Products not loading?
- Check console for: `🛍️ Loaded X products`
- Verify collections are properly set
- Check that products exist in selected collections

### Customization not applying?
- Make sure to **save** changes in theme customizer
- **Refresh** the page after saving
- Check browser console for any errors
- Clear browser cache if needed

## 🧪 Quick Test Checklist

- [ ] Banner slider auto-rotates (if multiple banners)
- [ ] Manual slide selection works (click dots)
- [ ] Timer counts down correctly
- [ ] Timer resets when reaching zero (if auto-reset enabled)
- [ ] Bundle changes when timer expires (if enabled)
- [ ] Products display in proper grid
- [ ] Add to cart works
- [ ] Quantity selectors work
- [ ] Preview bar updates
- [ ] Sticky footer shows correct total
- [ ] All customization settings apply
- [ ] Console shows no errors

## 📱 Testing on Different Devices

- **Desktop**: Grid should show 2+ columns
- **Tablet**: Grid should be responsive
- **Mobile**: Grid should show 2 columns
- **All**: Slider should work smoothly
- **All**: Timer should be visible and functional

## 🎯 Performance Notes

- Slider uses CSS transforms for smooth animations
- Timer updates every 1 second
- No unnecessary re-renders
- Efficient DOM manipulation
- Proper event cleanup

## 💡 Tips

1. **Fast Timer Testing**: Set timer to `0h 0m 10s` for quick testing
2. **Bundle Rotation**: Add 3-4 bundle names separated by commas
3. **Slider Speed**: Use 2-3 seconds for testing, 5-7 for production
4. **Console Logs**: Keep browser console open during testing
5. **Save Often**: Save customizer settings after each change

---

**Need Help?**
- Check browser console for detailed logs
- All features have emoji-prefixed console messages
- Look for ⚠️ warnings or ❌ errors
