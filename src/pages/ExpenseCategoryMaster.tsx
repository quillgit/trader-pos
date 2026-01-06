import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { ExpenseCategory } from '@/types';
import { ExpenseCategorySchema } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ExpenseCategoryMaster() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editId, setEditId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    });

    const fetchCategories = async () => {
        const keys = await stores.masters.expense_categories.keys();
        const items: ExpenseCategory[] = [];
        for (const key of keys) {
            const item = await stores.masters.expense_categories.getItem<ExpenseCategory>(key);
            if (item) items.push(item);
        }
        setCategories(items.sort((a, b) => a.name.localeCompare(b.name)));
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newCategory: ExpenseCategory = {
            id: editId || uuidv4(),
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            created_at: editId ? (categories.find(c => c.id === editId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Validate
        const result = ExpenseCategorySchema.safeParse(newCategory);
        if (!result.success) {
            toast.error('Invalid data: ' + result.error.message);
            return;
        }

        // Save Local
        await stores.masters.expense_categories.setItem(newCategory.id, newCategory);

        // Add to Sync Queue
        await SyncEngine.addToQueue('expense_category', editId ? 'update' : 'create', newCategory);

        // Refresh UI
        setFormData({ name: '', description: '', is_active: true });
        setFormOpen(false);
        setEditId(null);
        fetchCategories();
        toast.success(editId ? 'Category updated' : 'Category created');
    };

    const handleEdit = (category: ExpenseCategory) => {
        setEditId(category.id);
        setFormData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active
        });
        setFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        
        // Logical delete or physical? Let's do physical for now as it's master data, 
        // but typically we should check usage. For simplicity, just delete.
        await stores.masters.expense_categories.removeItem(id);
        await SyncEngine.addToQueue('expense_category', 'delete', { id });
        fetchCategories();
        toast.success('Category deleted');
    };

    const handleCancel = () => {
        setFormOpen(false);
        setEditId(null);
        setFormData({ name: '', description: '', is_active: true });
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Expense Categories</h2>
                <button
                    onClick={() => setFormOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Category
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map(category => (
                    <div key={category.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg">{category.name}</h3>
                                <p className="text-sm text-gray-500">{category.description || 'No description'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(category)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {category.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">
                            {editId ? 'Edit Category' : 'New Category'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium">Active</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
