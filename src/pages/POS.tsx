import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';

interface ReceiptData {
  id: string;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  total: number; subtotal: number; discount: number; paymentMethod: string; date: Date;
  debtorName?: string;
}

export default function POS() {
  const { userId, profile } = useAuth();
  const { data: products } = useLocalData('products');
  const { data: transactions } = useLocalData('transactions');
  const { add: addTx, remove: removeTx } = useLocalData('transactions');
  const { updateQuantity } = useLocalData('products');
  const { data: debtors, add: addDebtor, update: updateDebtor } = useLocalData('debtors');

  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'debt'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [voidTxId, setVoidTxId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [debtorSearch, setDebtorSearch] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [showDebtorDropdown, setShowDebtorDropdown] = useState(false);
  const [showNewDebtor, setShowNewDebtor] = useState(false);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtorPhone, setNewDebtorPhone] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debtorRef = useRef<HTMLInputElement>(null);

  function fmtTime(ts: number) {
    const pref = localStorage.getItem('dl-time-format') || '12h';
    if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= 'F1' && e.key <= 'F8') {
        e.preventDefault();
        const idx = parseInt(e.key.replace('F', '')) - 1;
        const inStock = products.filter((p: any) => p.quantity > 0);
        if (idx < inStock.length) addToCartDirect(inStock[idx]._id);
        return;
      }
      if (e.key === 'F9' && cart.length > 0 && !loading) { e.preventDefault(); finalizeSale(); return; }
      if (e.key === 'F10') { e.preventDefault(); setVoidTxId(transactions.length > 0 ? transactions[0]._id : null); return; }
      if (e.key === 'Escape') { setSelectedProduct(''); searchRef.current?.blur(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cart]);

  // ── Daily stats ──
  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const todaySales = useMemo(() => transactions.filter((t: any) => t._creationTime >= todayStart), [transactions, todayStart]);
  const todayTotal = todaySales.reduce((s: number, t: any) => s + t.total, 0);
  const todayCount = todaySales.length;

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter((p: any) => {
      return p.name.toLowerCase().includes(q) && (showOutOfStock || p.quantity > 0);
    }).slice(0, 5);
  }, [products, search, showOutOfStock]);

  const filteredProducts = useMemo(() =>
    products.filter((p: any) => {
      if (!showOutOfStock && p.quantity <= 0) return false;
      return p.name.toLowerCase().includes(search.toLowerCase());
    }),
    [products, search, showOutOfStock]
  );

  const quickProducts = useMemo(() => products.filter((p: any) => p.quantity > 0).slice(0, 8), [products]);

  const getPrice = useCallback((p: any) => p.retailPrice || 0, []);

  // ── Cart methods ──
  const addToCartDirect = (productId: string) => {
    const product = products.find((p: any) => p._id === productId);
    if (!product || product.quantity < 1) return;
    const price = getPrice(product);
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.product._id === product._id);
      if (existing) return prev.map((c: any) => c.product._id === product._id ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * price } : c);
      return [...prev, { product, quantity: 1, subtotal: price, _price: price }];
    });
  };

  const addToCart = () => {
    if (!selectedProduct || quantity < 1) return;
    const product = products.find((p: any) => p._id === selectedProduct);
    if (!product || quantity > product.quantity) return;
    const price = getPrice(product);
    setCart((prev: any[]) => {
      const existing = prev.find((c: any) => c.product._id === product._id);
      if (existing) return prev.map((c: any) => c.product._id === product._id ? { ...c, quantity: c.quantity + quantity, subtotal: (c.quantity + quantity) * price, _price: price } : c);
      return [...prev, { product, quantity, subtotal: quantity * price, _price: price }];
    });
    setSelectedProduct(''); setQuantity(1);
  };

  // ── Barcode scan handler ──
  const handleBarcodeScan = (code: string) => {
    const found = products.find((p: any) => p.barcode === code);
    if (found) {
      addToCartDirect(found._id);
      setSearch(found.name);
      setSuccessMsg(`Scanned: ${found.name} — KES ${getPrice(found).toLocaleString()}`);
      setTimeout(() => setSuccessMsg(''), 2500);
    } else {
      setSuccessMsg(`Product not found for barcode: ${code}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const subtotal = cart.reduce((s: number, i: any) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - discount);

  // ── Debtor ──
  const handleAddDebtor = () => {
    if (!newDebtorName.trim() || !userId) return;
    const existing = debtors.find((d: any) => d.name.toLowerCase() === newDebtorName.trim().toLowerCase());
    if (existing) {
      setSelectedDebtor(existing);
      setNewDebtorName(''); setNewDebtorPhone(''); setShowNewDebtor(false);
      return;
    }
    const id = addDebtor({
      userId: userId as any, name: newDebtorName.trim(), phone: newDebtorPhone,
      amount: 0, notes: '', status: 'active'
    } as any);
    setSelectedDebtor({ _id: id, name: newDebtorName.trim(), phone: newDebtorPhone, amount: 0 });
    setNewDebtorName(''); setNewDebtorPhone(''); setShowNewDebtor(false);
  };

  // ── Finalize ──
  const finalizeSale = () => {
    if (cart.length === 0 || !userId) return;
    if (paymentMethod === 'debt' && !selectedDebtor) {
      alert('Select a debtor or add a new one for debt sales');
      debtorRef.current?.focus();
      return;
    }
    setLoading(true); setSuccessMsg(''); setReceipt(null);
    const items = cart.map((c: any) => ({
      productId: c.product._id, name: c.product.name, quantity: c.quantity,
      price: c.product.retailPrice,
      wholesalePrice: c.product.wholesalePrice, subtotal: c.subtotal,
    }));
    const extraData: any = {};
    if (paymentMethod === 'debt' && selectedDebtor) {
      extraData.debtorId = selectedDebtor._id;
      extraData.debtorName = selectedDebtor.name;
      const currentDebtor = debtors.find((d: any) => d._id === selectedDebtor._id);
      if (currentDebtor) {
        updateDebtor(selectedDebtor._id, { amount: (currentDebtor.amount || 0) + total, status: 'active' } as any);
      }
    }
    const txId = addTx({ userId: userId as any, items, total, paymentMethod, discount, ...extraData } as any);
    cart.forEach((c: any) => {
      const p = products.find((x: any) => x._id === c.product._id);
      if (p) updateQuantity(p._id, Math.max(0, p.quantity - c.quantity));
    });
    setReceipt({ id: txId, items, total, subtotal, discount, paymentMethod, date: new Date(), debtorName: paymentMethod === 'debt' ? selectedDebtor?.name : undefined });
    setSuccessMsg(`Sale finalized! KES ${total.toLocaleString()}`);
    window.dispatchEvent(new Event('salecompleted'));
    setCart([]); setDiscount(0); setSelectedDebtor(null); setDebtorSearch(''); setLoading(false);
  };

  // ── Void ──
  const voidTransaction = (txId: string) => {
    const tx = transactions.find((t: any) => t._id === txId);
    if (!tx) return;
    tx.items.forEach((item: any) => {
      const p = products.find((x: any) => x._id === item.productId);
      if (p) updateQuantity(p._id, (p.quantity || 0) + item.quantity);
    });
    removeTx(txId);
    setVoidTxId(null);
    setSuccessMsg('Transaction voided — stock restored');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const isGod = profile?.email === 'fahmanmanka25@gmail.com';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Point of Sale</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Process customer transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {isGod && <span className="badge-blue text-[10px] px-2">GOD MODE</span>}
          <span className="text-[10px] text-[var(--text-muted)] hidden md:block">F1-F8 Quick | F9 Sale | Esc</span>
        </div>
      </div>

      {/* Daily Sales Summary */}
      {todayCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-surface2)]/50 border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            <span className="text-xs text-[var(--text-secondary)]">Today:</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">KES {todayTotal.toLocaleString()}</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{todayCount} txns</span>
        </div>
      )}

      {/* Success message */}
      {successMsg && !receipt && (
        <div className="p-3 rounded-xl text-sm flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Void Modal */}
      {voidTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setVoidTxId(null)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[var(--border-color)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Void Transaction</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">This removes the transaction and restores stock.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {transactions.slice(0, 10).map((t: any) => (
                <button key={t._id} onClick={() => voidTransaction(t._id)}
                  className="w-full text-left p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-primary)]">{new Date(t._creationTime).toLocaleDateString()} {fmtTime(t._creationTime)}</span>
                    <span className="text-red-400 font-medium">-KES {t.total.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.items.length} items · {t.paymentMethod}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setVoidTxId(null)} className="btn-secondary w-full">Close</button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0" onClick={() => setReceipt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden print:rounded-none print:shadow-none print:max-w-full" onClick={(e) => e.stopPropagation()}>
            <div ref={receiptRef} className="receipt p-6 print:p-4">
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <h2 className="text-lg font-bold text-gray-900">{profile?.storeName || 'DukaHub'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{(profile?.storeName ? profile.storeName + ' — ' : '') + 'Retail Management System'}</p>
                <p className="text-xs text-gray-400 mt-1">{receipt.date.toLocaleDateString()} {fmtTime(receipt.date.getTime())}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">#{receipt.id.slice(-8).toUpperCase()}</p>

              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
                  <span className="flex-1">Item</span><span className="w-10 text-right">Qty</span><span className="w-16 text-right">Price</span><span className="w-18 text-right">Total</span>
                </div>
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-700 py-0.5">
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="w-10 text-right text-gray-500">{item.quantity}</span>
                    <span className="w-16 text-right text-gray-500">{item.price.toLocaleString()}</span>
                    <span className="w-18 text-right font-medium">{item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>KES {receipt.subtotal.toLocaleString()}</span></div>
                {receipt.discount > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-KES {receipt.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>KES {receipt.total.toLocaleString()}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200">
                <div className="flex justify-between text-sm text-gray-600"><span>Payment</span><span className="font-medium capitalize">{receipt.paymentMethod}</span></div>
                {receipt.debtorName && <div className="flex justify-between text-sm text-gray-600 mt-1"><span>Debtor</span><span className="font-medium">{receipt.debtorName}</span></div>}
              </div>
              <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-200"><p className="text-xs text-gray-400">Thank you for your business!</p></div>
            </div>
            <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 print:hidden">
              <button onClick={() => window.print()} className="btn-primary flex-1 text-gray-900 bg-gray-900 text-white hover:bg-gray-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
              </button>
              <button onClick={() => {
                const text = `${profile?.storeName || 'DukaHub'}\n${receipt.date.toLocaleDateString()} ${fmtTime(receipt.date.getTime())}\n#${receipt.id.slice(-8).toUpperCase()}\n\n${receipt.items.map(i => `${i.name} ×${i.quantity} = KES ${i.subtotal.toLocaleString()}`).join('\n')}\n\nTotal: KES ${receipt.total.toLocaleString()}\nPayment: ${receipt.paymentMethod}${receipt.debtorName ? '\nDebtor: ' + receipt.debtorName : ''}\n\nThank you for your business!`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }} className="btn-secondary flex-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> WhatsApp</button>
              <button onClick={() => setReceipt(null)} className="btn-secondary flex-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT: 2-Column Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 xl:gap-6">

        {/* ── LEFT COLUMN: Products ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quick Select + Scanner Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Barcode Scanner Button */}
            <button onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm hover:opacity-90">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
              <span className="hidden sm:inline">Barcode</span>
              <span className="text-[10px] opacity-60">📷</span>
            </button>

            {/* Recent Sales Toggle */}
            <button onClick={() => setShowRecentSales(!showRecentSales)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                showRecentSales
                  ? 'border-[var(--border-hover)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--item-bg)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent
            </button>

            {/* Out of stock toggle */}
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer ml-auto">
              <input type="checkbox" checked={showOutOfStock} onChange={(e) => setShowOutOfStock(e.target.checked)}
                className="rounded accent-[var(--text-primary)] w-3.5 h-3.5" />
              0-stock
            </label>
          </div>

          {/* Quick Select */}
          {quickProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Quick Select</p>
                <span className="text-[10px] text-[var(--text-muted)]">F1-F8</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {quickProducts.map((p: any, idx: number) => (
                  <button key={p._id} onClick={() => addToCartDirect(p._id)}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border
                      bg-[var(--item-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">F{idx + 1}</span>
                    <span>{p.name}</span>
                    <span className="text-[var(--text-muted)]">KES {getPrice(p).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search + Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input ref={searchRef} type="text" value={search} onChange={(e) => { setSearch(e.target.value); setShowSearchSuggestions(true); }}
                className="glass-input w-full pl-9" placeholder="Search products..."
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedProduct) { addToCart(); searchRef.current?.focus(); } }}
                onFocus={() => searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)} />
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 overflow-hidden">
                  {searchSuggestions.map((p: any) => (
                    <button key={p._id} type="button"
                      onMouseDown={() => { setSelectedProduct(p._id); setQuantity(1); setSearch(''); setShowSearchSuggestions(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[var(--nav-hover-bg)] transition-colors border-b border-[var(--border-color)] last:border-0">
                      <span className="flex-1 text-[var(--text-primary)] font-medium">{p.name}</span>
                      <span className="text-xs text-[var(--accent-primary)] font-semibold">KES {getPrice(p).toLocaleString()}</span>
                      {p.quantity > 0 ? <span className="text-xs text-[var(--text-muted)]">{p.quantity} left</span> : <span className="text-xs text-red-400">Out</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales Panel */}
          {showRecentSales && (
            <div className="p-3 rounded-xl bg-[var(--bg-surface2)]/50 border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Recently Sold</p>
                <button onClick={() => setShowRecentSales(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {transactions.slice(0, 5).flatMap((t: any) => t.items || []).slice(0, 10).map((item: any, i: number) => (
                  <button key={i} onClick={() => {
                    const p = products.find((x: any) => x._id === item.productId || x.name === item.name);
                    if (p) addToCartDirect(p._id);
                  }}
                    className="px-2.5 py-1 rounded-md text-xs transition-colors border bg-[var(--item-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]">
                    {item.name}
                  </button>
                ))}
                {transactions.length === 0 && <p className="text-xs text-[var(--text-muted)]">No sales yet</p>}
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {filteredProducts.map((p: any) => (
              <button key={p._id} onClick={() => { if (p.quantity > 0) { setSelectedProduct(p._id); setQuantity(1); } }}
                className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                  p.quantity <= 0
                    ? 'opacity-40 border-[var(--border-color)]'
                    : selectedProduct === p._id
                      ? 'border-[var(--border-hover)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--item-bg)] hover:border-[var(--border-hover)] text-[var(--text-primary)]'
                }`}>
                {p.image && <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover mb-1.5" />}
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs mt-0.5 text-[var(--accent-primary)]">KES {getPrice(p).toLocaleString()}</p>
                <p className={`text-xs ${p.quantity > 0 ? 'text-[var(--text-muted)]' : 'text-red-400'}`}>
                  {p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}
                </p>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-sm text-[var(--text-muted)] text-center py-8">
                {search ? 'No products found' : 'No products in stock.'}
              </p>
            )}
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-end gap-3">
            <div className="flex-1 min-w-0 max-w-[120px]">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Qty</label>
              <input type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field"
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedProduct) addToCart(); }} />
            </div>
            <button onClick={addToCart} disabled={!selectedProduct}
              className="btn-primary flex-1">
              Add to Cart {selectedProduct ? '↵' : ''}
            </button>
            <button onClick={() => setShowScanner(true)}
              className="btn-secondary flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              </svg>
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Cart + Payment ── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Cart */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Cart ({cart.length})</h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Clear
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">Cart is empty — add products to get started</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin mb-3">
                {cart.map((item: any) => (
                  <div key={item.product._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--item-bg)] border border-[var(--border-color)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.product.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.quantity} × KES {item.product.retailPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-[var(--accent-primary)]">KES {item.subtotal.toLocaleString()}</span>
                      <button onClick={() => setCart((prev: any[]) => prev.filter((c: any) => c.product._id !== item.product._id))}
                        className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-[var(--border-color)] pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Discount</span>
                <input type="number" min={0} value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="input-field w-24 text-xs ml-auto text-right" placeholder="KES" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-red-400">
                  <span>Discount</span><span>-KES {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border-color)]">
                <span>Total</span><span>KES {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Payment</h2>

            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['cash', 'mpesa', 'debt'] as const).map((m) => (
                <button key={m} onClick={() => {
                  setPaymentMethod(m);
                  if (m !== 'debt') { setSelectedDebtor(null); setDebtorSearch(''); setShowNewDebtor(false); }
                }}
                  className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-200 border ${
                    paymentMethod === m
                      ? 'border-[var(--border-hover)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--item-bg)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                  }`}>
                  {m === 'cash' && <>💰 Cash</>}
                  {m === 'mpesa' && <>📱 M-Pesa</>}
                  {m === 'debt' && <>📒 Debt</>}
                </button>
              ))}
            </div>

            {/* Debtor selection */}
            {paymentMethod === 'debt' && (
              <div className="p-3 rounded-xl border mb-4 bg-amber-500/5 border-amber-500/20">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Assign to Debtor</label>
                {selectedDebtor ? (
                  <div className="flex items-center justify-between p-2 bg-[var(--bg-surface2)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{selectedDebtor.name}</p>
                        <p className="text-xs text-amber-400">Outstanding: KES {((debtors.find((d: any) => d._id === selectedDebtor._id)?.amount || 0) + total).toLocaleString()}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedDebtor(null); setDebtorSearch(''); }} className="btn-ghost p-1 text-xs text-red-400">Change</button>
                  </div>
                ) : (
                  <>
                    <input ref={debtorRef} type="text" value={debtorSearch}
                      onChange={(e) => { setDebtorSearch(e.target.value); setShowDebtorDropdown(true); }}
                      className="input-field text-sm w-full mb-2" placeholder="Search debtors..."
                      onFocus={() => setShowDebtorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDebtorDropdown(false), 200)} />
                    {showDebtorDropdown && (
                      <div className="relative">
                        <div className="absolute w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                          {debtors.filter((d: any) => d.name.toLowerCase().includes(debtorSearch.toLowerCase()))
                            .map((d: any) => (
                              <button key={d._id} type="button" onMouseDown={() => { setSelectedDebtor(d); setDebtorSearch(''); setShowDebtorDropdown(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-[var(--nav-hover-bg)] transition-colors border-b border-[var(--border-color)] last:border-0">
                                <span className="flex-1 text-[var(--text-primary)]">{d.name}</span>
                                <span className="text-xs text-amber-400">KES {d.amount.toLocaleString()}</span>
                              </button>
                            ))}
                          {debtors.filter((d: any) => d.name.toLowerCase().includes(debtorSearch.toLowerCase())).length === 0 && (
                            <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                              No debtors match
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Quick add debtor */}
                    <button type="button" onClick={() => setShowNewDebtor(true)}
                      className="text-xs text-[var(--accent-primary)] hover:underline mt-1">
                      + Add new debtor
                    </button>
                    {showNewDebtor && (
                      <div className="mt-2 p-2 bg-[var(--bg-surface2)] rounded-lg border border-[var(--border-color)]">
                        <div className="flex gap-2 mb-2">
                          <input type="text" value={newDebtorName} onChange={(e) => setNewDebtorName(e.target.value)}
                            className="input-field text-sm flex-1" placeholder="Full name" />
                          <input type="tel" value={newDebtorPhone} onChange={(e) => setNewDebtorPhone(e.target.value)}
                            className="input-field text-sm w-24" placeholder="Phone" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleAddDebtor} className="btn-primary btn-sm" disabled={!newDebtorName.trim()}>Add & Select</button>
                          <button type="button" onClick={() => setShowNewDebtor(false)} className="btn-ghost text-xs">Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Finalize Button */}
            <button onClick={finalizeSale} disabled={cart.length === 0 || loading}
              className="btn-primary w-full mt-2 text-base py-3">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                : `Complete Sale — KES ${total.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          title="Scan Product Barcode"
        />
      )}
    </div>
  );
}
