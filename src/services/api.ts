export const getApiUrl = () => localStorage.getItem('OFFLINE_TRADER_API_URL') || '';

export const api = {
    async sync(payload: any) {
        const baseUrl = getApiUrl();
        if (!baseUrl) throw new Error('API URL not configured');

        // Google Apps Script usually takes query params for routing or looks at body
        // We'll send ?action=sync for clarity, though payload has action too
        const response = await fetch(`${baseUrl}?action=sync`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }
        return response.json();
    },

    async bootstrap() {
        const baseUrl = getApiUrl();
        if (!baseUrl) throw new Error('API URL not configured');
        const response = await fetch(`${baseUrl}?action=bootstrap`, {
            method: 'POST',
            body: JSON.stringify({ action: 'bootstrap' })
        });
        if (!response.ok) {
            throw new Error(`Bootstrap failed: ${response.statusText}`);
        }
        return response.json();
    },

    async fetchMasters(type: string) {
        const baseUrl = getApiUrl();
        if (!baseUrl) throw new Error('API URL not configured');

        const response = await fetch(`${baseUrl}?action=getMaster&type=${type}`);
        if (!response.ok) {
            throw new Error(`Fetch masters failed: ${response.statusText}`);
        }
        return response.json();
    },

    async pullTransactions(since?: string) {
        const baseUrl = getApiUrl();
        if (!baseUrl) throw new Error('API URL not configured');

        const url = new URL(baseUrl);
        url.searchParams.set('action', 'pull_transactions');
        if (since) url.searchParams.set('since', since);

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Pull transactions failed: ${response.statusText}`);
        }
        return response.json();
    },

    async pushSettings(settings: any) {
         const baseUrl = getApiUrl();
         if (!baseUrl) throw new Error('API URL not configured');
 
         const payload = {
             action: 'update',
             type: 'settings',
             payload: settings
         };
 
         const response = await fetch(`${baseUrl}?action=sync`, {
             method: 'POST',
             body: JSON.stringify(payload),
         });
 
         if (!response.ok) {
             throw new Error(`Settings push failed: ${response.statusText}`);
         }
         return response.json();
    }
};
