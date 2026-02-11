# Combo Design Three - Customization Reference

## 🎨 All Available Settings

### 🎨 Basic Styling
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Primary Color | Color | #20D060 | Main accent color for buttons, badges, etc. |
| Text Color | Color | #111111 | Main text color |
| Header Title | Text | "Value Combo Packs" | Page header title |

---

### 🖼️ Banner Slider
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable Banner Slider | Checkbox | ✅ true | Show/hide banner slider |
| Slider Speed | Range (2-10) | 5 seconds | Auto-rotation speed |
| Banner Image 1 | Image Picker | - | First banner image |
| Banner 1 Title | Text | "Mega Breakfast Bundle" | Title overlay for banner 1 |
| Banner 1 Subtitle | Text | "Milk, Bread, Eggs..." | Subtitle for banner 1 |
| Banner Image 2 | Image Picker | - | Second banner image |
| Banner 2 Title | Text | "Lunch Special" | Title overlay for banner 2 |
| Banner 2 Subtitle | Text | "Sandwich, Chips & Drink" | Subtitle for banner 2 |
| Banner Image 3 | Image Picker | - | Third banner image |
| Banner 3 Title | Text | "Dinner Combo" | Title overlay for banner 3 |
| Banner 3 Subtitle | Text | "Pasta, Sauce & Cheese" | Subtitle for banner 3 |

**Notes:**
- If no images uploaded, shows gradient placeholder
- Slider only auto-rotates if 2+ banners exist
- Dots navigation appears for multiple banners

---

### 🎁 Hero Deal Card
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Show Deal of the Day | Checkbox | ✅ true | Show/hide hero section |
| Hero Image Override | Image Picker | - | Custom image (overrides product image) |
| Hero Product | Product Picker | - | Product to feature |
| Hero Title | Text | "Mega Breakfast Bundle" | Custom title (overrides product title) |
| Hero Subtitle | Text | "Milk, Bread, Eggs..." | Descriptive subtitle |
| Hero Price | Text | "$14.99" | Custom price display |
| Hero Original Price | Text | "$24.50" | Strikethrough compare price |
| Hero Button Text | Text | "Add to Cart - Save 38%" | CTA button text |

---

### ⏰ Timer & Dynamic Bundles
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable Countdown Timer | Checkbox | ✅ true | Show/hide countdown timer |
| Timer Hours | Range (0-23) | 2 | Initial hours |
| Timer Minutes | Range (0-59) | 45 | Initial minutes |
| Timer Seconds | Range (0-59) | 12 | Initial seconds |
| Auto Reset Timer | Checkbox | ✅ true | Reset timer when it reaches zero |
| Change Bundle on Timer End | Checkbox | ❌ false | Rotate bundle offers when timer expires |
| Bundle Titles | Text (CSV) | "Mega Breakfast Bundle,Lunch Special,Dinner Combo" | Comma-separated bundle names |
| Bundle Subtitles | Text (CSV) | "Milk, Bread, Eggs...,Sandwich, Chips...,Pasta, Sauce..." | Comma-separated descriptions |

**How Dynamic Bundles Work:**
1. Timer counts down from set time
2. When timer reaches 0:00:00
   - If auto-reset: timer resets to initial time
   - If dynamic bundle enabled: hero title/subtitle change to next bundle
3. Cycles through all bundles in order
4. Smooth fade animation between changes

**Example Bundle Setup:**
```
Titles: "Morning Pack,Lunch Box,Dinner Deal,Snack Time"
Subtitles: "Coffee + Pastry,Sandwich + Chips,Pasta + Salad,Cookies + Milk"
```

---

### 💰 Pricing & Discounts
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Discount Percentage | Range (0-50, step 5) | 20% | Discount applied to combos |
| Show Preview Bar | Checkbox | ✅ true | Show/hide product preview bar |

---

### 📦 Collections
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Collection 1 | Collection Picker | - | First product collection |
| Title 1 | Text | "All Packs" | Tab label for collection 1 |
| Collection 2 Handle | Text | - | Second collection handle |
| Title 2 | Text | "Household" | Tab label for collection 2 |
| Collection 3 Handle | Text | - | Third collection handle |
| Title 3 | Text | "Snacks" | Tab label for collection 3 |
| Collection 4 Handle | Text | - | Fourth collection handle |
| Title 4 | Text | "Beverages" | Tab label for collection 4 |

---

## 🎯 Quick Setup Guide

### Minimal Setup (5 minutes)
1. ✅ Set Primary Color
2. ✅ Select Collection 1
3. ✅ Choose Hero Product
4. ✅ Adjust Timer (optional)

### Full Setup (15 minutes)
1. ✅ Upload 2-3 banner images
2. ✅ Customize banner titles/subtitles
3. ✅ Set slider speed
4. ✅ Configure hero deal
5. ✅ Set timer duration
6. ✅ Enable dynamic bundles (optional)
7. ✅ Add bundle rotation text
8. ✅ Set discount percentage
9. ✅ Configure 4 collections
10. ✅ Customize category titles

### Advanced Setup (30 minutes)
- Create custom banner graphics
- Set up timed bundle rotations
- Configure multiple product collections
- Test timer and bundle changes
- Optimize for mobile/desktop
- A/B test different timer durations

---

## 💡 Best Practices

### Banner Images
- **Size**: 800x200px minimum
- **Format**: JPG or PNG
- **Content**: High contrast text overlay works best
- **Mobile**: Keep important content centered

### Timer Settings
- **Short timers** (5-15 min): Create urgency
- **Medium timers** (1-3 hours): Daily deals
- **Long timers** (12-24 hours): Weekly specials
- **Test mode**: Use 10-30 seconds for testing

### Bundle Rotation
- **3-4 bundles**: Optimal variety
- **Consistent naming**: "Morning Pack", "Lunch Pack", etc.
- **Clear descriptions**: Mention key products
- **Match collections**: Align bundles with available products

### Collections
- **4 categories**: Covers most use cases
- **Clear names**: "Breakfast", "Lunch", "Dinner", "Snacks"
- **Balanced products**: 4-8 products per collection
- **Price range**: Similar pricing within collections

---

## 🔧 Troubleshooting

### "Nothing changed after saving"
- ✅ Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- ✅ Clear browser cache
- ✅ Check console for errors (F12)

### "Slider not showing"
- ✅ Verify "Enable Banner Slider" is checked
- ✅ Upload at least one banner image
- ✅ Check console for slider initialization

### "Timer not counting down"
- ✅ Verify "Enable Countdown Timer" is checked
- ✅ Check console for timer start message
- ✅ Refresh page

### "Bundle not changing"
- ✅ Enable "Change Bundle on Timer End"
- ✅ Set timer to short duration for testing
- ✅ Verify bundle titles/subtitles are comma-separated
- ✅ Wait for timer to reach 0:00:00

### "Products not showing"
- ✅ Verify collections have products
- ✅ Check collection handles are correct
- ✅ Ensure products are published
- ✅ Check console for product count

---

## 📊 Feature Matrix

| Feature | Customizable | Default State | Mobile Friendly |
|---------|--------------|---------------|-----------------|
| Banner Slider | ✅ Yes | Enabled | ✅ Yes |
| Auto-rotation | ✅ Yes | 5 seconds | ✅ Yes |
| Countdown Timer | ✅ Yes | Enabled | ✅ Yes |
| Dynamic Bundles | ✅ Yes | Disabled | ✅ Yes |
| Preview Bar | ✅ Yes | Enabled | ✅ Yes |
| Product Grid | Partial | 2 columns | ✅ Yes |
| Hero Card | ✅ Yes | Enabled | ✅ Yes |
| Sticky Footer | No | Auto | ✅ Yes |
| Category Filters | ✅ Yes | 4 tabs | ✅ Yes |
| Discount Display | ✅ Yes | 20% | ✅ Yes |

---

## 🎨 Color Customization Tips

### Primary Color Examples
- **Green** (#20D060): Fresh, organic, healthy
- **Blue** (#2196F3): Trust, professional, tech
- **Orange** (#FF9800): Energy, excitement, food
- **Purple** (#9C27B0): Premium, luxury, creative
- **Red** (#F44336): Urgency, deals, clearance

### Color Contrast
- Ensure text is readable on colored backgrounds
- Test on both light and dark modes
- Use color picker to match brand colors

---

**Last Updated**: 2026-02-03
**Template Version**: 3.0 (Enhanced)
