'use client';

import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession() || {};
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/account/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(new Set<string>(data?.productIds ?? []));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') refresh();
    else setFavoriteIds(new Set());
  }, [status, refresh]);

  const isFavorite = useCallback((productId: string) => favoriteIds.has(String(productId)), [favoriteIds]);

  const toggleFavorite = useCallback(async (productId: string) => {
    const id = String(productId);
    const currentlyFav = favoriteIds.has(id);
    // optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (currentlyFav) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (currentlyFav) {
        await fetch(`/api/account/favorites?productId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/account/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: id }),
        });
      }
    } catch {
      // revert on error
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.add(id);
        else next.delete(id);
        return next;
      });
    }
    return !currentlyFav;
  }, [favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, refresh, count: favoriteIds.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    return {
      favoriteIds: new Set<string>(),
      isFavorite: () => false,
      toggleFavorite: async () => false,
      refresh: async () => {},
      count: 0,
    } as FavoritesContextValue;
  }
  return ctx;
}
