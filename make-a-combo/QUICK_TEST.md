# Quick Test Instructions

## Test 1: Save a New Template

1. **Go to** `/app/customize`
2. **Make any changes** to the template (change a color, text, etc.)
3. **Click "Save Template"**
4. **Enter a title** like "Test Template 123"
5. **Click Save**

### Expected Results:
- ✅ Success toast message appears
- ✅ You're redirected to `/app/templates`
- ✅ New template appears in the list

### Check Terminal Logs:
You should see in your terminal (where `shopify app dev` is running):

```
[Templates API] Received request: { contentType: '...', action: 'create', resource: undefined }
[Templates API] ✨ Creating template: { id: X, title: 'Test Template 123', shop: '...' }
[Templates API] ✅ Template saved to fake_db.json
[Templates API] 📤 Calling PHP webhook...
[PHP API] 🚀 Sending to webhook: https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php
[PHP API] 📦 Payload: { event: 'create', resource: 'templates', shop: '...', dataPreview: 'X fields' }
[PHP API] ✅ Response Status: 200
[PHP API] 📄 Response Body: (whatever your PHP returns)
```

---

## Test 2: Verify Data in fake_db.json

1. **Open** `public/fake_db.json`
2. **Look for** your new template at the top of the `templates` array
3. **Verify** it has:
   - `id` (number)
   - `title` (your title)
   - `config` (object with all settings)
   - `shop` (your shop domain)
   - `active` (should be `false`)
   - `createdAt` (ISO timestamp)

---

## Test 3: Check PHP Endpoint

### Option A: Check PHP Logs
If you have access to your PHP server logs, check if the POST request was received.

### Option B: Test Manually with curl
```bash
curl -X POST https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "resource": "templates",
    "shop": "test.myshopify.com",
    "data": {
      "id": 999,
      "title": "Manual Test"
    }
  }'
```

This should return whatever your PHP script outputs.

---

## Troubleshooting

### Issue: No logs appearing in terminal

**Possible causes:**
1. The API isn't being called
2. The request is failing before reaching the action

**Solution:**
- Check browser console (F12) for errors
- Make sure you're clicking "Save Template" not just "Save"

---

### Issue: "Body parse error" in logs

**Possible cause:**
The request format doesn't match what the API expects

**Solution:**
- Check the browser console for the actual request being sent
- Verify the customize page is using `/api/templates`

---

### Issue: Template saves but PHP webhook not called

**Possible causes:**
1. ngrok URL is not accessible
2. Network error
3. PHP script is rejecting the request

**Solution:**
1. Test ngrok URL in browser: `https://b97f-103-186-151-131.ngrok-free.app/make-a-combo/test.php`
2. Check terminal for `[PHP API] ❌` errors
3. Look for network errors in the logs

---

### Issue: Template not appearing in list

**Possible causes:**
1. Shop filter is excluding it
2. Template was saved to wrong shop
3. Page needs refresh

**Solution:**
1. Check `fake_db.json` - is the template there?
2. Verify the `shop` field matches your current shop
3. Hard refresh the page (Ctrl+Shift+R)

---

## What to Share if Still Not Working

If it's still not working, please share:

1. **Terminal output** (copy the logs from when you click Save)
2. **Browser console** (F12 → Console tab, copy any errors)
3. **Which specific issue:**
   - [ ] Template not saving at all
   - [ ] Template saving but not showing in list
   - [ ] Template saving but PHP webhook not being called
   - [ ] PHP webhook being called but failing
   - [ ] Other: _______________

---

## Success Checklist

- [ ] Terminal shows `[Templates API] ✨ Creating template`
- [ ] Terminal shows `[Templates API] ✅ Template saved to fake_db.json`
- [ ] Terminal shows `[PHP API] 🚀 Sending to webhook`
- [ ] Terminal shows `[PHP API] ✅ Response Status: 200`
- [ ] Template appears in `public/fake_db.json`
- [ ] Template appears in `/app/templates` page
- [ ] PHP endpoint received the data

If all checkboxes are checked, everything is working! ✅
