# 🔥 Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `clothing-brand-management`
4. Disable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Click on **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create Database"
3. Select **Start in production mode**
4. Choose location closest to you (e.g., asia-south1 for India)
5. Click "Enable"

## Step 4: Set Firestore Security Rules

Go to **Firestore Database > Rules** and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Users collection - users can only read their own profile
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow write: if false; // Only admin can create users
    }
    
    // Products - read by all authenticated users
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() == 'owner';
    }
    
    // Categories - read by all authenticated users
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() == 'owner';
    }
    
    // Customers - read/write by authenticated users
    match /customers/{customerId} {
      allow read, write: if isAuthenticated();
    }
    
    // Daily Sales - read/write by authenticated users
    match /dailySales/{saleId} {
      allow read, write: if isAuthenticated();
    }
    
    // Pre-bookings - read/write by authenticated users
    match /preBookings/{bookingId} {
      allow read, write: if isAuthenticated();
    }
    
    // Exhibitions - read/write by authenticated users
    match /exhibitions/{exhibitionId} {
      allow read, write: if isAuthenticated();
    }
    
    // Exhibition Sales - read/write by authenticated users
    match /exhibitionSales/{saleId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

Click **Publish**

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ > Project Settings
2. Scroll down to "Your apps"
3. Click the **Web icon** (</>)
4. Register app name: `clothing-brand-web`
5. Copy the firebaseConfig object

## Step 6: Update .env File

Open `.env` file and replace with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## Step 7: Create Test Users

You need to manually create users in Firebase Console:

### Method 1: Firebase Console (Recommended for first users)

1. Go to **Authentication > Users**
2. Click "Add User"
3. Create Owner account:
   - Email: `owner@test.com`
   - Password: `owner123`
4. Create Employee account:
   - Email: `employee@test.com`
   - Password: `employee123`

### Method 2: Use the createUser script

After creating the first owner account, you can use the app to create more users.

## Step 8: Create User Profiles in Firestore

After creating users in Authentication, you need to add their profiles:

1. Go to **Firestore Database**
2. Click "Start collection"
3. Collection ID: `users`
4. Add documents for each user:

### Owner Document:
```
Document ID: [Copy UID from Authentication]
Fields:
  - email: "owner@test.com"
  - name: "Owner Name"
  - role: "owner"
  - isActive: true
  - createdAt: [current timestamp]
```

### Employee Document:
```
Document ID: [Copy UID from Authentication]
Fields:
  - email: "employee@test.com"
  - name: "Employee Name"
  - role: "employee"
  - isActive: true
  - createdAt: [current timestamp]
```

## Step 9: Create Initial Collections (Optional)

Create these empty collections for better structure:

1. `products`
2. `categories`
3. `customers`
4. `dailySales`
5. `preBookings`
6. `exhibitions`
7. `exhibitionSales`

## Step 10: Test the Application

```bash
cd clothing-brand-management
npm install
npm run dev
```

Login with:
- **Owner**: owner@test.com / owner123
- **Employee**: employee@test.com / employee123

## ✅ Verification Checklist

- [ ] Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Firestore database created
- [ ] Security rules updated
- [ ] .env file configured
- [ ] Test users created in Authentication
- [ ] User profiles created in Firestore
- [ ] App runs locally
- [ ] Login works for both roles
- [ ] Owner redirects to /owner
- [ ] Employee redirects to /employee

## 🔒 Security Notes

1. Never commit `.env` file to git
2. Use strong passwords in production
3. Update security rules before going live
4. Enable App Check for production
5. Set up Firebase Admin SDK for user management

## 📝 Next Steps

After authentication works:
1. Add products and categories
2. Build Daily Sales form
3. Implement Pre-booking system
4. Create Exhibition management
5. Build analytics dashboards
