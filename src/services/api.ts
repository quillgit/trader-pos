export const API_BASE = '/api';

export const api = {
    async sync(payload: any) {
        const response = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }
        return response.json();
    },

    async fetchMasters(type: string) {
        const response = await fetch(`${API_BASE}/master/${type}`);
        if (!response.ok) {
            throw new Error(`Fetch masters failed: ${response.statusText}`);
        }
        return response.json();
    }
};
