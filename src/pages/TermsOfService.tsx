export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 bg-white border rounded-xl p-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Acceptance of Terms</h2>
            <p className="text-sm text-gray-700">
              By using TraderPOS, you agree to these Terms. If you do not agree, do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Usage</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>You are responsible for ensuring the accuracy of data entered.</li>
              <li>You must comply with local laws applicable to your business operations.</li>
              <li>Administrative access should be restricted to authorized personnel.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Data and Sync</h2>
            <p className="text-sm text-gray-700">
              The app stores data locally and synchronizes to a Google Apps Script backend when online. You acknowledge that storage and backups are managed by your administrator’s Google account and infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Availability</h2>
            <p className="text-sm text-gray-700">
              While the app is designed to operate offline, updates and sync depend on internet connectivity. We do not guarantee uninterrupted availability or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Limitation of Liability</h2>
            <p className="text-sm text-gray-700">
              The application is provided “as is”. We are not liable for loss of data, business interruption, or other damages arising from use of the app. Your administrator is responsible for proper configuration and backups.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Changes</h2>
            <p className="text-sm text-gray-700">
              Terms may be updated over time. Continued use after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Contact</h2>
            <p className="text-sm text-gray-700">
              For questions regarding these Terms, contact your system administrator or the support channel provided with your deployment.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

