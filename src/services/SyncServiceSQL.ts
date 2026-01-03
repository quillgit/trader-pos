import { stores } from '@/lib/storage';
import type { Transaction, Partner, Product, Employee, CashSession, Expense, Attendance } from '@/types';

// Define the API response structure for Pull
interface PullResponse {
    products: Product[];
    partners: Partner[];
    employees: Employee[];
    transactions: Transaction[];
    cash_sessions: CashSession[];
    expenses: Expense[];
    attendance: Attendance[];
    server_timestamp: string;
}

// Define the API payload structure for Push
interface PushPayload {
    products: Product[];
    partners: Partner[];
    employees: Employee[];
    transactions: Transaction[];
    cash_sessions: CashSession[];
    expenses: Expense[];
    attendance: Attendance[];
    client_timestamp: number;
}

export const SyncServiceSQL = {
    // Configuration
    getApiUrl: () => localStorage.getItem('SQL_API_URL') || 'http://localhost:3000/api',
    getLastSyncTime: async () => await stores.meta.getItem<string>('last_sql_sync_time') || new Date(0).toISOString(),
    setLastSyncTime: async (time: string) => await stores.meta.setItem('last_sql_sync_time', time),

    /**
     * Orchestrates the full sync process: Push then Pull.
     */
    async sync() {
        if (!navigator.onLine) throw new Error('Offline');

        console.log('Starting SQL Sync...');
        
        // 1. Push Local Changes
        await this.pushChanges();

        // 2. Pull Server Changes
        await this.pullChanges();

        console.log('SQL Sync Complete');
    },

    /**
     * Pushes all records marked as 'PENDING' or dirty to the server.
     */
    async pushChanges() {
        const payload: PushPayload = {
            products: [],
            partners: [],
            employees: [],
            transactions: [],
            cash_sessions: [],
            expenses: [],
            attendance: [],
            client_timestamp: Date.now()
        };

        // Collect pending items from all stores
        // Note: In a real SQL/SQLite environment, we would query `WHERE sync_status = 'PENDING'`
        // With LocalForage, we iterate. Optimization: Keep a separate 'dirty_ids' list.
        
        await stores.transactions.purchases.iterate((val: Transaction) => {
            if (val.sync_status === 'PENDING') payload.transactions.push(val);
        });
        await stores.transactions.sales.iterate((val: Transaction) => {
            if (val.sync_status === 'PENDING') payload.transactions.push(val);
        });
        
        // Masters
        await stores.masters.partners.iterate((_val: Partner) => {
            // Assuming we add sync_status to Partner schema, or check dirty flag
            // For now, let's assume we sync all if updated_at > last_sync
             // payload.partners.push(val); 
             // Logic needs 'sync_status' on all models for efficient push
        });

        // If nothing to push, skip
        const totalItems = Object.values(payload).filter(Array.isArray).reduce((acc, arr) => acc + arr.length, 0);
        if (totalItems === 0) {
            console.log('Nothing to push');
            return;
        }

        const response = await fetch(`${this.getApiUrl()}/sync/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Push failed: ${response.statusText}`);

        // On success, mark items as SYNCED
        // We iterate the payload again to update local status
        // Ideally server returns the IDs that were successfully processed
        
        for (const trx of payload.transactions) {
            trx.sync_status = 'SYNCED';
            if (trx.type === 'PURCHASE') await stores.transactions.purchases.setItem(trx.id, trx);
            else await stores.transactions.sales.setItem(trx.id, trx);
        }
    },

    /**
     * Pulls changes from the server since the last sync.
     */
    async pullChanges() {
        const lastSync = await this.getLastSyncTime();
        const response = await fetch(`${this.getApiUrl()}/sync/pull?since=${encodeURIComponent(lastSync)}`);

        if (!response.ok) throw new Error(`Pull failed: ${response.statusText}`);

        const data: PullResponse = await response.json();

        // Apply changes to local stores
        // Using Promise.all for parallel updates
        const promises = [];

        if (data.products) {
            for (const item of data.products) {
                promises.push(stores.masters.products.setItem(item.id, item));
            }
        }
        if (data.partners) {
            for (const item of data.partners) {
                promises.push(stores.masters.partners.setItem(item.id, item));
            }
        }
        if (data.transactions) {
            for (const item of data.transactions) {
                const store = item.type === 'PURCHASE' ? stores.transactions.purchases : stores.transactions.sales;
                promises.push(store.setItem(item.id, { ...item, sync_status: 'SYNCED' }));
            }
        }

        await Promise.all(promises);

        // Update last sync time
        if (data.server_timestamp) {
            await this.setLastSyncTime(data.server_timestamp);
        }
    }
};
