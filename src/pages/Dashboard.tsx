import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stores } from '@/lib/storage';
import type { Transaction, Expense } from '@/types';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    AlertCircle, 
    ArrowUpRight, 
    ArrowDownRight, 
    CreditCard,
    DollarSign,
    Activity
} from 'lucide-react';
import CashSessionWidget from '@/components/CashSessionWidget';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        receivables: 0,
        payables: 0,
        monthlySales: 0,
        monthlyPurchases: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // 1. Load Sales & Payments In
            const saleKeys = await stores.transactions.sales.keys();
            let salesTotal = 0;
            let salesMonth = 0;
            let receivables = 0;
            const salesList: any[] = [];

            for (const k of saleKeys) {
                const item = await stores.transactions.sales.getItem<Transaction>(k);
                if (!item) continue;
                
                if (item.type === 'SALE') {
                    salesTotal += item.total_amount;
                    receivables += (item.total_amount - (item.paid_amount || 0));
                    
                    const d = new Date(item.date);
                    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                        salesMonth += item.total_amount;
                    }
                    salesList.push({ ...item, category: 'sale' });
                } else if (item.type === 'PAYMENT_IN') {
                    salesList.push({ ...item, category: 'payment_in' });
                }
            }

            // 2. Load Purchases & Payments Out
            const purchKeys = await stores.transactions.purchases.keys();
            let purchTotal = 0;
            let purchMonth = 0;
            let payables = 0;
            const purchList: any[] = [];

            for (const k of purchKeys) {
                const item = await stores.transactions.purchases.getItem<Transaction>(k);
                if (!item) continue;

                if (item.type === 'PURCHASE') {
                    purchTotal += item.total_amount;
                    payables += (item.total_amount - (item.paid_amount || 0));

                    const d = new Date(item.date);
                    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                        purchMonth += item.total_amount;
                    }
                    purchList.push({ ...item, category: 'purchase' });
                } else if (item.type === 'PAYMENT_OUT') {
                    purchList.push({ ...item, category: 'payment_out' });
                }
            }

            // 3. Load Expenses
            const expKeys = await stores.transactions.expenses.keys();
            let expTotal = 0;
            const expList: any[] = [];

            for (const k of expKeys) {
                const item = await stores.transactions.expenses.getItem<Expense>(k);
                if (item) {
                    expTotal += item.amount;
                    expList.push({ ...item, category: 'expense', type: 'EXPENSE', total_amount: item.amount });
                }
            }

            // 4. Combine & Sort Recent Activity
            const allActivity = [...salesList, ...purchList, ...expList]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

            setStats({
                totalSales: salesTotal,
                totalPurchases: purchTotal,
                totalExpenses: expTotal,
                receivables,
                payables,
                monthlySales: salesMonth,
                monthlyPurchases: purchMonth
            });
            setRecentActivity(allActivity);

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;
    }

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
                    <p className="text-gray-500 text-sm">Welcome back, here's what's happening today.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/sales/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> New Sale
                    </Link>
                    <Link to="/purchases/new" className="bg-white text-gray-700 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4" /> New Purchase
                    </Link>
                </div>
            </div>

            <CashSessionWidget />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Total Sales (Month)" 
                    value={formatCurrency(stats.monthlySales)} 
                    icon={TrendingUp} 
                    trend="+12% from last month" // Mock trend for now
                    trendColor="text-green-600"
                    iconColor="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <StatCard 
                    label="Total Purchases (Month)" 
                    value={formatCurrency(stats.monthlyPurchases)} 
                    icon={TrendingDown} 
                    trend="+5% from last month"
                    trendColor="text-red-600"
                    iconColor="text-orange-600"
                    bgColor="bg-orange-50"
                />
                <StatCard 
                    label="Receivables (Unpaid)" 
                    value={formatCurrency(stats.receivables)} 
                    icon={Wallet} 
                    trend="Pending Collection"
                    trendColor="text-amber-600"
                    iconColor="text-amber-600"
                    bgColor="bg-amber-50"
                />
                <StatCard 
                    label="Payables (Due)" 
                    value={formatCurrency(stats.payables)} 
                    icon={CreditCard} 
                    trend="Upcoming Bills"
                    trendColor="text-purple-600"
                    iconColor="text-purple-600"
                    bgColor="bg-purple-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-500" />
                            Recent Activity
                        </h3>
                        <Link to="/reports" className="text-xs text-blue-600 hover:underline">View All</Link>
                    </div>
                    <div className="divide-y">
                        {recentActivity.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">No recent activity found.</div>
                        ) : (
                            recentActivity.map((item) => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            item.category === 'sale' ? 'bg-green-100 text-green-600' :
                                            item.category === 'purchase' ? 'bg-blue-100 text-blue-600' :
                                            item.category === 'expense' ? 'bg-red-100 text-red-600' :
                                            item.category === 'payment_in' ? 'bg-emerald-100 text-emerald-600' :
                                            'bg-orange-100 text-orange-600'
                                        }`}>
                                            {item.category === 'sale' && <TrendingUp className="w-5 h-5" />}
                                            {item.category === 'purchase' && <TrendingDown className="w-5 h-5" />}
                                            {item.category === 'expense' && <AlertCircle className="w-5 h-5" />}
                                            {item.category === 'payment_in' && <DollarSign className="w-5 h-5" />}
                                            {item.category === 'payment_out' && <CreditCard className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">
                                                {item.category === 'sale' ? `Sale to ${item.partner_name || 'Customer'}` :
                                                 item.category === 'purchase' ? `Purchase from ${item.partner_name || 'Supplier'}` :
                                                 item.category === 'expense' ? `Expense: ${item.description}` :
                                                 item.category === 'payment_in' ? `Payment Received (${item.partner_name})` :
                                                 `Payment Sent (${item.partner_name})`}
                                            </p>
                                            <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${
                                        ['sale', 'payment_in'].includes(item.category) ? 'text-green-600' : 'text-gray-900'
                                    }`}>
                                        {['sale', 'payment_in'].includes(item.category) ? '+' : '-'} {formatCurrency(item.total_amount || item.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Stats / Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border shadow-sm p-4">
                        <h3 className="font-semibold mb-4 text-sm text-gray-500 uppercase tracking-wider">Financial Summary</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Total Expenses</span>
                                    <span className="font-medium">{formatCurrency(stats.totalExpenses)}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Estimated Profit (Gross)</span>
                                    <span className={`text-lg font-bold ${stats.totalSales - stats.totalPurchases > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(stats.totalSales - stats.totalPurchases)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Calculated as Total Sales - Total Purchases. Does not include expenses.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                        <p className="text-indigo-100 text-sm mb-4">Check the reports section for detailed analysis of your business performance.</p>
                        <Link to="/reports" className="block w-full bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-colors">
                            View Reports
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, trend, trendColor, iconColor, bgColor }: any) {
    return (
        <div className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor} ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-50 ${trendColor}`}>{trend}</span>}
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
            </div>
        </div>
    );
}
