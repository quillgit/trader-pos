import { useState } from 'react';
import { stores } from '@/lib/storage';
import { CashSessionSchema } from '@/types';
import type { CashSession } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Lock, Unlock, Wallet } from 'lucide-react';
import { SyncEngine } from '@/services/sync';
import { useCashSession } from '@/hooks/use-cash-session';

export default function CashSessionWidget() {
    const { session: currentSession, balance, refreshSession, loading } = useCashSession();
    const [amountInput, setAmountInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const startAmount = parseFloat(amountInput);
            if (isNaN(startAmount)) {
                alert('Invalid amount');
                return;
            }

            const newSession: CashSession = {
                id: uuidv4(),
                date: new Date().toISOString(),
                start_amount: startAmount,
                status: 'OPEN',
                created_by: 'CURRENT_USER', // Replace with auth later
                transactions_count: 0,
                expenses_count: 0
            };

            const result = CashSessionSchema.safeParse(newSession);
            if (!result.success) throw new Error(result.error.message);

            await stores.transactions.sessions.setItem(newSession.id, newSession);
            await SyncEngine.addToQueue('session', 'create', newSession);

            await refreshSession();
            setAmountInput('');
        } catch (error: any) {
            alert('Error starting session: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentSession) return;

        setIsProcessing(true);
        try {
            const endAmount = parseFloat(amountInput);
            if (isNaN(endAmount)) {
                alert('Invalid amount');
                return;
            }

            const updatedSession: CashSession = {
                ...currentSession,
                end_amount: endAmount,
                status: 'CLOSED',
                closed_by: 'CURRENT_USER' // Replace with auth
            };

            await stores.transactions.sessions.setItem(updatedSession.id, updatedSession);
            await SyncEngine.addToQueue('session', 'close', updatedSession);

            await refreshSession();
            setAmountInput('');
        } catch (error: any) {
            alert('Error closing session: ' + error.message);
        } finally {
            setIsProcessing(false);
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
                    <input
                        type="number"
                        placeholder="Opening Balance"
                        className="border rounded px-3 py-1 text-sm flex-1"
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        required
                        min="0"
                    />
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
                        Opening: <span className="font-bold">{currentSession.start_amount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="text-xs text-green-600 font-bold uppercase tracking-wide">Current Cash</div>
                    <div className="text-2xl font-bold text-green-800 flex items-center gap-1">
                        <Wallet className="w-5 h-5 text-green-600" />
                        {balance.toLocaleString()}
                    </div>
                </div>

                <form onSubmit={handleCloseSession} className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2 items-center">
                        <div className="text-right">
                            <label className="block text-[10px] text-green-700 font-bold uppercase">End Amount</label>
                            <input
                                type="number"
                                placeholder="Expected..."
                                className="border rounded px-2 py-1 text-xs w-24 text-right font-bold"
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                                required
                                min="0"
                            />
                        </div>
                        <button
                            disabled={isProcessing}
                            className="bg-green-600 text-white px-3 py-3 rounded text-xs hover:bg-green-700 disabled:opacity-50 h-full mt-3"
                        >
                            {isProcessing ? 'Closing...' : 'Close'}
                        </button>
                    </div>
                    <div className="text-[10px] text-green-600 cursor-pointer hover:underline" onClick={() => setAmountInput(balance.toString())}>
                        Use calculated: {balance.toLocaleString()}
                    </div>
                </form>
            </div>
        </div>
    );
}
