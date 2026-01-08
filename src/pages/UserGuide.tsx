import { useState } from 'react';
import { 
    Book, LayoutDashboard, Package, Users, ShoppingCart, 
    FileText, Wallet, Banknote, UserCircle, Settings, 
    ChevronRight, ChevronDown 
} from 'lucide-react';

export default function UserGuide() {
    const APP_NAME = import.meta.env.VITE_APP_NAME || 'TraderPOS';
    const [activeSection, setActiveSection] = useState<string | null>('getting-started');

    const toggleSection = (id: string) => {
        setActiveSection(activeSection === id ? null : id);
    };

    const sections = [
        {
            id: 'getting-started',
            title: '1. Getting Started',
            icon: Book,
            content: (
                <div className="space-y-4">
                    <p>To access the system, you must log in using your assigned user profile and PIN.</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                        <li>Select your <strong>User Name</strong> from the dropdown menu.</li>
                        <li>Enter your <strong>4-digit PIN</strong>.</li>
                        <li>Click <strong>Login</strong>.</li>
                    </ol>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> If you are setting up for the first time, ask your administrator for your credentials.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'dashboard',
            title: '2. Dashboard',
            icon: LayoutDashboard,
            content: (
                <div className="space-y-4">
                    <p>After logging in, you will see the Dashboard. This gives you a quick overview of your business performance.</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong>Today's Sales:</strong> Total value of sales made today.</li>
                        <li><strong>Today's Purchases:</strong> Total value of commodities bought today.</li>
                        <li><strong>Cash Balance:</strong> Current calculated cash on hand.</li>
                        <li><strong>Pending Sync:</strong> Number of items waiting to be uploaded to the server.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'master-data',
            title: '3. Master Data Management',
            icon: Package,
            content: (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" /> Products
                        </h4>
                        <p className="mb-2">Manage the commodities you buy and sell.</p>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                            <li><strong>Add Product:</strong> Click <code>+ New Product</code>, enter Name, Unit (kg, pcs), Category, Buying Price, and Selling Price.</li>
                            <li><strong>Edit/Delete:</strong> Use the icons next to each product.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Partners
                        </h4>
                        <p className="mb-2">Manage your Suppliers (Farmers) and Customers.</p>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                            <li><strong>Add Partner:</strong> Click <code>+ New Partner</code>.</li>
                            <li><strong>Type:</strong> Select 'Supplier' for people you buy from, 'Customer' for people you sell to.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Banknote className="w-4 h-4" /> Expense Categories
                        </h4>
                        <p className="mb-2">Manage custom categories for your operational expenses.</p>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                            <li><strong>Add Category:</strong> Click <code>+ Add Category</code> and provide a name (e.g., "Electricity").</li>
                            <li><strong>Active Status:</strong> Toggle categories on or off.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'transactions',
            title: '4. Transactions',
            icon: ShoppingCart,
            content: (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Purchases (Inbound)
                        </h4>
                        <p className="mb-2">Record commodities bought from suppliers.</p>
                        <ol className="list-decimal list-inside ml-4 text-sm text-gray-700 space-y-1">
                            <li>Go to <strong>Transactions &gt; Purchases</strong>.</li>
                            <li>Click <code>+ New Purchase</code>.</li>
                            <li>Select <strong>Supplier</strong>.</li>
                            <li>Add <strong>Items</strong> (Select Product, enter Quantity).</li>
                            <li>Enter <strong>Paid Amount</strong>. (Less than total = Debt).</li>
                            <li>Click <strong>Submit</strong>.</li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Sales (Outbound)
                        </h4>
                        <p className="mb-2">Record commodities sold to customers.</p>
                        <ol className="list-decimal list-inside ml-4 text-sm text-gray-700 space-y-1">
                            <li>Go to <strong>Transactions &gt; Sales</strong>.</li>
                            <li>Click <code>+ New Sale</code>.</li>
                            <li>Select <strong>Customer</strong>.</li>
                            <li>Add <strong>Items</strong> (Select Product, enter Quantity).</li>
                            <li>Enter <strong>Paid Amount</strong>.</li>
                            <li>Click <strong>Submit</strong>.</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            id: 'cash-mgmt',
            title: '5. Cash Management',
            icon: Wallet,
            content: (
                <div className="space-y-6">
                    <p>Manage your daily cash flow securely.</p>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Cash In / Top Up</h4>
                        <p className="text-sm text-gray-700">Record money added to the drawer (e.g., Capital injection).</p>
                        <p className="text-sm text-gray-700 ml-4 mt-1">Go to <strong>Finance &gt; Cash In</strong> or <strong>Transactions &gt; Topup</strong>.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Expenses</h4>
                        <ol className="list-decimal list-inside ml-4 text-sm text-gray-700 space-y-1">
                            <li>Go to <strong>Finance &gt; Expenses</strong>.</li>
                            <li>Click <code>+ New Expense</code>.</li>
                            <li>Select a <strong>Category</strong>.</li>
                            <li>Enter Amount and Description.</li>
                            <li>Click <strong>Save</strong>.</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            id: 'hris',
            title: '6. HRIS & Payroll',
            icon: UserCircle,
            content: (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Attendance</h4>
                        <p className="text-sm text-gray-700 mb-2">Employees can clock in/out or Admin can manage records.</p>
                        <ul className="list-disc list-inside ml-4 text-sm text-gray-700">
                            <li>Go to <strong>HRIS &gt; Attendance</strong>.</li>
                            <li><strong>Check In/Out:</strong> Click the button to record time.</li>
                            <li><strong>Admin Mode:</strong> Admins can manually add records.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Payroll</h4>
                        <ol className="list-decimal list-inside ml-4 text-sm text-gray-700 space-y-1">
                            <li>Go to <strong>HRIS &gt; Payroll</strong>.</li>
                            <li>Select <strong>Period</strong>.</li>
                            <li>Click <strong>Generate Payroll</strong>.</li>
                            <li>Click <strong>Pay All</strong> to record the expense.</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            title: '7. Settings & Sync',
            icon: Settings,
            content: (
                <div className="space-y-4">
                    <p>Configure the application and server connection in <strong>System &gt; Settings</strong>.</p>
                    <ul className="list-disc list-inside space-y-2 ml-4 text-sm text-gray-700">
                        <li><strong>Company Info:</strong> Update your company name and address.</li>
                        <li><strong>Server Sync:</strong> Enter your API URL for cloud sync.</li>
                        <li><strong>Google Client ID:</strong> Setup OAuth for Google integrations.</li>
                        <li><strong>License:</strong> Verify your application license key.</li>
                    </ul>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 mt-4">
                        <h5 className="font-bold text-green-800 mb-1">Offline Mode</h5>
                        <p className="text-sm text-green-700">
                            {APP_NAME} works offline! Data saves locally and syncs automatically when internet returns.
                            Look for the Sync Status icon in the dashboard.
                        </p>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Book className="w-8 h-8 text-blue-600" />
                    User Guide
                </h1>
                <p className="text-gray-600 mt-2">
                    Welcome to the {APP_NAME} manual. Click on a section below to learn more.
                </p>
            </div>

            <div className="space-y-4">
                {sections.map((section) => (
                    <div 
                        key={section.id} 
                        className="bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-200"
                    >
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <section.icon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-800 text-lg">{section.title}</span>
                            </div>
                            {activeSection === section.id ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                        
                        {activeSection === section.id && (
                            <div className="p-6 pt-0 border-t bg-white animate-in slide-in-from-top-2 duration-200">
                                <div className="pt-4 text-gray-700 leading-relaxed">
                                    {section.content}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-10 text-center text-gray-500 text-sm">
                <p>Bakul Iwak (TraderPOS) v1.0</p>
                <p>&copy; {new Date().getFullYear()} All Rights Reserved.</p>
            </div>
        </div>
    );
}
