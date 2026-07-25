import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';

interface ReceiptData {
  id: string;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  total: number; subtotal: number; discount: number; paymentMethod: string; date: Date; pricing: 'retail' | 'wholesale';
}

function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<any>(null);
  const toggle = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported'); return; }
    if (listening && ref.current) { ref.current.stop(); setListening(false); return; }
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false;
    r.onresult = (e: any) => { onResult(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false);
    r.start(); ref.current = r; setListening(true);
  }, [listening, onResult]);
  return { listening, toggle };
}

export default function POS() {
  const { userId, profile } = useAuth();
  const { data: products } = useLocalData('products');
  const { data: transactions } = useLocalData('transactions');
  const { add: addTx, remove: removeTx } = useLocalData('transactions');
  const { updateQuantity } = useLocalData('products');
  const { data: categories } = useLocalData('categories');

  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'debt'>('cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pricingMode, setPricingMode] = useState<'retail' | 'wholesale'>('retail');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [voidTxId, setVoidTxId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  function fmtTime(ts: number) {
    const pref = localStorage.getItem('dl-time-format') || '12h';
    if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // #1: Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // F1-F8: quick products
      if (e.key >= 'F1' && e.key <= 'F8') {
        e.preventDefault();
        const idx = parseInt(e.key.replace('F', '')) - 1;
        const inStock = products.filter((p: any) => p.quantity > 0);
        if (idx < inStock.length) addToCartDirect(inStock[idx]._id);
        return;
      }
      // F9: finalize sale
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0 && !loading) finalizeSale(); return; }
      // F10: void last transaction modal
      if (e.key === 'F10') { e.preventDefault(); setVoidTxId(transactions.length > 0 ? transactions[0]._id : null); return; }
      // Escape: clear selection
      if (e.key === 'Escape') { setSelectedProduct(''); searchRef.current?.blur(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // #8: Confirm before clearing cart (beforeunload)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cart]);

  // Daily sales summary
  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);
  const todaySales = useMemo(() =>
    transactions.filter((t: any) => t._creationTime >= todayStart),
    [transactions, todayStart]
  );
  const todayTotal = todaySales.reduce((s: number, t: any) => s + t.total, 0);
  const todayCount = todaySales.length;

  // Unique categories
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: any) => { if (p.category) cats.add(p.category); });
    categories.forEach((c: any) => { if (c.name) cats.add(c.name); });
    return Array.from(cats).sort();
  }, [products, categories]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter((p: any) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      return p.name.toLowerCase().includes(q) && (showOutOfStock || p.quantity > 0);
    }).slice(0, 5);
  }, [products, search, categoryFilter, showOutOfStock]);

  const onVoiceResult = useCallback((text: string) => {
    setSearch(text);
    const found = products.find((p: any) => p.name.toLowerCase().includes(text.toLowerCase()));
    if (found) { setSelectedProduct(found._id); setQuantity(1); }
  }, [products]);
  const { listening, toggle: toggleVoice } = useVoiceInput(onVoiceResult);

  // Filtered products
  const filteredProducts = useMemo(() =>
    products.filter((p: any) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!showOutOfStock && p.quantity <= 0) return false;
      return p.name.toLowerCase().includes(search.toLowerCase());
    }),
    [products, search, categoryFilter, showOutOfStock]
  );

  // Quick products (top N in-stock)
  const quickProducts = useMemo(() => products.filter((p: any) => p.quantity > 0).slice(0, 8), [products]);

  // Pricing helpers
  const getPrice = useCallback((p: any) => pricingMode === 'wholesale' ? (p.wholesalePrice || 0) : (p.retailPrice || 0), [pricingMode]);

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

  const handleBarcode = (value: string) => {
    const found = products.find((p: any) => p.barcode === value || p.name.toLowerCase().includes(value.toLowerCase()));
    if (found) { setSelectedProduct(found._id); setQuantity(1); addToCartDirect(found._id); }
  };

  const subtotal = cart.reduce((s: number, i: any) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - discount);

  const finalizeSale = () => {
    if (cart.length === 0 || !userId) return;
    setLoading(true); setSuccessMsg(''); setReceipt(null);
    const items = cart.map((c: any) => ({
      productId: c.product._id, name: c.product.name, quantity: c.quantity,
      price: pricingMode === 'wholesale' ? (c.product.wholesalePrice || 0) : c.product.retailPrice,
      wholesalePrice: c.product.wholesalePrice,
      subtotal: c.subtotal,
    }));
    const txId = addTx({ userId: userId as any, items, total, paymentMethod, discount, pricing: pricingMode } as any);
    cart.forEach((c: any) => {
      const p = products.find((x: any) => x._id === c.product._id);
      if (p) updateQuantity(p._id, Math.max(0, p.quantity - c.quantity));
    });
    setReceipt({ id: txId, items, total, subtotal, discount, paymentMethod, date: new Date(), pricing: pricingMode });
    setSuccessMsg(`Sale finalized! KES ${total.toLocaleString()}`);
    window.dispatchEvent(new Event('salecompleted'));
    setCart([]); setDiscount(0); setLoading(false);
  };

  // Void a transaction
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
      <div className="page-header">
        <div><h1 className="page-title">Point of Sale</h1><p className="page-subtitle">Process customer transactions</p></div>
        <div className="flex items-center gap-2">
          {isGod && <span className="badge-blue">GOD MODE</span>}
          <span className="text-xs text-[var(--text-muted)] hidden sm:block">F1-F8: Quick | F9: Sale | F10: Void</span>
        </div>
      </div>

      {/* #4: Daily Sales Summary */}
      {todayCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-sm text-[var(--text-secondary)]">Today's Sales:</span>
              <span className="text-lg font-bold text-cyan-400">KES {todayTotal.toLocaleString()}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{todayCount} transaction{todayCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {successMsg && !receipt && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {successMsg}
        </div>
      )}

      {/* Void Transaction Modal */}
      {voidTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setVoidTxId(null)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Void Transaction</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">This will remove the transaction and restore stock quantities.</p>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {transactions.slice(0, 10).map((t: any) => (
                <button key={t._id} onClick={() => voidTransaction(t._id)}
                  className="w-full text-left p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors">
                  <div className="flex justify-between text-sm"><span className="text-[var(--text-primary)]">{new Date(t._creationTime).toLocaleDateString()} {fmtTime(t._creationTime)}</span><span className="text-red-400 font-medium">-KES {t.total.toLocaleString()}</span></div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.items.length} items · {t.paymentMethod}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setVoidTxId(null)} className="btn-secondary w-full">Close</button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0" onClick={() => setReceipt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden print:rounded-none print:shadow-none print:max-w-full" onClick={(e) => e.stopPropagation()}>
            <div ref={receiptRef} className="receipt p-6 print:p-4">
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <h2 className="text-lg font-bold text-gray-900">DukaLedger Pro</h2>
                <p className="text-xs text-gray-500 mt-0.5">Retail Management System</p>
                <p className="text-xs text-gray-400 mt-1">{receipt.date.toLocaleDateString()} {fmtTime(receipt.date.getTime())}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">#{receipt.id.slice(-8).toUpperCase()}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase">{receipt.pricing}</p>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100"><span className="flex-1">Item</span><span className="w-10 text-right">Qty</span><span className="w-18 text-right">Price</span><span className="w-20 text-right">Total</span></div>
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-700 py-0.5">
                    <span className="flex-1 truncate">{item.name}</span><span className="w-10 text-right text-gray-500">{item.quantity}</span>
                    <span className="w-18 text-right text-gray-500">{item.price.toLocaleString()}</span><span className="w-20 text-right font-medium">{item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>KES {receipt.subtotal.toLocaleString()}</span></div>
                {receipt.discount > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-KES {receipt.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>KES {receipt.total.toLocaleString()}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200"><div className="flex justify-between text-sm text-gray-600"><span>Payment</span><span className="font-medium capitalize">{receipt.paymentMethod}</span></div></div>
              <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-200"><p className="text-xs text-gray-400">Thank you for your business!</p></div>
            </div>
            <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-200 print:hidden">
              <button onClick={() => window.print()} className="btn-primary flex-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print Receipt</button>
              <button onClick={() => setReceipt(null)} className="btn-secondary flex-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Close</button>
            </div>
          </div>
        </div>
      )}

      {quickProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Quick Select</p>
            <span className="text-[10px] text-[var(--text-muted)]">F1-F8</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {quickProducts.map((p: any, idx: number) => (
              <button key={p._id} onClick={() => addToCartDirect(p._id)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 text-sm font-medium transition-all duration-200 whitespace-nowrap">
                <span className="text-[10px] text-blue-300/50 font-mono">F{idx + 1}</span>
                <span>{p.name}</span><span className="text-blue-300/70">KES {getPrice(p).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex-1">Select Products</h2>
              <div className="relative max-w-[180px]">
                <svg className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4V1m0 3a8 8 0 00-8 8m16 0a8 8 0 00-8-8m-8 8a8 8 0 0014.93 4M12 20v3m-8-8a8 8 0 0014.93-4" /></svg>
                <input type="text" value={barcodeQuery} onChange={(e) => { setBarcodeQuery(e.target.value); setShowBarcodeSuggestions(true); }}
                  className="input-field pl-7 text-xs" placeholder="Scan barcode..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && barcodeQuery.trim()) { handleBarcode(barcodeQuery.trim()); setBarcodeQuery(''); setShowBarcodeSuggestions(false); } }}
                  onFocus={() => barcodeQuery.trim() && setShowBarcodeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowBarcodeSuggestions(false), 200)} />
                {showBarcodeSuggestions && barcodeQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-slate-200/60 dark:border-slate-700/60 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {products.filter((p: any) => (p.barcode || '').toLowerCase().includes(barcodeQuery.toLowerCase()) || p.name.toLowerCase().includes(barcodeQuery.toLowerCase())).slice(0, 8).map((p: any) => (
                      <button key={p._id} type="button" onMouseDown={() => { handleBarcode(p.barcode || p.name); setBarcodeQuery(''); setShowBarcodeSuggestions(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[var(--bg-surface2)] transition-colors border-b border-slate-200/30 dark:border-slate-700/30 last:border-0">
                        <span className="text-xs text-cyan-400 font-mono">{p.barcode || '—'}</span>
                        <span className="flex-1 text-[var(--text-primary)]">{p.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">KES {getPrice(p).toLocaleString()}</span>
                      </button>
                    ))}
                    {products.filter((p: any) => (p.barcode || '').toLowerCase().includes(barcodeQuery.toLowerCase()) || p.name.toLowerCase().includes(barcodeQuery.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">No products match "{barcodeQuery}"</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={toggleVoice} className={`btn-icon ${listening ? 'text-red-400 bg-red-500/10 animate-pulse' : ''}`} title="Voice search">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
              <button onClick={() => setShowRecentSales(!showRecentSales)} className={`btn-icon ${showRecentSales ? 'text-cyan-400 bg-cyan-500/10' : ''}`} title="Recent sales"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
            </div>

            {/* #6: Wholesale/Retail toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-[var(--bg-surface2)] rounded-lg p-0.5">
                <button onClick={() => setPricingMode('retail')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${pricingMode === 'retail' ? 'bg-cyan-500/10 text-cyan-400' : 'text-[var(--text-muted)]'}`}><svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Retail</button>
                <button onClick={() => setPricingMode('wholesale')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${pricingMode === 'wholesale' ? 'bg-amber-500/10 text-amber-400' : 'text-[var(--text-muted)]'}`}><svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> Wholesale</button>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                <input type="checkbox" checked={showOutOfStock} onChange={(e) => setShowOutOfStock(e.target.checked)} className="rounded accent-cyan-500" />
                Show 0-stock
              </label>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <div className="flex items-center gap-2 mb-3">
                <input ref={searchRef} type="text" value={search} onChange={(e) => { setSearch(e.target.value); setShowSearchSuggestions(true); }}
                  className="input-field flex-1" placeholder="Search products (Enter to add)..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && selectedProduct) { addToCart(); searchRef.current?.focus(); } }}
                  onFocus={() => searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)} />
                {uniqueCategories.length > 0 && (
                  <div className="relative">
                    <button onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-300/30 dark:border-slate-700/30 bg-[var(--bg-surface2)] hover:border-cyan-400/50 transition-all duration-200 whitespace-nowrap">
                      <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      <span className="text-[var(--text-secondary)]">{categoryFilter || 'All'}</span>
                      <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showCategoryDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                        <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--bg-surface)] border border-slate-200/60 dark:border-slate-700/60 rounded-lg shadow-xl z-20 overflow-hidden">
                          <button onMouseDown={() => { setCategoryFilter(''); setShowCategoryDropdown(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-surface2)] ${!categoryFilter ? 'text-cyan-400 bg-cyan-500/5' : 'text-[var(--text-primary)]'}`}>
                            <span>All Categories</span>
                            {!categoryFilter && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <div className="border-t border-slate-200/30 dark:border-slate-700/30" />
                          {uniqueCategories.map((cat) => (
                            <button key={cat} onMouseDown={() => { setCategoryFilter(cat); setShowCategoryDropdown(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-surface2)] ${categoryFilter === cat ? 'text-cyan-400 bg-cyan-500/5' : 'text-[var(--text-primary)]'}`}>
                              <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg><span>{cat}</span>
                              {categoryFilter === cat && <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-slate-200/60 dark:border-slate-700/60 rounded-lg shadow-xl z-20 overflow-hidden">
                  {searchSuggestions.map((p: any) => (
                    <button key={p._id} type="button"
                      onMouseDown={() => { setSelectedProduct(p._id); setQuantity(1); setSearch(''); setShowSearchSuggestions(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-[var(--bg-surface2)] transition-colors border-b border-slate-200/30 dark:border-slate-700/30 last:border-0">
                      <span className="flex-1 text-[var(--text-primary)] font-medium">{p.name}</span>
                      <span className="text-xs text-cyan-400 font-semibold">KES {getPrice(p).toLocaleString()}</span>
                      {p.quantity > 0 ? <span className="text-xs text-[var(--text-muted)]">{p.quantity} left</span> : <span className="text-xs text-red-400">Out</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* #9: Recent Sales Panel */}
            {showRecentSales && (
              <div className="mb-3 p-3 bg-[var(--bg-surface2)] rounded-lg border border-slate-200/30 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Recently Sold</p>
                  <button onClick={() => setShowRecentSales(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {transactions.slice(0, 5).flatMap((t: any) => t.items || []).slice(0, 10).map((item: any, i: number) => (
                    <button key={i} onClick={() => {
                      const p = products.find((x: any) => x._id === item.productId || x.name === item.name);
                      if (p) { addToCartDirect(p._id); }
                    }}
                      className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-md text-xs transition-colors border border-cyan-500/20">
                      {item.name}
                    </button>
                  ))}
                  {transactions.length === 0 && <p className="text-xs text-[var(--text-muted)]">No sales yet</p>}
                </div>
              </div>
            )}

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto scrollbar-thin">
              {filteredProducts.map((p: any) => (
                <button key={p._id} onClick={() => { if (p.quantity > 0) { setSelectedProduct(p._id); setQuantity(1); } }}
                  className={`p-3 rounded-lg text-left transition-all duration-200 border ${p.quantity <= 0 ? 'opacity-40 border-slate-700/30' : selectedProduct === p._id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-[var(--bg-surface2)] border-slate-300/30 dark:border-slate-700/30 hover:border-slate-400/50 dark:hover:border-slate-600 text-[var(--text-primary)]'}`}>
                  {p.image && <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover mb-1" />}
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className={`text-xs mt-0.5 ${pricingMode === 'wholesale' ? 'text-amber-400' : 'text-cyan-400'}`}>KES {getPrice(p).toLocaleString()}</p>
                  <p className={`text-xs ${p.quantity > 0 ? 'text-[var(--text-muted)]' : 'text-red-400'}`}>{p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}</p>
                </button>
              ))}
              {filteredProducts.length === 0 && <p className="col-span-full text-sm text-[var(--text-muted)] text-center py-8">{search ? 'No products found' : 'No products in stock.'}</p>}
            </div>
          </div>

          <div className="card">
            <div className="flex items-end gap-3">
              <div className="flex-1"><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Quantity</label><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="input-field"
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedProduct) { addToCart(); } }} /></div>
              <button onClick={addToCart} className="btn-primary flex-1" disabled={!selectedProduct}>Add to Cart{selectedProduct ? ' ↵' : ''}</button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Cart ({cart.length} items)</h2>
            {cart.length === 0 ? <p className="text-sm text-[var(--text-muted)] text-center py-8">Cart is empty</p> : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {cart.map((item: any) => (
                  <div key={item.product._id} className="flex items-center justify-between p-3 bg-[var(--bg-surface2)] rounded-lg">
                    <div className="flex-1"><p className="text-sm font-medium text-[var(--text-primary)]">{item.product.name}</p><p className="text-xs text-[var(--text-muted)]">{item.quantity} × KES {item.product.retailPrice.toLocaleString()}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-cyan-400">KES {item.subtotal.toLocaleString()}</span>
                      <button onClick={() => setCart((prev: any[]) => prev.filter((c: any) => c.product._id !== item.product._id))} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment</h2>
            <div className="space-y-3 mb-4">
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Discount (KES)</label><input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'mpesa', 'debt'] as const).map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={`py-2.5 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${paymentMethod === m ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-[var(--bg-surface2)] text-[var(--text-secondary)] border border-slate-300/30 dark:border-slate-700/30 hover:border-slate-400/50'}`}>{m === 'cash' ? <><svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Cash</> : m === 'mpesa' ? <><svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> M-Pesa</> : <><svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Debt</>}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-[var(--text-secondary)]"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="flex justify-between text-sm text-amber-500"><span>Discount</span><span>-KES {discount.toLocaleString()}</span></div>}
              <div className="flex justify-between text-lg font-bold text-[var(--text-primary)]"><span>Total</span><span className="text-cyan-400">KES {total.toLocaleString()}</span></div>
            </div>
            <button onClick={finalizeSale} disabled={cart.length === 0 || loading} className="btn-primary w-full mt-4 text-base py-3">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : `Finalize Sale — KES ${total.toLocaleString()}${pricingMode === 'wholesale' ? ' (Wholesale)' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
