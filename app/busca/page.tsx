'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { useCart } from '@/hooks/use-cart';
import { SlidersHorizontal } from 'lucide-react';
import { gtmSearch, gtmViewItemList } from '@/lib/gtm';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') ?? '';
  const { data: session } = useSession() || {};
  const { addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('relevance');
  const [promoOnly, setPromoOnly] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (promoOnly) params.set('promo', 'true');
    params.set('sort', sort);
    params.set('limit', '40');
    fetch(`/api/products?${params}`).then(r => r.json()).then(d => {
      const prods = d?.products ?? [];
      setProducts(prods);
      if (q) gtmSearch(q);
      if (prods.length > 0) gtmViewItemList(prods, q ? `Busca: ${q}` : 'Busca');
    }).finally(() => setLoading(false));
  }, [q, categoryFilter, sort, promoOnly]);

  const handleAddToCart = async (productId: string) => { await addToCart(productId); };
  const handleUpdateQty = async (productId: string, qty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, qty);
  };

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-4">
        <h1 className="text-lg font-bold mb-4">{q ? `Resultados para "${q}"` : 'Busca'}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
            <option value="">Todas categorias</option>
            {(categories ?? []).map((c: any) => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
            <option value="relevance">Relevância</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="discount">Maior desconto</option>
            <option value="name">Nome (A-Z)</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={promoOnly} onChange={e => setPromoOnly(e.target.checked)} className="accent-[#CD0301]" />
            Somente em promoção
          </label>
        </div>
        {loading ? <LoadingSpinner /> : (products ?? []).length === 0 ? (
          <EmptyState title="Nenhum produto encontrado" description="Tente buscar por outro termo ou remova os filtros." actionLabel="Ver todos" actionHref="/home" />
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

export default function BuscaPage() {
  return <Suspense fallback={<LoadingSpinner />}><SearchContent /></Suspense>;
}
