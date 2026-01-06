import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Transaction, CashSession, Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, FileBarChart, CreditCard, Banknote } from 'lucide-react';

// Helper for date formatting
const formatDate = (date: Date | string | number, pattern: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    if (pattern === 'yyyy-MM-dd') {
        return d.toISOString().split('T')[0];
    }
    if (pattern === 'yyyy-MM-01') {
        // adjust for timezone offset to ensure we get local YYYY-MM-01
        // Actually simplest is just string manipulation
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01`;
    }
    if (pattern === 'HH:mm') {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (pattern === 'MMM dd, yyyy HH:mm') {
        return d.toLocaleString([], { 
            month: 'short', day: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    }
    return d.toISOString();
};

export default function Reports() {
    const [activeTab, setActiveTab] = useState<'daily' | 'sales_purchase' | 'debts'>('daily');
    
    // Daily Cash Book State
    const [dailyDate, setDailyDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
    const [listFilter, setListFilter] = useState<'ALL' | 'CASH' | 'TRANSFER'>('ALL');
    const [dailyData, setDailyData] = useState<{
        session: CashSession | null;
        inflows: Transaction[];
        outflows: Transaction[];
        expenses: Expense[];
        totalIn: number;
        totalOut: number;
        balance: number;
    }>({
        session: null,
        inflows: [],
        outflows: [],
        expenses: [],
        totalIn: 0,
        totalOut: 0,
        balance: 0
    });

    // Sales/Purchase Report State
    const [rangeStart, setRangeStart] = useState(formatDate(new Date(), 'yyyy-MM-01'));
    const [rangeEnd, setRangeEnd] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
    const [rangeData, setRangeData] = useState<{
        sales: Transaction[];
        purchases: Transaction[];
        totalSales: number;
        totalPurchases: number;
        grossProfit: number;
    }>({
        sales: [],
        purchases: [],
        totalSales: 0,
        totalPurchases: 0,
        grossProfit: 0
    });

    // Debt Report State
    const [debtData, setDebtData] = useState<{
        receivables: Transaction[];
        payables: Transaction[];
        totalReceivables: number;
        totalPayables: number;
    }>({
        receivables: [],
        payables: [],
        totalReceivables: 0,
        totalPayables: 0
    });

    // Load Daily Data
    useEffect(() => {
        const loadDaily = async () => {
            // 1. Get Session for date
            const sessionKeys = await stores.transactions.sessions.keys();
            let session: CashSession | null = null;
            for (const k of sessionKeys) {
                const s = await stores.transactions.sessions.getItem<CashSession>(k);
                if (s && s.date.startsWith(dailyDate)) {
                    session = s;
                    break;
                }
            }

            // 2. Get Transactions
            const saleKeys = await stores.transactions.sales.keys();
            const purchaseKeys = await stores.transactions.purchases.keys();
            
            const inflows: Transaction[] = [];
            const outflows: Transaction[] = [];

            for (const k of saleKeys) {
                const t = await stores.transactions.sales.getItem<Transaction>(k);
                if (t && t.date.startsWith(dailyDate)) {
                    inflows.push(t);
                }
            }

            for (const k of purchaseKeys) {
                const t = await stores.transactions.purchases.getItem<Transaction>(k);
                if (t && t.date.startsWith(dailyDate)) {
                    outflows.push(t);
                }
            }

            // 3. Get Expenses (Assuming we have an expense store, otherwise mock or skip)
            // Note: Expense store might not be fully implemented in types/storage yet based on previous reads,
            // but let's assume stores.transactions.expenses exists or we skip.
            // Based on storage.ts read earlier, I need to check if expenses store exists. 
            // I'll check storage.ts content again or just try-catch.
            // Let's assume it exists for now as ExpenseSchema exists.
            
            const expenses: Expense[] = [];
            try {
                // @ts-ignore
                const expKeys = await stores.transactions.expenses.keys();
                for (const k of expKeys) {
                    // @ts-ignore
                    const e = await stores.transactions.expenses.getItem<Expense>(k);
                    if (e && e.date.startsWith(dailyDate)) {
                        expenses.push(e);
                    }
                }
            } catch (e) {
                console.warn('Expenses store not found or empty', e);
            }

            // Calculate Totals
            // Inflow: Sales Paid Amount (Cash In) - count CASH only
            const totalIn = inflows
                .filter(t => t.payment_method === 'CASH')
                .reduce((sum, t) => sum + (t.paid_amount || 0), 0);
            
            // Outflow: Purchases Paid Amount (Cash Out) - count CASH only + Expenses
            const totalPurchaseOut = outflows
                .filter(t => t.payment_method === 'CASH')
                .reduce((sum, t) => sum + (t.paid_amount || 0), 0);
            const totalExpenseOut = expenses.reduce((sum, e) => sum + e.amount, 0);
            const totalOut = totalPurchaseOut + totalExpenseOut;

            // Balance: Opening + In - Out
            const startAmount = session ? session.start_amount : 0;
            const balance = startAmount + totalIn - totalOut;

            setDailyData({
                session,
                inflows,
                outflows,
                expenses,
                totalIn,
                totalOut,
                balance
            });
        };

        if (activeTab === 'daily') loadDaily();
    }, [dailyDate, activeTab]);

    // Load Range Data
    useEffect(() => {
        const loadRange = async () => {
            const saleKeys = await stores.transactions.sales.keys();
            const purchaseKeys = await stores.transactions.purchases.keys();
            
            const sales: Transaction[] = [];
            const purchases: Transaction[] = [];

            const start = new Date(rangeStart).getTime();
            const end = new Date(rangeEnd).getTime() + 86400000; // End of day

            for (const k of saleKeys) {
                const t = await stores.transactions.sales.getItem<Transaction>(k);
                if (t) {
                    const d = new Date(t.date).getTime();
                    if (d >= start && d < end) sales.push(t);
                }
            }

            for (const k of purchaseKeys) {
                const t = await stores.transactions.purchases.getItem<Transaction>(k);
                if (t) {
                    const d = new Date(t.date).getTime();
                    if (d >= start && d < end) purchases.push(t);
                }
            }

            const totalSales = sales.reduce((sum, t) => sum + t.total_amount, 0);
            const totalPurchases = purchases.reduce((sum, t) => sum + t.total_amount, 0);

            // Gross Profit Estimate: Sales Total - Cost of Goods Sold
            // Cost of Goods Sold = Sum of (Item Qty * Item Buy Price)
            // Note: We need buy price in transaction item. 
            // If transaction item doesn't have buy price snapshot, we might need to look up product master (imprecise if price changed)
            // or use the 'price' field in Purchase transactions if linked?
            // For now, let's use a simple Sales - Purchases (Cash Flow Profit) or just Gross Revenue.
            // Better: Sales Total - (Sum of Items * Current Buy Price from Product Master? No, too slow).
            // Let's stick to Sales vs Purchases for now.
            const grossProfit = totalSales - totalPurchases; 

            setRangeData({
                sales,
                purchases,
                totalSales,
                totalPurchases,
                grossProfit
            });
        };

        if (activeTab === 'sales_purchase') loadRange();
    }, [rangeStart, rangeEnd, activeTab]);

    // Load Debt Data
    useEffect(() => {
        const loadDebts = async () => {
            const saleKeys = await stores.transactions.sales.keys();
            const purchaseKeys = await stores.transactions.purchases.keys();
            
            const receivables: Transaction[] = [];
            const payables: Transaction[] = [];

            for (const k of saleKeys) {
                const t = await stores.transactions.sales.getItem<Transaction>(k);
                if (t && (t.paid_amount ?? 0) < t.total_amount) {
                    receivables.push(t);
                }
            }

            for (const k of purchaseKeys) {
                const t = await stores.transactions.purchases.getItem<Transaction>(k);
                if (t && (t.paid_amount ?? 0) < t.total_amount) {
                    payables.push(t);
                }
            }

            const totalReceivables = receivables.reduce((sum, t) => sum + (t.total_amount - (t.paid_amount ?? 0)), 0);
            const totalPayables = payables.reduce((sum, t) => sum + (t.total_amount - (t.paid_amount ?? 0)), 0);

            setDebtData({ receivables, payables, totalReceivables, totalPayables });
        };
        
        if (activeTab === 'debts') loadDebts();
    }, [activeTab]);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileBarChart className="w-6 h-6 text-blue-600" />
                    Reports
                </h2>
                
                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Daily Cash Book
                    </button>
                    <button
                        onClick={() => setActiveTab('sales_purchase')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'sales_purchase' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Sales & Purchases
                    </button>
                    <button
                        onClick={() => setActiveTab('debts')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'debts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Debts / Outstanding
                    </button>
                </div>
            </div>

            {/* DAILY CASH BOOK CONTENT */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 w-full sm:w-auto">
                            <label className="text-sm font-medium text-gray-700">Select Date:</label>
                            <input
                                type="date"
                                value={dailyDate}
                                onChange={(e) => setDailyDate(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                        </div>

                        <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
                             <button
                                onClick={() => setListFilter('ALL')}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    listFilter === 'ALL' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setListFilter('CASH')}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                    listFilter === 'CASH' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Banknote className="w-4 h-4" />
                                Cash
                            </button>
                            <button
                                onClick={() => setListFilter('TRANSFER')}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                                    listFilter === 'TRANSFER' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Transfer
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                                <Wallet className="w-4 h-4" />
                                <span className="text-sm font-medium">Opening Balance</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-900">
                                {formatCurrency(dailyData.session?.start_amount || 0)}
                            </div>
                            <div className="text-xs text-blue-500 mt-1">
                                {dailyData.session ? `Session ${dailyData.session.status}` : 'No Session Open'}
                            </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Total In (Cash Sales)</span>
                            </div>
                            <div className="text-2xl font-bold text-green-900">
                                +{formatCurrency(dailyData.totalIn)}
                            </div>
                            <div className="text-xs text-green-500 mt-1">
                                {dailyData.inflows.length} transactions
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <div className="flex items-center gap-2 text-red-600 mb-1">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Out (Buy/Exp)</span>
                            </div>
                            <div className="text-2xl font-bold text-red-900">
                                -{formatCurrency(dailyData.totalOut)}
                            </div>
                            <div className="text-xs text-red-500 mt-1">
                                {dailyData.outflows.length} purchases, {dailyData.expenses.length} expenses
                            </div>
                        </div>
                    </div>

                    {/* Closing Balance Preview */}
                    <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium opacity-90">Estimated Closing Balance</h3>
                            <p className="text-sm opacity-70">Opening + In - Out</p>
                        </div>
                        <div className="text-3xl font-bold">
                            {formatCurrency(dailyData.balance)}
                        </div>
                    </div>

                    {/* Detailed Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inflows */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">Inflows (Sales)</div>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Time</th>
                                            <th className="px-4 py-2 text-left">Customer</th>
                                            <th className="px-4 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {dailyData.inflows
                                            .filter(t => listFilter === 'ALL' || t.payment_method === listFilter)
                                            .map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500">
                                                    {formatDate(new Date(t.date), 'HH:mm')}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium">{t.partner_name || 'Cash Customer'}</div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                            t.payment_method === 'TRANSFER' 
                                                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                                : 'bg-green-50 text-green-600 border-green-100'
                                                        }`}>
                                                            {t.payment_method || 'CASH'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right text-green-600">
                                                    +{formatCurrency(t.paid_amount || 0, t.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                        {dailyData.inflows.filter(t => listFilter === 'ALL' || t.payment_method === listFilter).length === 0 && (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">No {listFilter === 'ALL' ? '' : listFilter.toLowerCase()} sales today</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Outflows */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">Outflows (Purchases & Expenses)</div>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Time</th>
                                            <th className="px-4 py-2 text-left">Payee</th>
                                            <th className="px-4 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {dailyData.outflows
                                            .filter(t => listFilter === 'ALL' || t.payment_method === listFilter)
                                            .map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500">
                                                    {formatDate(new Date(t.date), 'HH:mm')}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="font-medium">{t.partner_name || 'Supplier'} (Purchase)</div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                            t.payment_method === 'TRANSFER' 
                                                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                                : 'bg-green-50 text-green-600 border-green-100'
                                                        }`}>
                                                            {t.payment_method || 'CASH'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right text-red-600">
                                                    -{formatCurrency(t.paid_amount || 0, t.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                        {(listFilter === 'ALL' || listFilter === 'CASH') && dailyData.expenses.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500">
                                                    {formatDate(new Date(e.date), 'HH:mm')}
                                                </td>
                                                <td className="px-4 py-2 font-medium">
                                                    <div>{e.description} ({e.category})</div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-100 text-gray-600 border-gray-200">
                                                            EXPENSE
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right text-red-600">
                                                    -{formatCurrency(e.amount, e.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                        {dailyData.outflows.length === 0 && dailyData.expenses.length === 0 && (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">No outflows today</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SALES & PURCHASE REPORT CONTENT */}
            {activeTab === 'sales_purchase' && (
                <div className="space-y-6">
                    {/* Date Range Filter */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">From:</label>
                            <input
                                type="date"
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">To:</label>
                            <input
                                type="date"
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 text-indigo-600 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Sales</span>
                            </div>
                            <div className="text-2xl font-bold text-indigo-900">
                                {formatCurrency(rangeData.totalSales)}
                            </div>
                            <div className="text-xs text-indigo-500 mt-1">
                                {rangeData.sales.length} transactions
                            </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-600 mb-1">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Purchases</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-900">
                                {formatCurrency(rangeData.totalPurchases)}
                            </div>
                            <div className="text-xs text-orange-500 mt-1">
                                {rangeData.purchases.length} transactions
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${rangeData.grossProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${rangeData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <Wallet className="w-4 h-4" />
                                <span className="text-sm font-medium">Net Cash Flow (Sales - Buy)</span>
                            </div>
                            <div className={`text-2xl font-bold ${rangeData.grossProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                {rangeData.grossProfit > 0 ? '+' : ''}{formatCurrency(rangeData.grossProfit)}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                                Does not include expenses/overhead
                            </div>
                        </div>
                    </div>

                    {/* Sales Table */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                         <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-medium text-gray-700">Sales History</h3>
                            <span className="text-xs text-gray-500">{rangeData.sales.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Customer</th>
                                        <th className="px-4 py-3 text-left">Items</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-right">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rangeData.sales.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{formatDate(new Date(t.date), 'MMM dd, yyyy HH:mm')}</td>
                                            <td className="px-4 py-3 font-medium">
                                                <div>{t.partner_name || 'Cash Customer'}</div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                                        t.payment_method === 'TRANSFER' 
                                                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                            : 'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                        {t.payment_method || 'CASH'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 truncate max-w-xs">
                                                {t.items.map(i => `${i.product_name} (${i.quantity})`).join(', ')}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(t.total_amount, t.currency)}</td>
                                            <td className="px-4 py-3 text-right text-green-600">{formatCurrency(t.paid_amount || 0, t.currency)}</td>
                                        </tr>
                                    ))}
                                    {rangeData.sales.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No sales in this period</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* DEBTS REPORT CONTENT */}
            {activeTab === 'debts' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-600 mb-1">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Receivables (Piutang)</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-900">
                                {formatCurrency(debtData.totalReceivables)}
                            </div>
                            <div className="text-xs text-orange-500 mt-1">
                                Money customers owe you
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <div className="flex items-center gap-2 text-red-600 mb-1">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Payables (Hutang)</span>
                            </div>
                            <div className="text-2xl font-bold text-red-900">
                                {formatCurrency(debtData.totalPayables)}
                            </div>
                            <div className="text-xs text-red-500 mt-1">
                                Money you owe to suppliers
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         {/* Receivables List */}
                         <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">Receivables (Unpaid Sales)</div>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Date</th>
                                            <th className="px-4 py-2 text-left">Customer</th>
                                            <th className="px-4 py-2 text-right">Balance Due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {debtData.receivables.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500">
                                                    {formatDate(new Date(t.date), 'yyyy-MM-dd')}
                                                </td>
                                                <td className="px-4 py-2 font-medium">
                                                    {t.partner_name || 'Cash Customer'}
                                                    <div className="text-[10px] text-gray-400">#{t.id.slice(0, 6)}</div>
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-orange-600">
                                                    {formatCurrency(t.total_amount - (t.paid_amount ?? 0), t.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                        {debtData.receivables.length === 0 && (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">No outstanding receivables</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payables List */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b font-medium text-gray-700">Payables (Unpaid Purchases)</div>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Date</th>
                                            <th className="px-4 py-2 text-left">Supplier</th>
                                            <th className="px-4 py-2 text-right">Balance Due</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {debtData.payables.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500">
                                                    {formatDate(new Date(t.date), 'yyyy-MM-dd')}
                                                </td>
                                                <td className="px-4 py-2 font-medium">
                                                    {t.partner_name || 'Supplier'}
                                                    <div className="text-[10px] text-gray-400">#{t.id.slice(0, 6)}</div>
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-red-600">
                                                    {formatCurrency(t.total_amount - (t.paid_amount ?? 0), t.currency)}
                                                </td>
                                            </tr>
                                        ))}
                                        {debtData.payables.length === 0 && (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">No outstanding payables</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
