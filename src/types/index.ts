import { z } from 'zod';

export const SalaryComponentSchema = z.object({
    name: z.string(),
    amount: z.number().min(0),
    type: z.enum(['ALLOWANCE', 'DEDUCTION'])
});
export type SalaryComponent = z.infer<typeof SalaryComponentSchema>;

// --- MASTERS ---

export const ProductSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    unit: z.string(),
    category: z.string(),
    price_buy: z.number().min(0),
    price_sell: z.number().min(0),
    updated_at: z.string(), // ISO string
});
export type Product = z.infer<typeof ProductSchema>;

export const PartnerSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    type: z.enum(['SUPPLIER', 'CUSTOMER']).optional(), // Deprecated, kept for migration if needed
    is_supplier: z.boolean().default(false),
    is_customer: z.boolean().default(false),
    sub_type: z.enum(['PERSONAL', 'BUSINESS']),
    phone: z.string().optional(),
    address: z.string().optional(),
    updated_at: z.string(),
});
export type Partner = z.infer<typeof PartnerSchema>;

export const EmployeeSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    pin: z.string().length(6), // Simple PIN auth
    role: z.enum(['ADMIN', 'FINANCE', 'WAREHOUSE', 'HR', 'FIELD']),
    salary_frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().default('MONTHLY'),
    base_salary: z.number().min(0).optional().default(0),
    salary_components: z.array(SalaryComponentSchema).optional().default([]),
    updated_at: z.string(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

// --- CASH SESSION & EXPENSES ---

export const CashSessionSchema = z.object({
    id: z.string().uuid(),
    date: z.string(), // ISO date
    start_amount: z.number().min(0),
    end_amount: z.number().optional(),
    status: z.enum(['OPEN', 'CLOSED']),
    created_by: z.string(), // Employee ID
    closed_by: z.string().optional(),
    transactions_count: z.number().default(0),
    expenses_count: z.number().default(0),
});
export type CashSession = z.infer<typeof CashSessionSchema>;

export const ExpenseSchema = z.object({
    id: z.string().uuid(),
    date: z.string(), // ISO datetime
    amount: z.number().min(0),
    category: z.enum(['FUEL', 'FOOD', 'MAINTENANCE', 'SALARY', 'OTHER']),
    description: z.string(),
    created_by: z.string(), // Employee ID
    cash_session_id: z.string().optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// --- TRANSACTIONS ---

export const TransactionItemSchema = z.object({
    product_id: z.string().uuid(),
    product_name: z.string(),
    quantity: z.number().min(0.01),
    price: z.number().min(0),
    total: z.number().min(0),
});
export type TransactionItem = z.infer<typeof TransactionItemSchema>;

export const TransactionSchema = z.object({
    id: z.string().uuid(),
    date: z.string(), // ISO
    type: z.enum(['PURCHASE', 'SALE']),
    partner_id: z.string().uuid().optional(), // Optional for cash sales? No, usually tracked.
    partner_name: z.string().optional(),
    items: z.array(TransactionItemSchema),
    total_amount: z.number(),
    paid_amount: z.number().default(0),
    change_amount: z.number().default(0),
    sync_status: z.enum(['PENDING', 'SYNCED', 'FAILED']),
    created_by: z.string(), // Employee ID
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const AttendanceSchema = z.object({
    id: z.string().uuid(),
    employee_id: z.string().uuid(),
    timestamp: z.string(),
    type: z.enum(['CHECK_IN', 'CHECK_OUT']),
    sync_status: z.enum(['PENDING', 'SYNCED', 'FAILED']),
});
export type Attendance = z.infer<typeof AttendanceSchema>;

// --- SYNC ---

export const QueueItemSchema = z.object({
    id: z.string().uuid(),
    type: z.string(), // e.g. 'transaction', 'attendance', 'partner', 'product'
    payload: z.any(),
    action: z.string(), // e.g. 'create', 'update'
    timestamp: z.number(),
    retry_count: z.number().default(0),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;
