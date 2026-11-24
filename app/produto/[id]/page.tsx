'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { PriceDisplay } from '@/components/price-display';
import { ProductCard } from '@/components/product-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart, Plus, Minus, Info, ArrowLeft, Pill, Sparkles, Bath, Baby, Dumbbell, ShoppingBag, Home, Package, FileWarning, Lock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FavoriteButton } from '@/components/favorite-button';
import { gtmViewItem, gtmAddToCart } from '@/lib/gtm';

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

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession() || {};
  const isGuest = status === 'unauthenticated';
  const { addToCart, updateItemQuantity, getProductQuantity, getItemByProductId, totalItems } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [crossSell, setCrossSell] = useState<any[]>([]);
  const [upSell, setUpSell] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(p => {
        setProduct(p);
        if (p?.categoryId) {
          fetch(`/api/products?categoryId=${p.categoryId}&limit=5`).then(r => r.json()).then(d => {
            setRelated((d?.products ?? []).filter((x: any) => x?.id !== p?.id).slice(0, 4));
          });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // GTM: view_item
  useEffect(() => {
    if (product && !loading) gtmViewItem(product);
  }, [product, loading]);

  useEffect(() => {
    fetch(`/api/products/${params.id}/related`).then(r => r.json()).then(d => {
      setCrossSell(Array.isArray(d?.crossSell) ? d.crossSell : []);
      setUpSell(Array.isArray(d?.upSell) ? d.upSell : []);
    }).catch(() => {});
  }, [params.id]);

  const qty = getProductQuantity(params.id);
  const hasPromo = product?.promoPrice != null && product?.promoPrice < product?.price;
  const discount = hasPromo ? Math.round((1 - product.promoPrice / product.price) * 100) : 0;
  const IconComp = categoryIcons[product?.category?.slug ?? 'outros'] ?? Package;
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(product?.imageUrl) && !imgError;
  const stock = Number(product?.stock ?? 0);
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 2;

  const handleAdd = async () => {
    setActionLoading(true);
    try {
      await addToCart(params.id);
      gtmAddToCart(product);
      toast.success('Produto adicionado ao carrinho!');
    } catch { toast.error('Erro.'); }
    finally { setActionLoading(false); }
  };

  const handleQtyChange = async (newQty: number) => {
    setActionLoading(true);
    try {
      const item = getItemByProductId(params.id);
      if (item) await updateItemQuantity(item.id, newQty);
    } catch { toast.error('Erro.'); }
    finally { setActionLoading(false); }
  };

  const handleAddRelated = async (productId: string) => { await addToCart(productId); };
  const handleUpdateRelatedQty = async (productId: string, newQty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, newQty);
  };

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={0} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-4">
        <Link href="/home" className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Product Image */}
        <div className="relative bg-white border border-gray-100 aspect-square md:aspect-[16/9] rounded-xl flex items-center justify-center mb-6 p-4">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product?.name ?? 'Produto'}
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <IconComp size={80} className="text-gray-300" />
          )}
          {hasPromo && (
            <span className="absolute top-3 left-3 bg-[#CD0301] text-white text-sm font-bold px-3 py-1.5 rounded-lg">
              OFERTA -{discount}%
            </span>
          )}
          <div className="absolute top-3 right-3">
            <FavoriteButton productId={String(params.id)} size={22} />
          </div>
          {outOfStock && (
            <span className="absolute bottom-3 left-3 bg-gray-700 text-white text-xs font-semibold px-3 py-1 rounded-lg">
              Esgotado
            </span>
          )}
          {lowStock && (
            <span className="absolute bottom-3 left-3 bg-[#FFBC00] text-[#1A1A1A] text-xs font-bold px-3 py-1 rounded-lg">
              Últimas unidades
            </span>
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-[#1A1A1A] mb-1">{product?.name ?? 'Produto'}</h1>
        <p className="text-sm text-[#666666] mb-1">{product?.brand}</p>
        <p className="text-sm text-[#666666] mb-4">{product?.presentation}</p>

        {isGuest ? (
          <div className="bg-[#FFF6E5] border border-[#FFE0A3] rounded-xl p-4 flex items-center gap-3">
            <Lock size={20} className="text-[#B57A00] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#B57A00]">Faça login para ver o preço</p>
              <p className="text-xs text-[#8A6400]">Os preços são exclusivos para clientes cadastrados.</p>
            </div>
          </div>
        ) : (
          <PriceDisplay price={product?.price ?? 0} promoPrice={product?.promoPrice} size="lg" />
        )}

        {/* Prescription warning */}
        {product?.requiresPrescription && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Este produto requer receita médica. A dispensação estará sujeita à apresentação e validação da receita, conforme a legislação vigente.
            </p>
          </div>
        )}

        {lowStock && (
          <p className="mt-3 text-sm font-semibold text-[#B07A00]">Restam apenas {stock} em estoque</p>
        )}

        {/* Add to Cart */}
        <div className="mt-6">
          {isGuest ? (
            <div className="flex flex-col gap-2">
              <Link href="/cadastro" className="w-full bg-[#CD0301] text-white py-4 rounded-xl text-base font-semibold hover:bg-[#b00201] transition flex items-center justify-center gap-2 h-[52px]">
                Cadastre-se para comprar
              </Link>
              <Link href="/login" className="w-full text-center text-sm text-[#CD0301] font-semibold hover:underline">
                Já tem conta? Entrar
              </Link>
            </div>
          ) : outOfStock ? (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 cursor-not-allowed h-[52px]"
            >
              Produto esgotado
            </button>
          ) : qty > 0 ? (
            <div className="flex items-center justify-center gap-4 bg-[#F8F8F8] rounded-xl py-3">
              <button onClick={() => handleQtyChange(qty - 1)} disabled={actionLoading} className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm text-[#CD0301] hover:bg-red-50 transition disabled:opacity-50">
                <Minus size={20} />
              </button>
              <span className="text-xl font-bold w-8 text-center">{qty}</span>
              <button onClick={() => handleQtyChange(qty + 1)} disabled={actionLoading || qty >= stock} title={qty >= stock ? 'Quantidade máxima em estoque' : undefined} className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm text-[#CD0301] hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus size={20} />
              </button>
            </div>
          ) : (
            <button onClick={handleAdd} disabled={actionLoading} className="w-full bg-[#CD0301] text-white py-4 rounded-xl text-base font-semibold hover:bg-[#b00201] transition flex items-center justify-center gap-2 disabled:opacity-50 h-[52px]">
              <ShoppingCart size={20} />
              {actionLoading ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </button>
          )}
        </div>

        {/* Description */}
        {product?.descriptionHtml ? (
          <div className="mt-8">
            <h2 className="font-bold text-[#1A1A1A] mb-2">Descrição</h2>
            <div
              className="product-description text-sm text-[#666666] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </div>
        ) : product?.description ? (
          <div className="mt-8">
            <h2 className="font-bold text-[#1A1A1A] mb-2">Descrição</h2>
            <p className="text-sm text-[#666666] leading-relaxed">{product.description}</p>
          </div>
        ) : null}

        {product?.activeIngredient && (
          <div className="mt-4">
            <h2 className="font-bold text-[#1A1A1A] mb-2">Princípio ativo</h2>
            <p className="text-sm text-[#666666]">{product.activeIngredient}</p>
          </div>
        )}

        {/* Compre junto (cross-sell configurado) */}
        {(crossSell ?? []).length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold text-[#1A1A1A] mb-4">Compre junto</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {(crossSell ?? []).map((p: any) => (
                <div key={p?.id} className="min-w-[160px] max-w-[180px] flex-shrink-0">
                  <ProductCard product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddRelated} onUpdateQuantity={handleUpdateRelatedQty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Você também pode gostar (up-sell configurado) */}
        {(upSell ?? []).length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold text-[#1A1A1A] mb-4">Você também pode gostar</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {(upSell ?? []).map((p: any) => (
                <div key={p?.id} className="min-w-[160px] max-w-[180px] flex-shrink-0">
                  <ProductCard product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddRelated} onUpdateQuantity={handleUpdateRelatedQty} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {(related ?? []).length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold text-[#1A1A1A] mb-4">Você também pode precisar</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {(related ?? []).map((p: any) => (
                <div key={p?.id} className="min-w-[160px] max-w-[180px] flex-shrink-0">
                  <ProductCard product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddRelated} onUpdateQuantity={handleUpdateRelatedQty} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
