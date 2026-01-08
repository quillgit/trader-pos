import { useState, useEffect } from 'react';
import { LicenseService } from '@/services/license';
import { 
    ShieldCheck, Plus, Copy, RefreshCw, LogOut, 
    CheckCircle, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    onAuth, signInWithGoogle, signOutAdmin, 
    saveLicenseRecord, getAllLicenses 
} from '@/services/firebase';

export default function AdminLicenses() {
    const [adminUser, setAdminUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [licenses, setLicenses] = useState<any[]>([]);
    
    // Generation State
    const [genPlan, setGenPlan] = useState<'standard' | 'premium'>('standard');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedKey, setGeneratedKey] = useState('');

    useEffect(() => {
        const unsubscribe = onAuth(user => {
            setAdminUser(user);
            setIsLoading(false);
            if (user) {
                fetchLicenses();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchLicenses = async () => {
        try {
            const data = await getAllLicenses();
            setLicenses(data);
        } catch (error: any) {
            console.error('Failed to fetch licenses:', error);
            if (error.code === 'permission-denied') {
                toast.error('Access denied. You are not an admin.');
            } else {
                toast.error('Failed to load licenses');
            }
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // 1. Create locally to get a key format
            const newLic = await LicenseService.createLicense(genPlan);
            
            // 2. Save to Firebase (this is the source of truth for the admin)
            const record = {
                status: newLic.status,
                plan: newLic.plan,
                expiry: newLic.expiry || '',
                maxDevices: newLic.plan === 'premium' ? 5 : 3,
                created_at: new Date().toISOString()
            };
            
            await saveLicenseRecord(newLic.key, record);
            
            setGeneratedKey(newLic.key);
            toast.success('License generated & saved!');
            fetchLicenses(); // Refresh list
        } catch (e: any) {
            toast.error(e.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!adminUser) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
                <ShieldCheck className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Admin Access Required</h2>
                <p className="text-gray-500 mb-6">Sign in to manage licenses.</p>
                <button
                    onClick={() => signInWithGoogle()}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                        License Management
                    </h1>
                    <p className="text-gray-500 mt-1">Create and monitor active licenses</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        {adminUser.email}
                    </span>
                    <button
                        onClick={() => signOutAdmin()}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Generator Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Generate New License
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                                <select 
                                    value={genPlan}
                                    onChange={(e) => setGenPlan(e.target.value as any)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="standard">Standard Plan</option>
                                    <option value="premium">Premium Plan</option>
                                </select>
                            </div>

                            <button
                                disabled={isGenerating}
                                onClick={handleGenerate}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                {isGenerating ? (
                                    <>Processing...</>
                                ) : (
                                    <>Generate License</>
                                )}
                            </button>
                        </div>

                        {generatedKey && (
                            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-semibold text-green-800 mb-2 uppercase tracking-wider">New License Key</p>
                                <div className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                                    <code className="text-sm font-mono font-bold text-gray-800 select-all">
                                        {generatedKey}
                                    </code>
                                    <button 
                                        onClick={() => copyToClipboard(generatedKey)}
                                        className="text-gray-400 hover:text-green-600 p-1"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-green-600 mt-2">
                                    Share this key with the user.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* List Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-semibold text-gray-800">All Licenses</h3>
                            <button 
                                onClick={fetchLicenses}
                                className="text-gray-500 hover:text-indigo-600 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Key</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Expiry</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {licenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                No licenses found.
                                            </td>
                                        </tr>
                                    ) : (
                                        licenses.map((lic) => (
                                            <tr key={lic.key} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-gray-700">
                                                    {lic.key}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        lic.plan === 'premium' 
                                                            ? 'bg-purple-100 text-purple-700' 
                                                            : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {lic.plan}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {lic.status === 'active' ? (
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                                        )}
                                                        <span className={`text-xs font-medium ${
                                                            lic.status === 'active' ? 'text-green-700' : 'text-amber-700'
                                                        }`}>
                                                            {lic.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {lic.expiry ? new Date(lic.expiry).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button 
                                                        onClick={() => copyToClipboard(lic.key)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium hover:underline"
                                                    >
                                                        Copy Key
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
