import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wallet, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import { ExpenseSchema } from '@/types';
import type { Expense } from '@/types';
import { useCashSession } from '@/hooks/use-cash-session';
import { formatCurrency } from '@/lib/utils';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function ExpenseForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { session, balance, isExpired } = useCashSession();
    const [loading, setLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [formData, setFormData] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        currency: 'IDR',
        category: 'OTHER',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (session && Number(formData.amount) > balance) {
             toast.error(`Insufficient session cash! Available: ${formatCurrency(balance)}`);
             return;
        }

        setShowConfirmModal(true);
    };

    const handleFinalSubmit = async () => {
        setLoading(true);

        try {
            const newExpense: Expense = {
                id: uuidv4(),
                date: new Date().toISOString(), // Use full ISO for storage
                amount: Number(formData.amount),
                currency: formData.currency || 'IDR',
                category: formData.category as any,
                description: formData.description || '',
                created_by: user?.id || 'OFFLINE_USER',
                cash_session_id: session?.id
            };

            const result = ExpenseSchema.safeParse(newExpense);
            if (!result.success) throw new Error(result.error.message);

            await stores.transactions.expenses.setItem(newExpense.id, newExpense);
            await SyncEngine.addToQueue('expense', 'create', newExpense);

            if (session) {
                const updatedSession = {
                    ...session,
                    expenses_count: (session.expenses_count || 0) + 1
                };
                await stores.transactions.sessions.setItem(updatedSession.id, updatedSession);
            }

            navigate('/');
        } catch (error: any) {
            toast.error('Error saving expense: ' + error.message);
        } finally {
            setLoading(false);
            setShowConfirmModal(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold">New Expense</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-4 max-w-lg">

                {session && !isExpired ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 mb-2">
                        Linked to Active Cash Session ({new Date(session.date).toLocaleDateString()})
                    </div>
                ) : isExpired ? (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-2 font-bold">
                        Previous Session Expired. Close it before recording expenses.
                    </div>
                ) : (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 mb-2">
                        No active cash session found.
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                        type="date"
                        className="w-full border rounded px-3 py-2"
                        value={String(formData.date).split('T')[0]}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 flex justify-between">
                        <span>Amount</span>
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Max: {formatCurrency(balance)}
                        </span>
                    </label>
                    <div className="flex gap-2">
                        <select
                            className="border rounded-md px-3 py-2 bg-gray-50 text-sm font-medium"
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        >
                            <option value="IDR">IDR</option>
                            <option value="USD">USD</option>
                        </select>
                        <div className="flex-1">
                            <MoneyInput
                                required
                                value={formData.amount}
                                onChange={val => setFormData({ ...formData, amount: val })}
                                currency={formData.currency}
                                className="focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    >
                        <option value="FUEL">Fuel</option>
                        <option value="FOOD">Food</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="SALARY">Salary</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Details..."
                    />
                </div>

                <div className="pt-4">
                    <button
                    type="submit"
                    disabled={loading || !session || isExpired}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Expense'}
                </button>
                </div>
            </form>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Confirm Expense</h3>
                            <button onClick={() => setShowConfirmModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Date</span>
                                <span className="font-medium">{new Date(formData.date!).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Category</span>
                                <span className="font-medium">{formData.category}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Description</span>
                                <span className="font-medium text-right max-w-[60%] truncate">{formData.description || '-'}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between items-center text-lg font-bold text-gray-800">
                                <span>Amount</span>
                                <span>{formatCurrency(Number(formData.amount), formData.currency)}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={loading}
                                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
