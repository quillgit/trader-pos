import { useState, useEffect } from 'react';
import { LicenseService, type LicenseInfo } from '@/services/license';
import { Save, CheckCircle, XCircle, Building2, Server, LayoutTemplate, Loader2, Key, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SyncEngine } from '@/services/sync';
import { SyncServiceSQL } from '@/services/SyncServiceSQL';
import { api } from '@/services/api';
import { GoogleProvision } from '@/services/googleProvision';
import QRCode from 'react-qr-code';


export default function Settings() {
    const [apiUrl, setApiUrl] = useState('');
    const [sqlApiUrl, setSqlApiUrl] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [isManagedClientId, setIsManagedClientId] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [showQRCode, setShowQRCode] = useState(false);

    // License State
    const [licenseKey, setLicenseKey] = useState('');
    const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({ key: '', status: 'none', plan: 'standard' });
    const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);

    const [testStatus, setTestStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');
    
    const [activeTab, setActiveTab] = useState<'general' | 'connections' | 'license'>('general');

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
        
        // Load License
        const savedLicense = LicenseService.getLicense();
        setLicenseInfo(savedLicense);
        if (savedLicense.status === 'active') {
            setLicenseKey(savedLicense.key);
        }

        // SaaS Mode: Check environment variable first
        const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (envClientId) {
            setGoogleClientId(envClientId);
            setIsManagedClientId(true);
        } else {
            const gid = localStorage.getItem('GOOGLE_OAUTH_CLIENT_ID');
            if (gid) setGoogleClientId(gid);
        }
    }, []);

    const handleVerifyLicense = async () => {
        setIsVerifyingLicense(true);
        try {
            const info = await LicenseService.verifyLicense(licenseKey);
            setLicenseInfo(info);
            toast.success('License verified successfully!');
        } catch (e: any) {
            toast.error(e.message);
            setLicenseInfo({ ...licenseInfo, status: 'invalid' });
        } finally {
            setIsVerifyingLicense(false);
        }
    };

    const handleRemoveLicense = () => {
        if (window.confirm('Are you sure you want to remove the license?')) {
            LicenseService.removeLicense();
            setLicenseInfo({ key: '', status: 'none', plan: 'standard' });
            setLicenseKey('');
        }
    };


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
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <LayoutTemplate className="w-8 h-8 text-blue-600" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
                    <p className="text-sm text-gray-500">Manage your company details and server connections</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 border-b bg-white sticky top-0 z-10 pt-2">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'general' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    General
                </button>
                <button
                    onClick={() => setActiveTab('connections')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'connections' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Server className="w-4 h-4" />
                    Connections
                </button>
                <button
                    onClick={() => setActiveTab('license')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'license' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Key className="w-4 h-4" />
                    License
                </button>
            </div>

            <div className="min-h-[400px]">
                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            <h3>Company Information</h3>
                        </div>
                        
                        <div className="space-y-4 max-w-lg">
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
                                <textarea
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                    placeholder="123 Market St, City"
                                    rows={3}
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
                )}

                {/* License Tab */}
                {activeTab === 'license' && (
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                            <Key className="w-5 h-5 text-indigo-500" />
                            <h3>Product License</h3>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Key</label>
                                <div className="relative">
                                    <input
                                        className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border font-mono ${licenseInfo.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}
                                        placeholder="CT-XXXX-XXXX-XXXX"
                                        value={licenseKey}
                                        onChange={e => setLicenseKey(e.target.value)}
                                        readOnly={licenseInfo.status === 'active'}
                                    />
                                    {licenseInfo.status === 'active' && (
                                        <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                {licenseInfo.status !== 'active' ? (
                                    <button
                                        onClick={handleVerifyLicense}
                                        disabled={isVerifyingLicense || !licenseKey}
                                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
                                    >
                                        {isVerifyingLicense && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Verify License
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRemoveLicense}
                                        className="px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm"
                                    >
                                        Remove License
                                    </button>
                                )}
                            </div>
                        </div>

                        {licenseInfo.status === 'active' && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-800">License Active</p>
                                    <p className="text-xs text-green-600 mt-1">Plan: <span className="uppercase font-bold">{licenseInfo.plan}</span></p>
                                </div>
                                {licenseInfo.expiry && (
                                    <div className="text-right">
                                        <p className="text-xs text-green-600">Valid until</p>
                                        <p className="text-sm font-medium text-green-800">{new Date(licenseInfo.expiry).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Connections Tab */}
                {activeTab === 'connections' && (
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                            <Server className="w-5 h-5 text-indigo-500" />
                            <h3>Server Sync Configuration</h3>
                        </div>

                        <div className="space-y-6">
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Google OAuth Client ID</label>
                                    {isManagedClientId && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                            Managed by Platform
                                        </span>
                                    )}
                                </div>
                                <input
                                    className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs font-mono p-2.5 border ${isManagedClientId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                                    value={googleClientId}
                                    onChange={e => !isManagedClientId && setGoogleClientId(e.target.value)}
                                    readOnly={isManagedClientId}
                                />
                                {!isManagedClientId && (
                                    <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                                        <p>Used for one-click provisioning of Google Sheets and Apps Script.</p>
                                        <details className="mt-1 cursor-pointer">
                                            <summary className="text-blue-600 hover:text-blue-800">How to get Client ID?</summary>
                                            <ol className="list-decimal ml-4 mt-2 space-y-1">
                                                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a>.</li>
                                                <li>Create a new project.</li>
                                                <li>Enable <strong>Google Drive API</strong> and <strong>Google Apps Script API</strong>.</li>
                                                <li>Configure <strong>OAuth Consent Screen</strong> (External, enter email).</li>
                                                <li>Go to <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth Client ID</strong>.</li>
                                                <li>Application type: <strong>Web application</strong>.</li>
                                                <li>Add Authorized Origin: <code>{window.location.origin}</code></li>
                                                <li>Copy the <strong>Client ID</strong> and paste it here.</li>
                                            </ol>
                                        </details>
                                    </div>
                                )}
                            </div>

                            {/* Share Connection Feature */}
                            {apiUrl && (
                                <div className="pt-4 border-t border-gray-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Share Connection (Multi-Device Setup)</label>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <p className="text-sm text-blue-800 mb-3">
                                            Use this magic link or QR code to instantly connect other devices (Staff/Warehouse) to this database.
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => {
                                                    const config = {
                                                        apiUrl,
                                                        companyName,
                                                        companyAddress,
                                                        companyPhone
                                                    };
                                                    const payload = btoa(JSON.stringify(config));
                                                    const link = `${window.location.origin}/login?setup=${payload}`;
                                                    
                                                    navigator.clipboard.writeText(link);
                                                    toast.success('Setup link copied to clipboard!');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                                            >
                                                <Key className="w-4 h-4" />
                                                Copy Magic Setup Link
                                            </button>
                                            
                                            <button
                                                onClick={() => setShowQRCode(!showQRCode)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                                            >
                                                <QrCode className="w-4 h-4" />
                                                {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                                            </button>
                                        </div>

                                        {showQRCode && (
                                            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center animate-in fade-in zoom-in duration-200">
                                                <div className="bg-white p-2 rounded-lg">
                                                    <QRCode 
                                                        value={`${window.location.origin}/login?setup=${btoa(JSON.stringify({
                                                            apiUrl,
                                                            companyName,
                                                            companyAddress,
                                                            companyPhone
                                                        }))}`}
                                                        size={200}
                                                        level="M"
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2 text-center">Scan with another device to auto-configure</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


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

                            <div className="flex flex-wrap items-center gap-3 pt-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <button
                                    onClick={handleTest}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
                                >
                                    Test Connection
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!apiUrl) {
                                            toast.error('Please enter the Google Apps Script URL first');
                                            return;
                                        }
                                        const toastId = toast.loading('Setting up Google Sheets...');
                                        try {
                                            localStorage.setItem('OFFLINE_TRADER_API_URL', apiUrl);
                                            await api.bootstrap();
                                            await api.pushSettings({
                                                'COMPANY_NAME': companyName || 'My Company',
                                                'COMPANY_ADDRESS': companyAddress || '',
                                                'COMPANY_PHONE': companyPhone || ''
                                            });
                                            await SyncEngine.syncAllDown();
                                            toast.success('Google Sheets setup complete!', { id: toastId });
                                        } catch (e: any) {
                                            toast.error('Setup failed: ' + e.message, { id: toastId });
                                        }
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
                                >
                                    Auto-Setup Sheets
                                </button>
                                
                                <button
                                    onClick={async () => {
                                        if (!googleClientId) {
                                            toast.error('Please enter Google OAuth Client ID');
                                            return;
                                        }
                                        const toastId = toast.loading('Provisioning Apps Script...');
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
                                            await SyncEngine.syncAllDown();
                                            toast.success('Apps Script provisioned!', { id: toastId });
                                        } catch (e: any) {
                                            toast.error('Provisioning failed: ' + e.message, { id: toastId });
                                        }
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors shadow-sm"
                                >
                                    Provision New Script
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
                                    className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors shadow-sm"
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
                )}
            </div>

            <div className="flex justify-end pt-6 border-t bg-gray-50 -mx-4 px-4 pb-8 md:bg-transparent md:border-none md:p-0 md:pb-0">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isLoading ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
}
