# Commodity Trader PWA - User Manual

## 1. Getting Started

### Login
1.  Open the application.
2.  Select your name from the dropdown.
3.  Enter your 6-digit PIN.
4.  Click **Login**.

> **Note:** If this is the first time running the app and no users exist, click the "Setup Mode" link at the bottom to login as a Developer (PIN: `0000`).

### Dashboard Overview
The dashboard is your main command center. It shows:
-   **Cash Session Status**: Whether your daily book is Open or Closed.
-   **Quick Stats**: Counts of Products, Partners, etc.
-   **Quick Actions**: Buttons to start a Sale, Purchase, or Expense.

---

## 2. Daily Workflow

### Step 1: Start the Day (Open Cash Session)
**You cannot record sales or purchases until you open a session.**
1.  Go to the **Dashboard**.
2.  In the "Daily Cash Session" widget, verify the status is **CLOSED**.
3.  Enter the **Opening Cash** amount (money currently in the drawer).
4.  Click **Open Session**.

### Step 2: Manage Transactions
#### Recording a Purchase (Buying Stock)
1.  Click **New Purchase**.
2.  Select the **Supplier** (or create a new one in the Partners menu).
3.  Add **Products**: Select product, enter quantity and buying price. Click **Add**.
4.  Review the list.
5.  Click **Save Purchase**.

#### Recording a Sale (Selling Stock)
1.  Click **New Sale**.
2.  Select the **Customer**.
3.  Add **Products**: Select product, enter quantity and selling price. Click **Add**.
4.  Click **Save Sale**.

#### Recording Expenses
1.  Click **Record Expense** on the Dashboard.
2.  Enter the **Date**, **Amount**, **Category** (e.g., FUEL, FOOD), and a **Description**.
3.  Click **Save**. *This will be deducted from your daily cash calculation.*

### Step 3: End the Day (Close Session)
1.  Go to the **Dashboard**.
2.  In the "Daily Cash Session" widget, you will see the session is **OPEN**.
3.  Enter the **Closing Cash** (money physically in the drawer).
4.  Click **Close Session**.
5.  The system will record the variance (Physical Cash - Expected Cash).

---

## 3. Managing Data

### Partners (Suppliers & Customers)
-   Go to **Partners**.
-   Click **New Partner**.
-   Enter Name and select roles:
    -   **Supplier**: If you buy goods from them.
    -   **Customer**: If you sell goods to them.
    -   *A partner can be both.*

### Employees & Security
-   Go to **Employees** (Admin only).
-   Click **New**.
-   Enter Name, Role (Admin/Field/etc.), and a **6-digit PIN**.
-   This PIN is used for login.

---

## 4. Settings & Syncing

### Connecting to Google Sheets
To back up your data to the cloud:
1.  Go to **Settings**.
2.  Paste the **Google Apps Script Web App URL** provided by your administrator.
3.  Click **Test Connection** to ensure it works.
4.  Click **Save**.

### Offline Mode
-   The app works fully offline!
-   Transactions are saved to your device.
-   When you connect to the internet, the app will automatically try to sync data to the Google Sheet.
