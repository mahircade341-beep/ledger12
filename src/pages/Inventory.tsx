import { useState, useMemo, useRef } from 'react';
import { useLocalData, fileToDataURL } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Inventory() {
  const { userId } = useAuth();
  const { data: products, update, remove } = useLocalData('products');
  const { data: transactions } = useLocalData('transactions');
  const { data: categories } = useLocalData('categories');
  const { data: adjustments, add: addAdjustment } = useLocalData('stockAdjustments');

  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'category'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [threshold, setThreshold] = useState(lowStockThreshold);
  const [showScanner, setShowScanner] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(0);
  const [editWholesale, setEditWholesale] = useState(0);
  const [editRetail, setEditRetail] = useState(0);
  const [editCategory, setEditCategory] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editSupplierPhone, setEditSupplierPhone] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalProducts = products.length;
  const totalStock = products.reduce((s: number, p: any) => s + (p.quantity || 0), 0);
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const outOfStockCount = products.filter((p: any) => p.quantity <= 0).length;
  const totalValue = products.reduce((s: number, p: any) => s + (p.retailPrice || 0) * (p.quantity || 0), 0);

  // Recent stock movements
  const recentMovements = useMemo(() => {
    return transactions.slice(0, 20).flatMap((t: any) =>
      (t.items || []).map((item: any) => ({
        name: item.name,
        quantity: -item.quantity,
        date: new Date(t._creationTime || Date.now()),
        type: 'sale' as const,
      }))
    ).slice(0, 30);
  }, [transactions]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: any) => { if (p.category) cats.add(p.category); });
    categories.forEach((c: any) => { if (c.name) cats.add(c.name); });
    return Array.from(cats).sort();
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((p: any) => p.category === categoryFilter);
    }
    if (lowStockOnly) {
      result = result.filter((p: any) => p.quantity <= lowStockThreshold);
    }
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'quantity': return (a.quantity || 0) - (b.quantity || 0);
        case 'price': return (a.retailPrice || 0) - (b.retailPrice || 0);
        case 'category': return (a.category || '').localeCompare(b.category || '');
        default: return 0;
      }
    });
    return result;
  }, [products, search, categoryFilter, sortBy, lowStockOnly, lowStockThreshold]);

  const handleThresholdChange = (val: number) => {
    const v = Math.max(1, Math.min(100, val));
    setThreshold(v);
    localStorage.setItem('dl-low-stock-threshold', v.toString());
  };

  const openEdit = (p: any) => {
    setEditModal(p);
    setEditName(p.name);
    setEditQty(p.quantity);
    setEditWholesale(p.wholesalePrice);
    setEditRetail(p.retailPrice);
    setEditCategory(p.category || '');
    setEditBarcode(p.barcode || '');
    setEditSupplier(p.supplier || '');
    setEditSupplierPhone(p.supplierPhone || '');
    setEditImage(p.image || '');
  };

  const handleEditSave = async () => {
    if (!editModal || !editName.trim()) return;
    setEditLoading(true);

    const prevQty = editModal.quantity || 0;
    await update(editModal._id, {
      name: editName.trim(),
      quantity: editQty,
      wholesalePrice: editWholesale,
      retailPrice: editRetail,
      category: editCategory,
      barcode: editBarcode,
      supplier: editSupplier,
      supplierPhone: editSupplierPhone,
      image: editImage || undefined,
    } as any);

    // Log stock adjustment if quantity changed
    const diff = editQty - prevQty;
    if (diff !== 0 && userId) {
      addAdjustment({
        userId: userId as any,
        productId: editModal._id,
        productName: editName.trim(),
        quantityChange: diff,
        previousQuantity: prevQty,
        newQuantity: editQty,
        type: diff > 0 ? 'restock' : 'adjustment',
        notes: diff > 0 ? 'Manual restock' : 'Manual reduction',
      } as any);
    }

    setEditLoading(false);
    setEditModal(null);
  };

  const handleImageEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const dataUrl = await fileToDataURL(file); setEditImage(dataUrl); }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) remove(id);
  };

  const criticalCount = products.filter((p: any) => p.quantity <= 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Inventory</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage your products — edit, delete, and monitor stock levels</p>
        </div>
        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && <span className="badge-red">{criticalCount} out of stock</span>}
          {lowStockCount > 0 && <span className="badge-amber">{lowStockCount} low stock</span>}
        </div>
      </div>

      {/* Low-Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card stat-card-default">
          <span className="stat-label">Products</span>
          <span className="stat-value">{totalProducts}</span>
        </div>
        <div className="stat-card stat-card-default">
          <span className="stat-label">Total Stock</span>
          <span className="stat-value">{totalStock.toLocaleString()}</span>
        </div>
        <div className="stat-card stat-card-default">
          <span className="stat-label">Stock Value</span>
          <span className="stat-value text-sm sm:text-lg">KES {totalValue.toLocaleString()}</span>
        </div>
        <div className={`stat-card ${criticalCount > 0 ? 'stat-card-red' : 'stat-card-emerald'}`}>
          <span className="stat-label">Out of Stock</span>
          <span className="stat-value">{criticalCount}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-9" placeholder="Search products, barcodes..." />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
            showFilters || lowStockOnly
              ? 'border-[var(--border-hover)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
              : 'border-[var(--border-color)] bg-[var(--item-bg)] text-[var(--text-secondary)]'
          }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filters{(lowStockOnly || categoryFilter) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded accent-amber-500" /> Low stock only
        </label>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 rounded-xl border bg-[var(--bg-surface2)]/50 border-[var(--border-color)]">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase mb-1">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="select-field text-sm">
                <option value="">All Categories</option>
                {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                className="select-field text-sm">
                <option value="name">Name</option>
                <option value="quantity">Stock Level</option>
                <option value="price">Price</option>
                <option value="category">Category</option>
              </select>
            </div>
            {(categoryFilter || lowStockOnly) && (
              <button onClick={() => { setCategoryFilter(''); setLowStockOnly(false); setSortBy('name'); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline mt-4">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            All Products ({filteredProducts.length})
          </h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-10">
            <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm text-[var(--text-muted)]">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border-white)]">
                  <th className="text-left py-2.5 pr-2 font-medium">Product</th>
                  <th className="text-left py-2.5 px-2 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-right py-2.5 px-2 font-medium">Qty</th>
                  <th className="text-right py-2.5 px-2 font-medium hidden sm:table-cell">Wholesale</th>
                  <th className="text-right py-2.5 px-2 font-medium">Retail</th>
                  <th className="text-left py-2.5 px-2 font-medium hidden lg:table-cell">Supplier</th>
                  <th className="text-right py-2.5 pl-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p: any) => (
                  <tr key={p._id} className="border-b border-[var(--border-white)]/50 hover:bg-[var(--bg-surface2)]/50 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-[var(--bg-surface3)] flex items-center justify-center text-xs shrink-0">📦</div>
                        )}
                        <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px] block">{p.name}</span>
                        {p.barcode && <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">{p.barcode}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-[var(--text-muted)] hidden sm:table-cell">{p.category || '—'}</td>
                    <td className={`py-2.5 px-2 text-right font-medium ${
                      p.quantity <= 0 ? 'text-red-400' :
                      p.quantity <= lowStockThreshold ? 'text-amber-400' :
                      'text-[var(--text-secondary)]'
                    }`}>{p.quantity}</td>
                    <td className="py-2.5 px-2 text-right text-[var(--text-muted)] hidden sm:table-cell">KES {p.wholesalePrice?.toLocaleString() || '0'}</td>
                    <td className="py-2.5 px-2 text-right text-[var(--text-primary)] font-medium">KES {p.retailPrice?.toLocaleString() || '0'}</td>
                    <td className="py-2.5 px-2 text-[var(--text-muted)] hidden lg:table-cell text-xs">{p.supplier || '—'}</td>
                    <td className="py-2.5 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="btn-ghost p-1.5" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(p._id, p.name)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Log */}
      {(() => {
        const hasAdjustments = adjustments.length > 0 || recentMovements.length > 0;
        if (!hasAdjustments) return null;

        const combined = [
          // From stock_adjustments table
          ...adjustments.map((a: any) => ({
            name: a.productName,
            quantity: a.quantityChange,
            date: new Date(a._creationTime || Date.now()),
            type: a.type as string,
            notes: a.notes || '',
          })),
          // From sales (transactions)
          ...recentMovements,
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);

        const displayed = showAllLog ? combined : combined.slice(0, 20);

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
                </svg>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Stock Adjustment Log</h2>
                <span className="text-[10px] text-[var(--text-muted)] font-medium bg-[var(--bg-surface3)] px-2 py-0.5 rounded-full">
                  {combined.length} entries
                </span>
              </div>
              {combined.length > 20 && (
                <button onClick={() => setShowAllLog(!showAllLog)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">
                  {showAllLog ? 'Show less' : 'View all'}
                </button>
              )}
            </div>
            <div className="space-y-0.5 max-h-72 overflow-y-auto scrollbar-thin">
              {displayed.map((m: any, i: number) => {
                const isPositive = m.quantity > 0;
                const dateStr = m.date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
                const timeStr = m.date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--nav-hover-bg)] transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {isPositive ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{m.quantity}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">•</span>
                          <span className={`text-[10px] font-medium ${
                            m.type === 'restock' ? 'text-emerald-400/70' :
                            m.type === 'adjustment' ? 'text-amber-400/70' :
                            'text-red-400/70'
                          }`}>
                            {m.type === 'restock' ? 'Restock' : m.type === 'adjustment' ? 'Adjustment' : 'Sale'}
                          </span>
                          {m.notes && (
                            <>
                              <span className="text-[10px] text-[var(--text-muted)]">•</span>
                              <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[100px]">{m.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:block group-hover:text-[var(--text-secondary)] transition-colors">
                      {dateStr} {timeStr}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 sm:hidden">{dateStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>In Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Low Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Out of Stock</span>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="w-full max-w-lg glass-strong rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Product</h2>
              <button onClick={() => setEditModal(null)} className="btn-ghost p-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Product Name *</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field w-full" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
                  <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="input-field" list="cat-list-edit" />
                  <datalist id="cat-list-edit">{uniqueCategories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Barcode</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} className="input-field flex-1" />
                    <button type="button" onClick={() => setShowScanner(true)}
                      className="shrink-0 w-10 rounded-lg border bg-[var(--item-bg)] border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity</label>
                  <input type="number" min={0} value={editQty} onChange={(e) => setEditQty(parseInt(e.target.value) || 0)} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Wholesale (KES)</label>
                  <input type="number" min={0} value={editWholesale} onChange={(e) => setEditWholesale(parseInt(e.target.value) || 0)} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Retail (KES) *</label>
                  <input type="number" min={0} value={editRetail} onChange={(e) => setEditRetail(parseInt(e.target.value) || 0)} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
                  <input type="text" value={editSupplier} onChange={(e) => setEditSupplier(e.target.value)} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier Phone</label>
                  <input type="tel" value={editSupplierPhone} onChange={(e) => setEditSupplierPhone(e.target.value)} className="input-field w-full" />
                </div>
              </div>

              {/* Image */}
              <div className="border-t border-[var(--border-white)] pt-3">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Product Image</p>
                <div className="flex items-center gap-3">
                  {editImage ? (
                    <div className="relative">
                      <img src={editImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-[var(--border-color)]" />
                      <button type="button" onClick={() => setEditImage('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
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
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageEdit} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleEditSave} disabled={editLoading} className="btn-primary flex-1">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal (shared) */}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            if (editModal) setEditBarcode(code);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
          title="Scan Barcode"
        />
      )}
    </div>
  );
}
