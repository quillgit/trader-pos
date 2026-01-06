import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Attendance } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AttendancePage() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const { user: currentUser } = useAuth();
    const [status, setStatus] = useState<'NONE' | 'CHECKED_IN' | 'CHECKED_OUT'>('NONE');

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
                    // Check if it was today? If last log was check in from yesterday, we might force check out?
                    // For now, simple: if last was IN -> we are CHECKED_IN.
                    setStatus(lastLog.type === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT');
                } else {
                    setStatus('CHECKED_OUT');
                }
            }
        };
        load();
    }, [currentUser]);

    const handlePunch = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
        if (!currentUser) return;

        const att: Attendance = {
            id: uuidv4(),
            employee_id: currentUser.id,
            timestamp: new Date().toISOString(),
            type: type,
            sync_status: 'PENDING'
        };

        await stores.transactions.attendance.setItem(att.id, att);
        await SyncEngine.addToQueue('attendance', 'create', att);

        // Update local state
        setAttendances([att, ...attendances]);
        setStatus(type === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT');
    };

    if (!currentUser) return <div>Please Login</div>;

    return (
        <div className="space-y-6 max-w-lg mx-auto py-6">
            <h2 className="text-2xl font-bold">Attendance</h2>

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

            {/* Recent Logs Logs */}
            <div className="bg-white border rounded-md">
                <div className="p-3 border-b bg-gray-50 font-medium text-sm">Recent Activity</div>
                <div className="max-h-60 overflow-auto">
                    {attendances.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No activity recorded.</div>
                    ) : (
                        <ul className="divide-y">
                            {attendances.map(log => (
                                <li key={log.id} className="p-3 text-sm flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${log.type === 'CHECK_IN' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="font-medium text-gray-700">
                                            {/* We might want to show username here if admin view, but this page is mixed */}
                                            {log.employee_id === currentUser.id ? 'You' : 'User ' + log.employee_id.substring(0, 4)}
                                        </span>
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
    );
}
