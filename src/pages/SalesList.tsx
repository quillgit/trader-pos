import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Transaction } from '@/types';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function SalesList() {
    const [sales, setSales] = useState<Transaction[]>([]);

    useEffect(() => {
        const load = async () => {
            const keys = await stores.transactions.sales.keys();
            const list: Transaction[] = [];
            for (const k of keys) {
                const item = await stores.transactions.sales.getItem<Transaction>(k);
                if (item) list.push(item);
            }
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setSales(list);
        };
        load();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Sales</h2>
                <Link to="/sales/new" className="bg-orange-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> New
                </Link>
            </div>

            <div className="bg-white border rounded-md">
                {sales.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No sales found.</div>
                ) : (
                    <ul className="divide-y">
                        {sales.map(t => (
                            <li key={t.id} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-medium">{t.partner_name || 'Unknown Customer'}</div>
                                        <div className="text-xs text-gray-500">{new Date(t.date).toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold">{t.total_amount}</div>
                                        <span className={`text-[10px] px-1 rounded ${t.sync_status === 'SYNCED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {t.sync_status}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                    {t.items.length} items: {t.items.map(i => i.product_name).join(', ')}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
