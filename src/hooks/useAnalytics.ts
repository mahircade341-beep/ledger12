import { useCallback } from 'react';

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

function pushEvent(event: string, params: DataLayer) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ecommerce: params,
  });
}

export default function useAnalytics() {
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

  return { trackItemView, trackAddToCart, trackBeginCheckout, trackPurchase };
}
