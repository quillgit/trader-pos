import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { formatCurrency, exportXLSX } from '@/lib/utils';
import type { Expense } from '@/types';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';

export default function ExpensesList() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    // Filtering & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const load = async () => {
            const keys = await stores.transactions.expenses.keys();
            const list: Expense[] = [];
            for (const k of keys) {
                const item = await stores.transactions.expenses.getItem<Expense>(k);
                if (item) list.push(item);
            }
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setExpenses(list);
        };
        load();
    }, []);

    // Filter Logic
    const filteredExpenses = expenses.filter(t => {
        const matchDesc = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchDate = true;
        if (startDate) {
            matchDate = matchDate && new Date(t.date) >= new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchDate = matchDate && new Date(t.date) <= end;
        }

        return (matchDesc || matchCat) && matchDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = filteredExpenses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold">Expenses</h2>
                <Link to="/expenses/new" className="bg-red-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4" /> New Expense
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-md border shadow-sm space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search description or category..."
                        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <input 
                    type="date"
                    className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                />
                <input 
                    type="date"
                    className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                />
                <button
                    onClick={() => {
                        const headers = ['ID','Date','Category','Description','Amount','Currency'];
                        const rows = filteredExpenses.map(t => ({
                            ID: t.id,
                            Date: new Date(t.date).toLocaleString(),
                            Category: t.category,
                            Description: t.description,
                            Amount: t.amount,
                            Currency: t.currency
                        }));
                        exportXLSX(`expenses_${startDate || 'all'}_${endDate || 'all'}`, 'Expenses', headers, rows);
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-md text-sm"
                >
                    Export
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        No expenses found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate">
                                            {expense.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-red-600">
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-xs text-gray-500">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
