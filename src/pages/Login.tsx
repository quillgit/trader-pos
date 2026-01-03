import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stores } from '@/lib/storage';
import type { Employee } from '@/types';
import { Lock } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const loadEmployees = async () => {
            const keys = await stores.masters.employees.keys();
            const list: Employee[] = [];
            for (const k of keys) {
                const e = await stores.masters.employees.getItem<Employee>(k);
                if (e) list.push(e);
            }
            setEmployees(list);

            // If only one employee and it's default admin, maybe select it?
            // Or if no employees exist yet, we might need a default setup flow.
        };
        loadEmployees();
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) {
            setError('Please select a user');
            return;
        }

        if (emp.pin === pin) {
            localStorage.setItem('commodity_user', JSON.stringify(emp));
            navigate('/');
        } else {
            setError('Invalid PIN');
        }
    };

    // Temporary backdoor for initial setup if no employees exist
    const handleDevLogin = () => {
        if (employees.length === 0) {
            const devUser = { id: 'dev', name: 'Developer', pin: '0000', role: 'ADMIN' };
            localStorage.setItem('commodity_user', JSON.stringify(devUser));
            navigate('/');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <div className="flex justify-center mb-6">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <Lock className="w-8 h-8" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Commodity Trader</h1>

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
            </div>
        </div>
    );
}
