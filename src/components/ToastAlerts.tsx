import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '../hooks/useLocalData';

interface Toast {
  id: string;
  type: 'stock' | 'debt' | 'critical';
  title: string;
  message: string;
  link?: string;
}

export default function ToastAlerts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();
  const dismissedRef = useRef<Set<string>>(new Set());
  const { data: products } = useLocalData('products');
  const { data: debtors } = useLocalData('debtors');

  const addToast = useCallback((t: Toast) => {
    if (dismissedRef.current.has(t.id)) return;
    setToasts((prev) => {
      if (prev.find((x) => x.id === t.id)) return prev;
      return [...prev, t];
    });
  }, []);

  const dismissToast = (id: string) => {
    dismissedRef.current.add(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check for alerts whenever products or debtors data changes
  useEffect(() => {
    const threshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');

    // Low-stock check
    const lowStock = products.filter((p: any) => p.quantity > 0 && p.quantity <= threshold);
    const outOfStock = products.filter((p: any) => p.quantity <= 0);

    if (outOfStock.length > 0) {
      addToast({
        id: 'out-of-stock',
        type: 'critical',
        title: 'Out of Stock',
        message: `${outOfStock.length} product${outOfStock.length !== 1 ? 's are' : ' is'} out of stock`,
        link: '/inventory',
      });
    } else if (lowStock.length > 0) {
      addToast({
        id: 'low-stock',
        type: 'stock',
        title: 'Low Stock Alert',
        message: `${lowStock.length} product${lowStock.length !== 1 ? 's are' : ' is'} running low (≤ ${threshold})`,
        link: '/inventory',
      });
    }

    // Outstanding debt check
    const activeDebtors = debtors.filter((d: any) => d.status === 'active');
    if (activeDebtors.length > 0) {
      const totalOwed = activeDebtors.reduce((sum: number, d: any) => sum + d.amount, 0);
      addToast({
        id: 'outstanding-debt',
        type: 'debt',
        title: 'Payment Reminder',
        message: `KES ${totalOwed.toLocaleString()} outstanding from ${activeDebtors.length} debtor${activeDebtors.length !== 1 ? 's' : ''}`,
        link: '/daftari',
      });
    }
  }, [products, debtors, addToast]);

  // Also listen for custom event from sales
  useEffect(() => {
    const onSale = () => {
      // Re-trigger check by clearing and re-setting
      const threshold = parseInt(localStorage.getItem('dl-low-stock-threshold') || '5');
      const lowStock = products.filter((p: any) => p.quantity > 0 && p.quantity <= threshold);
      const outOfStock = products.filter((p: any) => p.quantity <= 0);
      if (outOfStock.length > 0) {
        addToast({
          id: 'out-of-stock',
          type: 'critical',
          title: 'Out of Stock',
          message: `${outOfStock.length} product${outOfStock.length !== 1 ? 's are' : ' is'} out of stock`,
          link: '/inventory',
        });
      }
    };
    window.addEventListener('salecompleted', onSale);
    return () => window.removeEventListener('salecompleted', onSale);
  }, [products, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-fade-in p-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
            toast.type === 'critical'
              ? 'bg-red-500/10 border-red-500/20 text-[var(--color-danger)]'
              : toast.type === 'stock'
              ? 'bg-amber-500/10 border-amber-500/20 text-[var(--color-warning)]'
              : 'bg-cyan-500/10 border-cyan-500/20 text-[var(--color-info)]'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">
              {toast.type === 'critical' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              ) : toast.type === 'stock' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>
              {toast.link && (
                <button
                  onClick={() => { dismissToast(toast.id); navigate(toast.link!); }}
                  className="text-xs font-medium underline underline-offset-2 mt-1 opacity-70 hover:opacity-100 transition-opacity"
                >
                  View details →
                </button>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
