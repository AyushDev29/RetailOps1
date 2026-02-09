# Clothing Brand Management System

A React-based management system for clothing brands with employee and owner dashboards.

## Features

- 🔐 Firebase Authentication with role-based access
- 👔 Employee Dashboard (Daily Sales, Pre-Booking, Exhibition Sales)
- 📊 Owner Dashboard (Revenue Analytics & Reports)
- 📱 Responsive Design
- 🔒 Secure role-based route protection

## Quick Start

### 1. Install Dependencies
```bash
cd clothing-brand-management
npm install
```

### 2. Firebase Setup
Follow the detailed guide in `FIREBASE_SETUP.md`

Quick steps:
1. Create Firebase project
2. Enable Email/Password authentication
3. Create Firestore database
4. Copy config to `.env` file
5. Create test users

### 3. Run Development Server
```bash
npm run dev
```

App will open at `http://localhost:3000`

## Test Credentials

After setting up Firebase (see FIREBASE_SETUP.md):

**Owner Account:**
- Email: `owner@test.com`
- Password: `owner123`

**Employee Account:**
- Email: `employee@test.com`
- Password: `employee123`

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components (Navbar, Sidebar, etc.)
├── pages/
│   ├── auth/            # Login page
│   ├── dashboard/       # Employee dashboard pages
│   ├── analytics/       # Analytics pages
│   └── owner/           # Owner dashboard
├── services/
│   ├── firebase.js      # Firebase initialization
│   ├── authService.js   # Authentication services
│   └── ...              # Other services
├── hooks/               # Custom React hooks
├── contexts/            # React context providers
├── utils/               # Utility functions
├── constants/           # Application constants
└── routes/              # Route configuration
```

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Firebase (Auth + Firestore)
- **Routing:** React Router v6
- **Styling:** CSS

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables

Create a `.env` file with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Security

- Never commit `.env` file
- Use strong passwords in production
- Review Firebase security rules before deployment
- Enable Firebase App Check for production

## Next Steps

- [ ] Complete Firebase setup
- [ ] Test authentication
- [ ] Add products and categories
- [ ] Build Daily Sales form
- [ ] Implement Pre-booking system
- [ ] Create Exhibition management
- [ ] Build analytics dashboards

## Support

For issues or questions, refer to:
- `FIREBASE_SETUP.md` - Detailed Firebase setup guide
- Firebase Console - Check logs and authentication
- Browser Console - Check for errors
