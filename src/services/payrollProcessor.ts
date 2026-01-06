import { stores } from '@/lib/storage';
import type { Employee, PayrollLine, PayrollComponent, Attendance, Transaction, Expense } from '@/types';

type DateRange = { start: string; end: string };

type TransactionResolver = (employeeId: string, range: DateRange, component: PayrollComponent) => Promise<number>;

export class PayrollProcessor {
  async resolveTransactionDefault(employeeId: string, range: DateRange, component: PayrollComponent): Promise<number> {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const inRange = (d: string) => {
      const x = new Date(d);
      return x >= start && x <= end;
    };
    const key = component.source_key || '';
    if (!key) return 0;
    if (key === 'SALES_TOTAL') {
      let sum = 0;
      const keys = await stores.transactions.sales.keys();
      for (const k of keys) {
        const t = await stores.transactions.sales.getItem<Transaction>(k);
        if (!t) continue;
        if (t.created_by !== employeeId) continue;
        if (!inRange(t.date)) continue;
        sum += t.total_amount || 0;
      }
      return sum;
    }
    if (key === 'SALES_TOTAL_RATE') {
      let base = 0;
      const keys = await stores.transactions.sales.keys();
      for (const k of keys) {
        const t = await stores.transactions.sales.getItem<Transaction>(k);
        if (!t) continue;
        if (t.created_by !== employeeId) continue;
        if (!inRange(t.date)) continue;
        base += t.total_amount || 0;
      }
      return base * (component.amount || 0);
    }
    if (key === 'PURCHASES_TOTAL') {
      let sum = 0;
      const keys = await stores.transactions.purchases.keys();
      for (const k of keys) {
        const t = await stores.transactions.purchases.getItem<Transaction>(k);
        if (!t) continue;
        if (t.created_by !== employeeId) continue;
        if (!inRange(t.date)) continue;
        sum += t.total_amount || 0;
      }
      return sum;
    }
    if (key === 'PURCHASES_TOTAL_RATE') {
      let base = 0;
      const keys = await stores.transactions.purchases.keys();
      for (const k of keys) {
        const t = await stores.transactions.purchases.getItem<Transaction>(k);
        if (!t) continue;
        if (t.created_by !== employeeId) continue;
        if (!inRange(t.date)) continue;
        base += t.total_amount || 0;
      }
      return base * (component.amount || 0);
    }
    if (key.startsWith('EXPENSES_CATEGORY:')) {
      const cat = key.split(':')[1];
      let sum = 0;
      const keys = await stores.transactions.expenses.keys();
      for (const k of keys) {
        const e = await stores.transactions.expenses.getItem<Expense>(k);
        if (!e) continue;
        if (e.created_by !== employeeId) continue;
        if (!inRange(e.date)) continue;
        if ((e as any).category === cat) sum += e.amount || 0;
      }
      return sum;
    }
    return 0;
  }
  async getEmployee(id: string): Promise<Employee | null> {
    const keys = await stores.masters.employees.keys();
    for (const k of keys) {
      const e = await stores.masters.employees.getItem<Employee>(k);
      if (e && e.id === id) return e;
    }
    return null;
  }

  async getLines(employeeId: string): Promise<PayrollLine[]> {
    const keys = await stores.masters.payroll_lines.keys();
    const res: PayrollLine[] = [];
    for (const k of keys) {
      const l = await stores.masters.payroll_lines.getItem<PayrollLine>(k);
      if (l && l.employee_id === employeeId && l.active) res.push(l);
    }
    return res;
  }

  async getComponent(id: string): Promise<PayrollComponent | null> {
    const keys = await stores.masters.payroll_components.keys();
    for (const k of keys) {
      const c = await stores.masters.payroll_components.getItem<PayrollComponent>(k);
      if (c && c.id === id) return c;
    }
    return null;
  }

  async getDaysAttended(employeeId: string, range: DateRange): Promise<number> {
    const keys = await stores.transactions.attendance.keys();
    const days = new Set<string>();
    const start = new Date(range.start);
    const end = new Date(range.end);
    for (const k of keys) {
      const a = await stores.transactions.attendance.getItem<Attendance>(k);
      if (!a) continue;
      if (a.employee_id !== employeeId) continue;
      if (a.type !== 'CHECK_IN') continue;
      const d = new Date(a.timestamp);
      if (d >= start && d <= end) days.add(d.toDateString());
    }
    return days.size;
  }

  async computeForEmployee(
    employeeId: string,
    range: DateRange,
    workDays: number,
    resolveTransaction?: TransactionResolver
  ): Promise<{
    employeeId: string;
    basePay: number;
    components: Array<{ id: string; name: string; type: 'ALLOWANCE' | 'DEDUCTION'; amount: number }>;
    netPay: number;
    daysAttended: number;
  }> {
    const emp = await this.getEmployee(employeeId);
    if (!emp) throw new Error('Employee not found');
    const daysAttended = await this.getDaysAttended(employeeId, range);
    const basePay =
      emp.base_salary_method === 'DAILY_RATE'
        ? emp.base_salary * daysAttended
        : emp.base_salary;

    const lines = await this.getLines(employeeId);
    const components: Array<{ id: string; name: string; type: 'ALLOWANCE' | 'DEDUCTION'; amount: number }> = [];
    for (const line of lines) {
      const comp = await this.getComponent(line.component_id);
      if (!comp) continue;
      let amount = 0;
      if (comp.calculation_method === 'FIXED') {
        amount = typeof line.amount_override === 'number' ? line.amount_override : comp.amount;
      } else if (comp.calculation_method === 'TRANSACTION') {
        const resolverAmount = resolveTransaction
          ? await resolveTransaction(employeeId, range, comp)
          : await this.resolveTransactionDefault(employeeId, range, comp);
        amount = resolverAmount;
      } else if (comp.calculation_method === 'ATTENDANCE') {
        const base = typeof line.amount_override === 'number' ? line.amount_override : comp.amount;
        amount = workDays > 0 ? (daysAttended / workDays) * base : 0;
      }
      components.push({ id: comp.id, name: comp.name, type: comp.type, amount });
    }
    const allowances = components.filter(c => c.type === 'ALLOWANCE').reduce((s, c) => s + c.amount, 0);
    const deductions = components.filter(c => c.type === 'DEDUCTION').reduce((s, c) => s + c.amount, 0);
    const netPay = basePay + allowances - deductions;
    return { employeeId, basePay, components, netPay, daysAttended };
  }
}
