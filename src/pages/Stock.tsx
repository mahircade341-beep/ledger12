import { useState, useRef, useMemo } from 'react';
import { useLocalData, fileToDataURL } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Stock() {
  const { userId } = useAuth();
  const { data: products, add, update } = useLocalData('products');
  const { add: addAdjustment } = useLocalData('stockAdjustments');

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.supplier || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, search]);

  const handleSelectProduct = (p: any) => {
    setName(p.name);
    setBarcode(p.barcode || '');
    setWholesalePrice(p.wholesalePrice || 0);
    setRetailPrice(p.retailPrice || 0);
    setSupplier(p.supplier || '');
    setSupplierPhone(p.supplierPhone || '');
    setImage(p.image || '');
    setQuantity(0);  // reset quantity so they enter how many to add
    setEditId(p._id);
    setSearch('');
  };

  const resetForm = () => {
    setName(''); setQuantity(0); setWholesalePrice(0); setRetailPrice(0);
    setSupplier(''); setSupplierPhone(''); setBarcode(''); setImage(''); setEditId(null);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const dataUrl = await fileToDataURL(file); setImage(dataUrl); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setLoading(true);
    const data = { name: name.trim(), quantity, wholesalePrice, retailPrice, supplier, supplierPhone, barcode, image: image || undefined };

    if (editId) {
      // Update existing product — log the stock change
      const existing = products.find((p: any) => p._id === editId);
      const prevQty = existing?.quantity || 0;
      update(editId, data as any);
      const diff = quantity - prevQty;
      if (diff !== 0) {
        addAdjustment({
          userId: userId as any,
          productId: editId,
          productName: name.trim(),
          quantityChange: diff,
          previousQuantity: prevQty,
          newQuantity: quantity,
          type: diff > 0 ? 'restock' : 'adjustment',
          notes: diff > 0 ? 'Stock added' : 'Stock reduced',
        } as any);
      }
    } else {
      // New product
      const newId = add({ userId: userId as any, ...data } as any);
      if (quantity > 0) {
        addAdjustment({
          userId: userId as any,
          productId: newId,
          productName: name.trim(),
          quantityChange: quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          type: 'restock',
          notes: 'Initial stock',
        } as any);
      }
    }

    resetForm();
    setLoading(false);
  };

  // All core fields required — only dealer (supplier) info, barcode, and image are optional
  const requiredFieldsFilled =
    name.trim() !== '' &&
    quantity > 0 &&
    wholesalePrice > 0 &&
    retailPrice > 0;
  const totalProducts = products.length;
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStockCount = products.filter((p: any) => p.quantity <= 0).length;

  return (
    <div className="space-y-6">
      {/* V2 Header with stats */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Stock Input</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Add new products or restock existing inventory</p>
          </div>
        </div>
        {/* V2 Stat cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="stat-v2">
            <span className="stat-label-v2">Total Products</span>
            <span className="stat-value-v2">{totalProducts}</span>
          </div>
          {outOfStockCount > 0 && (
            <div className="stat-v2 border border-red-500/20 bg-red-500/5">
              <span className="stat-label-v2">Out of Stock</span>
              <span className="stat-value-v2 text-red-400">{outOfStockCount}</span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="stat-v2 border border-amber-500/20 bg-amber-500/5">
              <span className="stat-label-v2">Low Stock</span>
              <span className="stat-value-v2 text-amber-400">{lowStockCount}</span>
            </div>
          )}
          {outOfStockCount === 0 && lowStockCount === 0 && (
            <div className="stat-v2 stat-v2-accent col-span-2">
              <span className="stat-label-v2">Status</span>
              <span className="stat-value-v2 text-emerald-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                All Stocked
              </span>
            </div>
          )}
        </div>
      </div>

      {/* V2 Search existing products to restock */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              className="input-v2 w-full pl-9" placeholder="Search existing products to restock..." />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="btn-ghost p-2 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* V2 Quick product results */}
        {filteredProducts.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-lg glass-v2">
            {filteredProducts.map((p: any) => (
              <button key={p._id} type="button" onClick={() => handleSelectProduct(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[var(--nav-hover-bg)] transition-all border-b border-[var(--border-color)] last:border-0 first:rounded-t-xl last:rounded-b-xl">
                {p.image ? (
                  <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-[var(--border-color)]" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-dim)] to-[var(--accent-primary)]/10 flex items-center justify-center text-sm shrink-0">📦</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge-v2">
                      Stock: <strong className={p.quantity <= 0 ? 'text-red-400' : 'text-emerald-400'}>{p.quantity}</strong>
                    </span>
                    {p.barcode && <span className="text-xs font-mono text-[var(--text-muted)]">{p.barcode}</span>}
                  </div>
                </div>
                <span className="text-xs text-[var(--accent-primary)] font-medium shrink-0 flex items-center gap-1">
                  Restock
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </span>
              </button>
            ))}
          </div>
        )}
        {search && filteredProducts.length === 0 && (
          <div className="mt-2 p-3 rounded-xl glass-v2 border border-dashed border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              No products match "<strong className="text-[var(--text-secondary)]">{search}</strong>"
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Fill the form below to <span className="text-[var(--accent-primary)]">add a new product</span></p>
          </div>
        )}
      </div>

      {/* V2 Add Stock Form */}
      <div className="w-full">
        <div className="card-v2">
          {/* V2 header with gradient accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/30 rounded-t-xl -mt-[1px] mx-auto" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-blue-500 flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <p className="text-xs text-[var(--text-muted)]">Fill in the details and commit to inventory</p>
            </div>
            {editId && (
              <span className="badge-v2-info ml-auto">Editing</span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Product Name <span className="text-[var(--accent-primary)]">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-v2 w-full" placeholder="e.g. Cooking Oil 1L" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barcode / QR</label>
                <div className="flex gap-1.5">
                  <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input-v2 flex-1 min-w-0" placeholder="Scan or type" />
                  <button type="button" onClick={() => setShowScanner(true)}
                    className="shrink-0 flex items-center justify-center w-10 rounded-lg border border-[var(--border-color)] bg-[var(--item-bg)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] text-[var(--text-muted)] transition-all"
                    title="Scan barcode with camera">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                    </svg>
                  </button>
                </div>
              </div>                <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity <span className="text-[var(--accent-primary)]">*</span></label>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className={`input-v2 w-full ${quantity <= 0 ? 'border-amber-500/40' : ''}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Wholesale (KES) <span className="text-[var(--accent-primary)]">*</span></label>
                <input type="number" min={1} value={wholesalePrice} onChange={(e) => setWholesalePrice(parseInt(e.target.value) || 0)} className={`input-v2 w-full ${wholesalePrice <= 0 ? 'border-amber-500/40' : ''}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Retail Price (KES) <span className="text-[var(--accent-primary)]">*</span></label>
                <input type="number" min={1} value={retailPrice} onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)} className="input-v2 w-full" required />
              </div>
            </div>

            {wholesalePrice <= 0 && (
              <div className="alert-v2-warning">
                <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-xs text-amber-400/90">Wholesale price is required — it powers profit tracking in Insights.</p>
              </div>
            )}

            {/* V2 Product Image */}
            <div className="divider-v2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Product Image</span>
            </div>
            <div className="flex items-center gap-3">
              {image ? (
                <div className="relative">
                  <img src={image} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-[var(--border-color)] shadow-sm" />
                  <button type="button" onClick={() => setImage('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform hover:scale-110">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--accent-dim)]/10 transition-all group">
                  <svg className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <span className="text-xs text-[var(--text-muted)]">Upload product photo <span className="opacity-60">(optional)</span></span>
            </div>

            {/* V2 Supplier Info — optional */}
            <div className="divider-v2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Supplier Info <span className="font-normal normal-case opacity-60">(optional)</span></span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Name</label><input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-v2 w-full" placeholder="e.g. Bidco" /></div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Phone</label><input type="tel" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="input-v2 w-full" placeholder="e.g. 07XX XXX XXX" /></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={!requiredFieldsFilled || loading} className="btn-v2-primary flex-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Saving...
                  </span>
                ) : editId ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Update Product
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Commit Stock
                  </span>
                )}
              </button>
              {editId && <button type="button" onClick={resetForm} className="btn-v2-secondary">Cancel</button>}
            </div>
            {!requiredFieldsFilled && (
              <div className="alert-v2-warning mt-1">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-xs text-amber-400">
                  Fill in <strong>Product Name</strong>, <strong>Quantity</strong>, <strong>Wholesale</strong>, and <strong>Retail Price</strong> to commit stock
                </p>
              </div>
            )}
          </form>
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
