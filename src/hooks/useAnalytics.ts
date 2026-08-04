import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

type DataLayer = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: DataLayer[];
  }
}

interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_brand?: string;
  index?: number;
}

interface PurchaseParams {
  transaction_id: string;
  value: number;
  currency?: string;
  tax?: number;
  shipping?: number;
  items: AnalyticsItem[];
  coupon?: string;
  payment_type?: string;
  utm_data?: Record<string, string>;
}

interface ViewItemParams {
  item_id: string;
  item_name: string;
  price: number;
  item_category?: string;
}

interface AddToCartParams {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
}

interface BeginCheckoutParams {
  value: number;
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
  coupon?: string;
}

/**
 * Stable per-browser session id. Used to dedupe page views.
 * No personal data — Kenya DPA compliant.
 */
let sessionId = '';
try {
  sessionId = localStorage.getItem('dl-analytics-session') || '';
  if (!sessionId) {
    sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('dl-analytics-session', sessionId);
  }
} catch {}

/**
 * Insert an event into the Supabase analytics_events table.
 * Fire-and-forget — never blocks the UI.
 */
function insertEvent(event: string, path: string, metadata: Record<string, unknown> = {}) {
  try {
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    void supabase.from('analytics_events').insert({
      event,
      path,
      referrer: document.referrer || '',
      session_id: sessionId,
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    });
  } catch {
    // Analytics must never break the app
  }
}

/** Track a page view — deduplicated within the same session+path. */
const viewedPaths = new Set<string>();

export default function useAnalytics() {
  const trackPageView = useCallback((path: string) => {
    // Dedupe: only count the first visit per session+path
    const key = `${sessionId}:${path}`;
    if (viewedPaths.has(key)) return;
    viewedPaths.add(key);

    // Push to dataLayer for future GA4
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'page_view', path });

    // Insert to Supabase
    insertEvent('page_view', path);
  }, []);

  const trackItemView = useCallback((product: ViewItemParams) => {
    insertEvent('view_item', window.location.pathname, {
      item_id: product.item_id,
      item_name: product.item_name,
      price: product.price,
      category: product.item_category || 'General',
    });
  }, []);

  const trackAddToCart = useCallback((params: AddToCartParams) => {
    insertEvent('add_to_cart', window.location.pathname, {
      item_id: params.item_id,
      item_name: params.item_name,
      price: params.price,
      quantity: params.quantity,
      category: params.item_category || 'General',
    });
  }, []);

  const trackBeginCheckout = useCallback((params: BeginCheckoutParams) => {
    insertEvent('begin_checkout', window.location.pathname, {
      value: params.value,
      coupon: params.coupon,
      items: params.items.map(i => ({ id: i.item_id, name: i.item_name, price: i.price, qty: i.quantity })),
    });
  }, []);

  const trackPurchase = useCallback((params: PurchaseParams) => {
    insertEvent('purchase', window.location.pathname, {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency || 'KES',
      payment_type: params.payment_type,
      items: params.items.map(i => ({ id: i.item_id, name: i.item_name, price: i.price, qty: i.quantity })),
      utm_data: params.utm_data,
    });
  }, []);

  return { trackPageView, trackItemView, trackAddToCart, trackBeginCheckout, trackPurchase };
}