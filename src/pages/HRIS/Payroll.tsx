import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Employee, Attendance, Expense, Adjustment } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/use-cash-session';
import { v4 as uuidv4 } from 'uuid';
import { SyncEngine } from '@/services/sync';
import toast from 'react-hot-toast';
import type { PayrollComponent, PayrollLine } from '@/types';

function RecordEntryForm({ employeeId, daysPresent, onSaved }: { employeeId: string; daysPresent: number; onSaved: (entry: Adjustment) => void }) {
    const { user } = useAuth();
    const [type, setType] = useState<'ALLOWANCE' | 'DEDUCTION'>('ALLOWANCE');
    const [name, setName] = useState('');
    const [calc, setCalc] = useState<'FIXED' | 'PER_DAY' | 'PER_QUANTITY'>('FIXED');
    const [unitPrice, setUnitPrice] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(0);
    const preview = calc === 'FIXED' ? unitPrice * (quantity || 1) : calc === 'PER_DAY' ? unitPrice * daysPresent : unitPrice * (quantity || 0);
    const save = async () => {
        if (!user) {
            toast.error('Please login');
            return;
        }
        if (!name || unitPrice <= 0) {
            toast.error('Fill name and unit price');
            return;
        }
        const entry: Adjustment = {
            id: uuidv4(),
            date: new Date().toISOString(),
            employee_id: employeeId,
            type,
            name,
            calc,
            unit_price: unitPrice,
            quantity,
            sync_status: 'PENDING',
            created_by: user.id
        };
        await stores.transactions.hr_adjustments.setItem(entry.id, entry);
        await SyncEngine.addToQueue('hr_adjustment', 'create', entry);
        onSaved(entry);
        setName('');
        setCalc('FIXED');
        setUnitPrice(0);
        setQuantity(0);
        toast.success('Entry recorded');
    };
    return (
        <div className="grid grid-cols-6 gap-2 items-end">
            <select className="border rounded p-2" value={type} onChange={e => setType(e.target.value as any)}>
                <option value="ALLOWANCE">Allowance</option>
                <option value="DEDUCTION">Deduction</option>
            </select>
            <input className="border rounded p-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <select className="border rounded p-2" value={calc} onChange={e => setCalc(e.target.value as any)}>
                <option value="FIXED">Fixed</option>
                <option value="PER_DAY">Per Day</option>
                <option value="PER_QUANTITY">Per Quantity</option>
            </select>
            <input type="number" className="border rounded p-2 text-right" placeholder="Unit Price" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value || 0))} />
            <input type="number" className="border rounded p-2 text-right" placeholder={calc === 'PER_QUANTITY' ? 'Quantity' : 'Qty'} value={quantity} onChange={e => setQuantity(Number(e.target.value || 0))} />
            <div className="text-right">
                <div className="text-xs text-gray-500">Preview</div>
                <div className="font-medium">{formatCurrency(preview)}</div>
            </div>
            <div className="col-span-6">
                <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" onClick={save}>Save Entry</button>
            </div>
        </div>
    );
}

export default function PayrollPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const { user } = useAuth();
    const { session, balance, isExpired } = useCashSession();

    // Filters
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
    const [baseMethod, setBaseMethod] = useState<'FIXED' | 'PER_DAY'>('FIXED');
    const [generatedPayroll, setGeneratedPayroll] = useState<any[]>([]);
    const [dailyAllowancePerDay, setDailyAllowancePerDay] = useState<number>(0);
    const [extraAllowances, setExtraAllowances] = useState<Record<string, number>>({});
    const [bonDeductions, setBonDeductions] = useState<Record<string, number>>({});
    const [isPaying, setIsPaying] = useState(false);
    const [selectedEmpForComponents, setSelectedEmpForComponents] = useState<string | null>(null);
    const [dynamicComponents, setDynamicComponents] = useState<Record<string, Array<{
        id: string;
        name: string;
        type: 'ALLOWANCE' | 'DEDUCTION';
        calc: 'FIXED' | 'PER_DAY' | 'PER_QUANTITY';
        unitPrice: number;
        quantity: number;
    }>>>({});
    const [view, setView] = useState<'PROCESSOR' | 'SETUP'>('PROCESSOR');
    const [components, setComponents] = useState<PayrollComponent[]>([]);
    const [componentForm, setComponentForm] = useState<Partial<PayrollComponent>>({
        name: '',
        type: 'ALLOWANCE',
        calculation_method: 'FIXED',
        amount: 0,
        source_key: ''
    } as any);
    const [selectedEmployeeForLines, setSelectedEmployeeForLines] = useState<string>('');
    const [lines, setLines] = useState<PayrollLine[]>([]);
    const [lineForm, setLineForm] = useState<Partial<PayrollLine>>({
        component_id: '',
        amount_override: undefined,
        active: true
    } as any);

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
            const adjKeys = await stores.transactions.hr_adjustments.keys();
            const adjList: Adjustment[] = [];
            for (const k of adjKeys) adjList.push((await stores.transactions.hr_adjustments.getItem<Adjustment>(k))!);
            setAdjustments(adjList);
            const pcKeys = await stores.masters.payroll_components.keys();
            const compList: PayrollComponent[] = [];
            for (const k of pcKeys) compList.push((await stores.masters.payroll_components.getItem<PayrollComponent>(k))!);
            setComponents(compList);
        };
        load();
    }, []);

    useEffect(() => {
        const loadLines = async () => {
            if (!selectedEmployeeForLines) {
                setLines([]);
                return;
            }
            const keys = await stores.masters.payroll_lines.keys();
            const res: PayrollLine[] = [];
            for (const k of keys) {
                const l = await stores.masters.payroll_lines.getItem<PayrollLine>(k);
                if (l && l.employee_id === selectedEmployeeForLines) res.push(l);
            }
            setLines(res);
        };
        loadLines();
    }, [selectedEmployeeForLines]);

    const saveComponent = async () => {
        if (!componentForm.name) {
            toast.error('Component name required');
            return;
        }
        const comp: PayrollComponent = {
            id: uuidv4(),
            name: componentForm.name!,
            type: componentForm.type as any,
            calculation_method: componentForm.calculation_method as any,
            amount: Number(componentForm.amount) || 0,
            source_key: componentForm.source_key || undefined,
            updated_at: new Date().toISOString()
        };
        await stores.masters.payroll_components.setItem(comp.id, comp);
        await SyncEngine.addToQueue('payroll_component', 'create', comp);
        setComponents([...components, comp]);
        setComponentForm({ name: '', type: 'ALLOWANCE', calculation_method: 'FIXED', amount: 0, source_key: '' } as any);
        toast.success('Component saved');
    };

    const deleteComponent = async (id: string) => {
        await stores.masters.payroll_components.removeItem(id);
        setComponents(components.filter(c => c.id !== id));
    };

    const saveLine = async () => {
        if (!selectedEmployeeForLines || !lineForm.component_id) {
            toast.error('Select employee and component');
            return;
        }
        const line: PayrollLine = {
            id: uuidv4(),
            employee_id: selectedEmployeeForLines,
            component_id: lineForm.component_id!,
            amount_override: typeof lineForm.amount_override === 'number' ? lineForm.amount_override : undefined,
            active: lineForm.active !== false,
            updated_at: new Date().toISOString()
        };
        await stores.masters.payroll_lines.setItem(line.id, line);
        await SyncEngine.addToQueue('payroll_line', 'create', line);
        setLines([...lines, line]);
        setLineForm({ component_id: '', amount_override: undefined, active: true } as any);
        toast.success('Line saved');
    };

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

            let basePay = emp.base_salary_method === 'DAILY_RATE' && frequency !== 'MONTHLY'
                ? emp.base_salary * daysPresent
                : emp.base_salary;

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

            // Dynamic components per employee
            const dyn = dynamicComponents[emp.id] || [];
            for (const comp of dyn) {
                let value = 0;
                if (comp.calc === 'FIXED') {
                    value = comp.unitPrice * (comp.quantity || 1);
                } else if (comp.calc === 'PER_DAY') {
                    value = comp.unitPrice * daysPresent;
                } else if (comp.calc === 'PER_QUANTITY') {
                    value = comp.unitPrice * (comp.quantity || 0);
                }
                if (comp.type === 'ALLOWANCE') allowances += value;
                else deductions += value;
            }
            const relevantAdjustments = adjustments.filter(adj => {
                if (adj.employee_id !== emp.id) return false;
                const d = new Date(adj.date);
                if (frequency === 'DAILY') return d.toDateString() === now.toDateString();
                const startOfMonthLocal = new Date(now.getFullYear(), now.getMonth(), 1);
                return d >= startOfMonthLocal;
            });
            for (const adj of relevantAdjustments) {
                let value = 0;
                if (adj.calc === 'FIXED') {
                    value = adj.unit_price * (adj.quantity || 1);
                } else if (adj.calc === 'PER_DAY') {
                    value = adj.unit_price * daysPresent;
                } else if (adj.calc === 'PER_QUANTITY') {
                    value = adj.unit_price * (adj.quantity || 0);
                }
                if (adj.type === 'ALLOWANCE') allowances += value;
                else deductions += value;
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
        <div className="space-y-6 max-w-5xl mx-auto py-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Payroll</h2>
                <div className="flex gap-2">
                    <button
                        className={`px-3 py-1 rounded ${view === 'PROCESSOR' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => setView('PROCESSOR')}
                    >
                        Processor
                    </button>
                    <button
                        className={`px-3 py-1 rounded ${view === 'SETUP' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => setView('SETUP')}
                    >
                        Setup
                    </button>
                </div>
            </div>

            {view === 'PROCESSOR' && (
            <>
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
                    <label className="block text-sm font-medium mb-1">Base Salary Method</label>
                    <select
                        className="border rounded p-2 min-w-[180px]"
                        value={baseMethod}
                        onChange={e => setBaseMethod(e.target.value as any)}
                    >
                        <option value="FIXED">Fixed</option>
                        <option value="PER_DAY">Per Day (attendance based)</option>
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
                                <th className="p-3 text-right">Components</th>
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
                                    <td className="p-3 text-right">
                                        <button
                                            className="text-purple-600 hover:underline"
                                            onClick={() => setSelectedEmpForComponents(p.id)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                    <td className="p-3 text-right font-bold text-lg">{formatCurrency(p.netPay)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {selectedEmpForComponents && (
                        <div className="border-t p-4 bg-gray-50">
                            <h3 className="font-semibold mb-2">Components for {employees.find(e => e.id === selectedEmpForComponents)?.name}</h3>
                            <div className="space-y-2">
                                {(dynamicComponents[selectedEmpForComponents] || []).map((c, idx) => (
                                    <div key={c.id} className="grid grid-cols-7 gap-2 items-center">
                                        <input
                                            type="text"
                                            className="border rounded p-1"
                                            value={c.name}
                                            onChange={e => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list[idx] = { ...list[idx], name: e.target.value };
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        />
                                        <select
                                            className="border rounded p-1"
                                            value={c.type}
                                            onChange={e => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list[idx] = { ...list[idx], type: e.target.value as any };
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        >
                                            <option value="ALLOWANCE">Allowance</option>
                                            <option value="DEDUCTION">Deduction</option>
                                        </select>
                                        <select
                                            className="border rounded p-1"
                                            value={c.calc}
                                            onChange={e => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list[idx] = { ...list[idx], calc: e.target.value as any };
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        >
                                            <option value="FIXED">Fixed</option>
                                            <option value="PER_DAY">Per Day</option>
                                            <option value="PER_QUANTITY">Per Quantity</option>
                                        </select>
                                        <input
                                            type="number"
                                            className="border rounded p-1 text-right"
                                            placeholder="Unit Price"
                                            value={c.unitPrice}
                                            onChange={e => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list[idx] = { ...list[idx], unitPrice: Number(e.target.value || 0) };
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        />
                                        <input
                                            type="number"
                                            className="border rounded p-1 text-right"
                                            placeholder={c.calc === 'PER_QUANTITY' ? 'Quantity' : 'Qty'}
                                            value={c.quantity}
                                            onChange={e => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list[idx] = { ...list[idx], quantity: Number(e.target.value || 0) };
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        />
                                        <div className="text-right text-sm">
                                            {(() => {
                                                const days = (generatedPayroll.find(p => p.id === selectedEmpForComponents)?.daysPresent) || 0;
                                                const val = c.calc === 'FIXED'
                                                    ? c.unitPrice * (c.quantity || 1)
                                                    : c.calc === 'PER_DAY'
                                                        ? c.unitPrice * days
                                                        : c.unitPrice * (c.quantity || 0);
                                                return formatCurrency(val);
                                            })()}
                                        </div>
                                        <button
                                            className="text-red-600 hover:underline"
                                            onClick={() => {
                                                const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                                list.splice(idx, 1);
                                                setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <div>
                                    <button
                                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                                        onClick={() => {
                                            const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                            list.push({
                                                id: uuidv4(),
                                                name: 'tunjangan ambil keong',
                                                type: 'ALLOWANCE',
                                                calc: 'PER_QUANTITY',
                                                unitPrice: 100,
                                                quantity: 0
                                            });
                                            setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                        }}
                                    >
                                        Add Component
                                    </button>
                                    <button
                                        className="ml-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                        onClick={() => {
                                            const list = [...(dynamicComponents[selectedEmpForComponents] || [])];
                                            list.push({
                                                id: uuidv4(),
                                                name: 'Daily Allowance',
                                                type: 'ALLOWANCE',
                                                calc: 'PER_DAY',
                                                unitPrice: 0,
                                                quantity: 0
                                            });
                                            setDynamicComponents({ ...dynamicComponents, [selectedEmpForComponents]: list });
                                        }}
                                    >
                                        Add Per-Day Allowance
                                    </button>
                                    <button
                                        className="ml-2 text-gray-600 hover:underline"
                                        onClick={() => setSelectedEmpForComponents(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                    </div>
                </div>
            )}
            
                    {selectedEmpForComponents && (
                        <div className="border-t p-4">
                            <h3 className="font-semibold mb-2">Record Entry</h3>
                            <RecordEntryForm
                                employeeId={selectedEmpForComponents}
                                daysPresent={(generatedPayroll.find(p => p.id === selectedEmpForComponents)?.daysPresent) || 0}
                                onSaved={(entry) => {
                                    setAdjustments([...adjustments, entry]);
                                }}
                            />
                            <div className="mt-4">
                                <h4 className="font-medium mb-1">Recorded Entries</h4>
                                <ul className="text-sm space-y-1">
                                    {adjustments.filter(a => a.employee_id === selectedEmpForComponents).map(a => {
                                        const days = (generatedPayroll.find(p => p.id === selectedEmpForComponents)?.daysPresent) || 0;
                                        const val = a.calc === 'FIXED' ? a.unit_price * (a.quantity || 1)
                                            : a.calc === 'PER_DAY' ? a.unit_price * days
                                            : a.unit_price * (a.quantity || 0);
                                        return (
                                            <li key={a.id} className="flex justify-between">
                                                <span>{a.type === 'ALLOWANCE' ? '+' : '-'} {a.name} ({a.calc})</span>
                                                <span>{formatCurrency(val)}</span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}
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
            </>
            )}

            {view === 'SETUP' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-md border shadow-sm">
                        <h3 className="text-lg font-semibold mb-2">Payroll Components</h3>
                        <div className="space-y-2">
                            <input className="border rounded p-2 w-full" placeholder="Name" value={componentForm.name as any} onChange={e => setComponentForm({ ...componentForm, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-2">
                                <select className="border rounded p-2" value={componentForm.type as any} onChange={e => setComponentForm({ ...componentForm, type: e.target.value as any })}>
                                    <option value="ALLOWANCE">Allowance</option>
                                    <option value="DEDUCTION">Deduction</option>
                                </select>
                                <select className="border rounded p-2" value={componentForm.calculation_method as any} onChange={e => setComponentForm({ ...componentForm, calculation_method: e.target.value as any })}>
                                    <option value="FIXED">Fixed</option>
                                    <option value="TRANSACTION">Based on Transaction</option>
                                    <option value="ATTENDANCE">Based on Attendance</option>
                                </select>
                            </div>
                            <input type="number" className="border rounded p-2 w-full" placeholder="Amount" value={componentForm.amount as any} onChange={e => setComponentForm({ ...componentForm, amount: Number(e.target.value || 0) })} />
                            <input className="border rounded p-2 w-full" placeholder="Source Key (for transaction-based)" value={componentForm.source_key as any} onChange={e => setComponentForm({ ...componentForm, source_key: e.target.value })} />
                            <button className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700" onClick={saveComponent}>Save Component</button>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-medium mb-1">Existing Components</h4>
                            <ul className="text-sm space-y-1">
                                {components.map(c => (
                                    <li key={c.id} className="flex justify-between">
                                        <span>{c.name} — {c.type} — {c.calculation_method}</span>
                                        <button className="text-red-600 hover:underline" onClick={() => deleteComponent(c.id)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow-sm">
                        <h3 className="text-lg font-semibold mb-2">Employee Payroll Lines</h3>
                        <div className="space-y-2">
                            <select className="border rounded p-2 w-full" value={selectedEmployeeForLines} onChange={e => setSelectedEmployeeForLines(e.target.value)}>
                                <option value="">Select Employee...</option>
                                {employees.map(e => <option value={e.id} key={e.id}>{e.name}</option>)}
                            </select>
                            <select className="border rounded p-2 w-full" value={lineForm.component_id as any} onChange={e => setLineForm({ ...lineForm, component_id: e.target.value })}>
                                <option value="">Select Component...</option>
                                {components.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
                            </select>
                            <input type="number" className="border rounded p-2 w-full" placeholder="Amount Override (optional)" value={lineForm.amount_override as any || ''} onChange={e => setLineForm({ ...lineForm, amount_override: e.target.value ? Number(e.target.value) : undefined })} />
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={lineForm.active !== false} onChange={e => setLineForm({ ...lineForm, active: e.target.checked })} />
                                <span className="text-sm">Active</span>
                            </div>
                            <button className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700" onClick={saveLine}>Add Line</button>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-medium mb-1">Lines for Employee</h4>
                            <ul className="text-sm space-y-1">
                                {lines.map(l => (
                                    <li key={l.id} className="flex justify-between">
                                        <span>{components.find(c => c.id === l.component_id)?.name || l.component_id} {typeof l.amount_override === 'number' ? `— override ${l.amount_override}` : ''} {l.active ? '' : '— inactive'}</span>
                                        <button className="text-red-600 hover:underline" onClick={async () => { await stores.masters.payroll_lines.removeItem(l.id); setLines(lines.filter(x => x.id !== l.id)); }}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
