import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product, Partner, Transaction, TransactionItem, CashSession } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Trash, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SalesForm() {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default Today
    const [customers, setCustomers] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null); // null = loading

    const [currentItem, setCurrentItem] = useState({
        productId: '',
        quantity: 1,
        price: 0
    });

    useEffect(() => {
        const loadMasters = async () => {
            const pKeys = await stores.masters.products.keys();
            const productList: Product[] = [];
            for (const k of pKeys) {
                const p = await stores.masters.products.getItem<Product>(k);
                if (p) productList.push(p);
            }
            setProducts(productList);

            const sKeys = await stores.masters.partners.keys();
            const customerList: Partner[] = [];
            for (const k of sKeys) {
                const s = await stores.masters.partners.getItem<Partner>(k);
                if (s && s.type === 'CUSTOMER') customerList.push(s);
            }
            setCustomers(customerList);
            setCustomers(customerList);

            // Check Session
            const sessionKeys = await stores.transactions.sessions.keys();
            let active = false;
            for (const k of sessionKeys) {
                const s = await stores.transactions.sessions.getItem<CashSession>(k);
                if (s && s.status === 'OPEN') {
                    active = true;
                    break;
                }
            }
            setHasOpenSession(active);
        };
        loadMasters();
    }, []);

    const handleProductChange = (productId: string) => {
        const prod = products.find(p => p.id === productId);
        if (prod) {
            setCurrentItem({
                productId,
                quantity: 1,
                price: prod.price_sell // Default to Selling Price
            });
        } else {
            setCurrentItem({ ...currentItem, productId: '' });
        }
    };

    const addItem = () => {
        const prod = products.find(p => p.id === currentItem.productId);
        if (!prod) return;

        setCart([...cart, {
            product_id: prod.id,
            product_name: prod.name,
            quantity: currentItem.quantity,
            price: currentItem.price,
            total: currentItem.quantity * currentItem.price
        }]);

        setCurrentItem({ productId: '', quantity: 1, price: 0 });
    };

    const removeItem = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleSubmit = async () => {
        if (!selectedCustomer || cart.length === 0) {
            alert('Select customer and add items');
            return;
        }

        const customer = customers.find(s => s.id === selectedCustomer);
        const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);

        const trx: Transaction = {
            id: uuidv4(),
            date: new Date(date).toISOString(),
            type: 'SALE',
            partner_id: selectedCustomer,
            partner_name: customer?.name,
            items: cart,
            total_amount: totalAmount,
            sync_status: 'PENDING',
            created_by: 'OFFLINE_USER'
        };

        await stores.transactions.sales.setItem(trx.id, trx);
        await SyncEngine.addToQueue('transaction', 'create', trx);

        alert('Sale saved offline!');
        navigate('/sales');
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto py-6">
            <h2 className="text-2xl font-bold text-orange-600">New Sale</h2>

            <h2 className="text-2xl font-bold text-orange-600">New Sale</h2>

            {hasOpenSession === false && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 flex justify-between items-center">
                    <div>
                        <strong>Session Closed:</strong> You must open a daily cash session before recording sales.
                    </div>
                    <button onClick={() => navigate('/')} className="text-sm underline hover:text-red-900">
                        Go to Dashboard
                    </button>
                </div>
            )}

            <div className={`bg-white p-4 rounded-md border shadow-sm space-y-4 ${hasOpenSession === false ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-medium mb-1">Customer</label>
                    <select
                        className="w-full border rounded p-2"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                        <option value="">Select Customer...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.sub_type})</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                        type="date"
                        className="w-full border rounded p-2"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Add Items</h3>
                    <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-5">
                            <label className="text-xs">Product</label>
                            <select
                                className="w-full border rounded p-2"
                                value={currentItem.productId}
                                onChange={(e) => handleProductChange(e.target.value)}
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                            <label className="text-xs">Qty</label>
                            <input
                                type="number" className="w-full border rounded p-2"
                                value={currentItem.quantity}
                                onChange={e => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                            <label className="text-xs">Price</label>
                            <input
                                type="number" className="w-full border rounded p-2"
                                value={currentItem.price}
                                onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                            <button
                                type="button" onClick={addItem} disabled={!currentItem.productId}
                                className="w-full bg-orange-100 text-orange-700 p-2 rounded hover:bg-orange-200"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cart Table */}
                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-right">Qty</th>
                                <th className="p-2 text-right">Price</th>
                                <th className="p-2 text-right">Total</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="p-2">{item.product_name}</td>
                                    <td className="p-2 text-right">{item.quantity}</td>
                                    <td className="p-2 text-right">{item.price}</td>
                                    <td className="p-2 text-right font-medium">{item.total}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td colSpan={3} className="p-2 text-right">Total:</td>
                                <td className="p-2 text-right">{cart.reduce((sum, item) => sum + item.total, 0)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button
                        className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                        disabled={cart.length === 0}
                        onClick={handleSubmit}
                    >
                        <Save className="w-4 h-4" />
                        Save Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
