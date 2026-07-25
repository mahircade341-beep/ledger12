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
              <svg className="w-5 h-5 mt-0.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
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
                className="input-field max-w-[180px] pl-8"
                placeholder="Filter..."
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 8px center; background-size: 16px;` }}
              />
            </div>

            {categories.length === 0 && !search && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
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
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{cat.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {productCounts[cat.name] || 0} product{productCounts[cat.name] !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(cat)} className="btn-ghost p-1.5" title="Rename"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button>
                        <button onClick={() => handleDelete(cat._id, cat.name)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
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
