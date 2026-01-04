import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product, Partner, Transaction, TransactionItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Save, Plus, ShoppingCart, X, Printer, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Receipt from '@/components/Receipt';
import { useCashSession } from '@/hooks/use-cash-session';

export default function PurchaseForm() {
    const navigate = useNavigate();
    const { session, balance, loading: sessionLoading } = useCashSession();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [suppliers, setSuppliers] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [paidAmount, setPaidAmount] = useState<number>(0);
    
    // Printing
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
    const [companyInfo] = useState({ name: 'ComTrade', address: 'Local Market', phone: '-' }); // Mock/Default

    // Item entry state
    const [currentItem, setCurrentItem] = useState({
        productId: '',
        quantity: 1,
        price: 0 // Will default to buying price
    });

    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const changeAmount = paidAmount > totalAmount ? paidAmount - totalAmount : 0;

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
            const supplierList: Partner[] = [];
            for (const k of sKeys) {
                const s = await stores.masters.partners.getItem<Partner>(k);
                if (s && s.is_supplier == true) supplierList.push(s);
            }
            setSuppliers(supplierList);
        };
        loadMasters();
    }, []);

    const handleProductChange = (productId: string) => {
        const prod = products.find(p => p.id === productId);
        if (prod) {
            setCurrentItem({
                productId,
                quantity: 1,
                price: prod.price_buy
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

        // Reset item entry
        setCurrentItem({ productId: '', quantity: 1, price: 0 });
        toast.success('Item added to cart');
    };

    const removeItem = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
        toast.success('Item removed');
    };

    const handleSubmit = async () => {
        if (!selectedSupplier || cart.length === 0) {
            toast.error('Select supplier and add items');
            return;
        }

        if (paidAmount > balance) {
             toast.error(`Insufficient session cash! Available: ${balance.toLocaleString()}`);
             return;
        }

        const supplier = suppliers.find(s => s.id === selectedSupplier);

        const trx: Transaction = {
            id: uuidv4(),
            date: new Date(date).toISOString(),
            type: 'PURCHASE',
            partner_id: selectedSupplier,
            partner_name: supplier?.name,
            items: cart,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            change_amount: changeAmount,
            currency: 'IDR',
            sync_status: 'PENDING',
            created_by: 'OFFLINE_USER', // Should come from Auth context
            cash_session_id: session?.id
        };

        // Save
        await stores.transactions.purchases.setItem(trx.id, trx);
        await SyncEngine.addToQueue('transaction', 'create', trx);

        toast.success('Purchase saved successfully!');
        
        // Trigger Print Confirm
        setPrintingTransaction(trx);
        setShowPrintConfirm(true);
    };

    const handlePrintConfirm = (shouldPrint: boolean) => {
        setShowPrintConfirm(false);
        if (shouldPrint) {
            // Show Receipt Modal (already handled by printingTransaction not null, 
            // but we need to ensure we don't navigate away yet)
            // Actually, we just keep printingTransaction set.
        } else {
            navigate('/purchases');
        }
    };

    const closeReceipt = () => {
        setPrintingTransaction(null);
        navigate('/purchases');
    };

    return (
        <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden bg-gray-100 relative">
            {/* Left Panel: Product Selection & Inputs */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">New Purchase</h2>
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
                        <div>
                            <strong>Session Closed:</strong> You must open a daily cash session first.
                        </div>
                        <button onClick={() => navigate('/')} className="text-sm underline hover:text-red-900 font-medium">
                            Go to Dashboard
                        </button>
                    </div>
                )}

                <div className={`space-y-4 ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Supplier Selection */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <SearchableSelect
                            label="Select Supplier"
                            options={suppliers.map(s => ({
                                value: s.id,
                                label: s.name,
                                subLabel: s.sub_type
                            }))}
                            value={selectedSupplier}
                            onChange={setSelectedSupplier}
                            placeholder="Search supplier by name..."
                        />
                    </div>

                    {/* Product Entry */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Item
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-5">
                                <SearchableSelect
                                    label="Product"
                                    options={products.map(p => ({
                                        value: p.id,
                                        label: p.name,
                                        subLabel: `Buy: ${p.price_buy}`
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
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                                    min="1"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={currentItem.price}
                                    onChange={e => setCurrentItem({ ...currentItem, price: Number(e.target.value) })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    type="button"
                                    onClick={addItem}
                                    disabled={!currentItem.productId}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Product Quick List (Optional - can be added later) */}
                </div>
            </div>

            {/* Right Panel: Cart & Payment */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l shadow-xl flex flex-col z-20 h-auto lg:h-full">
                <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        Current Order
                        <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
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
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                            <span>Total</span>
                            <span>{totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide flex justify-between">
                                <span>Paid Amount</span>
                                <span className={`${paidAmount > balance ? 'text-red-600 font-bold' : 'text-blue-600'} flex items-center gap-1`}>
                                    <Wallet className="w-3 h-3" />
                                    Max: {balance.toLocaleString()}
                                </span>
                            </label>
                            <input
                                type="number"
                                className={`w-full border rounded-lg px-3 py-2 text-lg font-bold text-right focus:ring-2 ${paidAmount > balance ? 'border-red-500 focus:ring-red-500 text-red-600' : 'focus:ring-green-500 focus:border-green-500'}`}
                                value={paidAmount || ''}
                                placeholder="0"
                                onChange={(e) => setPaidAmount(Number(e.target.value))}
                            />
                            {paidAmount > balance && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                    Insufficient session cash available.
                                </p>
                            )}
                        </div>

                        {paidAmount > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600">Change</span>
                                    <span className={`text-lg font-bold ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {changeAmount.toLocaleString()}
                                    </span>
                                </div>
                                {paidAmount < totalAmount && (
                                    <div className="text-right text-xs text-red-500 font-medium">
                                        Balance Due: {(totalAmount - paidAmount).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                        disabled={cart.length === 0 || !session || paidAmount > balance}
                        onClick={handleSubmit}
                    >
                        <Save className="w-5 h-5" />
                        Complete Purchase
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
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
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
