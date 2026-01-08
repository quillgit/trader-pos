export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 bg-white border rounded-xl p-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Overview</h2>
            <p className="text-sm text-gray-700">
              TraderPOS is an offline-first application. Your data is primarily stored on your device to ensure functionality without internet. When online, data synchronizes to a Google Apps Script backend writing to Google Sheets configured by your administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Data We Store</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Master data such as products, partners, employees</li>
              <li>Transactions: sales, purchases, expenses, cash sessions</li>
              <li>Attendance and payroll components</li>
              <li>Basic settings such as company name and API URL</li>
              <li>Authentication session using local storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">What We Do Not Store</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>No payment card numbers or sensitive banking details</li>
              <li>No external personal identifiers beyond what administrators configure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Synchronization</h2>
            <p className="text-sm text-gray-700">
              When internet is available, queued changes are sent to your configured Apps Script endpoint. The administrator controls the destination Sheet and access. Data sent includes operational records required for business tracking.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Device Information</h2>
            <p className="text-sm text-gray-700">
              The app may store a random device identifier to support license and multi-device setups. This identifier is not used for tracking outside the application’s scope.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Cookies and Storage</h2>
            <p className="text-sm text-gray-700">
              The app uses local storage and IndexedDB to keep data on your device. Service workers cache resources for offline access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Data Retention</h2>
            <p className="text-sm text-gray-700">
              Local data remains on your device until removed by you via Factory Reset or by clearing browser storage. Synced data persists in the administrator’s Google Sheets until they remove it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Contact</h2>
            <p className="text-sm text-gray-700">
              For privacy questions, contact your system administrator or the support channel provided with your deployment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

