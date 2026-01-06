import { useEffect, useState } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, Plus, Search, Save, X } from 'lucide-react';
import { useCashSession } from '@/hooks/use-cash-session';
import { useAuth } from '@/contexts/AuthContext';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function TopupPage() {
    const { user } = useAuth();
    const { session, balance, isExpired } = useCashSession();
    const [amount, setAmount] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [topups, setTopups] = useState<Transaction[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
 
    useEffect(() => {
        loadTopups();
    }, []);
 
    const loadTopups = async () => {
        setLoading(true);
        const keys = await stores.transactions.sales.keys();
        const list: Transaction[] = [];
        for (const k of keys) {
            const t = await stores.transactions.sales.getItem<Transaction>(k);
            if (t && t.type === 'PAYMENT_IN' && (t.partner_name || '').toLowerCase() === 'topup') {
                list.push(t);
            }
        }
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTopups(list);
        setLoading(false);
    };
 
    const handleReview = () => {
        if (!session) {
            toast.error('No active cash session');
            return;
        }
        if (isExpired) {
            toast.error('Session expired. Please close previous session first.');
            return;
        }
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        setShowConfirm(true);
    };
 
    const handleConfirm = async () => {
        if (!session) return;
        setIsSubmitting(true);
        try {
            const trx: Transaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                type: 'PAYMENT_IN',
                partner_name: 'Topup',
                items: [],
                total_amount: amount,
                paid_amount: amount,
                change_amount: 0,
                currency: 'IDR',
                created_by: user?.id || 'OFFLINE_USER',
                sync_status: 'PENDING',
                cash_session_id: session.id,
                payment_method: 'CASH',
                notes,
            };
            await stores.transactions.sales.setItem(trx.id, trx);
            await SyncEngine.addToQueue('transaction', 'create', trx);
            toast.success('Topup recorded');
            setAmount(0);
            setNotes('');
            setShowConfirm(false);
            loadTopups();
        } catch (e: any) {
            toast.error('Failed to record topup: ' + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };
 
    const filtered = topups.filter(t =>
        (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
 
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 text-green-600" />
                Cash Topup
            </h2>
 
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm mb-3">
                    <span className="text-gray-600">Current Cash</span>
                    <span className="ml-2 font-bold text-green-700">{formatCurrency(balance)}</span>
                </div>
 
                {!session ? (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 mb-2">
                        No active cash session found.
                    </div>
                ) : isExpired ? (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mb-2 font-bold">
                        Previous session expired. Close it before recording topups.
                    </div>
                ) : null}
 
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${!session || isExpired ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Amount</label>
                        <MoneyInput
                            value={amount}
                            onChange={setAmount}
                            className="focus:ring-green-500 text-lg font-bold"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Optional note"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>
 
                <div className="mt-4">
                    <button
                        onClick={handleReview}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                        disabled={!session || isExpired}
                    >
                        <Plus className="w-4 h-4" />
                        Review Topup
                    </button>
                </div>
            </div>
 
            <div className="bg-white p-4 rounded-lg border shadow-sm relative">
                <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search notes or ID..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">Loading topups...</div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm">
                        No topup records found.
                    </div>
                ) : (
                    filtered.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-gray-800">Topup</div>
                                    <div className="text-xs text-gray-500">{new Date(t.date).toLocaleString()}</div>
                                    <div className="text-xs text-gray-400 mt-1">#{t.id.slice(0, 8)}</div>
                                </div>
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                                    PAYMENT_IN
                                </span>
                            </div>
                            <div className="space-y-2 text-sm my-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-bold text-green-700">{formatCurrency(t.paid_amount, t.currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Session</span>
                                    <span className="font-mono text-xs">{t.cash_session_id?.slice(0, 8) || '-'}</span>
                                </div>
                                <div>
                                    <div className="text-gray-500">Notes</div>
                                    <div className="text-gray-800">{t.notes || '-'}</div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
 
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold">Confirm Topup</h3>
                            <button onClick={() => setShowConfirm(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Amount</span>
                                <span className="font-bold text-green-700">{formatCurrency(amount)}</span>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Notes</div>
                                <div className="text-sm text-gray-800">{notes || '-'}</div>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
