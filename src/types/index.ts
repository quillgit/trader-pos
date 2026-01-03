import { z } from 'zod';

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
    type: z.enum(['SUPPLIER', 'CUSTOMER']),
    sub_type: z.enum(['PERSONAL', 'BUSINESS']), // Personal suppliers might be tax-exempt logic later
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
    updated_at: z.string(),
});
export type Employee = z.infer<typeof EmployeeSchema>;

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
