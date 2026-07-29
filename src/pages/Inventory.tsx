import { useState, useMemo, useEffect } from 'react';
import { useLocalData } from '../hooks/useLocalData';

export default function Inventory() {
  const { data: products } = useLocalData('products');
  const { data: transactions } = useLocalData('transactions');
  const { data: categories } = useLocalData('categories');

  const lowStockThreshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'category'>('name');
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const totalProducts = products.length;
  const totalStock = products.reduce((s: number, p: any) => s + (p.quantity || 0), 0);
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const outOfStockCount = products.filter((p: any) => p.quantity <= 0).length;
  const totalValue = products.reduce((s: number, p: any) => s + (p.retailPrice || 0) * (p.quantity || 0), 0);

  // Recent stock movements
  const recentMovements = useMemo(() => {
    // Get recent sales that affected stock
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
  }, [products, search, categoryFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Inventory</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Real-time stock levels across all products</p>
        </div>
        <div className="flex items-center gap-1.5">
          {outOfStockCount > 0 && <span className="badge-red">{outOfStockCount} out of stock</span>}
          {lowStockCount > 0 && <span className="badge-amber">{lowStockCount} low</span>}
        </div>
      </div>

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
        <div className={`stat-card ${outOfStockCount > 0 ? 'stat-card-red' : 'stat-card-emerald'}`}>
          <span className="stat-label">Out of Stock</span>
          <span className="stat-value">{outOfStockCount}</span>
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
            showFilters
              ? 'border-[var(--border-hover)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
              : 'border-[var(--border-color)] bg-[var(--item-bg)] text-[var(--text-secondary)]'
          }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filters
        </button>
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
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
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
          <div className="space-y-1.5">
            {filteredProducts.map((p: any) => (
              <div key={p._id}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all bg-[var(--item-bg)] border-[var(--border-color)] hover:border-[var(--border-hover)]">
                {/* Image */}
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface3)] flex items-center justify-center text-lg shrink-0">
                    📦
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                    {p.barcode && <span className="text-[10px] text-[var(--text-muted)] font-mono">{p.barcode}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--text-secondary)]">{p.category || '—'}</span>
                    <span className="text-xs text-[var(--text-muted)]">Retail: KES {p.retailPrice?.toLocaleString() || '0'}</span>
                    {p.wholesalePrice > 0 && (
                      <span className="text-xs text-[var(--text-muted)]">Wholesale: KES {p.wholesalePrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Stock indicator */}
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${
                    p.quantity <= 0 ? 'text-red-400' :
                    p.quantity <= lowStockThreshold ? 'text-amber-400' :
                    'text-[var(--accent-primary)]'
                  }`}>
                    {p.quantity}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">in stock</div>
                </div>

                {/* Progress bar */}
                <div className="w-16 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-[var(--bg-surface3)] overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      p.quantity <= 0 ? 'bg-red-500' :
                      p.quantity <= lowStockThreshold ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                      style={{ width: `${Math.min(100, (p.quantity / 50) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Stock Movements */}
      {recentMovements.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Recent Movements</h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {recentMovements.slice(0, 15).map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--nav-hover-bg)] transition-colors">
                <span className="text-sm text-[var(--text-primary)]">{m.name}</span>
                <span className="text-sm font-medium text-red-400">{m.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
