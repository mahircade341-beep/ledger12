import { useState, useRef } from 'react';
import { useLocalData, fileToDataURL } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

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
  const [image, setImage] = useState('');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const [threshold, setThreshold] = useState(lowStockThreshold);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const { data: categories } = useLocalData('categories');

  const uniqueCategories = [...new Set([
    ...categories.map((c: any) => c.name),
    ...products.map((p: any) => p.category).filter(Boolean)
  ])].sort();

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.barcode || '').includes(search)) return false;
    if (lowStockOnly && p.quantity > lowStockThreshold) return false;
    return true;
  });

  const resetForm = () => {
    setName(''); setQuantity(0); setWholesalePrice(0); setRetailPrice(0);
    setCategory(''); setSupplier(''); setSupplierPhone(''); setBarcode(''); setImage(''); setEditId(null);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const dataUrl = await fileToDataURL(file); setImage(dataUrl); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setLoading(true);
    const data = { name: name.trim(), quantity, wholesalePrice, retailPrice, category, supplier, supplierPhone, barcode, image: image || undefined };
    if (editId) {
      update(editId, data as any);
    } else {
      add({ userId: userId as any, ...data } as any);
    }
    resetForm();
    setLoading(false);
  };

  const editProduct = (p: any) => {
    setName(p.name); setQuantity(p.quantity); setWholesalePrice(p.wholesalePrice);
    setRetailPrice(p.retailPrice); setCategory(p.category || ''); setSupplier(p.supplier || '');
    setSupplierPhone(p.supplierPhone || ''); setBarcode(p.barcode || ''); setImage(p.image || ''); setEditId(p._id);
  };

  const handleDelete = (id: string) => { if (confirm('Delete this product?')) remove(id); };

  const lowStockCount = products.filter((p) => p.quantity <= lowStockThreshold).length;

  const handleThresholdChange = (val: number) => {
    const v = Math.max(1, Math.min(100, val));
    setThreshold(v);
    localStorage.setItem('dl-low-stock-threshold', v.toString());
  };

  const criticalCount = products.filter((p) => p.quantity <= 0).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Stock Management</h1><p className="page-subtitle">Manage your inventory & suppliers</p></div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && <span className="badge-red">{criticalCount} out of stock</span>}
          {lowStockCount > 0 && <span className="badge-amber">{lowStockCount} low stock</span>}
        </div>
      </div>

      {/* Low-Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            <span className="text-sm text-amber-400 font-medium">{lowStockCount} product{lowStockCount !== 1 ? 's' : ''} running low</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Threshold:</label>
            <div className="flex items-center gap-1.5">
              <input type="range" min={1} max={50} value={threshold} onChange={(e) => handleThresholdChange(parseInt(e.target.value))} className="w-20 accent-amber-500" />
              <span className="text-xs font-medium text-amber-400 w-6">{threshold}</span>
            </div>
            <button onClick={() => setLowStockOnly(true)} className="btn-secondary btn-sm text-xs">View All</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{editId ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Product Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Cooking Oil 1L" required /></div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" placeholder="e.g. Food" list="cat-list" />
                  <datalist id="cat-list">{uniqueCategories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barcode</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input-field flex-1" placeholder="Scan or type" />
                    <button type="button" onClick={() => setShowScanner(true)}
                      className="shrink-0 flex items-center justify-center w-10 rounded-lg border bg-[var(--item-bg)] border-[var(--border-color)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                      title="Scan barcode with camera">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity</label><input type="number" min={0} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className="input-field" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Wholesale (KES)</label><input type="number" min={0} value={wholesalePrice} onChange={(e) => setWholesalePrice(parseInt(e.target.value) || 0)} className={`input-field ${wholesalePrice <= 0 ? 'border-amber-500/40' : ''}`} /></div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Retail Price (KES) *</label><input type="number" min={0} value={retailPrice} onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)} className="input-field" required /></div>
              </div>
              {wholesalePrice <= 0 && retailPrice > 0 && (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  <p className="text-xs text-amber-400/90">No wholesale price set — profit tracking will be incomplete for this product.</p>
                </div>
              )}
              {/* Product Image */}
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 mt-1">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Product Image</p>
                <div className="flex items-center gap-3">
                  {image ? (
                    <div className="relative">
                      <img src={image} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200/30" />
                      <button type="button" onClick={() => setImage('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ) : (
                    <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200/30 flex items-center justify-center cursor-pointer hover:border-cyan-400/50 transition-colors">
                      <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  <span className="text-xs text-[var(--text-muted)]">Upload product photo (optional)</span>
                </div>
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
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded accent-amber-500" /> Low stock only
                </label>
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-[180px] pl-8" placeholder="Search..." />
                </div>
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
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded object-cover shrink-0" />}
                          <span className="text-[var(--text-primary)] font-medium truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[var(--text-muted)] hidden sm:table-cell">{p.category || '—'}</td>
                      <td className={`py-2.5 px-2 text-right ${p.quantity <= 0 ? 'text-red-400 font-medium' : p.quantity <= lowStockThreshold ? 'text-amber-400 font-medium' : 'text-[var(--text-secondary)]'}`}>{p.quantity}</td>
                      <td className="py-2.5 px-2 text-right text-[var(--text-muted)] hidden sm:table-cell">KES {p.wholesalePrice.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right text-cyan-400 font-medium">KES {p.retailPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-[var(--text-muted)] hidden lg:table-cell text-xs">{p.supplier || '—'}</td>
                      <td className="py-2.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => editProduct(p)} className="btn-ghost p-1.5" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button>
                          <button onClick={() => handleDelete(p._id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
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

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => { setBarcode(code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode"
        />
      )}
    </div>
  );
}
