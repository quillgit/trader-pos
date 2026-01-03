import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Employee, Attendance } from '@/types';
import { Calculator } from 'lucide-react';

export default function PayrollPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendances, setAttendances] = useState<Attendance[]>([]);

    // Filters
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
    const [generatedPayroll, setGeneratedPayroll] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            // Employees
            const eKeys = await stores.masters.employees.keys();
            const eList: Employee[] = [];
            for (const k of eKeys) eList.push((await stores.masters.employees.getItem<Employee>(k))!);
            setEmployees(eList);

            // Attendance
            const aKeys = await stores.transactions.attendance.keys();
            const aList: Attendance[] = [];
            for (const k of aKeys) aList.push((await stores.transactions.attendance.getItem<Attendance>(k))!);
            setAttendances(aList);
        };
        load();
    }, []);

    const generate = () => {
        // Filter employees by frequency
        const targetEmployees = employees.filter(e => e.salary_frequency === frequency);

        // Simple logic: Assume we are generating for "Current Period" (e.g. this month or today)
        // For production, we need Start/End Date pickers.
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);


        const payrolls = targetEmployees.map(emp => {
            let daysPresent = 0;

            // Count unique days present
            // Naive logic: if any CHECK_IN exists on a day, count as present
            const empLogs = attendances.filter(a => a.employee_id === emp.id && a.type === 'CHECK_IN');

            // Filter logs by date range based on frequency
            // Daily = logs from today
            // Monthly = logs from start of month
            // Weekly = logs from start of week (skipped logic for brevity, using monthly/daily)

            const relevantLogs = empLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                if (frequency === 'DAILY') {
                    // Check if same day
                    return logDate.toDateString() === new Date().toDateString();
                } else {
                    return logDate >= startOfMonth;
                }
            });

            // Unique days
            const uniqueDays = new Set(relevantLogs.map(l => new Date(l.timestamp).toDateString()));
            daysPresent = uniqueDays.size;

            // Calculate Base Pay
            let basePay = 0;
            if (frequency === 'DAILY') {
                basePay = emp.base_salary * daysPresent; // Daily Rate * Days
            } else if (frequency === 'WEEKLY') {
                basePay = emp.base_salary; // Weekly Fixed? Or Weekly Rate * Days? Assuming Fixed for now
            } else {
                basePay = emp.base_salary; // Monthly Fixed
            }

            // Components
            let allowances = 0;
            let deductions = 0;

            if (emp.salary_components) {
                emp.salary_components.forEach(c => {
                    if (c.type === 'ALLOWANCE') allowances += c.amount;
                    if (c.type === 'DEDUCTION') deductions += c.amount;
                });
            }

            const netPay = basePay + allowances - deductions;

            return {
                id: emp.id,
                name: emp.name,
                daysPresent,
                basePay,
                allowances,
                deductions,
                netPay
            };
        });

        setGeneratedPayroll(payrolls);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6">
            <h2 className="text-2xl font-bold">Payroll Processor</h2>

            <div className="bg-white p-4 rounded-md border shadow-sm flex items-end gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Frequency</label>
                    <select
                        className="border rounded p-2 min-w-[150px]"
                        value={frequency}
                        onChange={e => setFrequency(e.target.value as any)}
                    >
                        <option value="DAILY">Daily Wages</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly Salary</option>
                    </select>
                </div>

                <button
                    onClick={generate}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                    <Calculator className="w-4 h-4" />
                    Generate
                </button>
            </div>

            {/* Results Table */}
            {generatedPayroll.length > 0 && (
                <div className="bg-white border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 font-medium">
                            <tr>
                                <th className="p-3">Employee</th>
                                <th className="p-3 text-right">Attendance (Days)</th>
                                <th className="p-3 text-right">Base Pay</th>
                                <th className="p-3 text-right text-green-600">Allowances</th>
                                <th className="p-3 text-right text-red-600">Deductions</th>
                                <th className="p-3 text-right font-bold">Net Pay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {generatedPayroll.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3 text-right">{p.daysPresent}</td>
                                    <td className="p-3 text-right">{p.basePay.toLocaleString()}</td>
                                    <td className="p-3 text-right text-green-600">+{p.allowances.toLocaleString()}</td>
                                    <td className="p-3 text-right text-red-600">-{p.deductions.toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold text-lg">{p.netPay.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
