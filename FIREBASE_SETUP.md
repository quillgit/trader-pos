# Firebase Setup Guide for Commodity Trader PWA

Follow these steps to configure the Firebase backend for authentication, database storage, and license management.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Name your project (e.g., `commodity-trader-pwa`).
4. Disable Google Analytics (optional, not required for this app).
5. Click **Create project**.

## 2. Register the Web App

1. In the Project Overview page, click the **Web icon** (`</>`) to register your app.
2. App nickname: `Commodity Trader Web`.
3. Click **Register app**.
4. **Copy the `firebaseConfig` object**. You will need these values for your `.env` file.

## 3. Enable Authentication

1. Go to **Build > Authentication** in the left sidebar.
2. Click **Get Started**.
3. Select **Google** from the Sign-in method list.
4. Enable the toggle.
5. Select a **Project support email**.
6. Click **Save**.

## 4. Enable Firestore Database

1. Go to **Build > Firestore Database** in the left sidebar.
2. Click **Create Database**.
3. Select a location:
   - Recommended: `asia-southeast2` (Jakarta) if you are in Indonesia.
   - Or `us-central1` (default) for general usage.
4. Choose **Start in production mode**.
5. Click **Create**.

## 5. Configure Security Rules

These rules ensure that only authorized administrators can generate and manage licenses.

1. Go to the **Rules** tab in Firestore Database.
2. Replace the existing rules with the code below:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. HELPER FUNCTIONS
    // Check if the signed-in user is listed in the 'admins' collection
    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // 2. COLLECTIONS

    // Licenses: Only Admins can read/write
    // This protects the business logic (plans, expiry) from modification
    match /licenses/{licenseId} {
      allow read, write: if isAdmin();
    }

    // License Devices: Only Admins can read/write
    // Stores device snapshots for audit
    match /license_devices/{licenseId}/devices/{deviceId} {
      allow read, write: if isAdmin();
    }

    // Admins: Only the user themselves can read their own record
    // Write access is blocked (manage admins via Firebase Console only)
    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; 
    }
  }
}
```

3. Click **Publish**.

## 6. Set Up Admin Access

To grant yourself admin privileges (so you can write to the database):

1. **Sign in to the app** locally (`npm run dev`) using the "Sign In" button in Settings.
2. Go to **Firebase Console > Authentication** to find your **User UID** (User ID).
3. Go to **Firestore Database > Data**.
4. Click **Start collection**.
   - **Collection ID**: `admins`
   - **Document ID**: *Paste your User UID here*
   - **Field**: `email` (string) -> *Your Google email address*
   - **Field**: `role` (string) -> `super_admin`
5. Click **Save**.

## 7. Configure Environment Variables

1. Open (or create) the `.env` file in the project root.
2. Fill in the keys using the config you copied in Step 2.
3. Add your email to `VITE_ADMIN_EMAILS` to unlock the UI Admin Panel.

```properties
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Admin Access Control
# Comma-separated list of emails that can see the Admin Panel in Settings
VITE_ADMIN_EMAILS=your.email@gmail.com
```

## 8. Verification

1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Open the app and go to **Settings**.
3. Sign in with Google.
4. If your email is in `.env`, you should see the **Admin Panel** with the "Generate License" tool.
5. Try generating a license. If successful, it will be saved to Firestore, confirming your Admin permissions are working.
