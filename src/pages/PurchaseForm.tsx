import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product, Partner, Transaction, TransactionItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Save, Plus, ShoppingCart, X, Printer, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Receipt from '@/components/Receipt';
import { useCashSession } from '@/hooks/use-cash-session';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { useAuth } from '@/contexts/AuthContext';

import { formatCurrency } from '@/lib/utils';

export default function PurchaseForm() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { id: editId } = useParams();
    const { session, balance, loading: sessionLoading, isExpired } = useCashSession();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [suppliers, setSuppliers] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null);
    const [editNotes, setEditNotes] = useState<string>('');
    
    // Confirmation
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');

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

    useEffect(() => {
        const loadEdit = async () => {
            if (!editId) return;
            const trx = await stores.transactions.purchases.getItem<Transaction>(editId);
            if (!trx) {
                 toast.error('Transaction not found');
                 navigate('/purchases');
                 return;
            }

            // Validation: Can only edit if session is active and matches
            const currentSessionId = session?.id;
            const trxSessionId = trx.cash_session_id;

            if (!session || isExpired || currentSessionId !== trxSessionId) {
                toast.error('Cannot edit transaction from a closed or different session.');
                navigate('/purchases');
                return;
            }

            setOriginalTransaction(trx);
            setDate(new Date(trx.date).toISOString().split('T')[0]);
            setSelectedSupplier(trx.partner_id || '');
            setCart(trx.items || []);
            setPaidAmount(trx.paid_amount || 0);
            setPaymentMethod((trx as any).payment_method || 'CASH');
        };
        
        if (!sessionLoading) {
             loadEdit();
        }
    }, [editId, session, isExpired, sessionLoading, navigate]);

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

        if (!editId) {
            if (paymentMethod === 'CASH' && paidAmount > balance) {
                toast.error(`Insufficient session cash! Available: ${formatCurrency(balance)}`);
                return;
            }
        } else {
            const currentPaid = originalTransaction?.paid_amount || 0;
            const delta = paidAmount - currentPaid;
            if (paymentMethod === 'CASH' && delta > 0 && delta > balance) {
                toast.error(`Insufficient session cash for additional payment. Available: ${formatCurrency(balance)}`);
                return;
            }
            if (!session || isExpired || originalTransaction?.cash_session_id !== session?.id) {
                toast.error('Editing allowed only in current active session');
                return;
            }
        }

        setShowConfirmModal(true);
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            const supplier = suppliers.find(s => s.id === selectedSupplier);

            let finalNotes = editNotes;
            if (editId && originalTransaction) {
                 const changes = [];
                 if (paidAmount !== originalTransaction.paid_amount) {
                     changes.push(`Paid Amount: ${formatCurrency(originalTransaction.paid_amount || 0)} -> ${formatCurrency(paidAmount)}`);
                 }
                 if (totalAmount !== originalTransaction.total_amount) {
                     changes.push(`Total Amount: ${formatCurrency(originalTransaction.total_amount)} -> ${formatCurrency(totalAmount)}`);
                 }
                 
                 if (changes.length > 0) {
                     const timestamp = new Date().toLocaleString();
                     const autoLog = `[System ${timestamp}] ${changes.join(', ')}`;
                     finalNotes = finalNotes ? `${finalNotes}\n${autoLog}` : autoLog;
                 }
                 
                 // Append to existing notes
                 finalNotes = originalTransaction.notes ? `${originalTransaction.notes}\n${finalNotes}` : finalNotes;
            }

            const trx: Transaction = editId && originalTransaction ? {
                ...originalTransaction,
                date: new Date(date).toISOString(),
                partner_id: selectedSupplier,
                partner_name: supplier?.name,
                items: cart,
                total_amount: totalAmount,
                paid_amount: paidAmount,
                change_amount: changeAmount,
                sync_status: 'PENDING',
                payment_method: paymentMethod,
                notes: finalNotes || ''
            } : {
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
                created_by: user?.id || 'OFFLINE_USER',
                cash_session_id: session?.id,
                payment_method: paymentMethod,
                notes: editNotes || ''
            };

            // Save
            await stores.transactions.purchases.setItem(trx.id, trx);
            await SyncEngine.addToQueue('transaction', editId ? 'update' : 'create', trx);

            toast.success('Purchase saved successfully!');
            
            setShowConfirmModal(false);

            if (editId) {
                navigate('/purchases');
            } else {
                setPrintingTransaction(trx);
                setShowPrintConfirm(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to save purchase');
        } finally {
            setIsSubmitting(false);
        }
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
                    <h2 className="text-2xl font-bold text-gray-800">{editId ? 'Edit Purchase' : 'New Purchase'}</h2>
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

                {isExpired && !sessionLoading && (
                     <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-lg mb-4 flex justify-between items-center shadow-sm">
                        <div>
                            <strong>Session Expired:</strong> Previous session must be closed first.
                        </div>
                        <button onClick={() => navigate('/')} className="text-sm underline hover:text-orange-900 font-medium">
                            Go to Dashboard
                        </button>
                    </div>
                )}

                <div className={`space-y-4 ${!session || isExpired ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                        subLabel: `Buy: ${formatCurrency(p.price_buy)}`
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
                                <MoneyInput
                                    value={currentItem.price}
                                    onChange={val => setCurrentItem({ ...currentItem, price: val })}
                                    className="focus:ring-blue-500 focus:border-blue-500"
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
                                        {item.quantity} x {formatCurrency(item.price)}
                                    </div>
                                    <div className="font-bold text-gray-900">
                                        {formatCurrency(item.total)}
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
                            <span className="font-medium">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                            <span>Total</span>
                            <span>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide flex justify-between">
                                <span>Paid Amount</span>
                                <span className={`${paidAmount > balance ? 'text-red-600 font-bold' : 'text-blue-600'} flex items-center gap-1`}>
                                    <Wallet className="w-3 h-3" />
                                    Max: {formatCurrency(balance)}
                                </span>
                            </label>
                            <MoneyInput
                                value={paidAmount}
                                onChange={setPaidAmount}
                                placeholder="0"
                                className={`text-lg font-bold text-right focus:ring-2 ${paymentMethod === 'CASH' && paidAmount > balance ? 'border-red-500 focus:ring-red-500 text-red-600' : 'focus:ring-green-500 focus:border-green-500'}`}
                            />
                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="radio"
                                        value="CASH"
                                        checked={paymentMethod === 'CASH'}
                                        onChange={() => setPaymentMethod('CASH')}
                                    />
                                    <span>Cash (Session)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="radio"
                                        value="TRANSFER"
                                        checked={paymentMethod === 'TRANSFER'}
                                        onChange={() => setPaymentMethod('TRANSFER')}
                                    />
                                    <span>Transfer</span>
                                </div>
                            </div>
                            {paymentMethod === 'CASH' && paidAmount > balance && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                    Insufficient session cash available.
                                </p>
                            )}
                            {editId && (
                                <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Edit Notes (optional)</label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Reason for correction..."
                        />
                    </div>
                )}
            </div>

                        {paidAmount > 0 && (
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-600">Change</span>
                                    <span className={`text-lg font-bold ${changeAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {formatCurrency(changeAmount)}
                                    </span>
                                </div>
                                {paidAmount < totalAmount && (
                                    <div className="text-right text-xs text-red-500 font-medium">
                                        Balance Due: {formatCurrency(totalAmount - paidAmount)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                        disabled={cart.length === 0 || !session || isExpired || paidAmount > balance}
                        onClick={handleSubmit}
                    >
                        <Save className="w-5 h-5" />
                        {editId ? 'Update Purchase' : 'Complete Purchase'}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Confirm Purchase</h3>
                            <button onClick={() => setShowConfirmModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Supplier</span>
                                    <span className="font-medium">{suppliers.find(s => s.id === selectedSupplier)?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Date</span>
                                    <span className="font-medium">{new Date(date).toLocaleDateString()}</span>
                                </div>
                                <div className="border-t pt-2 mt-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Items</span>
                                    <div className="mt-1 space-y-1">
                                        {cart.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{item.product_name} x {item.quantity}</span>
                                                <span>{formatCurrency(item.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t pt-2 mt-2 space-y-1">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Paid Amount</span>
                                        <span>{formatCurrency(paidAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Change</span>
                                        <span>{formatCurrency(changeAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Payment Method</span>
                                        <span className={`text-[10px] px-2 py-1 rounded ${paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {paymentMethod}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Confirm Purchase'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
