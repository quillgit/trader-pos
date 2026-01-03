import { Link } from 'react-router-dom';
import { Package, Users, ShoppingCart, FileText } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Products" value="--" icon={Package} to="/products" color="bg-blue-500" />
                <StatsCard label="Partners" value="--" icon={Users} to="/partners" color="bg-purple-500" />
                <StatsCard label="Purchases" value="--" icon={ShoppingCart} to="/purchases" color="bg-green-500" />
                <StatsCard label="Sales" value="--" icon={FileText} to="/sales" color="bg-orange-500" />
            </div>

            {/* Recent Activity or Quick Actions */}
            <div className="bg-white rounded-lg border p-4 shadow-sm">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="flex gap-4">
                    <Link to="/purchases/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm">
                        New Purchase
                    </Link>
                    <Link to="/sales/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm">
                        New Sale
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ label, value, icon: Icon, to, color }: any) {
    return (
        <Link to={to} className="block bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </Link>
    );
}
