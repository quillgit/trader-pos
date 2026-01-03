import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product, Partner, Transaction, TransactionItem, CashSession } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Trash, Save, ShoppingCart, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function SalesForm() {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customers, setCustomers] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null);

    // Component-level state for controlled inputs and derived values
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const changeAmount = paidAmount > totalAmount ? paidAmount - totalAmount : 0;

    // Item entry state
    const [currentItem, setCurrentItem] = useState({
        productId: '',
        quantity: 1,
        price: 0 // Will default to selling price
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
                price: prod.price_sell
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
        toast.success('Item added to cart');
    };

    const removeItem = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleSubmit = async () => {
        if (!selectedCustomer || cart.length === 0) {
            toast.error('Please select a customer and add items to the cart');
            return;
        }

        // Partial Payment Check
        if (paidAmount < totalAmount) {
             const confirm = window.confirm(`Payment is less than total. Record ${totalAmount - paidAmount} as credit (Hutang)?`);
             if (!confirm) return;
        }

        const customer = customers.find(s => s.id === selectedCustomer);

        const trx: Transaction = {
            id: uuidv4(),
            date: new Date(date).toISOString(),
            type: 'SALE',
            partner_id: selectedCustomer,
            partner_name: customer?.name,
            items: cart,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            change_amount: changeAmount,
            sync_status: 'PENDING',
            created_by: 'OFFLINE_USER'
        };

        await stores.transactions.sales.setItem(trx.id, trx);
        await SyncEngine.addToQueue('transaction', 'create', trx);

        toast.success('Sale saved successfully!');
        navigate('/sales');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
            <div className="flex items-center gap-3 border-b pb-4">
                <ShoppingCart className="w-8 h-8 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-800">New Sale (POS)</h2>
            </div>

            {hasOpenSession === false && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-semibold">Session Closed</strong>
                        <p className="text-sm mt-1">You must open a daily cash session before recording sales.</p>
                        <button onClick={() => navigate('/')} className="text-sm underline hover:text-red-900 mt-2 font-medium">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${hasOpenSession === false ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* Left Column: Input Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Customer Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <SearchableSelect
                                    label="Select Customer"
                                    options={customers.map(c => ({
                                        value: c.id,
                                        label: c.name,
                                        subLabel: c.sub_type
                                    }))}
                                    value={selectedCustomer}
                                    onChange={setSelectedCustomer}
                                    placeholder="Search customer by name..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Date</label>
                                <input
                                    type="date"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 p-2 border"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Entry */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Items</h3>
                        <div className="grid grid-cols-4 gap-4 items-end">
                            <div className="col-span-4 md:col-span-2">
                                <SearchableSelect
                                    label="Product"
                                    options={products.map(p => ({
                                        value: p.id,
                                        label: p.name,
                                        subLabel: `Stock: 100 | Sell: ${p.price_sell.toLocaleString()}`
                                    }))}
                                    value={currentItem.productId}
                                    onChange={handleProductChange}
                                    placeholder="Search product..."
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium mb-1 text-gray-700">Qty</label>
                                <input
                                    type="number" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 p-2 border"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                                    min="1"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium mb-1 text-gray-700">Price</label>
                                <input
                                    type="number" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 p-2 border"
                                    value={currentItem.price}
                                    onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-4">
                                <button
                                    type="button" onClick={addItem} disabled={!currentItem.productId}
                                    className="w-full bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart & Totals */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full max-h-[calc(100vh-12rem)]">
                        <div className="p-4 bg-gray-50 border-b">
                            <h3 className="font-semibold text-gray-700">Current Order</h3>
                            <div className="text-xs text-gray-500 mt-1">{cart.length} items in cart</div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {cart.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                                    <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">Cart is empty</span>
                                </div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start p-3 bg-white border rounded-lg group hover:border-orange-200 transition-colors">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-800">{item.product_name}</div>
                                            <div className="text-xs text-gray-500">
                                                {item.quantity} x {item.price.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="font-medium text-gray-900">{item.total.toLocaleString()}</div>
                                            <button 
                                                onClick={() => removeItem(idx)} 
                                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            >
                                                <Trash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-lg font-bold text-gray-800">
                                    <span>Total</span>
                                    <span>{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                    <label className="text-sm font-medium text-gray-600">Paid</label>
                                    <input 
                                        type="number" 
                                        className="w-32 text-right border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm p-1.5 border"
                                        value={paidAmount || ''}
                                        onChange={e => setPaidAmount(Number(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Change</span>
                                    <span className={`font-medium ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {changeAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm transition-all active:scale-[0.98]"
                                disabled={cart.length === 0}
                                onClick={handleSubmit}
                            >
                                <Save className="w-5 h-5" />
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
