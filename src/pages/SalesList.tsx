import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import type { Transaction } from '@/types';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, Printer, X } from 'lucide-react';
import Receipt from '@/components/Receipt';

export default function SalesList() {
    const [sales, setSales] = useState<Transaction[]>([]);
    
    // Filtering & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Printing
    const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
    const [companyInfo, setCompanyInfo] = useState({ name: '', address: '', phone: '' });

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

            // Load company info
            setCompanyInfo({
                name: localStorage.getItem('COMPANY_NAME') || 'My Company',
                address: localStorage.getItem('COMPANY_ADDRESS') || '',
                phone: localStorage.getItem('COMPANY_PHONE') || ''
            });
        };
        load();
    }, []);

    // Filter Logic
    const filteredSales = sales.filter(t => {
        const matchName = (t.partner_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchId = t.id.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchDate = true;
        if (startDate) {
            matchDate = matchDate && new Date(t.date) >= new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchDate = matchDate && new Date(t.date) <= end;
        }

        return (matchName || matchId) && matchDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePrint = (t: Transaction) => {
        setPrintingTransaction(t);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold">Sales</h2>
                <Link to="/sales/new" className="bg-orange-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
                    <Plus className="w-4 h-4" /> New Sale
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-md border shadow-sm space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search customer or ID..."
                        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <input 
                    type="date"
                    className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                />
                <input 
                    type="date"
                    className="w-full sm:w-auto border rounded-md px-3 py-2 text-sm"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                />
            </div>

            {/* List */}
            <div className="bg-white border rounded-md overflow-hidden">
                {paginatedSales.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No sales found matching criteria.</div>
                ) : (
                    <>
                        <ul className="divide-y">
                            {paginatedSales.map(t => (
                                <li key={t.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium">{t.partner_name || 'Cash Customer'}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <span>{new Date(t.date).toLocaleString()}</span>
                                                <span className="bg-gray-100 px-1 rounded text-[10px] font-mono">#{t.id.slice(0, 8)}</span>
                                            </div>
                                            <div className="mt-2 text-xs text-gray-600">
                                                {t.items.length} items: {t.items.map(i => i.product_name).join(', ')}
                                            </div>
                                        </div>
                                        
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="font-bold">{t.total_amount.toLocaleString()}</div>
                                            {t.paid_amount !== undefined && (
                                                <div className="text-xs text-gray-500">Paid: {t.paid_amount.toLocaleString()}</div>
                                            )}
                                            {t.change_amount > 0 && (
                                                <div className="text-xs text-green-600">Change: {t.change_amount.toLocaleString()}</div>
                                            )}
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1 rounded ${t.sync_status === 'SYNCED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {t.sync_status}
                                                </span>
                                                {(t.paid_amount ?? 0) < t.total_amount && (
                                                    <span className="text-[10px] px-1 rounded bg-red-100 text-red-700 font-bold">
                                                        PARTIAL
                                                    </span>
                                                )}
                                                <button 
                                                    onClick={() => handlePrint(t)}
                                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                                                    title="Print Receipt"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 border rounded bg-white disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 border rounded bg-white disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Print Modal */}
            {printingTransaction && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none">
                        <div className="p-4 border-b flex justify-between items-center print:hidden">
                            <h3 className="font-bold">Print Receipt</h3>
                            <button onClick={() => setPrintingTransaction(null)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto bg-gray-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
                            <Receipt transaction={printingTransaction} company={companyInfo} />
                        </div>

                        <div className="p-4 border-t bg-white flex justify-end gap-2 print:hidden">
                            <button 
                                onClick={() => setPrintingTransaction(null)}
                                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Print Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
