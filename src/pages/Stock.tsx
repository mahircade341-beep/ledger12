import { useState } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

export default function Stock() {
  const { userId } = useAuth();
  const { data: products, add, update, remove } = useLocalData('products');

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.barcode || '').includes(search)) return false;
    if (lowStockOnly && p.quantity > 5) return false;
    return true;
  });

  const resetForm = () => {
    setName(''); setQuantity(0); setWholesalePrice(0); setRetailPrice(0);
    setCategory(''); setSupplier(''); setSupplierPhone(''); setBarcode(''); setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setLoading(true);
    if (editId) {
      update(editId, { name: name.trim(), quantity, wholesalePrice, retailPrice, category, supplier, supplierPhone, barcode } as any);
    } else {
      add({ userId: userId as any, name: name.trim(), quantity, wholesalePrice, retailPrice, category, supplier, supplierPhone, barcode } as any);
    }
    resetForm();
    setLoading(false);
  };

  const editProduct = (p: any) => {
    setName(p.name); setQuantity(p.quantity); setWholesalePrice(p.wholesalePrice);
    setRetailPrice(p.retailPrice); setCategory(p.category || ''); setSupplier(p.supplier || '');
    setSupplierPhone(p.supplierPhone || ''); setBarcode(p.barcode || ''); setEditId(p._id);
  };

  const handleDelete = (id: string) => { if (confirm('Delete this product?')) remove(id); };

  const lowStockCount = products.filter((p) => p.quantity <= 5).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Stock Management</h1><p className="page-subtitle">Manage your inventory & suppliers</p></div>
        {lowStockCount > 0 && <span className="badge-amber">{lowStockCount} low stock</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{editId ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Product Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Cooking Oil 1L" required /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Category</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" placeholder="e.g. Food" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Barcode</label><input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input-field" placeholder="Scan or type" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Quantity</label><input type="number" min={0} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className="input-field" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Wholesale (KES)</label><input type="number" min={0} value={wholesalePrice} onChange={(e) => setWholesalePrice(parseInt(e.target.value) || 0)} className="input-field" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Retail Price (KES) *</label><input type="number" min={0} value={retailPrice} onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)} className="input-field" required /></div>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-1">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Supplier Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supplier Name</label><input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-field" placeholder="e.g. Bidco" /></div>
                  <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supplier Phone</label><input type="tel" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="input-field" placeholder="e.g. 07XX XXX XXX" /></div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : editId ? 'Update Product' : 'Commit Stock'}</button>
                {editId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
              </div>
            </form>
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Inventory ({products.length})</h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                  <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded accent-amber-500" /> Low stock only
                </label>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-[180px]" placeholder="🔍 Search..." />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[var(--text-muted)] border-b border-slate-200/60 dark:border-slate-800/60">
                  <th className="text-left py-2 pr-2">Product</th><th className="text-left py-2 px-2 hidden sm:table-cell">Cat</th>
                  <th className="text-right py-2 px-2">Qty</th><th className="text-right py-2 px-2 hidden sm:table-cell">Wholesale</th>
                  <th className="text-right py-2 px-2">Retail</th><th className="text-left py-2 px-2 hidden lg:table-cell">Supplier</th>
                  <th className="text-right py-2 pl-2">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p: any) => (
                    <tr key={p._id} className="border-b border-slate-200/30 dark:border-slate-800/30 hover:bg-[var(--bg-surface2)]/50 transition-colors">
                      <td className="py-2.5 pr-2 text-[var(--text-primary)] font-medium">{p.name}</td>
                      <td className="py-2.5 px-2 text-[var(--text-muted)] hidden sm:table-cell">{p.category || '—'}</td>
                      <td className={`py-2.5 px-2 text-right ${p.quantity <= 5 ? 'text-amber-400 font-medium' : 'text-[var(--text-secondary)]'}`}>{p.quantity}</td>
                      <td className="py-2.5 px-2 text-right text-[var(--text-muted)] hidden sm:table-cell">KES {p.wholesalePrice.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right text-cyan-400 font-medium">KES {p.retailPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-[var(--text-muted)] hidden lg:table-cell text-xs">{p.supplier || '—'}</td>
                      <td className="py-2.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => editProduct(p)} className="btn-ghost p-1.5" title="Edit">✏️</button>
                          <button onClick={() => handleDelete(p._id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">{search ? 'No matching products' : 'No products yet. Add your first product!'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
