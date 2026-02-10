# Deploy Bills Collection Rules

## What Changed
Added Firestore security rules for the new `bills` collection to enable bill storage and retrieval.

## Deployment Steps

### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the entire content from `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Firebase CLI
```bash
firebase deploy --only firestore:rules
```

## What the Rules Allow

### Bills Collection (`/bills/{billId}`)
- **Employees**: 
  - Can create bills (only their own)
  - Can read their own bills
  - Can list/query their own bills
- **Owners**: 
  - Can read all bills
  - Can list/query all bills
- **No one**: 
  - Can update bills (immutable)
  - Can delete bills (permanent record)

## Verification
After deployment, test by:
1. Creating a new order in Employee Dashboard
2. Check that bill appears in "Today's Sales" section
3. Click "View Bill" to reopen the bill

## Troubleshooting
If you get "Missing or insufficient permissions":
- Verify rules are deployed
- Check that user is authenticated
- Ensure user has active status
- Check browser console for detailed error
