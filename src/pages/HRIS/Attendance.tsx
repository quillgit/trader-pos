import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Attendance, Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const { user: currentUser } = useAuth();
    const [status, setStatus] = useState<'NONE' | 'CHECKED_IN' | 'CHECKED_OUT'>('NONE');

    // Admin Mode
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');

    useEffect(() => {
        const load = async () => {
            if (currentUser) {
                // Load Logs
                const keys = await stores.transactions.attendance.keys();
                const logs: Attendance[] = [];
                let lastLog: Attendance | null = null;

                for (const k of keys) {
                    const log = await stores.transactions.attendance.getItem<Attendance>(k);
                    if (log) {
                        logs.push(log);
                        if (log.employee_id === currentUser.id) {
                            if (!lastLog || new Date(log.timestamp) > new Date(lastLog.timestamp)) {
                                lastLog = log;
                            }
                        }
                    }
                }

                // Sort by new
                logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setAttendances(logs);

                // Determine logging status based on last log
                if (lastLog) {
                    setStatus(lastLog.type === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT');
                } else {
                    setStatus('CHECKED_OUT');
                }

                // Load Employees for Admin
                if (['ADMIN', 'HR'].includes(currentUser.role)) {
                    const empKeys = await stores.masters.employees.keys();
                    const empList: Employee[] = [];
                    for (const k of empKeys) {
                        const e = await stores.masters.employees.getItem<Employee>(k);
                        if (e) empList.push(e);
                    }
                    setEmployees(empList);
                }
            }
        };
        load();
    }, [currentUser, isAdminMode]); // Reload when mode toggles to ensure fresh data

    const handlePunch = async (type: 'CHECK_IN' | 'CHECK_OUT', employeeId?: string, customTime?: string) => {
        const targetId = employeeId || currentUser?.id;
        if (!targetId) return;

        const timestamp = customTime || new Date().toISOString();

        const att: Attendance = {
            id: uuidv4(),
            employee_id: targetId,
            timestamp: timestamp,
            type: type,
            sync_status: 'PENDING'
        };

        await stores.transactions.attendance.setItem(att.id, att);
        await SyncEngine.addToQueue('attendance', 'create', att);

        // Update local state
        setAttendances(prev => [att, ...prev]);
        
        if (targetId === currentUser?.id) {
            setStatus(type === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT');
        }
        
        toast.success(`${type === 'CHECK_IN' ? 'Check In' : 'Check Out'} recorded`);
    };

    if (!currentUser) return <div>Please Login</div>;

    const canManage = ['ADMIN', 'HR'].includes(currentUser.role);

    // Filter for Admin View
    const filteredAttendances = attendances.filter(a => {
        const matchesDate = a.timestamp.startsWith(selectedDate);
        const matchesEmp = selectedEmployee === 'ALL' || a.employee_id === selectedEmployee;
        return matchesDate && matchesEmp;
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Attendance</h2>
                {canManage && (
                    <button
                        onClick={() => setIsAdminMode(!isAdminMode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isAdminMode 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {isAdminMode ? 'Exit Admin Mode' : 'Manage Team'}
                    </button>
                )}
            </div>

            {isAdminMode ? (
                // --- ADMIN VIEW ---
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="border rounded-md p-2 w-40"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                            <select 
                                value={selectedEmployee}
                                onChange={e => setSelectedEmployee(e.target.value)}
                                className="border rounded-md p-2 w-48"
                            >
                                <option value="ALL">All Employees</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Team Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employees
                            .filter(e => selectedEmployee === 'ALL' || e.id === selectedEmployee)
                            .map(emp => {
                                // Find logs for this employee on selected date
                                const empLogs = filteredAttendances
                                    .filter(a => a.employee_id === emp.id)
                                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                
                                const firstIn = empLogs.find(l => l.type === 'CHECK_IN');
                                const lastOut = empLogs.reverse().find(l => l.type === 'CHECK_OUT'); // Reverse to find last
                                const isPresent = !!firstIn;
                                const isComplete = !!firstIn && !!lastOut && new Date(lastOut.timestamp) > new Date(firstIn.timestamp);

                                return (
                                    <div key={emp.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{emp.name}</h3>
                                                <div className="text-xs text-gray-500">{emp.role}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                isComplete ? 'bg-gray-100 text-gray-600' :
                                                isPresent ? 'bg-green-100 text-green-700' : 
                                                'bg-red-50 text-red-500'
                                            }`}>
                                                {isComplete ? 'COMPLETED' : isPresent ? 'PRESENT' : 'ABSENT'}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                                            <div className="flex justify-between">
                                                <span>In:</span>
                                                <span className="font-mono">{firstIn ? new Date(firstIn.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Out:</span>
                                                <span className="font-mono">{lastOut ? new Date(lastOut.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    const time = prompt('Enter Check-IN time (HH:MM)', '08:00');
                                                    if (time) handlePunch('CHECK_IN', emp.id, `${selectedDate}T${time}:00`);
                                                }}
                                                className="flex-1 bg-green-50 text-green-700 border border-green-200 py-1 rounded text-xs font-bold hover:bg-green-100"
                                            >
                                                + IN
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const time = prompt('Enter Check-OUT time (HH:MM)', '17:00');
                                                    if (time) handlePunch('CHECK_OUT', emp.id, `${selectedDate}T${time}:00`);
                                                }}
                                                className="flex-1 bg-red-50 text-red-700 border border-red-200 py-1 rounded text-xs font-bold hover:bg-red-100"
                                            >
                                                + OUT
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ) : (
                // --- USER SELF VIEW ---
                <div className="space-y-6 max-w-lg mx-auto">
                    <div className="bg-white p-6 rounded-md border shadow-sm text-center space-y-4">
                        <div className="text-lg font-medium text-gray-600">
                            Hello, <span className="text-black">{currentUser.name}</span>
                        </div>

                        <div className="text-4xl font-bold font-mono my-4">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => handlePunch('CHECK_IN')}
                                disabled={status === 'CHECKED_IN'}
                                className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-green-200 transition-all font-bold"
                            >
                                <Clock className="w-8 h-8 mb-1" />
                                CHECK IN
                            </button>

                            <button
                                onClick={() => handlePunch('CHECK_OUT')}
                                disabled={status === 'CHECKED_OUT'}
                                className="flex flex-col items-center justify-center w-32 h-32 rounded-full bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-red-200 transition-all font-bold"
                            >
                                <CheckCircle className="w-8 h-8 mb-1" />
                                CHECK OUT
                            </button>
                        </div>

                        <div className="text-sm text-gray-500 mt-2">
                            Status: <span className="font-medium text-gray-900">{status.replace('_', ' ')}</span>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    <div className="bg-white border rounded-md">
                        <div className="p-3 border-b bg-gray-50 font-medium text-sm">Recent Activity</div>
                        <div className="max-h-60 overflow-auto">
                            {attendances.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm">No activity recorded.</div>
                            ) : (
                                <ul className="divide-y">
                                    {attendances.filter(a => a.employee_id === currentUser.id).map(log => (
                                        <li key={log.id} className="p-3 text-sm flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${log.type === 'CHECK_IN' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className="font-medium text-gray-700">You</span>
                                                <span className="text-gray-500">{log.type.replace('_', ' ')}</span>
                                            </div>
                                            <div className="text-gray-400 font-mono text-xs">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
