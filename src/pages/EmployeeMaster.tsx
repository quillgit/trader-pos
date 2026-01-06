import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Employee } from '@/types';
import { EmployeeSchema } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, User, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EmployeeMaster() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Employee>>({
        name: '',
        role: 'FIELD',
        pin: '',
        salary_frequency: 'MONTHLY',
        base_salary: 0,
        salary_components: []
    });

    // Helper for adding components
    const addComponent = () => {
        const comps = formData.salary_components || [];
        setFormData({
            ...formData,
            salary_components: [...comps, { name: '', amount: 0, type: 'ALLOWANCE' }]
        });
    };

    const removeComponent = (idx: number) => {
        const comps = [...(formData.salary_components || [])];
        comps.splice(idx, 1);
        setFormData({ ...formData, salary_components: comps });
    };

    const updateComponent = (idx: number, field: string, val: any) => {
        const comps = [...(formData.salary_components || [])];
        (comps[idx] as any)[field] = val;
        setFormData({ ...formData, salary_components: comps });
    };

    const fetchEmployees = async () => {
        const keys = await stores.masters.employees.keys();
        const items: Employee[] = [];
        for (const key of keys) {
            const item = await stores.masters.employees.getItem<Employee>(key);
            if (item) items.push(item);
        }
        setEmployees(items);
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name || !formData.pin || formData.pin.length !== 6) {
            toast.error('Name required. PIN must be 6 digits.');
            return;
        }

        const newEmployee: Employee = {
            id: uuidv4(),
            name: formData.name!,
            role: formData.role as any,
            pin: formData.pin,
            updated_at: new Date().toISOString(),
            salary_frequency: formData.salary_frequency as any || 'MONTHLY',
            base_salary: Number(formData.base_salary) || 0,
            base_salary_method: 'FIXED',
            salary_components: formData.salary_components || []
        };

        const result = EmployeeSchema.safeParse(newEmployee);
        if (!result.success) {
            toast.error('Error: ' + result.error.message);
            return;
        }

        await stores.masters.employees.setItem(newEmployee.id, newEmployee);
        await SyncEngine.addToQueue('employee', 'create', newEmployee);

        await SyncEngine.addToQueue('employee', 'create', newEmployee);

        setFormData({ name: '', role: 'FIELD', pin: '', salary_frequency: 'MONTHLY', base_salary: 0, salary_components: [] });
        setFormOpen(false);
        fetchEmployees();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await stores.masters.employees.removeItem(id);
        fetchEmployees();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Employees</h2>
                <button
                    onClick={() => setFormOpen(!isFormOpen)}
                    className="bg-purple-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-4 rounded-md border shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                className="w-full border rounded px-2 py-1"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Role</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="FINANCE">Finance</option>
                                    <option value="WAREHOUSE">Warehouse</option>
                                    <option value="HR">HR</option>
                                    <option value="FIELD">Field</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">PIN (6 digits)</label>
                                <input
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.pin}
                                    onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Pay Frequency</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.salary_frequency}
                                    onChange={e => setFormData({ ...formData, salary_frequency: e.target.value as any })}
                                >
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Base Salary</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.base_salary}
                                    onChange={e => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Salary Components */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium">Allowances & Deductions</label>
                                <button type="button" onClick={addComponent} className="text-xs bg-gray-100 px-2 py-1 rounded border">
                                    + Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(formData.salary_components || []).map((comp, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            placeholder="Name"
                                            className="flex-1 border rounded px-2 py-1 text-sm"
                                            value={comp.name}
                                            onChange={e => updateComponent(idx, 'name', e.target.value)}
                                        />
                                        <select
                                            className="border rounded px-2 py-1 text-sm bg-white"
                                            value={comp.type}
                                            onChange={e => updateComponent(idx, 'type', e.target.value)}
                                        >
                                            <option value="ALLOWANCE">Allowance (+)</option>
                                            <option value="DEDUCTION">Deduction (-)</option>
                                        </select>
                                        <input
                                            type="number"
                                            className="w-24 border rounded px-2 py-1 text-sm"
                                            value={comp.amount}
                                            onChange={e => updateComponent(idx, 'amount', Number(e.target.value))}
                                        />
                                        <button type="button" onClick={() => removeComponent(idx)} className="text-red-500 hover:text-red-700">
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1 border rounded text-sm">Cancel</button>
                            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white border rounded-md">
                {employees.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No employees yet.</div>
                ) : (
                    <ul className="divide-y">
                        {employees.map(e => (
                            <li key={e.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{e.name}</div>
                                        <div className="text-xs text-gray-500">{e.role} • PIN: ******</div>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600">
                                    <Trash className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
