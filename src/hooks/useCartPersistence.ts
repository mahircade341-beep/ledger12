import { useState, useEffect, useCallback } from 'react';

const CART_STORAGE_KEY = 'dukahub-cart';

interface CartItem {
  product: any;
  quantity: number;
  subtotal: number;
  _price: number;
  _addedAt: number;
}

interface CartPersistenceReturn {
  savedCart: CartItem[];
  saveCart: (items: CartItem[]) => void;
  clearCart: () => void;
  isOffline: boolean;
}

/**
 * Persists the cart to localStorage so it survives page refreshes and brief offline periods.
 * Also detects online/offline status.
 */
export default function useCartPersistence(): CartPersistenceReturn {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Load saved cart from localStorage on mount
  const [savedCart, setSavedCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Corrupted data, start fresh
    }
    return [];
  });

  const saveCart = useCallback((items: CartItem[]) => {
    setSavedCart(items);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }, []);

  const clearCart = useCallback(() => {
    setSavedCart([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // silently fail
    }
  }, []);

  return { savedCart, saveCart, clearCart, isOffline };
}
