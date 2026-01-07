import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stores } from '@/lib/storage';
import type { Employee } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { login } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    
    // Magic Setup State
    const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
    const [setupSuccess, setSetupSuccess] = useState(false);

    useEffect(() => {
        // Handle Magic Setup Link
        const setupPayload = searchParams.get('setup');
        if (setupPayload) {
            handleMagicSetup(setupPayload);
        }

        const loadEmployees = async () => {
            const keys = await stores.masters.employees.keys();
            const list: Employee[] = [];
            for (const k of keys) {
                const e = await stores.masters.employees.getItem<Employee>(k);
                if (e) list.push(e);
            }
            setEmployees(list);
        };
        loadEmployees();
    }, [searchParams]);

    const handleMagicSetup = async (payload: string) => {
        setIsAutoConfiguring(true);
        try {
            const configStr = atob(payload);
            const config = JSON.parse(configStr);

            if (config.apiUrl) {
                localStorage.setItem('OFFLINE_TRADER_API_URL', config.apiUrl);
            }
            if (config.companyName) localStorage.setItem('COMPANY_NAME', config.companyName);
            if (config.companyAddress) localStorage.setItem('COMPANY_ADDRESS', config.companyAddress);
            if (config.companyPhone) localStorage.setItem('COMPANY_PHONE', config.companyPhone);

            // Trigger sync to get users immediately
            try {
                 const { SyncEngine } = await import('@/services/sync');
                 await SyncEngine.syncAllDown();
            } catch (e) {
                console.warn('Auto-sync after setup failed, but config saved.');
            }

            setSetupSuccess(true);
            toast.success('Device configured successfully!');
            
            // Clean URL
            setSearchParams({});
            
            // Reload employees
            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            console.error(e);
            toast.error('Invalid setup link');
            setError('Setup link failed. Please configure manually.');
        } finally {
            setIsAutoConfiguring(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) {
            setError('Please select a user');
            return;
        }

        if (emp.pin === pin) {
            login(emp);
            navigate('/');
        } else {
            setError('Invalid PIN');
        }
    };

    // Temporary backdoor for initial setup if no employees exist
    const handleDevLogin = () => {
        if (employees.length === 0) {
            const devUser = { id: 'dev', name: 'Developer', pin: '0000', role: 'ADMIN' } as Employee;
            login(devUser);
            navigate('/');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <div className="flex justify-center mb-6">
                    <img 
                        src="/logo-traderpos.png" 
                        alt="TraderPOS Logo" 
                        className="w-24 h-24 object-contain"
                    />
                </div>
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">TraderPOS</h1>

                {isAutoConfiguring ? (
                    <div className="text-center py-8 space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                        <p className="text-gray-600 font-medium">Configuring device from link...</p>
                        <p className="text-xs text-gray-400">Syncing settings and master data</p>
                    </div>
                ) : setupSuccess ? (
                    <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-bold text-gray-800">Setup Complete!</h3>
                        <p className="text-gray-600">This device is now connected to the store.</p>
                        <p className="text-sm text-gray-500">Reloading application...</p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Select User</label>
                        <select
                            className="w-full border rounded p-2"
                            value={selectedEmployee}
                            onChange={e => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">Select...</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">PIN</label>
                        <input
                            type="password"
                            className="w-full border rounded p-2 text-center tracking-widest text-lg"
                            placeholder="••••"
                            maxLength={6}
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                    <button
                        type="submit"
                        className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700"
                    >
                        Login
                    </button>

                    {employees.length === 0 && (
                        <button type="button" onClick={handleDevLogin} className="w-full text-xs text-gray-400 mt-4 hover:underline">
                            No users? Click for Setup Mode
                        </button>
                    )}
                </form>
                )}
            </div>
        </div>
    );
}
