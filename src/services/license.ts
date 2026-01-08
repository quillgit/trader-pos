import { toast } from 'react-hot-toast';
import { getApiUrl } from './api';
import { v4 as uuidv4 } from 'uuid';

export interface LicenseInfo {
    key: string;
    status: 'active' | 'expired' | 'invalid' | 'none';
    expiry?: string;
    plan: 'standard' | 'premium';
    lastChecked?: string;
}

export interface LicenseDevice {
    key: string;
    device_id: string;
    status: 'active' | 'revoked';
    registered_at?: string;
    last_seen?: string;
    user_agent?: string;
    platform?: string;
    ip?: string;
}

const STORAGE_KEY = 'COMMODITY_TRADER_LICENSE';

export const LicenseService = {
    getDeviceId(): string {
        const k = 'COMMODITY_TRADER_DEVICE_ID';
        let id = localStorage.getItem(k);
        if (!id) {
            id = uuidv4();
            localStorage.setItem(k, id);
        }
        return id;
    },
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform || ''
        };
    },
    getLicense(): LicenseInfo {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { key: '', status: 'none', plan: 'standard' };
        try {
            return JSON.parse(stored);
        } catch {
            return { key: '', status: 'none', plan: 'standard' };
        }
    },

    async createLicense(plan: 'standard' | 'premium', expiryDays: number = 365): Promise<LicenseInfo> {
        const baseUrl = getApiUrl();
        if (!baseUrl) throw new Error('API URL not configured');
        
        const key = 'CT-' + uuidv4().substring(0, 8).toUpperCase();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        const expiryIso = expiryDate.toISOString();
        
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'add_license');
        
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, plan, expiry: expiryIso })
        });
        
        if (!response.ok) throw new Error('Failed to create license');
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        
        return {
          key: data.key,
          status: data.status,
          plan: data.plan,
          expiry: data.expiry,
          lastChecked: new Date().toISOString()
        };
    },

    async verifyLicense(key: string): Promise<LicenseInfo> {
        const cleanKey = key.trim();
        if (!cleanKey || cleanKey.length < 5) {
            throw new Error('Invalid license key format');
        }

        const baseUrl = getApiUrl();
        if (!baseUrl) {
            throw new Error('API URL not configured. Set it in Settings.');
        }

        const url = new URL(baseUrl);
        url.searchParams.set('action', 'verify_license');

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: cleanKey })
        });
        if (!response.ok) {
            throw new Error(`License verification failed: ${response.statusText}`);
        }
        const data = await response.json();

        const info: LicenseInfo = {
            key: cleanKey,
            status: (data.status as LicenseInfo['status']) || 'invalid',
            plan: (data.plan as LicenseInfo['plan']) || 'standard',
            expiry: typeof data.expiry === 'string' ? data.expiry : undefined,
            lastChecked: new Date().toISOString()
        };
        if (info.status === 'active') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
            try {
                await this.registerDevice(cleanKey);
            } catch {}
            return info;
        }
        throw new Error(data.message || 'License key not recognized');
    },
    
    removeLicense() {
        localStorage.removeItem(STORAGE_KEY);
        toast.success('License removed');
    },

    async refreshStatus(): Promise<LicenseInfo> {
        const current = this.getLicense();
        if (!current.key) {
            return current;
        }
        const baseUrl = getApiUrl();
        if (!baseUrl || !navigator.onLine) {
            return current;
        }
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'license_status');

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: current.key })
        });
        if (!response.ok) return current;
        const data = await response.json();
        const updated: LicenseInfo = {
            key: current.key,
            status: (data.status as LicenseInfo['status']) || current.status,
            plan: (data.plan as LicenseInfo['plan']) || current.plan,
            expiry: typeof data.expiry === 'string' ? data.expiry : current.expiry,
            lastChecked: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    },

    async registerDevice(key?: string): Promise<boolean> {
        const lic = this.getLicense();
        const lk = key || lic.key;
        const baseUrl = getApiUrl();
        if (!lk || !baseUrl) return false;
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'register_device');
        const payload = { key: lk, device_id: this.getDeviceId(), info: this.getDeviceInfo() };
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) return false;
        const data = await response.json();
        if (data && data.status === 'error') {
            toast.error(data.message || 'Device registration failed');
            return false;
        }
        return true;
    },

    async heartbeat() {
        const lic = this.getLicense();
        const baseUrl = getApiUrl();
        if (!lic.key || !baseUrl) return;
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'heartbeat');
        const payload = { key: lic.key, device_id: this.getDeviceId() };
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) return;
    },

    async listLicense(): Promise<{ license: LicenseInfo | null; devices: LicenseDevice[] }> {
        const lic = this.getLicense();
        const baseUrl = getApiUrl();
        if (!lic.key || !baseUrl) return { license: null, devices: [] };
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'list_license');
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: lic.key })
        });
        if (!response.ok) return { license: lic, devices: [] };
        const data = await response.json();
        const devices: LicenseDevice[] = Array.isArray(data.devices) ? data.devices.map((d: any) => ({
            key: String(d.key || lic.key),
            device_id: String(d.device_id || ''),
            status: String(d.status || 'active') as LicenseDevice['status'],
            registered_at: typeof d.registered_at === 'string' ? d.registered_at : undefined,
            last_seen: typeof d.last_seen === 'string' ? d.last_seen : undefined,
            user_agent: typeof d.user_agent === 'string' ? d.user_agent : undefined,
            platform: typeof d.platform === 'string' ? d.platform : undefined,
            ip: typeof d.ip === 'string' ? d.ip : undefined
        })) : [];
        return { license: data.license || lic, devices };
    },

    async revokeDevice(deviceId: string) {
        const lic = this.getLicense();
        const baseUrl = getApiUrl();
        if (!lic.key || !baseUrl) return;
        const url = new URL(baseUrl);
        url.searchParams.set('action', 'revoke_device');
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: lic.key, device_id: deviceId })
        });
        if (!response.ok) {
            const msg = response.statusText || 'Failed to revoke device';
            toast.error(msg);
            return;
        }
        const data = await response.json();
        if (data && data.status !== 'success') {
            toast.error(data.message || 'Failed to revoke device');
        } else {
            toast.success('Device revoked');
        }
    }
};
