import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import { ExpenseSchema } from '@/types';
import type { Expense, CashSession } from '@/types';

export default function ExpenseForm() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentSession, setCurrentSession] = useState<CashSession | null>(null);

    const [formData, setFormData] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: 'OTHER',
        description: ''
    });

    useEffect(() => {
        // Check for open session to link expense
        const checkSession = async () => {
            const keys = await stores.transactions.sessions.keys();
            for (const key of keys) {
                const session = await stores.transactions.sessions.getItem<CashSession>(key);
                if (session && session.status === 'OPEN') {
                    setCurrentSession(session);
                    break;
                }
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const newExpense: Expense = {
                id: uuidv4(),
                date: new Date().toISOString(), // Use full ISO for storage
                amount: Number(formData.amount),
                category: formData.category as any,
                description: formData.description || '',
                created_by: 'CURRENT_USER',
                cash_session_id: currentSession?.id
            };

            const result = ExpenseSchema.safeParse(newExpense);
            if (!result.success) throw new Error(result.error.message);

            await stores.transactions.expenses.setItem(newExpense.id, newExpense);
            await SyncEngine.addToQueue('expense', 'create', newExpense);

            // If linked to a session, update the session counts? 
            // Currently session schema has 'expenses_count', we might want to increment that.
            if (currentSession) {
                const updatedSession = {
                    ...currentSession,
                    expenses_count: (currentSession.expenses_count || 0) + 1
                };
                await stores.transactions.sessions.setItem(updatedSession.id, updatedSession);
            }

            navigate('/');
        } catch (error: any) {
            alert('Error saving expense: ' + error.message);
        } finally {
            setLoading(false);
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

                {currentSession ? (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100 mb-2">
                        Linked to Active Cash Session ({new Date(currentSession.date).toLocaleDateString()})
                    </div>
                ) : (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-2">
                        No active cash session found. This expense will be recorded but not linked to a daily cash close.
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
                    <label className="block text-sm font-medium mb-1">Amount</label>
                    <input
                        type="number"
                        className="w-full border rounded px-3 py-2 text-lg font-mono"
                        value={formData.amount || ''}
                        onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        required
                        min="0"
                        step="0.01"
                    />
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
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {loading ? 'Saving...' : 'Save Expense'}
                    </button>
                </div>
            </form>
        </div>
    );
}
