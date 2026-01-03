# Commodity Trader PWA - Technical Documentation

## 1. System Overview

This application is an **Offline-First Progressive Web App (PWA)** designed for commodity trading and basic business management. It allows users to manage products, partners (suppliers/customers), transactions (sales/purchases), daily cash sessions, expenses, and employees.

### Architecture
-   **Frontend**: React (Vite) + Tailwind CSS
-   **Local Database**: IndexedDB (via `localforage`) for full offline capability.
-   **Backend / Sync**: Google Apps Script (acting as a serverless Webhook).
-   **Remote Storage**: Google Sheets (acting as the database).
-   **Sync Strategy**:
    -   Reads/Writes happen to local IndexedDB first.
    -   A background `SyncEngine` pushes changes to Google Apps Script when online.
    -   Changes are queued (`stores.syncQueue`) if offline and retried later.

## 2. Setup Guide

### Prerequisites
-   Node.js (v18+)
-   Google Account (for Sheets/Apps Script)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd commodity-trader-pwa
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:5173`.

### Building for Production
```bash
npm run build
npm run preview
```

## 3. Backend Deployment (Google Apps Script)

The backend is a single file in Google Apps Script that receives JSON payloads and writes them to a Google Sheet.

1.  Create a new **Google Sheet**.
2.  Go to **Extensions > Apps Script**.
3.  Copy the content of `backend/Code.gs` from this project.
4.  Paste it into the online script editor.
5.  **Deploy**:
    -   Click **Deploy** > **New Deployment**.
    -   Type: **Web App**.
    -   Execute as: **Me**.
    -   Who has access: **Anyone**.
    -   Click **Deploy**.
6.  **Copy the Web App URL** (ends in `/exec`).
7.  **Configure App**:
    -   Open the PWA.
    -   Log in (Default PIN `0000` via Setup Mode only if no users exist).
    -   Go to **Settings**.
    -   Paste the URL and Save.

## 4. Data Schemas

### Master Data
-   **Product**: `id`, `name`, `unit`, `price_buy`, `price_sell`.
-   **Partner**: `id`, `name`, `is_supplier`, `is_customer`, `phone`.
-   **Employee**: `id`, `name`, `pin` (6-digit), `role` (ADMIN, FIELD, etc.), `salary_frequency`, `base_salary`.

### Transactions
-   **CashSession**: Tracks daily opening/closing periods.
    -   `status`: OPEN, CLOSED
    -   `start_amount`: Initial cash on hand.
    -   `end_amount`: Closing cash.
-   **Transaction (Purchase/Sale)**:
    -   `type`: PURCHASE | SALE
    -   `items`: Array of products, qty, price.
    -   Linked to Partners.
    -   **Validation**: Requires an `OPEN` CashSession to be created.
-   **Expense**:
    -   `category`: FUEL, FOOD, etc.
    -   Linked to the current `CashSession`.

## 5. Security & Authentication

-   **Frontend Auth**: Simple PIN-based login. User session is stored in `localStorage`.
-   **Route Protection**: `ProtectedRoute` component guards all main routes.
-   **Backend Auth**: None (Public Web App execution). Security relies on the uniqueness of the Web App URL. *Recommendations for V2: Add an API Key or Token header.*

## 6. Directory Structure
-   `/src`: Frontend source code.
    -   `/components`: Reusable UI widgets (CrashSessionWidget, Layout).
    -   `/pages`: Screen-level components.
    -   `/lib`: Utilities (Storage, utils).
    -   `/services`: API and Sync logic.
    -   `/types`: Zod schemas and TS interfaces.
-   `/backend`: Google Apps Script code.
