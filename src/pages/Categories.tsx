import { useState } from 'react';
import { useLocalData, genId } from '../hooks/useLocalData';

export default function Categories() {
  const { data: categories, add, update, remove } = useLocalData('categories');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');

  const filtered = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // Check duplicate
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Category already exists');
      return;
    }
    add({ name: trimmed } as any);
    setName('');
  };

  const startEdit = (cat: any) => {
    setEditId(cat._id);
    setEditName(cat.name);
  };

  const saveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditId(null); return; }
    if (categories.some((c) => c._id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Category already exists');
      return;
    }
    update(id, { name: trimmed } as any);
    setEditId(null);
    setEditName('');
  };

  const handleDelete = (id: string, catName: string) => {
    if (confirm(`Delete category "${catName}"? Products using this category will keep the name but won't be linked.`)) {
      remove(id);
    }
  };

  // Count products per category
  const productCounts: Record<string, number> = {};
  try {
    const raw = localStorage.getItem('dl-products');
    if (raw) {
      const products = JSON.parse(raw);
      products.forEach((p: any) => {
        if (p.category) {
          productCounts[p.category] = (productCounts[p.category] || 0) + 1;
        }
      });
    }
  } catch {}

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your inventory with product categories</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Add category form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create Category</h2>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field flex-1"
                placeholder="e.g. Food, Beverages, Household"
                required
              />
              <button type="submit" className="btn-primary whitespace-nowrap">Add</button>
            </form>
            <p className="text-xs text-[var(--text-muted)] mt-2">Categories help organize products in Stock and POS.</p>
          </div>

          {/* Quick tip */}
          <div className="card mt-4 border-cyan-500/20">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">💡</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Using Categories</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  After creating categories, go to <strong>Stock</strong> and assign them to products. 
                  The POS will group products by category for faster checkout.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories list */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                All Categories ({categories.length})
              </h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field max-w-[180px]"
                placeholder="🔍 Filter..."
              />
            </div>

            {categories.length === 0 && !search && (
              <div className="text-center py-12">
                <span className="text-4xl">🏷️</span>
                <p className="text-[var(--text-muted)] text-sm mt-3">No categories yet. Create your first one above!</p>
              </div>
            )}

            {filtered.length === 0 && search && (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)] text-sm">No categories match your search</p>
              </div>
            )}

            <div className="space-y-2">
              {filtered.map((cat: any) => (
                <div
                  key={cat._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-surface2)]/50 hover:bg-[var(--bg-surface2)]/80 transition-colors group"
                >
                  {editId === cat._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(cat._id);
                          if (e.key === 'Escape') setEditId(null);
                        }}
                      />
                      <button onClick={() => saveEdit(cat._id)} className="btn-primary btn-sm">Save</button>
                      <button onClick={() => setEditId(null)} className="btn-ghost text-xs">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center text-base shrink-0">
                          🏷️
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{cat.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {productCounts[cat.name] || 0} product{productCounts[cat.name] !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(cat)}
                          className="btn-ghost p-1.5"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id, cat.name)}
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
