import localforage from 'localforage';

localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'commodity-trader-pwa',
    version: 1.0,
    storeName: 'keyvalue_pairs',
    description: 'Offline storage for commodity trading app'
});

// Create separate instances for different collections to mimic tables
export const stores = {
    masters: {
        products: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_products' }),
        partners: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_partners' }),
        employees: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_employees' }),
        expense_categories: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_expense_categories' }),
        payroll_components: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_payroll_components' }),
        payroll_lines: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'master_payroll_lines' }),
    },
    transactions: {
        purchases: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_purchases' }),
        sales: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_sales' }),
        attendance: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_attendance' }),
        sessions: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_sessions' }),
        expenses: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_expenses' }),
        hr_adjustments: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'trx_hr_adjustments' }),
    },
    syncQueue: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'sync_queue' }),
    meta: localforage.createInstance({ name: 'commodity-trader-pwa', storeName: 'meta_data' }) // For last sync time, etc.
};

export const StorageService = {
    async clearAll() {
        await Promise.all([
            stores.masters.products.clear(),
            stores.masters.partners.clear(),
            stores.masters.employees.clear(),
            stores.masters.expense_categories.clear(),
            stores.masters.payroll_components.clear(),
            stores.masters.payroll_lines.clear(),
            stores.transactions.purchases.clear(),
            stores.transactions.sales.clear(),
            stores.transactions.attendance.clear(),
            stores.transactions.sessions.clear(),
            stores.transactions.expenses.clear(),
            stores.transactions.hr_adjustments.clear(),
            stores.syncQueue.clear(),
            stores.meta.clear(),
        ]);
    },
    async factoryReset() {
        await this.clearAll();
        try {
            const keys = [
                'commodity_user',
                'OFFLINE_TRADER_API_URL',
                'SQL_API_URL',
                'COMPANY_NAME',
                'COMPANY_ADDRESS',
                'COMPANY_PHONE',
                'GOOGLE_OAUTH_CLIENT_ID',
                'COMMODITY_TRADER_LICENSE',
                'COMMODITY_TRADER_DEVICE_ID'
            ];
            for (const k of keys) localStorage.removeItem(k);
        } catch {}
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
        } catch {}
        try {
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(n => caches.delete(n)));
            }
        } catch {}
    }
};
