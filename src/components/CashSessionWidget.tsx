import { useState } from 'react';
import { stores } from '@/lib/storage';
import { CashSessionSchema } from '@/types';
import type { CashSession, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';
import { Lock, Unlock, Wallet } from 'lucide-react';
import { SyncEngine } from '@/services/sync';
import { useCashSession } from '@/hooks/use-cash-session';
import { useAuth } from '@/contexts/AuthContext';
import { MoneyInput } from '@/components/ui/MoneyInput';
import toast from 'react-hot-toast';
import { LicenseService } from '@/services/license';

export default function CashSessionWidget() {
    const { user } = useAuth();
    const { session: currentSession, balance, refreshSession, loading, isExpired } = useCashSession();
    const [amountInput, setAmountInput] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [topupAmount, setTopupAmount] = useState<number>(0);
    const [isTopupProcessing, setIsTopupProcessing] = useState(false);

    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const startAmount = amountInput;
            if (isNaN(startAmount)) {
                toast.error('Invalid amount');
                return;
            }
            const license = LicenseService.getLicense();
            if (license.status !== 'active' && startAmount > 500000) {
                toast.error('License not valid. Max opening cash Rp 500.000');
                return;
            }

            const newSession: CashSession = {
                id: uuidv4(),
                date: new Date().toISOString(),
                start_amount: startAmount,
                status: 'OPEN',
                created_by: user?.id || 'OFFLINE_USER',
                transactions_count: 0,
                expenses_count: 0
            };

            const result = CashSessionSchema.safeParse(newSession);
            if (!result.success) throw new Error(result.error.message);

            await stores.transactions.sessions.setItem(newSession.id, newSession);
            await SyncEngine.addToQueue('session', 'create', newSession);

            await refreshSession();
            setAmountInput(0);
        } catch (error: any) {
            toast.error('Error starting session: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSession) return;

        setIsProcessing(true);
        try {
            const endAmount = amountInput;
            if (isNaN(endAmount)) {
                toast.error('Invalid amount');
                return;
            }

            const updatedSession: CashSession = {
                ...currentSession,
                end_amount: endAmount,
                status: 'CLOSED',
                closed_by: user?.id || 'OFFLINE_USER'
            };

            await stores.transactions.sessions.setItem(updatedSession.id, updatedSession);
            await SyncEngine.addToQueue('session', 'close', updatedSession);

            await refreshSession();
            setAmountInput(0);
        } catch (error: any) {
            toast.error('Error closing session: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTopup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSession) return;
        if (isExpired) {
            toast.error('Session expired. Please close previous session first.');
            return;
        }
        const amt = topupAmount;
        if (isNaN(amt) || amt <= 0) {
            toast.error('Invalid topup amount');
            return;
        }
        setIsTopupProcessing(true);
        try {
            const trx: Transaction = {
                id: uuidv4(),
                date: new Date().toISOString(),
                type: 'PAYMENT_IN',
                items: [],
                total_amount: amt,
                paid_amount: amt,
                change_amount: 0,
                currency: 'IDR',
                partner_name: 'Topup',
                created_by: user?.id || 'OFFLINE_USER',
                sync_status: 'PENDING',
                cash_session_id: currentSession.id,
                payment_method: 'CASH'
            };
            await stores.transactions.sales.setItem(trx.id, trx);
            await SyncEngine.addToQueue('transaction', 'create', trx);
            await refreshSession();
            setTopupAmount(0);
            toast.success('Cash topped up');
        } catch (error: any) {
            toast.error('Topup failed: ' + error.message);
        } finally {
            setIsTopupProcessing(false);
        }
    };

    if (loading) return <div className="text-sm text-gray-500 animate-pulse">Loading cash status...</div>;

    if (!currentSession) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <Lock className="w-5 h-5" />
                    Cash Session Closed
                </div>
                <p className="text-sm text-red-600 mb-3">
                    You must open a cash session before processing transactions.
                </p>
                <form onSubmit={handleOpenSession} className="flex gap-2">
                    <div className="flex-1">
                        <MoneyInput
                            value={amountInput}
                            onChange={setAmountInput}
                            placeholder="0"
                            className="text-sm w-full font-medium"
                            required
                        />
                    </div>
                    <button
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                        {isProcessing ? 'Opening...' : 'Open Session'}
                    </button>
                </form>
            </div>
        );
    }

    if (isExpired) {
        return (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-orange-800 text-lg mb-1">Session Expired</h3>
                        <p className="text-sm text-orange-700 mb-3">
                            The active session is from <strong>{new Date(currentSession.date).toLocaleDateString()}</strong>. 
                            You must close it before starting today's transactions.
                        </p>
                        
                        <div className="flex items-center gap-4 bg-white/50 p-2 rounded-lg mb-3">
                             <div className="text-xs text-orange-800 uppercase font-bold">Calculated Cash</div>
                             <div className="text-xl font-bold text-orange-900">{formatCurrency(balance)}</div>
                        </div>

                        <form onSubmit={handleCloseSession} className="flex gap-2 items-end w-full">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-orange-800 mb-1">Confirm Closing Cash</label>
                                <MoneyInput
                                    value={amountInput}
                                    onChange={setAmountInput}
                                    className="border-orange-300 font-bold"
                                    required
                                />
                            </div>
                            <button
                                disabled={isProcessing}
                                className="bg-orange-600 text-white px-6 py-2 rounded font-bold hover:bg-orange-700 disabled:opacity-50 h-[38px]"
                            >
                                {isProcessing ? 'Closing...' : 'Close Session Now'}
                            </button>
                        </form>
                        <div 
                            className="text-xs text-orange-600 mt-2 cursor-pointer hover:underline text-right" 
                            onClick={() => setAmountInput(balance)}
                        >
                            Use calculated: {formatCurrency(balance)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                        <Unlock className="w-5 h-5" />
                        Active Cash Session
                    </div>
                    <div className="text-xs text-green-600">
                        Started: {new Date(currentSession.date).toLocaleTimeString()} <br />
                        Opening: <span className="font-bold">{formatCurrency(currentSession.start_amount)}</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="text-xs text-green-600 font-bold uppercase tracking-wide">Current Cash</div>
                    <div className="text-2xl font-bold text-green-800 flex items-center gap-1">
                        <Wallet className="w-5 h-5 text-green-600" />
                        {formatCurrency(balance)}
                    </div>
                </div>

                <form onSubmit={handleCloseSession} className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2 items-center">
                        <div className="text-right w-32">
                            <label className="block text-[10px] text-green-700 font-bold uppercase mb-1">End Amount</label>
                            <MoneyInput
                                value={amountInput}
                                onChange={setAmountInput}
                                placeholder="Expected..."
                                className="text-xs font-bold py-1"
                                required
                            />
                        </div>
                        <button
                            disabled={isProcessing}
                            className="bg-green-600 text-white px-3 py-3 rounded text-xs hover:bg-green-700 disabled:opacity-50 h-full mt-4"
                        >
                            {isProcessing ? 'Closing...' : 'Close'}
                        </button>
                    </div>
                    <div className="text-[10px] text-green-600 cursor-pointer hover:underline" onClick={() => setAmountInput(balance)}>
                        Use calculated: {formatCurrency(balance)}
                    </div>
                </form>
            </div>
            <div className="mt-4 bg-white/60 rounded-lg p-3 border border-green-100">
                <form onSubmit={handleTopup} className="flex items-end gap-2">
                    <div className="flex-1">
                        <label className="block text-[10px] text-green-700 font-bold uppercase mb-1">Topup Cash</label>
                        <MoneyInput
                            value={topupAmount}
                            onChange={setTopupAmount}
                            className="text-sm font-bold"
                            placeholder="0"
                        />
                    </div>
                    <button
                        disabled={isTopupProcessing}
                        className="bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                        {isTopupProcessing ? 'Processing...' : 'Top Up'}
                    </button>
                </form>
                <div className="text-[10px] text-green-600 mt-1">
                    Adds directly to session cash balance.
                </div>
            </div>
        </div>
    );
}
