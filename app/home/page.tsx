'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useCart } from '@/hooks/use-cart';
import Link from 'next/link';
import { Pill, Sparkles, Bath, Baby, Dumbbell, ShoppingBag, Home, Package, Tag, ArrowRight } from 'lucide-react';
import { gtmViewItemList } from '@/lib/gtm';

const categoryIcons: Record<string, any> = {
  'medicamentos-e-saude': Pill,
  'beleza-e-cosmeticos': Sparkles,
  'higiene-pessoal-e-cuidados-corporais': Bath,
  'vitaminas-suplementos-e-nutraceuticos': Dumbbell,
  'maternidade-e-infantil': Baby,
  'alimentacao-e-conveniencia': ShoppingBag,
  'produtos-domesticos-e-utilidades': Home,
  outros: Package,
};

export default function HomePage() {
  const { data: session } = useSession() || {};
  const { cart, addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/products?promo=true&limit=10').then(r => r.json()),
      fetch('/api/products?limit=20').then(r => r.json()),
      fetch('/api/banners').then(r => r.json()),
    ]).then(([cats, promo, all, bnr]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setPromoProducts(promo?.products ?? []);
      setAllProducts(all?.products ?? []);
      setBanners(bnr?.banners ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // GTM: view_item_list para ofertas e todos os produtos
  useEffect(() => {
    if (!loading) {
      if (promoProducts.length > 0) gtmViewItemList(promoProducts, 'Ofertas da semana');
      if (allProducts.length > 0) gtmViewItemList(allProducts, 'Todos os produtos');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const heroBanners = banners.filter((b: any) => b?.position === 'home_hero');
  const promoBanners = banners.filter((b: any) => b?.position === 'home_promo');

  const userName = (session?.user as any)?.name?.split(' ')?.[0] ?? '';

  const handleAddToCart = async (productId: string) => {
    await addToCart(productId);
  };

  const handleUpdateQty = async (productId: string, qty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, qty);
  };

  if (loading) return (
    <div className="min-h-screen bg-white">
      <CustomerHeader cartCount={0} userName={userName} />
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={userName} />

      {/* Hero Banner */}
      <div className="bg-[#CD0301] text-white px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Olá, {userName || 'visitante'}!</h1>
          <p className="text-sm md:text-base opacity-90 mb-4">O que você precisa hoje? Encontre medicamentos, higiene, beleza e muito mais.</p>
          <Link href="/ofertas" className="inline-flex items-center gap-2 bg-[#FFBC00] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#e6a900] transition text-sm">
            <Tag size={18} /> Ver ofertas
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Custom hero banners */}
        {heroBanners.length > 0 && (
          <section className="pt-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
              {heroBanners.map((b: any) => {
                const inner = (
                  <div className="relative min-w-[280px] md:min-w-[360px] h-32 rounded-xl overflow-hidden flex items-center px-5 flex-shrink-0" style={{ backgroundColor: b.bgColor, color: b.textColor }}>
                    {b.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="relative z-10">
                      <p className="font-bold text-lg leading-tight">{b.title}</p>
                      {b.subtitle && <p className="text-sm opacity-90 mt-0.5">{b.subtitle}</p>}
                    </div>
                  </div>
                );
                return b.linkUrl ? <Link key={b.id} href={b.linkUrl}>{inner}</Link> : <div key={b.id}>{inner}</div>;
              })}
            </div>
          </section>
        )}

        {/* Categories Grid */}
        <section className="py-6">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Categorias</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {(categories ?? []).map((cat: any) => {
              const IconComp = categoryIcons[cat?.slug] ?? Package;
              return (
                <Link key={cat?.id} href={`/categoria/${cat?.slug}`} className="flex flex-col items-center gap-1.5 p-3 bg-[#F8F8F8] rounded-xl hover:bg-gray-100 transition">
                  <IconComp size={24} className="text-[#CD0301]" />
                  <span className="text-[11px] font-medium text-[#1A1A1A] text-center leading-tight">{cat?.name}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Promo Products */}
        {(promoProducts ?? []).length > 0 && (
          <section className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Ofertas da semana</h2>
              <Link href="/ofertas" className="text-[#CD0301] text-sm font-medium flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {(promoProducts ?? []).map((p: any) => (
                <div key={p?.id} className="min-w-[160px] max-w-[180px] flex-shrink-0">
                  <ProductCard product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddToCart} onUpdateQuantity={handleUpdateQty} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Promo banners (from admin) — só aparecem quando cadastrados no admin */}
        {promoBanners.length > 0 && (
          <div className="grid gap-3 my-4">
            {promoBanners.map((b: any) => {
              const inner = (
                <div className="relative rounded-xl p-4 flex items-center gap-3 overflow-hidden" style={{ backgroundColor: b.bgColor, color: b.textColor }}>
                  {b.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  )}
                  <Tag size={24} className="flex-shrink-0 relative z-10" />
                  <div className="relative z-10">
                    <p className="font-bold text-sm">{b.title}</p>
                    {b.subtitle && <p className="text-xs opacity-80">{b.subtitle}</p>}
                  </div>
                </div>
              );
              return b.linkUrl ? <Link key={b.id} href={b.linkUrl}>{inner}</Link> : <div key={b.id}>{inner}</div>;
            })}
          </div>
        )}

        {/* All Products */}
        <section className="py-4">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Todos os produtos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(allProducts ?? []).map((p: any) => (
              <ProductCard key={p?.id} product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddToCart} onUpdateQuantity={handleUpdateQty} />
            ))}
          </div>
        </section>
      </div>

      <BottomNav cartCount={totalItems} />
    </div>
  );
}
