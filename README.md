# Clothing Brand Management System

A comprehensive retail management system built with React, Vite, and Firebase Firestore. Designed for clothing brands to manage daily sales, exhibitions, pre-bookings, and analytics with role-based access control.

## 🎯 Project Overview

This system provides separate dashboards for **Owners** and **Employees** with distinct capabilities:

- **Employees**: Create orders, manage exhibitions, view sales analytics (count-based)
- **Owners**: Full business oversight, user management, product management, revenue analytics

## 🏗️ Architecture

### Clean Separation of Concerns

```
services/          → Firestore queries, NO UI logic
hooks/             → Data fetching + state management
components/        → Pure UI components
pages/             → Route-level components
```

### Key Design Decisions

1. **No Compound Indexes**: All Firestore queries avoid `orderBy` with `where` clauses. Sorting happens in-memory to eliminate index requirements.

2. **Role-Based Data Access**:
   - Employee analytics: NO price/revenue fields
   - Owner analytics: Full revenue data
   - Enforced at service layer, not just UI

3. **Instant Filter Updates**: Analytics fetch data once, filter in-memory. No loading screens on filter changes.

4. **Memoization**: Heavy calculations use `useMemo` to prevent unnecessary recomputation.

## 📊 Data Model

### Collections

**users**
```javascript
{
  uid: string,
  email: string,
  name: string,
  role: 'employee' | 'owner',
  isActive: boolean,
  createdAt: Timestamp
}
```

**products**
```javascript
{
  name: string,
  category: string,
  active: boolean,
  createdAt: Timestamp
}
```

**customers**
```javascript
{
  phone: string,        // Unique identifier
  name: string,
  address: string,
  gender: 'Male' | 'Female' | 'Other',
  ageGroup: string,
  createdAt: Timestamp
}
```

**orders**
```javascript
{
  type: 'daily' | 'exhibition' | 'prebooking',
  status: 'completed' | 'pending' | 'prebooked',
  customerPhone: string,
  productId: string,
  price: number,
  quantity: number,
  exhibitionId: string | null,
  createdBy: string,    // Employee UID
  deliveryDate: Timestamp | null,
  createdAt: Timestamp
}
```

**exhibitions**
```javascript
{
  location: string,
  startTime: Timestamp,
  endTime: Timestamp | null,
  active: boolean,
  createdBy: string,    // Employee UID
  createdAt: Timestamp
}
```

## 🔐 Authentication & Authorization

### Registration Flow
1. User registers with email/password
2. Firestore document created with `role: 'employee'` (default)
3. User logged out immediately
4. Must login explicitly to access system

### Role Management
- All new users start as **employee**
- Only owners can change roles via Owner Dashboard
- Owners cannot demote/disable themselves
- Role changes persist in Firestore

### Security Rules
- Users can read own profile, owners can read all
- Products: All can read, only owners can create/update
- Orders: Employees can create/update own, owners have full access
- Exhibitions: Employees can manage own, owners have full access

## 📈 Analytics System

### Employee Analytics (Count-Based)
- **NO price/revenue data** - count only
- Daily/Weekly/Monthly sales comparison
- Exhibition sales breakdown
- Peak sales time (IST timezone)
- Peak sales gender distribution
- Peak sales age group distribution
- Global filters affect all charts simultaneously

### Owner Analytics (Revenue-Based)
- Overall revenue, daily sales revenue, exhibition sales revenue
- Monthly revenue comparison
- Top selling product by revenue
- Category-wise revenue breakdown
- Revenue trend (last 30 days)
- **Anomaly Detection**:
  - Spike: Revenue > 2× rolling 7-day average
  - Drop: Revenue < 0.5× rolling 7-day average
- Product performance over time (top 3 products)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Firebase project with Firestore enabled

### Installation

1. Clone the repository
```bash
git clone https://github.com/AyushDev29/RetailOps1.git
cd clothing-brand-management
```

2. Install dependencies
```bash
npm install
```

3. Configure Firebase
Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Deploy Firestore security rules
Copy rules from `FIRESTORE_RULES.md` to Firebase Console

5. Start development server
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── components/
│   ├── charts/          # BarChart, PieChart, LineChart, MultiLineChart
│   ├── common/          # Reusable components (StatsCard, ChartWrapper, ErrorBoundary, LoadingSkeleton)
│   └── layout/          # ProtectedRoute
├── contexts/
│   └── AuthContext.jsx  # Authentication state management
├── hooks/
│   ├── useAuth.js       # Auth hook
│   ├── useAnalytics.js  # Employee analytics hook
│   └── useOwnerAnalytics.js  # Owner analytics hook
├── pages/
│   ├── auth/            # Login, Register
│   ├── dashboard/       # EmployeeDashboard
│   ├── analytics/       # EmployeeAnalytics
│   └── owner/           # OwnerDashboard, OwnerAnalytics
├── routes/
│   └── AppRoutes.jsx    # Route definitions
├── services/
│   ├── firebase.js      # Firebase initialization
│   ├── authService.js   # User authentication
│   ├── productService.js
│   ├── customerService.js
│   ├── orderService.js
│   ├── exhibitionService.js
│   ├── analyticsService.js       # Employee analytics (no price)
│   └── ownerAnalyticsService.js  # Owner analytics (with price)
├── styles/              # Component-specific CSS
└── utils/
    └── seedProducts.js  # Sample product seeder
```

## 🔑 Key Features

### Employee Dashboard
- Start/end exhibitions (one active per employee)
- Create orders:
  - **Store Sale**: Daily sales, no exhibition required
  - **Exhibition Sale**: Requires active exhibition
  - **Pre-Booking**: Future orders, no exhibition required
- Customer phone auto-fill
- View pending pre-bookings
- Convert pre-bookings to sales
- Access employee analytics

### Owner Dashboard
- **User Management**: View all users, change roles, enable/disable users
- **Product Management**: Create products, activate/deactivate
- **Exhibitions Overview**: Read-only view of all exhibitions
- **Orders Overview**: Read-only view with filters
- Access owner analytics with revenue data

### Business Rules
1. Only ONE active exhibition per employee at a time
2. Exhibition sales auto-attach exhibitionId
3. Pre-booking conversion auto-links to active exhibition if exists
4. Phone is unique customer identifier with auto-fill
5. Products are pre-defined by owner, read-only for employees

## 🛠️ Performance Optimizations

1. **Memoization**: `useMemo` for expensive calculations
2. **In-Memory Filtering**: Fetch once, filter locally
3. **No Compound Indexes**: Avoid Firestore index requirements
4. **Lazy Loading**: Components load on-demand
5. **Error Boundaries**: Prevent full app crashes

## 🧪 Testing

### Manual Testing Checklist
- [ ] Register as employee, verify default role
- [ ] Login/logout flow
- [ ] Create store sale without exhibition
- [ ] Start exhibition, create exhibition sale
- [ ] Create pre-booking, convert to sale
- [ ] Employee analytics filters work instantly
- [ ] Owner can change user roles
- [ ] Owner can create/deactivate products
- [ ] Owner analytics shows revenue data
- [ ] Anomaly detection identifies spikes/drops

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## 🤝 Contributing

This is a portfolio/demonstration project. For suggestions or issues, please open an issue on GitHub.

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

**Ayush Dev**
- GitHub: [@AyushDev29](https://github.com/AyushDev29)
- Repository: [RetailOps1](https://github.com/AyushDev29/RetailOps1)

## 🙏 Acknowledgments

- Built with React + Vite for fast development
- Firebase Firestore for real-time database
- Chart components built from scratch with SVG
- Clean architecture inspired by production systems
