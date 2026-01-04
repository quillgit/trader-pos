import { useState, useEffect, useCallback } from 'react';
import { stores } from '@/lib/storage';
import type { CashSession, Transaction, Expense } from '@/types';

export function useCashSession() {
    const [session, setSession] = useState<CashSession | null>(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    const refreshSession = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Find active session
            const sessionKeys = await stores.transactions.sessions.keys();
            let active: CashSession | null = null;
            for (const key of sessionKeys) {
                const s = await stores.transactions.sessions.getItem<CashSession>(key);
                if (s && s.status === 'OPEN') {
                    active = s;
                    break;
                }
            }
            setSession(active);

            if (active) {
                let currentBalance = active.start_amount;

                // 2. Add Sales & Payment In
                const saleKeys = await stores.transactions.sales.keys();
                for (const key of saleKeys) {
                    const trx = await stores.transactions.sales.getItem<Transaction>(key);
                    // Only count if linked to this session
                    if (trx && trx.cash_session_id === active.id) {
                         currentBalance += (trx.paid_amount || 0);
                    }
                }

                // 3. Subtract Purchases & Payment Out
                const purchKeys = await stores.transactions.purchases.keys();
                for (const key of purchKeys) {
                    const trx = await stores.transactions.purchases.getItem<Transaction>(key);
                    // Only count if linked to this session
                    if (trx && trx.cash_session_id === active.id) {
                        currentBalance -= (trx.paid_amount || 0);
                    }
                }

                // 4. Subtract Expenses
                const expKeys = await stores.transactions.expenses.keys();
                for (const key of expKeys) {
                    const exp = await stores.transactions.expenses.getItem<Expense>(key);
                    if (exp && exp.cash_session_id === active.id) {
                        currentBalance -= exp.amount;
                    }
                }

                setBalance(currentBalance);
            } else {
                setBalance(0);
            }
        } catch (error) {
            console.error("Error calculating session balance:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    return { session, balance, loading, refreshSession };
}
