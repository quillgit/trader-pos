import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Partner } from '@/types';
import { PartnerSchema } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Users } from 'lucide-react';

export default function PartnerMaster() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);
    // const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<Partner>>({
        name: '',
        type: 'SUPPLIER', // Default
        sub_type: 'PERSONAL',
        phone: '',
        address: ''
    });

    const fetchPartners = async () => {
        const keys = await stores.masters.partners.keys();
        const items: Partner[] = [];
        for (const key of keys) {
            const item = await stores.masters.partners.getItem<Partner>(key);
            if (item) items.push(item);
        }
        setPartners(items);
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newPartner: Partner = {
            id: uuidv4(),
            name: formData.name!,
            type: formData.type as any,
            sub_type: formData.sub_type as any,
            phone: formData.phone || '',
            address: formData.address || '',
            updated_at: new Date().toISOString()
        };

        const result = PartnerSchema.safeParse(newPartner);
        if (!result.success) {
            alert('Error: ' + result.error.message);
            return;
        }

        await stores.masters.partners.setItem(newPartner.id, newPartner);
        await SyncEngine.addToQueue('partner', 'create', newPartner);

        setFormData({ name: '', type: 'SUPPLIER', sub_type: 'PERSONAL', phone: '', address: '' });
        setFormOpen(false);
        fetchPartners();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Partners</h2>
                <button
                    onClick={() => setFormOpen(!isFormOpen)}
                    className="bg-purple-600 text-white px-3 py-2 rounded-md flex items-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-4 rounded-md border shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Type</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="SUPPLIER">Supplier</option>
                                    <option value="CUSTOMER">Customer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Sub Type</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={formData.sub_type}
                                    onChange={e => setFormData({ ...formData, sub_type: e.target.value as any })}
                                >
                                    <option value="PERSONAL">Personal</option>
                                    <option value="BUSINESS">Business</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input
                                className="w-full border rounded px-2 py-1"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Phone</label>
                            <input
                                className="w-full border rounded px-2 py-1"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1 border rounded text-sm">Cancel</button>
                            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white border rounded-md">
                {partners.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No partners yet.</div>
                ) : (
                    <ul className="divide-y">
                        {partners.map(p => (
                            <li key={p.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${p.type === 'SUPPLIER' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.type} • {p.sub_type}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">{p.phone}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
