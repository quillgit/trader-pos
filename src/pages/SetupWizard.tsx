import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { GoogleProvision } from '@/services/googleProvision';
import { api } from '@/services/api';
import { stores } from '@/lib/storage';
import type { Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function SetupWizard() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState(localStorage.getItem('COMPANY_NAME') || '');
    const [companyAddress, setCompanyAddress] = useState(localStorage.getItem('COMPANY_ADDRESS') || '');
    const [companyPhone, setCompanyPhone] = useState(localStorage.getItem('COMPANY_PHONE') || '');

    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const [googleClientId, setGoogleClientId] = useState(envClientId || localStorage.getItem('GOOGLE_OAUTH_CLIENT_ID') || '');
    const isManagedClientId = Boolean(envClientId);
    const [apiUrl, setApiUrl] = useState(localStorage.getItem('OFFLINE_TRADER_API_URL') || '');
    const [isProvisioning, setIsProvisioning] = useState(false);

    const [adminName, setAdminName] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const saveCompanyLocals = () => {
        localStorage.setItem('COMPANY_NAME', companyName || '');
        localStorage.setItem('COMPANY_ADDRESS', companyAddress || '');
        localStorage.setItem('COMPANY_PHONE', companyPhone || '');
    };

    const handleCompanyNext = () => {
        if (!companyName.trim()) {
            toast.error('Company name is required');
            return;
        }
        saveCompanyLocals();
        setStep(2);
    };

    const handleProvision = async () => {
        if (!googleClientId.trim()) {
            toast.error('Google OAuth Client ID is required');
            return;
        }
        setIsProvisioning(true);
        const toastId = toast.loading('Provisioning Google Sheets and Apps Script...');
        try {
            localStorage.setItem('GOOGLE_OAUTH_CLIENT_ID', googleClientId);
            const res = await GoogleProvision.provision(googleClientId, companyName || 'Commodity Trader');
            localStorage.setItem('OFFLINE_TRADER_API_URL', res.url);
            setApiUrl(res.url);
            await api.bootstrap();
            await api.pushSettings({
                'COMPANY_NAME': companyName || 'My Company',
                'COMPANY_ADDRESS': companyAddress || '',
                'COMPANY_PHONE': companyPhone || ''
            });
            toast.success('Provisioning complete', { id: toastId });
            setStep(3);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Provisioning failed';
            toast.error(msg, { id: toastId });
        } finally {
            setIsProvisioning(false);
        }
    };

    const handleCreateAdmin = async () => {
        if (!adminName.trim()) {
            toast.error('Admin name is required');
            return;
        }
        const pin = adminPin.trim();
        if (!/^\d{6}$/.test(pin)) {
            toast.error('PIN must be exactly 6 digits');
            return;
        }
        setIsCreatingUser(true);
        const toastId = toast.loading('Creating admin user...');
        try {
            const id = uuidv4();
            const employee: Employee = {
                id,
                name: adminName.trim(),
                pin,
                role: 'ADMIN',
                salary_frequency: 'MONTHLY',
                base_salary: 0,
                base_salary_method: 'FIXED',
                salary_components: [],
                updated_at: new Date().toISOString()
            };
            await stores.masters.employees.setItem(id, employee);
            try {
                const { SyncEngine } = await import('@/services/sync');
                await SyncEngine.addToQueue('employee', 'create', employee);
            } catch { void 0; }
            toast.success('Admin user created', { id: toastId });
            navigate('/login');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to create user';
            toast.error(msg, { id: toastId });
        } finally {
            setIsCreatingUser(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-4">Setup Wizard</h1>
                <p className="text-sm text-gray-600 mb-6">Configure company profile, backend, and initial admin user.</p>

                <div className="flex items-center justify-between mb-6">
                    <div className={`flex-1 h-1 ${step >= 1 ? 'bg-purple-600' : 'bg-gray-200'} mr-2`} />
                    <div className={`flex-1 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'} mr-2`} />
                    <div className={`flex-1 h-1 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-200'}`} />
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Company Profile</h2>
                        <div>
                            <label className="block text-sm font-medium mb-1">Company Name</label>
                            <input className="w-full border rounded p-2" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <input className="w-full border rounded p-2" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input className="w-full border rounded p-2" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleCompanyNext} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Next</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Google Sheets Setup</h2>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium">Google OAuth Client ID</label>
                                {isManagedClientId && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                        Managed by Platform
                                    </span>
                                )}
                            </div>
                            <input className="w-full border rounded p-2" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} placeholder="xxxxxxxx.apps.googleusercontent.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Apps Script URL</label>
                            <input className="w-full border rounded p-2 font-mono text-xs" value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." />
                            <p className="text-xs text-gray-500 mt-1">Provision automatically or paste an existing Web App URL.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleProvision} disabled={isProvisioning} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
                                {isProvisioning ? 'Provisioning...' : 'Auto-Provision'}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!apiUrl) {
                                        toast.error('Enter Apps Script URL or provision first');
                                        return;
                                    }
                                    localStorage.setItem('OFFLINE_TRADER_API_URL', apiUrl);
                                    try {
                                        await api.bootstrap();
                                        await api.pushSettings({
                                            'COMPANY_NAME': companyName || 'My Company',
                                            'COMPANY_ADDRESS': companyAddress || '',
                                            'COMPANY_PHONE': companyPhone || ''
                                        });
                                        toast.success('Connected to backend');
                                        setStep(3);
                                    } catch (e: unknown) {
                                        const msg = e instanceof Error ? e.message : 'Connection failed';
                                        toast.error(msg);
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Use Existing URL
                            </button>
                            <button onClick={() => setStep(1)} className="ml-auto text-sm text-gray-500 hover:underline">Back</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Create Admin User</h2>
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input className="w-full border rounded p-2" value={adminName} onChange={e => setAdminName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">PIN (6 digits)</label>
                            <input className="w-full border rounded p-2 text-center tracking-widest" value={adminPin} onChange={e => setAdminPin(e.target.value)} maxLength={6} />
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleCreateAdmin} disabled={isCreatingUser} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60">
                                {isCreatingUser ? 'Creating...' : 'Create Admin'}
                            </button>
                            <button onClick={() => setStep(2)} className="ml-auto text-sm text-gray-500 hover:underline">Back</button>
                        </div>
                        <p className="text-xs text-gray-500">After creation you will be redirected to the login page.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
