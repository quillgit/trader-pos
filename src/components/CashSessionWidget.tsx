import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { CashSessionSchema } from '@/types';
import type { CashSession } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Lock, Unlock } from 'lucide-react';
import { SyncEngine } from '@/services/sync';

export default function CashSessionWidget() {
    const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [amountInput, setAmountInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        checkActiveSession();
    }, []);

    const checkActiveSession = async () => {
        setLoading(true);
        try {
            const keys = await stores.transactions.sessions.keys();
            let active: CashSession | null = null;

            // Find the most recent open session
            // In a real app we might maximize performance by keeping a pointer to active session
            for (const key of keys) {
                const session = await stores.transactions.sessions.getItem<CashSession>(key);
                if (session && session.status === 'OPEN') {
                    active = session;
                    break;
                }
            }
            setCurrentSession(active);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

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

            setCurrentSession(newSession);
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

            setCurrentSession(null);
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
                        Opening Balance: <span className="font-bold">{currentSession.start_amount.toLocaleString()}</span>
                    </div>
                </div>

                <form onSubmit={handleCloseSession} className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Closing Cash"
                            className="border rounded px-2 py-1 text-xs w-32"
                            value={amountInput}
                            onChange={e => setAmountInput(e.target.value)}
                            required
                            min="0"
                        />
                        <button
                            disabled={isProcessing}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                            {isProcessing ? 'Closing...' : 'Close'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
