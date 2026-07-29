import { useState, useRef } from 'react';
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
  const [barcode, setBarcode] = useState('');
  const [image, setImage] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);

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

  const totalProducts = products.length;
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStockCount = products.filter((p: any) => p.quantity <= 0).length;

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Stock Input</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Add new products or restock existing inventory</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-secondary)]">{totalProducts} products</span>
          {outOfStockCount > 0 && <span className="badge-red">{outOfStockCount} out</span>}
          {lowStockCount > 0 && <span className="badge-amber">{lowStockCount} low</span>}
        </div>
      </div>

      {/* Add Stock Form */}
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--btn-primary-bg)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <p className="text-xs text-[var(--text-muted)]">Fill in the details and commit to inventory</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Product Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Cooking Oil 1L" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barcode / QR</label>
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
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity</label>
                <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Wholesale Price (KES)</label>
                <input type="number" min={0} value={wholesalePrice} onChange={(e) => setWholesalePrice(parseInt(e.target.value) || 0)} className={`input-field ${wholesalePrice <= 0 ? 'border-amber-500/40' : ''}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Retail Price (KES) *</label>
                <input type="number" min={0} value={retailPrice} onChange={(e) => setRetailPrice(parseInt(e.target.value) || 0)} className="input-field" required />
              </div>
            </div>

            {wholesalePrice <= 0 && retailPrice > 0 && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <p className="text-xs text-amber-400/90">No wholesale price set — profit tracking will be incomplete for this product.</p>
              </div>
            )}

            {/* Product Image */}
            <div className="border-t border-[var(--border-white)] pt-3 mt-1">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Product Image</p>
              <div className="flex items-center gap-3">
                {image ? (
                  <div className="relative">
                    <img src={image} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-[var(--border-color)]" />
                    <button type="button" onClick={() => setImage('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-[var(--border-hover)] transition-colors">
                    <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <span className="text-xs text-[var(--text-muted)]">Upload product photo (optional)</span>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="border-t border-[var(--border-white)] pt-3 mt-1">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Supplier Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supplier Name</label><input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input-field" placeholder="e.g. Bidco" /></div>
                <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Supplier Phone</label><input type="tel" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="input-field" placeholder="e.g. 07XX XXX XXX" /></div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving...' : editId ? (
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
              {editId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
            </div>
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
