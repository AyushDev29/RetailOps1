# ⚡ Quick Start Guide

## 🎯 Goal
Get the authentication system running in 15 minutes.

## 📋 Prerequisites
- Node.js installed (v16 or higher)
- Google account (for Firebase)
- Code editor (VS Code recommended)

## 🚀 Steps

### 1️⃣ Install Dependencies (2 min)
```bash
cd clothing-brand-management
npm install
```

### 2️⃣ Create Firebase Project (3 min)
1. Go to https://console.firebase.google.com/
2. Click "Add Project"
3. Name: `clothing-brand-management`
4. Disable Analytics
5. Click "Create Project"

### 3️⃣ Enable Authentication (1 min)
1. Click "Authentication" in sidebar
2. Click "Get Started"
3. Click "Email/Password"
4. Toggle "Enable"
5. Click "Save"

### 4️⃣ Create Firestore (2 min)
1. Click "Firestore Database" in sidebar
2. Click "Create Database"
3. Select "Start in production mode"
4. Choose your region
5. Click "Enable"

### 5️⃣ Get Firebase Config (2 min)
1. Click gear icon ⚙️ > "Project Settings"
2. Scroll to "Your apps"
3. Click Web icon `</>`
4. App nickname: `clothing-brand-web`
5. Click "Register app"
6. Copy the config values

### 6️⃣ Update .env File (1 min)
Open `.env` and paste your values:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 7️⃣ Create Test Users (2 min)

**In Firebase Console:**
1. Go to Authentication > Users
2. Click "Add User"
3. Email: `owner@test.com`, Password: `owner123`
4. Click "Add User" again
5. Email: `employee@test.com`, Password: `employee123`

**Copy the UIDs** (you'll need them next)

### 8️⃣ Create User Profiles (2 min)

**In Firebase Console:**
1. Go to Firestore Database
2. Click "Start collection"
3. Collection ID: `users`
4. Click "Next"

**Add Owner Profile:**
- Document ID: [Paste owner's UID from step 7]
- Add fields:
  - `email` (string): `owner@test.com`
  - `name` (string): `Test Owner`
  - `role` (string): `owner`
  - `isActive` (boolean): `true`
  - `createdAt` (timestamp): [click "Set to current time"]
- Click "Save"

**Add Employee Profile:**
- Click "Add document"
- Document ID: [Paste employee's UID from step 7]
- Add same fields but:
  - `email`: `employee@test.com`
  - `name`: `Test Employee`
  - `role`: `employee`
- Click "Save"

### 9️⃣ Run the App (1 min)
```bash
npm run dev
```

Browser should open at http://localhost:3000

### 🔟 Test Login (1 min)

**Test Owner:**
- Email: `owner@test.com`
- Password: `owner123`
- Should redirect to `/owner`

**Test Employee:**
- Logout first
- Email: `employee@test.com`
- Password: `employee123`
- Should redirect to `/employee`

## ✅ Success!

If you can login with both accounts, you're done! 🎉

## 🐛 Common Issues

### "Configuration not found"
- Check .env file has correct values
- Restart dev server: `Ctrl+C` then `npm run dev`

### "User not found"
- Check email spelling
- Verify user exists in Authentication

### "Loading profile..." forever
- User profile missing in Firestore
- Check UID matches between Auth and Firestore
- Check field names are correct (lowercase)

### Can't access /owner as owner
- Check role field is exactly `owner` (lowercase)
- Check document ID matches UID from Authentication

## 📚 Need More Help?

- Detailed guide: `FIREBASE_SETUP.md`
- Step-by-step checklist: `SETUP_CHECKLIST.md`
- What we built: `AUTHENTICATION_COMPLETE.md`

## 🎯 Next Steps

Once authentication works:
1. Add products and categories
2. Build Daily Sales form
3. Implement Pre-booking
4. Create Exhibition management
5. Build analytics dashboards

---

**Estimated Total Time**: 15 minutes

**Status**: Ready to start! 🚀
