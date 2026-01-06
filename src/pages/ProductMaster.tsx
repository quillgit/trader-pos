import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Product } from '@/types';
import { ProductSchema } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, Edit2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { toast } from 'react-hot-toast';


export default function ProductMaster() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        unit: 'kg',
        category: 'General',
        price_buy: 0,
        price_sell: 0
    });

    const fetchProducts = async () => {
        const keys = await stores.masters.products.keys();
        const items: Product[] = [];
        for (const key of keys) {
            const item = await stores.masters.products.getItem<Product>(key);
            if (item) items.push(item);
        }
        setProducts(items);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newProduct: Product = {
            id: editId || uuidv4(),
            name: formData.name,
            unit: formData.unit,
            category: formData.category,
            price_buy: Number(formData.price_buy),
            price_sell: Number(formData.price_sell),
            updated_at: new Date().toISOString()
        };

        // Validate
        const result = ProductSchema.safeParse(newProduct);
        if (!result.success) {
            toast.error('Invalid data: ' + result.error.message);
            return;
        }

        // Save Local
        await stores.masters.products.setItem(newProduct.id, newProduct);

        // Add to Sync Queue
        await SyncEngine.addToQueue('product', editId ? 'update' : 'create', newProduct);

        // Refresh UI
        setFormData({ name: '', unit: 'kg', category: 'General', price_buy: 0, price_sell: 0 });
        setFormOpen(false);
        setEditId(null);
        fetchProducts();
    };

    const handleEdit = (product: Product) => {
        setEditId(product.id);
        setFormData({
            name: product.name,
            unit: product.unit,
            category: product.category,
            price_buy: product.price_buy,
            price_sell: product.price_sell
        });
        setFormOpen(true);
    };

    const handleCancel = () => {
        setFormOpen(false);
        setEditId(null);
        setFormData({ name: '', unit: 'kg', category: 'General', price_buy: 0, price_sell: 0 });
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Products</h2>
                <button
                    onClick={() => setFormOpen(!isFormOpen)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-4 rounded-md border shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                className="w-full border rounded px-2 py-1"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Unit</label>
                                <input
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Category</label>
                                <input
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Buy Price</label>
                                <MoneyInput
                                    value={formData.price_buy}
                                    onChange={val => setFormData({ ...formData, price_buy: val })}
                                    className="px-2 py-1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Sell Price</label>
                                <MoneyInput
                                    value={formData.price_sell}
                                    onChange={val => setFormData({ ...formData, price_sell: val })}
                                    className="px-2 py-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={handleCancel} className="px-3 py-1 border rounded text-sm">Cancel</button>
                            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                    placeholder="Search items..."
                    className="w-full pl-9 pr-4 py-2 border rounded-md"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white border rounded-md overflow-hidden">
                {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No products found.</div>
                ) : (
                    <ul className="divide-y">
                        {filteredProducts.map(p => (
                            <li key={p.id} className="p-3 hover:bg-gray-50 flex justify-between items-center group">
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.category} • {p.unit}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right text-sm">
                                        <div className="text-green-600">Buy: {formatCurrency(p.price_buy)}</div>
                                        <div className="text-blue-600">Sell: {formatCurrency(p.price_sell)}</div>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(p)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Edit Product"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
