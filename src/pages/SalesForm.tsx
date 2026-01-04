import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product, Partner, Transaction, TransactionItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Save, ShoppingCart, AlertCircle, Printer, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Receipt from '@/components/Receipt';
import { useCashSession } from '@/hooks/use-cash-session';

export default function SalesForm() {
    const navigate = useNavigate();
    const { session, loading: sessionLoading } = useCashSession();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customers, setCustomers] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);

    // Printing
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
    const [companyInfo] = useState({ name: 'ComTrade', address: 'Local Market', phone: '-' });

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
                if (s && s.is_customer == true) customerList.push(s);
            }
            setCustomers(customerList);
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
            currency: 'IDR',
            sync_status: 'PENDING',
            created_by: 'OFFLINE_USER',
            cash_session_id: session?.id
        };

        await stores.transactions.sales.setItem(trx.id, trx);
        await SyncEngine.addToQueue('transaction', 'create', trx);

        toast.success('Sale saved successfully!');
        
        // Trigger Print Confirm
        setPrintingTransaction(trx);
        setShowPrintConfirm(true);
    };

    const handlePrintConfirm = (shouldPrint: boolean) => {
        setShowPrintConfirm(false);
        if (shouldPrint) {
            // Show Receipt Modal
        } else {
            navigate('/sales');
        }
    };

    const closeReceipt = () => {
        setPrintingTransaction(null);
        navigate('/sales');
    };

    return (
        <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden bg-gray-100 relative">
            {/* Left Panel: Customer Selection & Inputs */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-orange-600" />
                        New Sale (POS)
                    </h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                {!session && !sessionLoading && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <div>
                                <strong>Session Closed:</strong> You must open a daily cash session first.
                            </div>
                        </div>
                        <button onClick={() => navigate('/')} className="text-sm underline hover:text-red-900 font-medium">
                            Go to Dashboard
                        </button>
                    </div>
                )}

                <div className={`space-y-4 ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Customer Selection */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
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

                    {/* Product Entry */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Add Item
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-5">
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
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                                    min="1"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={currentItem.price}
                                    onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    type="button"
                                    onClick={addItem}
                                    disabled={!currentItem.productId}
                                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Cart & Payment */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l shadow-xl flex flex-col z-20 h-auto lg:h-full">
                <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                        Current Order
                        <span className="ml-auto bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {cart.length} items
                        </span>
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-60">
                            <ShoppingCart className="w-12 h-12" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative group">
                                <button
                                    onClick={() => removeItem(idx)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="font-medium text-gray-800 pr-6">{item.product_name}</div>
                                <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                                    <div>
                                        {item.quantity} x {item.price.toLocaleString()}
                                    </div>
                                    <div className="font-bold text-gray-900">
                                        {item.total.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm font-medium text-gray-600">Paid Amount</label>
                            <input 
                                type="number" 
                                className="w-32 text-right border rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                value={paidAmount || ''}
                                onChange={e => setPaidAmount(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-800 border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Change</span>
                            <span className={`font-medium ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {changeAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-orange-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                        disabled={cart.length === 0 || !session}
                        onClick={handleSubmit}
                    >
                        <Save className="w-5 h-5" />
                        Complete Sale
                    </button>
                </div>
            </div>

            {/* Print Confirmation Modal */}
            {showPrintConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-2">Transaction Saved</h3>
                        <p className="text-gray-600 mb-6">Do you want to print the receipt?</p>
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => handlePrintConfirm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                No, Skip
                            </button>
                            <button 
                                onClick={() => handlePrintConfirm(true)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Yes, Print
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {printingTransaction && !showPrintConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none">
                        <div className="p-4 border-b flex justify-between items-center print:hidden">
                            <h3 className="font-bold">Print Receipt</h3>
                            <button onClick={closeReceipt} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto bg-gray-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
                            <Receipt transaction={printingTransaction} company={companyInfo} />
                        </div>

                        <div className="p-4 border-t bg-white flex justify-end gap-2 print:hidden">
                            <button 
                                onClick={() => window.print()}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button 
                                onClick={closeReceipt}
                                className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
