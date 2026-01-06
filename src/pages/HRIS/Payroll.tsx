import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Employee, Attendance, Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/use-cash-session';
import { v4 as uuidv4 } from 'uuid';
import { SyncEngine } from '@/services/sync';
import toast from 'react-hot-toast';

export default function PayrollPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const { user } = useAuth();
    const { session, balance, isExpired } = useCashSession();

    // Filters
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
    const [generatedPayroll, setGeneratedPayroll] = useState<any[]>([]);
    const [dailyAllowancePerDay, setDailyAllowancePerDay] = useState<number>(0);
    const [extraAllowances, setExtraAllowances] = useState<Record<string, number>>({});
    const [bonDeductions, setBonDeductions] = useState<Record<string, number>>({});
    const [isPaying, setIsPaying] = useState(false);

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

            // Daily allowance (premi) based on attendance days
            const dailyPremi = dailyAllowancePerDay > 0 ? dailyAllowancePerDay * daysPresent : 0;
            allowances += dailyPremi + (extraAllowances[emp.id] || 0);
            deductions += bonDeductions[emp.id] || 0;

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

    const paySalaries = async () => {
        if (!user) {
            toast.error('Please login');
            return;
        }
        if (generatedPayroll.length === 0) {
            toast.error('Generate payroll first');
            return;
        }
        // For CASH payments, require active cash session and enough balance
        if (!session || isExpired) {
            toast.error('No active cash session or session expired');
            return;
        }
        const totalToPay = generatedPayroll.reduce((sum, p) => sum + (p.netPay || 0), 0);
        if (totalToPay > balance) {
            toast.error('Insufficient cash in current session');
            return;
        }

        setIsPaying(true);
        const nowIso = new Date().toISOString();
        try {
            for (const p of generatedPayroll) {
                const expense: Expense = {
                    id: uuidv4(),
                    date: nowIso,
                    amount: Number(p.netPay) || 0,
                    currency: 'IDR',
                    category: 'SALARY',
                    description: `Salary payment (${frequency.toLowerCase()}) for ${p.name} - days ${p.daysPresent}`,
                    created_by: user.id,
                    cash_session_id: session?.id
                };
                await stores.transactions.expenses.setItem(expense.id, expense);
                await SyncEngine.addToQueue('expense', 'create', expense);
            }
            toast.success('Salaries recorded as expenses');
            setGeneratedPayroll([]);
            setExtraAllowances({});
            setBonDeductions({});
        } catch (e) {
            console.error(e);
            toast.error('Failed to record salaries');
        } finally {
            setIsPaying(false);
        }
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
                <div>
                    <label className="block text-sm font-medium mb-1">Daily Allowance per Day</label>
                    <input
                        type="number"
                        className="border rounded p-2 min-w-[150px]"
                        value={dailyAllowancePerDay}
                        onChange={e => setDailyAllowancePerDay(Number(e.target.value || 0))}
                    />
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
                                <th className="p-3 text-right">Extra Allowance</th>
                                <th className="p-3 text-right text-red-600">Deductions</th>
                                <th className="p-3 text-right">Bon Deduction</th>
                                <th className="p-3 text-right font-bold">Net Pay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {generatedPayroll.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3 text-right">{p.daysPresent}</td>
                                    <td className="p-3 text-right">{formatCurrency(p.basePay)}</td>
                                    <td className="p-3 text-right text-green-600">+{formatCurrency(p.allowances)}</td>
                                    <td className="p-3 text-right">
                                        <input
                                            type="number"
                                            className="border rounded p-1 w-28 text-right"
                                            value={extraAllowances[p.id] || 0}
                                            onChange={e => setExtraAllowances({ ...extraAllowances, [p.id]: Number(e.target.value || 0) })}
                                        />
                                    </td>
                                    <td className="p-3 text-right text-red-600">-{formatCurrency(p.deductions)}</td>
                                    <td className="p-3 text-right">
                                        <input
                                            type="number"
                                            className="border rounded p-1 w-28 text-right"
                                            value={bonDeductions[p.id] || 0}
                                            onChange={e => setBonDeductions({ ...bonDeductions, [p.id]: Number(e.target.value || 0) })}
                                        />
                                    </td>
                                    <td className="p-3 text-right font-bold text-lg">{formatCurrency(p.netPay)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 flex justify-end">
                        <button
                            onClick={paySalaries}
                            disabled={isPaying}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            <Wallet className="w-4 h-4" />
                            {isPaying ? 'Recording...' : 'Pay Salaries (Record as Expense)'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
