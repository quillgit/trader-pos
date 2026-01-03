import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle } from 'lucide-react';


export default function Settings() {
    const [apiUrl, setApiUrl] = useState('');
    const [testStatus, setTestStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const url = localStorage.getItem('OFFLINE_TRADER_API_URL');
        if (url) setApiUrl(url);
    }, []);

    const handleSave = () => {
        if (!apiUrl) {
            alert('Please enter a URL');
            return;
        }
        localStorage.setItem('OFFLINE_TRADER_API_URL', apiUrl);
        // Force reload api config?? api.ts reads it dynamically or we need to reload page.
        // Reloading page is safest for now to ensure all listeners update.
        alert('Settings saved. The app will reload.');
        window.location.reload();
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
                if (data.status === 'success') {
                    setTestStatus('SUCCESS');
                    setMessage('Connection successful!');
                } else {
                    setTestStatus('ERROR');
                    setMessage('Connected but script returned error: ' + data.message);
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
        <div className="space-y-6 max-w-lg mx-auto py-6">
            <h2 className="text-2xl font-bold">Settings</h2>

            <div className="bg-white p-6 rounded-md border shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Google Apps Script Web App URL</label>
                    <input
                        className="w-full border rounded p-2 text-sm font-mono"
                        placeholder="https://script.google.com/macros/s/..."
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Deploy your Google Apps Script as a Web App (Exec as Me, Access: Anyone) and paste the URL here.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleTest}
                        className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
                    >
                        Test Connection
                    </button>

                    {testStatus === 'SUCCESS' && <div className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {message}</div>}
                    {testStatus === 'ERROR' && <div className="text-red-600 text-sm flex items-center gap-1"><XCircle className="w-4 h-4" /> {message}</div>}
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                        <Save className="w-4 h-4" />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
