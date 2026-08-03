import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

type DataLayer = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: DataLayer[];
    sa_event?: (event: string, data?: DataLayer) => void;
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
 * Stable per-browser session id. Used to dedupe page views without
 * storing any personal data (Kenya DPA-friendly).
 */
let sessionId = '';
try {
  sessionId = localStorage.getItem('dl-analytics-session') || '';
  if (!sessionId) {
    sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('dl-analytics-session', sessionId);
  }
} catch {
  // Private mode / storage blocked — analytics degrade gracefully
}

function pushEvent(event: string, params: DataLayer) {
  if (typeof window === 'undefined') return;

  // 1) Standard dataLayer push (ready for GTM/GA4 later)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ecommerce: params,
  });

  // 2) Simple Analytics custom events (page views are tracked automatically
  //    by the script — skip them to avoid double counting)
  if (event !== 'page_view') {
    try {
      window.sa_event?.(event, params);
    } catch {
      // never block the UI on analytics
    }
  }

  // 2) Persist to Supabase (fire-and-forget; never block the UI on analytics).
  //    Only runs when the DB table exists (see supabase-migration.sql).
  try {
    if (import.meta.env.VITE_SUPABASE_URL) {
      void supabase.from('analytics_events').insert({
        event,
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || '',
        session_id: sessionId,
      });
    }
  } catch {
    // Analytics must never break the app
  }
}

export default function useAnalytics() {
  const trackPageView = useCallback((path: string) => {
    pushEvent('page_view', { path });
  }, []);

  const trackItemView = useCallback((product: ViewItemParams) => {
    pushEvent('view_item', {
      currency: 'KES',
      value: product.price,
      items: [
        {
          item_id: product.item_id,
          item_name: product.item_name,
          price: product.price,
          item_category: product.item_category || 'General',
          quantity: 1,
        },
      ],
    });
  }, []);

  const trackAddToCart = useCallback((params: AddToCartParams) => {
    pushEvent('add_to_cart', {
      currency: 'KES',
      value: params.price * params.quantity,
      items: [
        {
          item_id: params.item_id,
          item_name: params.item_name,
          price: params.price,
          quantity: params.quantity,
          item_category: params.item_category || 'General',
        },
      ],
    });
  }, []);

  const trackBeginCheckout = useCallback((params: BeginCheckoutParams) => {
    pushEvent('begin_checkout', {
      currency: 'KES',
      value: params.value,
      coupon: params.coupon,
      items: params.items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }, []);

  const trackPurchase = useCallback((params: PurchaseParams) => {
    pushEvent('purchase', {
      transaction_id: params.transaction_id,
      currency: params.currency || 'KES',
      value: params.value,
      tax: params.tax,
      shipping: params.shipping,
      coupon: params.coupon,
      payment_type: params.payment_type,
      items: params.items,
      ...(params.utm_data ? { utm_data: params.utm_data } : {}),
    });
  }, []);

  return { trackPageView, trackItemView, trackAddToCart, trackBeginCheckout, trackPurchase };
}
