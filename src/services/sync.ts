import { stores } from '@/lib/storage';
import { api } from './api';
import type { QueueItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const SyncEngine = {
    async addToQueue(type: string, action: string, payload: any) {
        const item: QueueItem = {
            id: uuidv4(),
            type,
            action,
            payload,
            timestamp: Date.now(),
            retry_count: 0
        };
        await stores.syncQueue.setItem(item.id, item);
        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    },

    async processQueue() {
        if (!navigator.onLine) return;

        // const keys = await stores.syncQueue.keys();
        // Process sequentially to ensure order? Or parallel?
        // Sequential is safer for dependency reasons (e.g. create partner then buy from partner)
        // But for performance, maybe parallel if independent.
        // Let's go sequential for now to be safe.

        // Sort keys or items by timestamp (keys in IDB are not ordered by time, so need to fetch all)
        const items: QueueItem[] = [];
        await stores.syncQueue.iterate((value: QueueItem) => {
            items.push(value);
        });

        // Sort by timestamp
        items.sort((a, b) => a.timestamp - b.timestamp);

        for (const item of items) {
            try {
                await api.sync(item);
                // On success, remove from queue
                await stores.syncQueue.removeItem(item.id);
                console.log(`Synced ${item.type} ${item.action}`);
            } catch (error) {
                console.error(`Failed to sync ${item.id}`, error);
                // Increment retry count?
                item.retry_count = (item.retry_count || 0) + 1;
                await stores.syncQueue.setItem(item.id, item);
                // If error is strictly network, stop processing
                // But we already checked navigator.onLine.
                // Maybe server error. continue or break?
                // If 500, break.
                break; // Stop queue processing on first error to maintain consistency?
            }
        }
    },

    async syncAllDown() {
        if (!navigator.onLine) {
            console.warn('Cannot sync down while offline');
            return;
        }

        // 1. Sync Masters
        const types = ['product', 'partner', 'employee', 'expense_category'];
        const storeMap: Record<string, any> = {
            'product': stores.masters.products,
            'partner': stores.masters.partners,
            'employee': stores.masters.employees,
            'expense_category': stores.masters.expense_categories
        };

        for (const type of types) {
            try {
                const data = await api.fetchMasters(type);
                // Handle both array response and wrapped response
                const items = Array.isArray(data) ? data : (data.data || []);
                
                if (Array.isArray(items)) {
                    const store = storeMap[type];
                    await store.clear();
                    for (const item of items) {
                        // Ensure ID exists, otherwise generate or skip? 
                        // Master data should have IDs from sheet.
                        if (item.id) {
                            await store.setItem(item.id.toString(), item);
                        }
                    }
                    console.log(`Synced down ${items.length} ${type}s`);
                }
            } catch (e) {
                console.error(`Failed to sync down ${type}`, e);
            }
        }

        // 2. Sync Transactions (Multi-Device)
        try {
            const lastPullTime = localStorage.getItem('LAST_TRX_PULL_TIME') || '0';
            const data = await api.pullTransactions(lastPullTime);
            
            if (data) {
                // Sales
                if (Array.isArray(data.sales)) {
                    for (const trx of data.sales) {
                        // Avoid overwriting pending changes? 
                        // Strategy: Server wins, but if we have local pending edits, it might be tricky.
                        // For now, assume simple append-only or replace.
                        await stores.transactions.sales.setItem(trx.id, { ...trx, sync_status: 'SYNCED' });
                    }
                    console.log(`Pulled ${data.sales.length} sales`);
                }
                
                // Purchases
                if (Array.isArray(data.purchases)) {
                    for (const trx of data.purchases) {
                        await stores.transactions.purchases.setItem(trx.id, { ...trx, sync_status: 'SYNCED' });
                    }
                    console.log(`Pulled ${data.purchases.length} purchases`);
                }

                // Expenses
                if (Array.isArray(data.expenses)) {
                     for (const exp of data.expenses) {
                        await stores.transactions.expenses.setItem(exp.id, { ...exp, sync_status: 'SYNCED' });
                    }
                    console.log(`Pulled ${data.expenses.length} expenses`);
                }

                // Sessions
                 if (Array.isArray(data.sessions)) {
                     for (const sess of data.sessions) {
                        await stores.transactions.sessions.setItem(sess.id, { ...sess, sync_status: 'SYNCED' });
                    }
                    console.log(`Pulled ${data.sessions.length} sessions`);
                }

                localStorage.setItem('LAST_TRX_PULL_TIME', Date.now().toString());
            }
        } catch (e) {
             console.error('Failed to pull transactions', e);
        }

        // 3. Sync Settings
        try {
            const settings = await api.fetchMasters('settings');
            if (settings && typeof settings === 'object') {
                if (settings['COMPANY_NAME']) localStorage.setItem('COMPANY_NAME', settings['COMPANY_NAME']);
                if (settings['COMPANY_ADDRESS']) localStorage.setItem('COMPANY_ADDRESS', settings['COMPANY_ADDRESS']);
                if (settings['COMPANY_PHONE']) localStorage.setItem('COMPANY_PHONE', settings['COMPANY_PHONE']);
                console.log('Synced settings');
            }
        } catch (e) {
            console.error('Failed to sync settings down', e);
        }
    },

    init() {
        window.addEventListener('online', () => {
            console.log('Online! Processing queue...');
            this.processQueue();
        });
    }
};
