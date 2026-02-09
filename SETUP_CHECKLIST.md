# 🚀 Setup Checklist

Follow these steps in order to get your app running:

## ✅ Step 1: Install Dependencies
```bash
cd clothing-brand-management
npm install
```

## ✅ Step 2: Firebase Setup

### 2.1 Create Firebase Project
- [ ] Go to https://console.firebase.google.com/
- [ ] Create new project: "clothing-brand-management"
- [ ] Note your Project ID

### 2.2 Enable Authentication
- [ ] Go to Authentication > Get Started
- [ ] Enable Email/Password sign-in method

### 2.3 Create Firestore Database
- [ ] Go to Firestore Database > Create Database
- [ ] Start in production mode
- [ ] Choose your region (e.g., asia-south1 for India)

### 2.4 Update Security Rules
- [ ] Copy rules from `FIREBASE_SETUP.md` Step 4
- [ ] Paste in Firestore > Rules
- [ ] Publish

### 2.5 Get Firebase Config
- [ ] Go to Project Settings (gear icon)
- [ ] Scroll to "Your apps"
- [ ] Click Web icon (</>)
- [ ] Copy the config values

### 2.6 Update .env File
- [ ] Open `.env` file
- [ ] Replace all values with your Firebase config
- [ ] Save file

## ✅ Step 3: Create Test Users

### 3.1 Create in Firebase Console
- [ ] Go to Authentication > Users > Add User
- [ ] Create owner@test.com / owner123
- [ ] Create employee@test.com / employee123
- [ ] Copy both UIDs

### 3.2 Create User Profiles in Firestore
- [ ] Go to Firestore Database
- [ ] Create collection: `users`
- [ ] Add document with owner's UID:
  ```
  email: "owner@test.com"
  name: "Test Owner"
  role: "owner"
  isActive: true
  createdAt: [timestamp]
  ```
- [ ] Add document with employee's UID:
  ```
  email: "employee@test.com"
  name: "Test Employee"
  role: "employee"
  isActive: true
  createdAt: [timestamp]
  ```

## ✅ Step 4: Run the App
```bash
npm run dev
```

App should open at http://localhost:3000

## ✅ Step 5: Test Login

### Test Owner Login
- [ ] Go to http://localhost:3000
- [ ] Login with: owner@test.com / owner123
- [ ] Should redirect to /owner
- [ ] Should see "Test Owner (owner)" in navbar
- [ ] Logout button should work

### Test Employee Login
- [ ] Login with: employee@test.com / employee123
- [ ] Should redirect to /employee
- [ ] Should see "Test Employee (employee)" in navbar
- [ ] Logout button should work

### Test Protected Routes
- [ ] Logout
- [ ] Try to access /owner directly
- [ ] Should redirect to /login
- [ ] Login as employee
- [ ] Try to access /owner
- [ ] Should redirect back to /employee

## 🎉 Success!

If all checkboxes are checked, your authentication is working perfectly!

## 🐛 Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Check if .env file has correct values
- Restart dev server after changing .env

### "Missing or insufficient permissions"
- Check Firestore security rules
- Make sure user document exists in Firestore

### "User not found" or "Wrong password"
- Verify user exists in Authentication
- Check email/password spelling

### Login works but shows "Loading profile..."
- User document missing in Firestore
- Check UID matches between Auth and Firestore

### Can't access /owner as owner
- Check user document has role: "owner"
- Check spelling (lowercase)

## 📚 Next Steps

Once authentication works:
1. ✅ Authentication (DONE!)
2. ⏭️ Add products and categories
3. ⏭️ Build Daily Sales form
4. ⏭️ Implement Pre-booking
5. ⏭️ Create Exhibition management
6. ⏭️ Build analytics

---

**Need help?** Check `FIREBASE_SETUP.md` for detailed instructions.
