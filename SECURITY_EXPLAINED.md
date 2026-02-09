# 🔒 Security System Explained

## How We Prevent Employees from Accessing Owner Dashboard

### 3-Layer Security System

```
┌─────────────────────────────────────────────────────────┐
│                    LAYER 1: UI/Frontend                 │
│  Login page with role buttons (Employee/Owner)          │
│  ProtectedRoute checks role before rendering            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              LAYER 2: Auth Context (App Logic)          │
│  Fetches REAL role from Firestore after login           │
│  Redirects based on ACTUAL role, not button clicked     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         LAYER 3: Firestore Rules (Database Level)       │
│  Blocks revenue queries if user role != 'owner'         │
│  Even if employee accesses page, can't fetch data       │
└─────────────────────────────────────────────────────────┘
```

## Real-World Example

### Scenario: Employee tries to access Owner Dashboard

**Step 1: Employee clicks "Login as Owner"**
```
UI shows: "Logging in as: Owner"
```

**Step 2: Employee enters their credentials**
```
Email: employee@test.com
Password: employee123
```

**Step 3: Firebase authenticates**
```
✅ Authentication successful
User UID: abc123xyz
```

**Step 4: App fetches user profile from Firestore**
```javascript
// Firestore query
const profile = await getDoc(doc(db, 'users', 'abc123xyz'));

// Result:
{
  email: "employee@test.com",
  name: "Test Employee",
  role: "employee",  // ← THIS is the source of truth!
  isActive: true
}
```

**Step 5: App checks ACTUAL role**
```javascript
if (userProfile.role === 'owner') {
  navigate('/owner');  // ❌ Won't happen
} else if (userProfile.role === 'employee') {
  navigate('/employee');  // ✅ Redirects here
}
```

**Result:** Employee is redirected to `/employee` dashboard, NOT `/owner`

---

### Scenario: Employee manually types /owner in URL

**Step 1: Employee types in browser**
```
http://localhost:3000/owner
```

**Step 2: ProtectedRoute component checks**
```javascript
<ProtectedRoute requiredRole="owner">
  <OwnerDashboard />
</ProtectedRoute>

// Inside ProtectedRoute:
if (userProfile.role !== 'owner') {
  return <Navigate to="/employee" />;  // ✅ Redirects back
}
```

**Result:** Employee is immediately redirected back to `/employee`

---

### Scenario: Employee somehow bypasses frontend (hacker attempt)

**Step 1: Employee uses browser dev tools to access owner page**
```javascript
// Hacker tries to fetch revenue data
const revenue = await getDocs(collection(db, 'dailySales'));
```

**Step 2: Firestore Security Rules check**
```javascript
// In Firestore Rules:
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

// Rule for dailySales:
allow read: if isAuthenticated() && getUserRole() == 'owner';
```

**Step 3: Firestore checks user's ACTUAL role**
```
User UID: abc123xyz
Firestore lookup: users/abc123xyz
Role: "employee"  // ← NOT "owner"
```

**Step 4: Firestore blocks the request**
```
❌ PERMISSION_DENIED: Missing or insufficient permissions
```

**Result:** Employee cannot fetch revenue data, even if they bypass the UI

---

## Key Security Points

### 1. Role is Stored Server-Side (Firestore)
```
✅ SECURE: Role stored in Firestore (server)
❌ INSECURE: Role stored in localStorage (client)
❌ INSECURE: Role based on login button clicked
```

### 2. Login Buttons are Just UI
```
The "Login as Owner" button is just for UX.
It doesn't grant owner access.
The REAL check happens after authentication.
```

### 3. Multiple Checkpoints
```
Frontend → Checks role → Redirects if wrong
App Logic → Checks role → Redirects if wrong
Firestore → Checks role → Blocks data if wrong
```

### 4. Cannot Fake Role
```
Employee cannot:
- Change their role in Firestore (rules prevent it)
- Fake their UID (Firebase Auth prevents it)
- Bypass Firestore rules (server-side enforcement)
```

## Code Flow

### Login Process
```javascript
// 1. User clicks "Login as Owner" (just UI)
setSelectedRole('owner');

// 2. User enters credentials
email: "employee@test.com"
password: "employee123"

// 3. Firebase authenticates
await signInWithEmailAndPassword(auth, email, password);
// Returns: { uid: "abc123xyz" }

// 4. Fetch REAL role from Firestore
const userDoc = await getDoc(doc(db, 'users', 'abc123xyz'));
const userProfile = userDoc.data();
// Returns: { role: "employee" }  ← Source of truth!

// 5. Redirect based on ACTUAL role
if (userProfile.role === 'owner') {
  navigate('/owner');  // ❌ Won't happen
} else {
  navigate('/employee');  // ✅ Goes here
}
```

### Protected Route Check
```javascript
function ProtectedRoute({ children, requiredRole }) {
  const { userProfile } = useAuth();
  
  // Check if user has required role
  if (requiredRole && userProfile.role !== requiredRole) {
    // Redirect to appropriate dashboard
    if (userProfile.role === 'owner') {
      return <Navigate to="/owner" />;
    } else {
      return <Navigate to="/employee" />;
    }
  }
  
  return children;
}
```

### Firestore Query with Rules
```javascript
// Employee tries to fetch revenue
const revenueQuery = query(
  collection(db, 'dailySales'),
  where('price', '>', 0)
);

// Firestore checks rules:
// 1. Is user authenticated? ✅ Yes
// 2. What is user's role? → Fetches from users/abc123xyz
// 3. Role = "employee"
// 4. Rule requires role = "owner"
// 5. ❌ PERMISSION_DENIED

// Result: Query fails, employee sees error
```

## Testing Security

### Test 1: Employee Login with Owner Button
```
1. Click "Login as Owner"
2. Enter: employee@test.com / employee123
3. Expected: Redirects to /employee (NOT /owner)
```

### Test 2: Manual URL Access
```
1. Login as employee
2. Type in browser: http://localhost:3000/owner
3. Expected: Immediately redirects to /employee
```

### Test 3: Data Access (Browser Console)
```
1. Login as employee
2. Open browser console (F12)
3. Try to fetch owner data
4. Expected: PERMISSION_DENIED error
```

## Summary

**Question:** Can an employee access owner dashboard by clicking "Login as Owner"?

**Answer:** NO! Here's why:

1. ✅ Login button is just UI (doesn't grant access)
2. ✅ Role is fetched from Firestore (server-side)
3. ✅ App redirects based on ACTUAL role
4. ✅ Protected routes check role
5. ✅ Firestore rules block unauthorized data access

**The employee will ALWAYS be redirected to /employee, regardless of which button they click.**

---

## Next Steps

1. ✅ Apply Firestore rules (see FIRESTORE_RULES.md)
2. ✅ Create test users with correct roles
3. ✅ Test login with both roles
4. ✅ Verify security by trying to access wrong dashboard
