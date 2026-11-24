'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { useCart } from '@/hooks/use-cart';
import { Tag } from 'lucide-react';
import { gtmViewItemList } from '@/lib/gtm';

export default function OfertasPage() {
  const { data: session } = useSession() || {};
  const { addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?promo=true&limit=40').then(r => r.json()).then(d => {
      const prods = d?.products ?? [];
      setProducts(prods);
      if (prods.length > 0) gtmViewItemList(prods, 'Ofertas');
    }).finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (productId: string) => { await addToCart(productId); };
  const handleUpdateQty = async (productId: string, qty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, qty);
  };

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={20} className="text-[#CD0301]" />
          <h1 className="text-xl font-bold">Ofertas</h1>
        </div>
        {loading ? <LoadingSpinner /> : (products ?? []).length === 0 ? (
          <EmptyState title="Nenhuma oferta no momento" actionLabel="Ver todos" actionHref="/home" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(products ?? []).map((p: any) => (
              <ProductCard key={p?.id} product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddToCart} onUpdateQuantity={handleUpdateQty} />
            ))}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
