import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, Users, FileText, Wallet, Banknote, Shield } from 'lucide-react';

export default function PublicHome() {
  const APP_NAME = import.meta.env.VITE_APP_NAME || 'TraderPOS';
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-traderpos.png" alt={`${APP_NAME}`} className="w-8 h-8" />
            <span className="font-bold text-gray-800">{APP_NAME}</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/home" className="text-gray-700 hover:text-indigo-600">Home</Link>
            <Link to="/privacy" className="text-gray-700 hover:text-indigo-600">Privacy</Link>
            <Link to="/terms" className="text-gray-700 hover:text-indigo-600">Terms</Link>
            <Link to="/login" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Login</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Offline-First POS for Commodity Trading</h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Manage products, partners, sales, purchases, cash sessions, expenses, and HR with a fast PWA that works even without internet.
          </p>
          <p className="mt-2 text-gray-600 max-w-3xl mx-auto">
            TraderPOS is a web-based point-of-sale and operations app tailored for commodity trading workflows. It helps teams capture field transactions, maintain master data, and synchronize to a Google Apps Script backend when online. The application is designed for small and medium businesses that need reliable, local-first operations with simple cloud sync.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="/login" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Open App</Link>
            <Link to="/guide" className="px-5 py-2.5 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50">User Guide</Link>
            <Link to="/privacy" className="px-5 py-2.5 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50">Privacy Policy</Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <LayoutDashboard className="w-5 h-5" />
              <h3 className="font-semibold">Dashboard & Reports</h3>
            </div>
            <p className="text-sm text-gray-600">Quick insights into performance and transactions with offline support.</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Package className="w-5 h-5" />
              <h3 className="font-semibold">Products & Partners</h3>
            </div>
            <p className="text-sm text-gray-600">Maintain master data for inventory and supplier/customer relationships.</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <FileText className="w-5 h-5" />
              <h3 className="font-semibold">Sales & Purchases</h3>
            </div>
            <p className="text-sm text-gray-600">Record transactions in the field and sync when online.</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Wallet className="w-5 h-5" />
              <h3 className="font-semibold">Cash Sessions & Topups</h3>
            </div>
            <p className="text-sm text-gray-600">Track opening/closing cash and manage daily balances.</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Banknote className="w-5 h-5" />
              <h3 className="font-semibold">Expenses</h3>
            </div>
            <p className="text-sm text-gray-600">Capture category-based expenses and sync to the backend.</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">Attendance & Payroll</h3>
            </div>
            <p className="text-sm text-gray-600">Simple HR workflows with local-first data and sync queue.</p>
          </div>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Shield className="w-5 h-5" />
            <h3 className="font-semibold">Privacy & Terms</h3>
          </div>
          <p className="text-sm text-gray-600">
            This app stores data locally for offline use. See our <Link to="/privacy" className="text-indigo-700 hover:underline">Privacy Policy</Link> and <Link to="/terms" className="text-indigo-700 hover:underline">Terms of Service</Link>.
          </p>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 text-sm text-gray-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-indigo-700">Privacy</Link>
            <Link to="/terms" className="hover:text-indigo-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
