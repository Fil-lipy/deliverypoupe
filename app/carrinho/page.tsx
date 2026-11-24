'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { PriceDisplay, formatBRL } from '@/components/price-display';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useCart } from '@/hooks/use-cart';
import { ProductCard } from '@/components/product-card';
import { Minus, Plus, X, Tag, Loader2, Info, FileWarning, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { gtmViewCart, gtmRemoveFromCart } from '@/lib/gtm';

export default function CarrinhoPage() {
  const { data: session } = useSession() || {};
  const { cart, loading, updateItemQuantity, removeItem, applyCoupon, removeCoupon, totalItems, fetchCart, addToCart, getProductQuantity, getItemByProductId } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponsAvailable, setCouponsAvailable] = useState<any[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [couponsEnabled, setCouponsEnabled] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [minOrder, setMinOrder] = useState(30);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(s => {
        setFeeEnabled(s?.delivery_fee_enabled === true);
        if (typeof s?.min_order_value === 'number') setMinOrder(s.min_order_value);
        const enabled = s?.coupons_enabled !== false;
        setCouponsEnabled(enabled);
        if (enabled) {
          fetch('/api/coupons').then(r => r.json()).then(d => setCouponsAvailable(Array.isArray(d) ? d : []));
        }
      })
      .catch(() => setCouponsEnabled(false));
  }, []);

  // GTM: view_cart
  useEffect(() => {
    if (!loading && (cart?.items ?? []).length > 0) {
      gtmViewCart(cart?.items ?? [], (cart?.subtotal ?? 0) - (cart?.discount ?? 0));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const cartProductIds = (cart?.items ?? []).map((i: any) => String(i?.productId)).filter(Boolean).join(',');
  useEffect(() => {
    const ids = cartProductIds ? cartProductIds.split(',') : [];
    if (ids.length === 0) { setSuggestions([]); return; }
    fetch('/api/relations/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: ids }) })
      .then(r => r.json())
      .then(d => setSuggestions(Array.isArray(d?.products) ? d.products : []))
      .catch(() => setSuggestions([]));
  }, [cartProductIds]);

  const handleAddSuggested = async (productId: string) => { await addToCart(productId); };
  const handleUpdateSuggestedQty = async (productId: string, newQty: number) => {
    const item = getItemByProductId(productId);
    if (item) await updateItemQuantity(item.id, newQty);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await applyCoupon(couponCode.trim());
      toast.success('Cupom aplicado!');
      setCouponCode('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Cupom inválido.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    await removeCoupon();
    toast.info('Cupom removido.');
  };

  const items = cart?.items ?? [];
  const savings = items.reduce((s: number, i: any) => {
    const origPrice = i?.product?.price ?? 0;
    const actualPrice = i?.unitPrice ?? origPrice;
    return s + (origPrice - actualPrice) * (i?.quantity ?? 0);
  }, 0) + (cart?.discount ?? 0);

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={0} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Meu Carrinho {totalItems > 0 ? `(${totalItems} ${totalItems === 1 ? 'item' : 'itens'})` : ''}</h1>

        {items.length === 0 ? (
          <EmptyState title="Seu carrinho está vazio" description="Adicione produtos para começar" actionLabel="Explorar produtos" actionHref="/home" />
        ) : (
          <>
            {/* Items */}
            <div className="space-y-3 mb-6">
              {items.map((item: any) => (
                <div key={item?.id} className="bg-[#F8F8F8] rounded-xl p-3 flex gap-3">
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item?.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item?.product?.name ?? ''}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = 'none';
                          t.parentElement?.querySelector('[data-fallback]')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Tag size={20} data-fallback className={`text-gray-300 ${item?.product?.imageUrl ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1">{item?.product?.name ?? ''}</p>
                        <p className="text-xs text-[#666666]">{item?.product?.brand} • {item?.product?.presentation}</p>
                        {item?.product?.requiresPrescription && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded mt-1">
                            <FileWarning size={10} /> Receita necessária
                          </span>
                        )}
                      </div>
                      <button onClick={() => { gtmRemoveFromCart(item?.product, item?.quantity ?? 1); removeItem(item?.id); }} className="text-gray-400 hover:text-[#CD0301] p-1"><X size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-white rounded-lg px-1">
                        <button onClick={() => updateItemQuantity(item?.id, (item?.quantity ?? 1) - 1)} className="w-7 h-7 flex items-center justify-center rounded text-[#CD0301] hover:bg-red-50"><Minus size={14} /></button>
                        <span className="text-sm font-semibold w-5 text-center">{item?.quantity ?? 0}</span>
                        <button onClick={() => updateItemQuantity(item?.id, (item?.quantity ?? 0) + 1)} className="w-7 h-7 flex items-center justify-center rounded text-[#CD0301] hover:bg-red-50"><Plus size={14} /></button>
                      </div>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatBRL(item?.subtotal ?? 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            {(couponsEnabled || cart?.coupon) && (
            <div className="mb-4">
              {cart?.coupon ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">Cupom {cart.coupon.code} aplicado</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-sm text-[#CD0301] font-medium">Remover</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input placeholder="Código do cupom" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                  <button onClick={handleApplyCoupon} disabled={couponLoading} className="bg-[#CD0301] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#b00201] disabled:opacity-50">
                    {couponLoading ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                  </button>
                </div>
              )}
              {!cart?.coupon && (
                <button onClick={() => setShowCoupons(!showCoupons)} className="text-sm text-[#CD0301] font-medium mt-2">
                  {showCoupons ? 'Ocultar cupons' : 'Ver cupons disponíveis'}
                </button>
              )}
              {showCoupons && !cart?.coupon && (
                <div className="mt-2 space-y-2">
                  {(couponsAvailable ?? []).map((c: any) => (
                    <button key={c?.id} onClick={() => { setCouponCode(c?.code ?? ''); setShowCoupons(false); }} className="w-full text-left bg-[#F8F8F8] rounded-lg p-3 hover:bg-gray-100 transition">
                      <p className="text-sm font-bold text-[#1A1A1A]">{c?.code}</p>
                      <p className="text-xs text-[#666666]">
                        {c?.type === 'PERCENTAGE' ? `${c?.value}% de desconto` : `${formatBRL(c?.value)} de desconto`}
                        {c?.minOrder ? ` • Pedido mínimo ${formatBRL(c.minOrder)}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Summary */}
            <div className="bg-[#F8F8F8] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Subtotal</span>
                <span className="font-medium">{formatBRL(cart?.subtotal ?? 0)}</span>
              </div>
              {(cart?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Desconto</span>
                  <span className="font-medium text-green-600">-{formatBRL(cart?.discount ?? 0)}</span>
                </div>
              )}
              {feeEnabled ? (
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Frete</span>
                  <span className="text-[#666666] italic">a calcular</span>
                </div>
              ) : (
                <div className="flex items-start justify-between text-sm gap-2">
                  <span className="text-[#666666]">Frete</span>
                  <span className="text-right text-[#666666] italic max-w-[65%]">informado pelo atendente no WhatsApp</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold">Total estimado</span>
                <span className="font-bold text-lg">{formatBRL((cart?.subtotal ?? 0) - (cart?.discount ?? 0))}</span>
              </div>
              {!feeEnabled && (
                <p className="text-xs text-[#666666]">O valor do frete será informado pelo atendente no WhatsApp ao finalizar o pedido.</p>
              )}
              {savings > 0 && (
                <p className="text-sm text-green-600 font-medium">Você economiza {formatBRL(savings)}</p>
              )}
            </div>

            <div className="mt-3 bg-[#FFBC00]/10 border border-[#FFBC00]/30 rounded-lg p-3 flex gap-2">
              <Info size={16} className="text-[#FFBC00] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#666666]">Valores e disponibilidade sujeitos à confirmação pela equipe</p>
            </div>

            {(suggestions ?? []).length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-[#1A1A1A] mb-3">Aproveite e leve também</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                  {(suggestions ?? []).map((p: any) => (
                    <div key={p?.id} className="min-w-[160px] max-w-[180px] flex-shrink-0">
                      <ProductCard product={p} cartQuantity={getProductQuantity(p?.id)} onAddToCart={handleAddSuggested} onUpdateQuantity={handleUpdateSuggestedQty} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const goodsValue = (cart?.subtotal ?? 0) - (cart?.discount ?? 0);
              const belowMin = minOrder > 0 && goodsValue < minOrder;
              if (belowMin) {
                const missing = Math.max(0, minOrder - goodsValue);
                return (
                  <>
                    <div className="mt-4 bg-[#CD0301]/5 border border-[#CD0301]/30 rounded-lg p-3 flex gap-2">
                      <Info size={16} className="text-[#CD0301] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#CD0301]">Pedido mínimo de {formatBRL(minOrder)}. Faltam {formatBRL(missing)} em produtos para finalizar.</p>
                    </div>
                    <button disabled className="block w-full bg-[#CD0301] text-white py-3.5 rounded-xl text-center font-semibold opacity-50 cursor-not-allowed mt-3">
                      Escolher entrega ou retirada
                    </button>
                  </>
                );
              }
              return (
                <Link href="/checkout/modalidade" className="block w-full bg-[#CD0301] text-white py-3.5 rounded-xl text-center font-semibold hover:bg-[#b00201] transition mt-4">
                  Escolher entrega ou retirada
                </Link>
              );
            })()}
            <Link href="/home" className="block text-center text-sm text-[#CD0301] font-medium mt-3 hover:underline">
              Continuar comprando
            </Link>
          </>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
