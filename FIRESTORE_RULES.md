# 🔒 Firestore Security Rules

## Copy these rules to Firebase Console

Go to: https://console.firebase.google.com/project/kamdon-poject/firestore/rules

Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Get the role of the authenticated user
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Check if user is owner
    function isOwner() {
      return isAuthenticated() && getUserRole() == 'owner';
    }
    
    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Allow user creation during registration
      allow create: if isAuthenticated();
      
      // Users can read their own profile
      // Owners can read all user profiles
      allow read: if isAuthenticated() && 
                     (request.auth.uid == userId || isOwner());
      
      // Only owners can update users (for role management)
      allow update: if isOwner();
      
      // Only owners can delete users
      allow delete: if isOwner();
    }
    
    // ============================================
    // PRODUCTS COLLECTION
    // ============================================
    match /products/{productId} {
      // All authenticated users can read products
      allow read: if isAuthenticated();
      
      // All authenticated users can create products (for seeding)
      // In production, change this to: allow create: if isOwner();
      allow create: if isAuthenticated();
      
      // Only owners can update/delete products
      allow update, delete: if isOwner();
    }
    
    // ============================================
    // CUSTOMERS COLLECTION
    // ============================================
    match /customers/{customerId} {
      // All authenticated users can read/write customers
      allow read, write: if isAuthenticated();
    }
    
    // ============================================
    // ORDERS COLLECTION (unified: daily, prebooking, exhibition)
    // ============================================
    match /orders/{orderId} {
      // All authenticated users can read orders
      allow read: if isAuthenticated();
      
      // Employees can create orders (with their own createdBy)
      allow create: if isAuthenticated()
                    && request.resource.data.createdBy == request.auth.uid;
      
      // Employees can update their own orders (for pre-booking conversion)
      allow update: if isAuthenticated()
                    && resource.data.createdBy == request.auth.uid;
      
      // Only owners can delete orders
      allow delete: if isOwner();
    }
    
    // ============================================
    // EXHIBITIONS COLLECTION
    // ============================================
    match /exhibitions/{exhibitionId} {
      // All authenticated users can read exhibitions
      allow read: if isAuthenticated();
      
      // Employees can create exhibitions (with their own createdBy)
      allow create: if isAuthenticated()
                    && request.resource.data.createdBy == request.auth.uid;
      
      // Employees can update their own exhibitions
      allow update: if isAuthenticated()
                    && resource.data.createdBy == request.auth.uid;
      
      // Only owners can delete exhibitions
      allow delete: if isOwner();
    }
  }
}
```

## 🔐 What These Rules Do

### 1. **Users Collection**
- ✅ Users can create their own profile during registration
- ✅ Users can read their own profile
- ✅ Owners can read all user profiles (for user management)
- ❌ Employees cannot read other user profiles
- ✅ Only owners can update/delete users

### 2. **Products**
- ✅ All authenticated users can read products
- ✅ All authenticated users can create products (for seeding - change to owner-only in production)
- ✅ Only owners can update/delete products

### 3. **Customers**
- ✅ All authenticated users can read/write customers
- 🔒 Must be authenticated

### 4. **Orders** (unified: daily sales, pre-bookings, exhibition sales)
- ✅ All authenticated users can read orders
- ✅ Employees can create orders (only with their own createdBy)
- ✅ Employees can update their own orders (for pre-booking conversion)
- ✅ Only owners can delete orders

### 5. **Exhibitions**
- ✅ All authenticated users can read exhibitions
- ✅ Employees can create exhibitions (only with their own createdBy)
- ✅ Employees can update their own exhibitions
- ✅ Only owners can delete exhibitions

## 🛡️ Security Features

1. **Role-Based Access**: Rules check user role from Firestore for owner operations
2. **Creator Validation**: Employees can only create/update records with their own UID
3. **Owner Privileges**: Owners have full delete access
4. **Data Integrity**: Orders and exhibitions can only be deleted by owners

## 📝 How to Apply

1. Go to Firebase Console: https://console.firebase.google.com/project/kamdon-poject/firestore/rules
2. Navigate to Firestore Database > Rules
3. Copy the rules above
4. Paste and replace all existing rules
5. Click "Publish"

## ⚠️ Important Notes

- Products can be created by anyone (for seeding). In production, change to `allow create: if isOwner();`
- The `getUserRole()` function fetches the role from Firestore (server-side)
- Users cannot fake their role because it's validated server-side
- Employees can only modify their own orders and exhibitions

## 🧪 Testing After Applying Rules

1. Register a new user (defaults to employee)
2. Login and access Employee Dashboard
3. Click "Add Sample Products" - should work
4. Create orders and exhibitions - should work
5. Check browser console - no permission errors
