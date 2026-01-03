import { useState, useEffect } from 'react';
import { stores } from '@/lib/storage';
import { SyncEngine } from '@/services/sync';
import type { Partner } from '@/types';
import { PartnerSchema } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Users, ShoppingBag, Truck } from 'lucide-react';

export default function PartnerMaster() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Partner>>({
        name: '',
        is_supplier: false,
        is_customer: false,
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

        if (!formData.is_supplier && !formData.is_customer) {
            alert("Please select at least one role (Supplier or Customer)");
            return;
        }

        const newPartner: Partner = {
            id: uuidv4(),
            name: formData.name!,
            type: undefined, // Deprecated
            is_supplier: formData.is_supplier || false,
            is_customer: formData.is_customer || false,
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

        setFormData({ name: '', is_supplier: false, is_customer: false, sub_type: 'PERSONAL', phone: '', address: '' });
        setFormOpen(false);
        fetchPartners();
    };

    const getRoleBadges = (p: Partner) => {
        const badges = [];
        if (p.is_supplier) {
            badges.push(
                <span key="sup" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    <Truck className="w-3 h-3" /> Supplier
                </span>
            );
        }
        // Handle migration case where type might still be present
        if (p.type === 'SUPPLIER' && !p.is_supplier) {
            badges.push(
                <span key="sup_legacy" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    <Truck className="w-3 h-3" /> Supplier
                </span>
            );
        }

        if (p.is_customer) {
            badges.push(
                <span key="cus" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <ShoppingBag className="w-3 h-3" /> Customer
                </span>
            );
        }
        // Handle migration case where type might still be present
        if (p.type === 'CUSTOMER' && !p.is_customer) {
            badges.push(
                <span key="cus_legacy" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    <ShoppingBag className="w-3 h-3" /> Customer
                </span>
            );
        }
        return badges;
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
                                <label className="block text-sm font-medium mb-1">Roles</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm border p-2 rounded w-full cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_supplier}
                                            onChange={e => setFormData({ ...formData, is_supplier: e.target.checked })}
                                        />
                                        Supplier
                                    </label>
                                    <label className="flex items-center gap-2 text-sm border p-2 rounded w-full cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_customer}
                                            onChange={e => setFormData({ ...formData, is_customer: e.target.checked })}
                                        />
                                        Customer
                                    </label>
                                </div>
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
                                    <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                                        {p.sub_type === 'BUSINESS' ? <Users className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {p.name}
                                            <div className="flex gap-1">
                                                {getRoleBadges(p)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">{p.sub_type}</div>
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
