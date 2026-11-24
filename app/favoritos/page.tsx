'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FavoritosPage() {
  const { data: session } = useSession() || {};
  const { addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const { favoriteIds } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = () => {
    setLoading(true);
    fetch('/api/account/favorites')
      .then((r) => r.json())
      .then((d) => setProducts(d?.products ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFavorites(); }, []);

  // keep list in sync when a favorite is removed elsewhere
  useEffect(() => {
    setProducts((prev) => prev.filter((p) => favoriteIds.has(String(p.id))));
  }, [favoriteIds]);

  const handleAdd = async (productId: string) => { await addToCart(productId); };
  const handleUpdateQty = async (productId: string, qty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, qty);
  };

  const userName = (session?.user as any)?.name?.split(' ')?.[0] ?? '';

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={userName} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/conta" className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] mb-4 md:hidden">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
          <Heart size={22} className="text-[#CD0301] fill-[#CD0301]" /> Meus favoritos
        </h1>

        {loading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <EmptyState
            title="Nenhum favorito ainda"
            description="Toque no coração dos produtos para guiá-los aqui e comprar mais rápido depois."
            actionLabel="Explorar produtos"
            actionHref="/home"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p: any) => (
              <ProductCard key={p?.id} product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAdd} onUpdateQuantity={handleUpdateQty} />
            ))}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
