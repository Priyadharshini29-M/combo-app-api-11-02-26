# API Testing Guide

## How to Test if Everything is Working

### 1. **Test Template Creation**

1. Go to the Customize page (`/app/customize`)
2. Make some changes to the template
3. Click "Save Template"
4. Enter a title like "Test Template"
5. Click Save

**Expected Results:**
- ✅ You should see a success toast message
- ✅ You should be redirected to `/app/templates`
- ✅ The new template should appear in the list

**Check the Browser Console (F12):**
You should see these logs:
```
[Templates API] Creating new template: {id: X, title: "Test Template", shop: "..."}
[Templates API] Template saved to fake_db.json
[Templates API] Sending to PHP webhook...
[PHP API] Response: ...
[Templates API] ✅ PHP webhook call completed
```

**Check the Terminal:**
You should see:
```
[PHP API] Response: (whatever your PHP script returns)
```

---

### 2. **Test Template Update**

1. Go to Templates page (`/app/templates`)
2. Click "Edit" on any template
3. Make some changes
4. Click "Save Template"

**Expected Results:**
- ✅ Success toast
- ✅ Changes saved
- ✅ PHP webhook called

**Browser Console:**
```
[Templates API] Updating template: {id: X, title: "..."}
[Templates API] Sending update to PHP webhook...
[Templates API] ✅ PHP webhook update completed
```

---

### 3. **Test Template Activation/Deactivation**

1. Go to Templates page
2. Click "Activate" or "Deactivate" button

**Expected Results:**
- ✅ Status changes
- ✅ PHP webhook called with update event

---

### 4. **Verify Data in fake_db.json**

Open: `public/fake_db.json`

You should see your templates in the `templates` array:
```json
{
  "templates": [
    {
      "id": 51,
      "title": "Test Template",
      "config": { ... },
      "shop": "make-a-combo.myshopify.com",
      "active": false,
      "createdAt": "2026-02-11T..."
    }
  ],
  "discounts": []
}
```

---

### 5. **Verify PHP Webhook Received Data**

Check your PHP endpoint logs or database to confirm it received:

**For CREATE:**
```json
{
  "event": "create",
  "resource": "templates",
  "shop": "make-a-combo.myshopify.com",
  "data": {
    "id": 51,
    "title": "Test Template",
    "config": { ... },
    "shop": "make-a-combo.myshopify.com",
    "active": false,
    "createdAt": "2026-02-11T04:32:36.000Z"
  }
}
```

**For UPDATE:**
```json
{
  "event": "update",
  "resource": "templates",
  "shop": "make-a-combo.myshopify.com",
  "data": { ... }
}
```

**For DELETE:**
```json
{
  "event": "delete",
  "resource": "templates",
  "shop": "make-a-combo.myshopify.com",
  "id": 51
}
```

---

## Troubleshooting

### Issue: "Templates not saving"

**Check:**
1. Browser console for errors
2. Terminal for server errors
3. File permissions on `public/fake_db.json`

**Solution:**
```bash
# Make sure the file is writable
# On Windows, right-click fake_db.json → Properties → Uncheck "Read-only"
```

---

### Issue: "PHP webhook not receiving data"

**Check:**
1. Is ngrok running? Test the URL in browser
2. Browser console - do you see `[PHP API] Error:`?
3. Is the URL correct in `app/utils/api-helpers.js`?

**Test PHP endpoint manually:**
```bash
curl -X POST https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php \
  -H "Content-Type: application/json" \
  -d '{"event":"test","resource":"templates","shop":"test.myshopify.com","data":{"id":1,"title":"Test"}}'
```

---

### Issue: "Templates showing but not updating"

**Check:**
1. Are you using the new API endpoints (`/api/templates`)?
2. Check `app/routes/app.customize.jsx` - should use `/api/templates`
3. Clear browser cache and reload

---

## Quick Diagnostic Checklist

- [ ] Templates appear in the UI (`/app/templates`)
- [ ] Can create new templates
- [ ] Can edit existing templates  
- [ ] Can activate/deactivate templates
- [ ] Data saves to `public/fake_db.json`
- [ ] Browser console shows `[Templates API]` logs
- [ ] Browser console shows `[PHP API] Response:` logs
- [ ] PHP endpoint receives the data
- [ ] No errors in browser console
- [ ] No errors in terminal

---

## Current API Endpoints

✅ **Templates API:** `/api/templates`
- GET: Fetch templates
- POST: Create/Update/Delete templates

✅ **Discounts API:** `/api/discounts`  
- GET: Fetch discounts
- POST: Create/Update/Delete discounts

❌ **OLD (Deprecated):** `/api/fake-backend`
- Should NOT be used anymore

---

## Next Steps

If everything is working:
1. ✅ Delete `app/routes/api.fake-backend.jsx` (no longer needed)
2. ✅ Test on your actual Shopify store
3. ✅ Monitor PHP logs for incoming data

If something is NOT working:
1. Share the browser console logs
2. Share the terminal output
3. Share any error messages you see
