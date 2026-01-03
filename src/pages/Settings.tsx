import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Building2, Server, LayoutTemplate, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SyncEngine } from '@/services/sync';
import { SyncServiceSQL } from '@/services/SyncServiceSQL';
import { api } from '@/services/api';


export default function Settings() {
    const [apiUrl, setApiUrl] = useState('');
    const [sqlApiUrl, setSqlApiUrl] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [testStatus, setTestStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const url = localStorage.getItem('OFFLINE_TRADER_API_URL');
        if (url) setApiUrl(url);

        const sqlUrl = localStorage.getItem('SQL_API_URL');
        if (sqlUrl) setSqlApiUrl(sqlUrl);

        const storedName = localStorage.getItem('COMPANY_NAME');
        if (storedName) setCompanyName(storedName);

        const storedAddress = localStorage.getItem('COMPANY_ADDRESS');
        if (storedAddress) setCompanyAddress(storedAddress);

        const storedPhone = localStorage.getItem('COMPANY_PHONE');
        if (storedPhone) setCompanyPhone(storedPhone);
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        const toastId = toast.loading('Saving settings...');

        // Save Company Info Locally
        localStorage.setItem('COMPANY_NAME', companyName);
        localStorage.setItem('COMPANY_ADDRESS', companyAddress);
        localStorage.setItem('COMPANY_PHONE', companyPhone);

        if (!apiUrl) {
            // Allow saving company info without API URL if they just want offline
            toast.success('Settings saved (Offline Mode).', { id: toastId });
            setTimeout(() => window.location.reload(), 1000);
            return;
        }

        localStorage.setItem('OFFLINE_TRADER_API_URL', apiUrl);
        localStorage.setItem('SQL_API_URL', sqlApiUrl);
        
        setMessage('Syncing settings to cloud...');
        setTestStatus('IDLE');

        try {
            // 1. Push Settings Up
            await api.pushSettings({
                'COMPANY_NAME': companyName,
                'COMPANY_ADDRESS': companyAddress,
                'COMPANY_PHONE': companyPhone
            });

            // 2. Pull Everything Down
            setMessage('Syncing master data...');
            await SyncEngine.syncAllDown();
            
            toast.success('Settings saved and synced with cloud!', { id: toastId });
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
             console.error(e);
             toast.error('Saved locally but cloud sync failed: ' + e.message, { id: toastId });
             // We reload anyway to ensure settings take effect
             setTimeout(() => window.location.reload(), 2000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setTestStatus('IDLE');
        setMessage('Pinging...');

        try {
            // We'll try to fetch masters/product just to see if it connects
            // Note: This relies on the API service using the localStorage URL
            localStorage.setItem('OFFLINE_TRADER_API_URL', apiUrl); // Save temp for test

            // We use a direct fetch here to control error handling better or use api service
            const response = await fetch(`${apiUrl}?action=getMaster&type=product`);

            if (response.ok) {
                const data = await response.json();
                // Check if array (successful list) or object with status
                if (Array.isArray(data) || data.status === 'success') {
                    setTestStatus('SUCCESS');
                    setMessage('Connection successful!');
                } else {
                    setTestStatus('ERROR');
                    setMessage('Connected but script returned error: ' + (data.message || 'Unknown error'));
                }
            } else {
                setTestStatus('ERROR');
                setMessage('HTTP Error: ' + response.statusText);
            }
        } catch (e: any) {
            setTestStatus('ERROR');
            setMessage('Connection failed: ' + e.message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center gap-3 border-b pb-4">
                <LayoutTemplate className="w-8 h-8 text-blue-600" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
                    <p className="text-sm text-gray-500">Manage your company details and server connections</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Company Information Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                        <h3>Company Information</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                placeholder="e.g. AgriTrade Co."
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                placeholder="123 Market St, City"
                                value={companyAddress}
                                onChange={e => setCompanyAddress(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                placeholder="+1 234 567 890"
                                value={companyPhone}
                                onChange={e => setCompanyPhone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Server Configuration Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        <h3>Server Sync</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Apps Script URL</label>
                            <input
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs font-mono p-2.5 border"
                                placeholder="https://script.google.com/macros/s/..."
                                value={apiUrl}
                                onChange={e => setApiUrl(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                Deploy your Google Apps Script as a Web App (Exec as Me, Access: Anyone) and paste the URL here.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SQL Backend URL (MariaDB)</label>
                            <input
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs font-mono p-2.5 border"
                                placeholder="https://api.yourdomain.com/v1"
                                value={sqlApiUrl}
                                onChange={e => setSqlApiUrl(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                URL for the self-hosted MariaDB backend. Leave empty if using Google Sheets.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                            <button
                                onClick={handleTest}
                                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
                            >
                                Test Connection
                            </button>

                            <button
                                onClick={async () => {
                                    const toastId = toast.loading('Syncing data...');
                                    try {
                                        let synced = false;
                                        if (apiUrl) {
                                            await SyncEngine.processQueue(); // Push
                                            await SyncEngine.syncAllDown(); // Pull
                                            synced = true;
                                        }
                                        if (sqlApiUrl) {
                                            await SyncServiceSQL.sync();
                                            synced = true;
                                        }
                                        
                                        if (!synced) {
                                            throw new Error('No API URL configured');
                                        }

                                        toast.success('Sync complete!', { id: toastId });
                                    } catch (e: any) {
                                        toast.error('Sync failed: ' + e.message, { id: toastId });
                                    }
                                }}
                                className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors"
                            >
                                Sync Now
                            </button>

                            {testStatus === 'SUCCESS' && (
                                <div className="text-green-600 text-sm flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                    <CheckCircle className="w-4 h-4" /> {message}
                                </div>
                            )}
                            {testStatus === 'ERROR' && (
                                <div className="text-red-600 text-sm flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                                    <XCircle className="w-4 h-4" /> {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isLoading ? 'Saving...' : 'Save & Apply Changes'}
                </button>
            </div>
        </div>
    );
}
