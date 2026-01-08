

# TraderPOS — Commodity Trader PWA
[Email Support](mailto:rickysukma9a@gmail.com)
An offline-first Progressive Web App for small commodity trading operations. It manages products, partners, transactions (sales/purchases), cash sessions, expenses, and HR features like attendance and payroll. Works fully offline and syncs to a lightweight backend powered by Google Apps Script and Google Sheets.

## Features
- Offline-first PWA with IndexedDB persistence
- Products, partners, sales and purchase tracking
- Cash sessions, topups and expenses
- HR: attendance logging and payroll components
- Sync queue for robust offline → online data flow
- Simple PIN login for employees
- Admin-only license management page
- Factory Reset to fully wipe local data and caches

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, lucide-react icons
- Persistence: IndexedDB via localforage
- Routing: react-router-dom
- PWA: vite-plugin-pwa
- Backend: Google Apps Script + Google Sheets
- Optional Admin features: Firebase (for license management console)

## Quick Start
1. Install dependencies

```sh
npm install
```

2. Run the app in development

```sh
npm run dev
```

Open http://localhost:5173

3. Build for production

```sh
npm run build
npm run preview
```

## Configuration
- API URL (Apps Script): set the deployed Web App URL
- Optional SQL API URL for future integrations
- Company info saved locally and can be pushed to the backend
- Optional Google OAuth Client ID for one-click provisioning flows

Where to configure:
- Settings page under General and Connections tabs: [Settings.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/pages/Settings.tsx)

Common local keys:
- OFFLINE_TRADER_API_URL
- SQL_API_URL
- COMPANY_NAME, COMPANY_ADDRESS, COMPANY_PHONE
- GOOGLE_OAUTH_CLIENT_ID

Environment variables (optional):
- VITE_GOOGLE_CLIENT_ID
- Firebase keys (only if using Admin Licenses page)
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_STORAGE_BUCKET
  - VITE_FIREBASE_MESSAGING_SENDER_ID
  - VITE_FIREBASE_APP_ID

## Backend (Google Apps Script)
- Deploy the script as a Web App (“Execute as Me”, Access “Anyone”)
- Use the Web App URL in Settings to enable sync
- Script file path: [backend/Code.gs](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/backend/Code.gs)

The app writes to Google Sheets and reads masters through simple JSON endpoints implemented in Apps Script.

## PWA Behavior
- Auto-update service worker is enabled
- Update guard prevents repeated “Updating to latest version…” toasts
- Implementation: [App.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/App.tsx#L41-L55)

## Authentication
- PIN-based login via Employees list in local storage
- Login page: [Login.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/pages/Login.tsx)
- Session storage and context: [AuthContext.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/contexts/AuthContext.tsx)

## License Management
- End-user license verification and device registration are available in Settings
- Admin License Console lives at /admin/licenses
- Admin page component: [AdminLicenses.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/pages/AdminLicenses.tsx)
- Firebase service (optional): [firebase.ts](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/services/firebase.ts)
- Setup guide: FIREBASE_SETUP.md in project root

## Factory Reset
Use Settings → General → Danger Zone to:
- Erase all local IndexedDB tables
- Remove local settings, user session, device id, license
- Unregister service workers and delete caches
- Auto-reload to a clean state

Reset utility:
- [storage.ts](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/lib/storage.ts#L33-L64)

UI:
- [Settings.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/pages/Settings.tsx#L428-L460)

## Scripts
- npm run dev: start development server
- npm run build: typecheck and production build
- npm run preview: preview production build locally
- npm run lint: run ESLint

## Directory Structure
- src/components: shared UI components (e.g., Layout, widgets)
- src/pages: application screens (Dashboard, Products, Sales, Settings, HRIS)
- src/services: API, sync engine, license, Firebase, etc.
- src/lib: storage and utilities
- backend: Google Apps Script code

## Troubleshooting
- Cannot login with correct PIN:
  - PIN normalization fix in [Login.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/pages/Login.tsx#L83-L95)
- Endless update notification:
  - Guard added in [App.tsx](file:///c:/Users/MSI/.gemini/antigravity/scratch/commodity-trader-pwa/src/App.tsx#L41-L55)
- Sync not working:
  - Ensure OFFLINE_TRADER_API_URL is set in Settings and the Web App is deployed