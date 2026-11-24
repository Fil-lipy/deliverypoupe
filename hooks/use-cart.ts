'use client';

import { useState, useEffect, useCallback } from 'react';

export function useCart() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error('Error fetching cart:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = useCallback(async (productId: string) => {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (!res.ok) throw new Error('Failed to add');
    await fetchCart();
  }, [fetchCart]);

  const updateItemQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      const res = await fetch(`/api/cart/item/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    } else {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error('Failed');
    }
    await fetchCart();
  }, [fetchCart]);

  const removeItem = useCallback(async (itemId: string) => {
    const res = await fetch(`/api/cart/item/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    await fetchCart();
  }, [fetchCart]);

  const applyCoupon = useCallback(async (code: string) => {
    const res = await fetch('/api/cart/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? 'Erro');
    await fetchCart();
    return data;
  }, [fetchCart]);

  const removeCoupon = useCallback(async () => {
    await fetch('/api/cart/coupon', { method: 'DELETE' });
    await fetchCart();
  }, [fetchCart]);

  const totalItems = (cart?.items ?? []).reduce((s: number, i: any) => s + (i?.quantity ?? 0), 0);

  const getProductQuantity = useCallback((productId: string) => {
    const item = (cart?.items ?? []).find((i: any) => i?.productId === productId);
    return item?.quantity ?? 0;
  }, [cart]);

  const getItemByProductId = useCallback((productId: string) => {
    return (cart?.items ?? []).find((i: any) => i?.productId === productId);
  }, [cart]);

  return { cart, loading, fetchCart, addToCart, updateItemQuantity, removeItem, applyCoupon, removeCoupon, totalItems, getProductQuantity, getItemByProductId };
}
