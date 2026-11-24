'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { useCart } from '@/hooks/use-cart';
import { gtmViewItemList } from '@/lib/gtm';

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession() || {};
  const { addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<string>('');
  const [activeDet, setActiveDet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Carrega a categoria (nome + subcategorias)
  useEffect(() => {
    let active = true;
    fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: any) => {
        if (!active) return;
        const arr = Array.isArray(cats) ? cats : [];
        const cat = arr.find((c: any) => c?.slug === params.slug);
        if (cat) {
          setCategoryName(cat.name);
          setSubcategories(Array.isArray(cat.subcategories) ? cat.subcategories : []);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  // Carrega produtos (recarrega ao trocar subcategoria)
  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    const qs = new URLSearchParams({ categoryId: params.slug, limit: '60' });
    if (activeSub) qs.set('subId', activeSub);
    if (activeSub && activeDet) qs.set('detId', activeDet);
    fetch(`/api/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          const prods = d?.products ?? [];
          setProducts(prods);
          if (prods.length > 0) gtmViewItemList(prods, categoryName || params.slug);
        }
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug, activeSub, activeDet]);

  // Detalhes da subcategoria ativa
  const activeSubObj = subcategories.find((s: any) => s?.slug === activeSub);
  const detalhes: any[] = Array.isArray(activeSubObj?.detalhes) ? activeSubObj.detalhes : [];

  const handleAddToCart = async (productId: string) => {
    await addToCart(productId);
  };
  const handleUpdateQty = async (productId: string, qty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, qty);
  };

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-3">{categoryName || 'Categoria'}</h1>

        {subcategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4">
            <button
              onClick={() => setActiveSub('')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition ${
                activeSub === '' ? 'bg-[#CD0301] text-white' : 'bg-[#F8F8F8] text-[#666666] hover:bg-gray-100'
              }`}
            >
              Todos
            </button>
            {subcategories.map((s: any) => (
              <button
                key={s?.slug}
                onClick={() => {
                  setActiveSub(s?.slug);
                  setActiveDet('');
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  activeSub === s?.slug ? 'bg-[#CD0301] text-white' : 'bg-[#F8F8F8] text-[#666666] hover:bg-gray-100'
                }`}
              >
                {s?.name}
              </button>
            ))}
          </div>
        )}

        {activeSub && detalhes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4">
            <button
              onClick={() => setActiveDet('')}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition ${
                activeDet === '' ? 'border-[#CD0301] text-[#CD0301] bg-[#CD0301]/5' : 'border-gray-200 text-[#666666] hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            {detalhes.map((d: any) => (
              <button
                key={d?.slug}
                onClick={() => setActiveDet(d?.slug)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition ${
                  activeDet === d?.slug ? 'border-[#CD0301] text-[#CD0301] bg-[#CD0301]/5' : 'border-gray-200 text-[#666666] hover:bg-gray-50'
                }`}
              >
                {d?.name}
              </button>
            ))}
          </div>
        )}

        {loading || loadingProducts ? (
          <LoadingSpinner />
        ) : (products ?? []).length === 0 ? (
          <EmptyState title="Nenhum produto nesta categoria" actionLabel="Voltar" actionHref="/home" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(products ?? []).map((p: any) => (
              <ProductCard
                key={p?.id}
                product={p}
                cartQuantity={getProductQuantity(p?.id)}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQty}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
