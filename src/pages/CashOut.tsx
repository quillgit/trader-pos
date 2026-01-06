import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Transaction } from '@/types';
import { Search, CreditCard, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';
import { useCashSession } from '@/hooks/use-cash-session';
import { useAuth } from '@/contexts/AuthContext';
import { MoneyInput } from '@/components/ui/MoneyInput';

export default function CashOut() {
    const { user } = useAuth();
    const { session, balance, isExpired } = useCashSession();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'CONFIRM'>('INPUT');

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        const keys = await stores.transactions.purchases.keys();
        const list: Transaction[] = [];
        for (const k of keys) {
            const item = await stores.transactions.purchases.getItem<Transaction>(k);
            if (item && item.type === 'PURCHASE' && (item.paid_amount || 0) < item.total_amount) {
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
        setStep('INPUT');
    };

    const handleReview = () => {
        if (!selectedTrx || paymentAmount <= 0) return;
        
        if (paymentMethod === 'CASH') {
            if (!session) {
                toast.error('No active cash session');
                return;
            }
            if (isExpired) {
                toast.error('Session expired. Please close previous session.');
                return;
            }
            if (paymentAmount > balance) {
                toast.error(`Insufficient session cash! Available: ${formatCurrency(balance, selectedTrx.currency)}`);
                return;
            }
        }

        const currentPaid = selectedTrx.paid_amount || 0;
        if (currentPaid + paymentAmount > selectedTrx.total_amount) {
            toast.error('Payment amount exceeds remaining balance');
            return;
        }

        setStep('CONFIRM');
    };

    const handleFinalPayment = async () => {
        if (!selectedTrx) return;

        setIsSubmitting(true);
        try {
            const currentPaid = selectedTrx.paid_amount || 0;
            const newPaid = currentPaid + paymentAmount;
            
            // 1. Update the original transaction
            const updatedTrx = {
                ...selectedTrx,
                paid_amount: newPaid,
                change_amount: newPaid > selectedTrx.total_amount ? newPaid - selectedTrx.total_amount : 0,
                notes: (() => {
                    const timestamp = new Date().toLocaleString();
                    const note = `[System ${timestamp}] Additional payment: ${formatCurrency(paymentAmount, selectedTrx.currency || 'IDR')} (Paid ${formatCurrency(currentPaid, selectedTrx.currency || 'IDR')} -> ${formatCurrency(newPaid, selectedTrx.currency || 'IDR')})`;
                    return selectedTrx.notes ? `${selectedTrx.notes}\n${note}` : note;
                })()
            };
            await stores.transactions.purchases.setItem(updatedTrx.id, updatedTrx);

            // 2. Create a payment record
            const paymentTrx: Transaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                type: 'PAYMENT_OUT',
                partner_id: selectedTrx.partner_id,
                partner_name: selectedTrx.partner_name,
                items: [],
                total_amount: paymentAmount,
                paid_amount: paymentAmount,
                change_amount: 0,
                currency: selectedTrx.currency || 'IDR',
                reference_id: selectedTrx.id,
                created_by: user?.id || 'OFFLINE_USER',
                sync_status: 'PENDING',
                cash_session_id: paymentMethod === 'CASH' ? session?.id : undefined,
                payment_method: paymentMethod,
                notes: (() => {
                    const timestamp = new Date().toLocaleString();
                    return `[System ${timestamp}] Payment Out recorded for ${selectedTrx.id} via ${paymentMethod}`;
                })()
            };
            await stores.transactions.purchases.setItem(paymentTrx.id, paymentTrx);

            toast.success('Payment recorded successfully');
            setSelectedTrx(null);
            setPaymentMethod('CASH');
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
                <CreditCard className="w-6 h-6 text-blue-600" />
                Cash Out (Payables)
            </h2>

            {/* Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm relative">
                <Search className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search supplier or transaction ID..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8 text-gray-500">Loading payables...</div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500 bg-white rounded-lg shadow-sm">
                        No outstanding payables found.
                    </div>
                ) : (
                    filtered.map(trx => {
                        const paid = trx.paid_amount || 0;
                        const remaining = trx.total_amount - paid;
                        const currency = trx.currency || 'IDR';
                        return (
                            <div key={trx.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{trx.partner_name || 'Unknown Supplier'}</h3>
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
                                        <span className="font-medium">{formatCurrency(trx.total_amount, currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Paid</span>
                                        <span className="font-medium text-green-600">{formatCurrency(paid, currency)}</span>
                                    </div>
                                    <div className="border-t pt-1 flex justify-between font-bold text-red-600">
                                        <span>Remaining</span>
                                        <span>{formatCurrency(remaining, currency)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleOpenPayment(trx)}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Pay Supplier
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
                        <h3 className="text-xl font-bold mb-4">
                            {step === 'INPUT' ? 'Make Payment' : 'Confirm Payment'}
                        </h3>
                        
                        {step === 'INPUT' ? (
                            <>
                                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Supplier</span>
                                        <span className="font-medium">{selectedTrx.partner_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Outstanding</span>
                                        <span className="font-bold text-red-600">
                                            {formatCurrency(selectedTrx.total_amount - (selectedTrx.paid_amount || 0), selectedTrx.currency)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium mb-1 flex justify-between">
                                        <span>Payment Amount</span>
                                        {paymentMethod === 'CASH' && (
                                            <span className={`${paymentAmount > balance ? 'text-red-600 font-bold' : 'text-blue-600'} flex items-center gap-1 text-xs`}>
                                                <Wallet className="w-3 h-3" />
                                                Max: {formatCurrency(balance, selectedTrx.currency)}
                                            </span>
                                        )}
                                    </label>
                                    <MoneyInput
                                        currency={selectedTrx.currency || 'IDR'}
                                        value={paymentAmount}
                                        onChange={setPaymentAmount}
                                        className={`text-lg font-bold focus:ring-2 ${paymentMethod === 'CASH' && paymentAmount > balance ? 'border-red-500 focus:ring-red-500 text-red-600' : 'focus:ring-blue-500 focus:outline-none'}`}
                                        autoFocus
                                    />
                                    <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                value="CASH"
                                                checked={paymentMethod === 'CASH'}
                                                onChange={() => setPaymentMethod('CASH')}
                                            />
                                            <span>Cash (Session)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="radio"
                                                value="TRANSFER"
                                                checked={paymentMethod === 'TRANSFER'}
                                                onChange={() => setPaymentMethod('TRANSFER')}
                                            />
                                            <span>Transfer</span>
                                        </div>
                                    </div>
                                    {paymentMethod === 'CASH' && paymentAmount > balance && (
                                        <p className="text-xs text-red-600 mt-1 font-medium">
                                            Insufficient session cash available.
                                        </p>
                                    )}
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
                                        onClick={handleReview}
                                        disabled={isSubmitting || paymentAmount <= 0}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                                    >
                                        Review Payment
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Pay to</span>
                                        <span className="font-bold">{selectedTrx.partner_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Transaction ID</span>
                                        <span className="font-mono text-xs">{selectedTrx.id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="border-t border-blue-200 my-2"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Payment Amount</span>
                                        <span className="text-xl font-bold text-blue-700">
                                            {formatCurrency(paymentAmount, selectedTrx.currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Payment Method</span>
                                        <span className={`text-[10px] px-2 py-1 rounded ${paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {paymentMethod}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setStep('INPUT')}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                        disabled={isSubmitting}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleFinalPayment}
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>Processing...</>
                                        ) : (
                                            <>Confirm & Pay</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
