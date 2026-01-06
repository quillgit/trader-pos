import { toast } from 'react-hot-toast';

export interface LicenseInfo {
    key: string;
    status: 'active' | 'expired' | 'invalid' | 'none';
    expiry?: string;
    plan: 'standard' | 'premium';
    lastChecked?: string;
}

const STORAGE_KEY = 'COMMODITY_TRADER_LICENSE';

export const LicenseService = {
    getLicense(): LicenseInfo {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { key: '', status: 'none', plan: 'standard' };
        try {
            return JSON.parse(stored);
        } catch {
            return { key: '', status: 'none', plan: 'standard' };
        }
    },

    async verifyLicense(key: string): Promise<LicenseInfo> {
        // MOCK: In real SaaS, this fetches your license server
        // For now, we simulate a check.
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

        const cleanKey = key.trim().toUpperCase();

        if (!cleanKey || cleanKey.length < 5) {
            throw new Error('Invalid license key format');
        }

        // Mock Validation Logic
        // In production, replace this with: 
        // const res = await fetch('https://api.your-saas.com/verify', { method: 'POST', body: JSON.stringify({ key }) });
        
        const isValid = cleanKey.startsWith('CT-') || cleanKey.length >= 8; 
        
        if (isValid) {
            const info: LicenseInfo = {
                key: cleanKey,
                status: 'active',
                plan: cleanKey.includes('PRO') ? 'premium' : 'standard',
                expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year validity
                lastChecked: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
            return info;
        } else {
            throw new Error('License key not recognized');
        }
    },
    
    removeLicense() {
        localStorage.removeItem(STORAGE_KEY);
        toast.success('License removed');
    }
};
