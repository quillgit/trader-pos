import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Transaction } from '@/types';
import { Search, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useCashSession } from '@/hooks/use-cash-session';

export default function CashIn() {
    const { session } = useCashSession();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        const keys = await stores.transactions.sales.keys();
        const list: Transaction[] = [];
        for (const k of keys) {
            const item = await stores.transactions.sales.getItem<Transaction>(k);
            if (item && item.type === 'SALE' && (item.paid_amount || 0) < item.total_amount) {
                list.push(item);
            }
        }
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(list);
        setLoading(false);
    };

    const handleOpenPayment = (trx: Transaction) => {
        setSelectedTrx(trx);
        setPaymentAmount(trx.total_amount - (trx.paid_amount || 0));
    };

    const handlePayment = async () => {
        if (!selectedTrx || paymentAmount <= 0) return;
        
        if (!session) {
            toast.error('No active cash session');
            return;
        }

        setIsSubmitting(true);
        try {
            const currentPaid = selectedTrx.paid_amount || 0;
            const newPaid = currentPaid + paymentAmount;
            
            if (newPaid > selectedTrx.total_amount) {
                toast.error('Payment amount exceeds remaining balance');
                setIsSubmitting(false);
                return;
            }

            // 1. Update the original transaction
            const updatedTrx = {
                ...selectedTrx,
                paid_amount: newPaid,
                change_amount: newPaid > selectedTrx.total_amount ? newPaid - selectedTrx.total_amount : 0
            };
            await stores.transactions.sales.setItem(updatedTrx.id, updatedTrx);

            // 2. Create a payment record
            const paymentTrx: Transaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                type: 'PAYMENT_IN',
                partner_id: selectedTrx.partner_id,
                partner_name: selectedTrx.partner_name,
                items: [],
                total_amount: paymentAmount,
                paid_amount: paymentAmount,
                change_amount: 0,
                currency: selectedTrx.currency || 'IDR',
                reference_id: selectedTrx.id,
                created_by: 'CURRENT_USER',
                sync_status: 'PENDING',
                cash_session_id: session.id
            };
            await stores.transactions.sales.setItem(paymentTrx.id, paymentTrx);

            toast.success('Payment recorded successfully');
            setSelectedTrx(null);
            loadTransactions(); // Reload list
        } catch (error) {
            console.error(error);
            toast.error('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = transactions.filter(t => 
        (t.partner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 text-green-600" />
                Cash In (Receivables)
            </h2>

            {/* Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm relative">
                <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search customer or transaction ID..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">Loading receivables...</div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm">
                        No outstanding receivables found.
                    </div>
                ) : (
                    filtered.map(trx => {
                        const paid = trx.paid_amount || 0;
                        const remaining = trx.total_amount - paid;
                        return (
                            <div key={trx.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{trx.partner_name || 'Unknown Customer'}</h3>
                                        <div className="text-xs text-gray-500">{new Date(trx.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-gray-400 mt-1">#{trx.id.slice(0, 8)}</div>
                                    </div>
                                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                                        Unpaid
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm my-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total</span>
                                        <span className="font-medium">{(trx.currency || 'IDR')} {trx.total_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Paid</span>
                                        <span className="font-medium text-green-600">{(trx.currency || 'IDR')} {paid.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t pt-1 flex justify-between font-bold text-red-600">
                                        <span>Remaining</span>
                                        <span>{(trx.currency || 'IDR')} {remaining.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleOpenPayment(trx)}
                                    className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    Receive Payment
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Payment Modal */}
            {selectedTrx && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">Receive Payment</h3>
                        
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Customer</span>
                                <span className="font-medium">{selectedTrx.partner_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Outstanding</span>
                                <span className="font-bold text-red-600">
                                    {(selectedTrx.currency || 'IDR')} {(selectedTrx.total_amount - (selectedTrx.paid_amount || 0)).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Payment Amount</label>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-500">{selectedTrx.currency || 'IDR'}</span>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 text-lg font-bold focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(Number(e.target.value))}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedTrx(null)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={isSubmitting || paymentAmount <= 0}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50"
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
