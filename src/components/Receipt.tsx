import type { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ReceiptProps {
    transaction: Transaction;
    company: {
        name: string;
        address: string;
        phone: string;
    };
}

export default function Receipt({ transaction, company }: ReceiptProps) {
    return (
        <div id="receipt-print" className="bg-white p-4 max-w-[300px] mx-auto text-xs font-mono border border-gray-200 shadow-sm print:shadow-none print:border-none print:w-full print:max-w-none print:m-0 print:p-0">
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="font-bold text-lg uppercase">{company.name}</h1>
                <p>{company.address}</p>
                <p>Tel: {company.phone}</p>
            </div>

            {/* Meta */}
            <div className="mb-4 border-b border-dashed pb-2">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(transaction.date).toLocaleString([], { 
                        year: '2-digit', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                    })}</span>
                </div>
                <div className="flex justify-between">
                    <span>TRX ID:</span>
                    <span>#{transaction.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{transaction.type === 'SALE' ? 'Customer:' : 'Supplier:'}</span>
                    <span className="font-bold">{transaction.partner_name || 'General'}</span>
                </div>
                <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="font-bold">{transaction.payment_method}</span>
                </div>
            </div>

            {/* Items */}
            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="pb-1">Item</th>
                        <th className="pb-1 text-right">Qty</th>
                        <th className="pb-1 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {transaction.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="py-1">
                                <div>{item.product_name}</div>
                                <div className="text-[10px] text-gray-500">@{formatCurrency(item.price, transaction.currency)}</div>
                            </td>
                            <td className="py-1 text-right align-top">{item.quantity}</td>
                            <td className="py-1 text-right align-top">{formatCurrency(item.total, transaction.currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 space-y-1">
                <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(transaction.total_amount, transaction.currency)}</span>
                </div>
                {transaction.paid_amount > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span>Paid:</span>
                            <span>{formatCurrency(transaction.paid_amount, transaction.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Change:</span>
                            <span>{formatCurrency(transaction.change_amount, transaction.currency)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-[10px]">
                <p>Thank you for your business!</p>
                <p className="mt-1 text-gray-400">Powered by OfflineTrader</p>
            </div>
            
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #receipt-print, #receipt-print * {
                        visibility: visible;
                    }
                    #receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        border: none;
                    }
                }
            `}</style>
        </div>
    );
}
