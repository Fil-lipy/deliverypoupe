/**
 * Google Tag Manager / GA4 dataLayer helpers.
 * Padrão GA4 e-commerce: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 *
 * Cada função limpa o ecommerce anterior com ecommerce: null
 * antes de enviar o novo objeto, conforme recomendação do Google.
 */

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

function push(obj: Record<string, any>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // limpa o objeto anterior
  window.dataLayer.push(obj);
}

/** Monta o item GA4 a partir de um product do app */
function toItem(product: any, quantity = 1, index?: number) {
  const item: Record<string, any> = {
    item_id: String(product?.id ?? ''),
    item_name: product?.name ?? '',
    price: Number(product?.promoPrice ?? product?.price ?? 0),
    quantity,
  };
  if (product?.brand) item.item_brand = product.brand;
  if (product?.category?.name) item.item_category = product.category.name;
  if (typeof index === 'number') item.index = index;
  if (product?.promoPrice != null && product.promoPrice < (product?.price ?? 0)) {
    item.discount = Number(((product.price ?? 0) - product.promoPrice).toFixed(2));
  }
  return item;
}

// ─── Eventos ───────────────────────────────────────────────

export function gtmViewItem(product: any) {
  if (!product) return;
  push({
    event: 'view_item',
    ecommerce: {
      currency: 'BRL',
      value: Number(product?.promoPrice ?? product?.price ?? 0),
      items: [toItem(product)],
    },
  });
}

export function gtmAddToCart(product: any, quantity = 1) {
  if (!product) return;
  push({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'BRL',
      value: Number(product?.promoPrice ?? product?.price ?? 0) * quantity,
      items: [toItem(product, quantity)],
    },
  });
}

export function gtmRemoveFromCart(product: any, quantity = 1) {
  if (!product) return;
  push({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'BRL',
      value: Number(product?.promoPrice ?? product?.price ?? 0) * quantity,
      items: [toItem(product, quantity)],
    },
  });
}

export function gtmViewCart(cartItems: any[], cartValue: number) {
  push({
    event: 'view_cart',
    ecommerce: {
      currency: 'BRL',
      value: cartValue,
      items: (cartItems ?? []).map((i: any, idx: number) =>
        toItem(i?.product, i?.quantity ?? 1, idx)
      ),
    },
  });
}

export function gtmBeginCheckout(cartItems: any[], cartValue: number, couponCode?: string) {
  const data: Record<string, any> = {
    event: 'begin_checkout',
    ecommerce: {
      currency: 'BRL',
      value: cartValue,
      items: (cartItems ?? []).map((i: any, idx: number) =>
        toItem(i?.product, i?.quantity ?? 1, idx)
      ),
    },
  };
  if (couponCode) data.ecommerce.coupon = couponCode;
  push(data);
}

export function gtmPurchase(
  transactionId: string,
  cartItems: any[],
  totalValue: number,
  shipping: number,
  couponCode?: string,
) {
  const data: Record<string, any> = {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'BRL',
      value: totalValue,
      shipping,
      items: (cartItems ?? []).map((i: any, idx: number) =>
        toItem(i?.product, i?.quantity ?? 1, idx)
      ),
    },
  };
  if (couponCode) data.ecommerce.coupon = couponCode;
  push(data);
}

export function gtmSearch(searchTerm: string) {
  if (!searchTerm) return;
  push({ event: 'search', search_term: searchTerm });
}

export function gtmSelectItem(product: any, listName?: string, index?: number) {
  if (!product) return;
  const item = toItem(product, 1, index);
  if (listName) item.item_list_name = listName;
  push({
    event: 'select_item',
    ecommerce: {
      items: [item],
    },
  });
}

export function gtmViewItemList(products: any[], listName: string) {
  if (!products?.length) return;
  push({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      items: products.slice(0, 20).map((p: any, idx: number) => {
        const item = toItem(p, 1, idx);
        item.item_list_name = listName;
        return item;
      }),
    },
  });
}
