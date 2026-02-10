# Step 1 Deployment Checklist

## ⚠️ CRITICAL: Deploy Firestore Rules

The new product schema requires updated security rules. Without deploying them, you'll get "Missing or insufficient permissions" errors.

## Quick Deploy Command

```bash
cd clothing-brand-management
firebase deploy --only firestore:rules
```

## What This Does

Deploys the security rules from `firestore.rules` to your Firebase project, which includes:
- ✅ Product collection rules (employee read-only, owner full access)
- ✅ Sale price validation at database level
- ✅ GST rate validation
- ✅ Category validation
- ✅ Required fields enforcement

## After Deployment

1. **Clear Old Products** (they have old schema)
   - Go to Firebase Console → Firestore Database
   - Delete all documents in `products` collection
   - OR keep them and manually update to new schema

2. **Seed New Products**
   - Login as Owner
   - Go to Owner Dashboard → Products tab
   - Click "Add Sample Products" button
   - This creates 12 products with new schema

3. **Test the App**
   - Login as Employee
   - Try creating an order
   - Products should now load without errors

## Troubleshooting

### Still Getting Permission Errors?

1. **Check rules deployed:**
   ```bash
   firebase firestore:rules:get
   ```

2. **Check user role in Firestore:**
   - Go to Firebase Console → Firestore
   - Open `users` collection
   - Find your user document
   - Verify `role` field is "employee" or "owner"
   - Verify `isActive` field is `true`

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for specific error messages
   - Check which collection is causing the error

### Products Not Loading?

- Old products use `active` field (boolean)
- New schema uses `isActive` field (boolean)
- Employee queries filter by `isActive: true`
- Solution: Delete old products and seed new ones

### "Add Sample Products" Button Not Working?

- Only owners can seed products
- Check you're logged in as owner
- Check console for specific error
- Verify `createProduct` function in productService

## Verification Steps

After deployment, verify:

1. ✅ Employee can read active products
2. ✅ Employee cannot create/update products
3. ✅ Owner can create products
4. ✅ Owner can update products
5. ✅ Sale price < base price is enforced
6. ✅ Invalid GST rates are rejected
7. ✅ Invalid categories are rejected

## Next Steps

Once rules are deployed and products are seeded:
- ✅ Step 1 (Product Data Model) is complete
- ✅ Step 2 (Order Calculation Engine) is complete
- ⏳ Step 3 (UI Integration) - Future work

---

**Status:** Waiting for Firestore rules deployment
