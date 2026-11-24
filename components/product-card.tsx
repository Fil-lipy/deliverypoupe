'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ShoppingCart, Plus, Minus, Pill, Sparkles, Bath, Baby, Dumbbell, ShoppingBag, Home, Package, FileWarning, Lock } from 'lucide-react';
import { PriceDisplay } from './price-display';
import { FavoriteButton } from './favorite-button';
import { toast } from 'sonner';
import { gtmAddToCart, gtmRemoveFromCart, gtmSelectItem } from '@/lib/gtm';

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

interface ProductCardProps {
  product: any;
  cartQuantity?: number;
  onAddToCart?: (productId: string) => Promise<void>;
  onUpdateQuantity?: (productId: string, qty: number) => Promise<void>;
}

export function ProductCard({ product, cartQuantity = 0, onAddToCart, onUpdateQuantity }: ProductCardProps) {
  const { status } = useSession() || {};
  const isGuest = status === 'unauthenticated';
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(cartQuantity);
  const [imgError, setImgError] = useState(false);
  const categorySlug = product?.category?.slug ?? 'outros';
  const IconComp = categoryIcons[categorySlug] ?? Package;
  const showImage = Boolean(product?.imageUrl) && !imgError;
  const hasPromo = product?.promoPrice != null && product?.promoPrice < product?.price;
  const discount = hasPromo ? Math.round((1 - product.promoPrice / product.price) * 100) : 0;
  const stock = Number(product?.stock ?? 0);
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 2;

  const handleAdd = async () => {
    setLoading(true);
    try {
      await onAddToCart?.(product.id);
      setQty(1);
      gtmAddToCart(product);
      toast.success('Produto adicionado ao carrinho!');
    } catch {
      toast.error('Erro ao adicionar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = async (newQty: number) => {
    setLoading(true);
    try {
      await onUpdateQuantity?.(product.id, newQty);
      if (newQty < qty) gtmRemoveFromCart(product, qty - newQty);
      setQty(newQty);
      if (newQty === 0) toast.info('Produto removido do carrinho.');
    } catch {
      toast.error('Erro ao atualizar quantidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/produto/${product?.id ?? ''}`} className="block" onClick={() => gtmSelectItem(product)}>
        <div className="relative bg-white aspect-square flex items-center justify-center p-2">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product?.name ?? 'Produto'}
              className="w-full h-full object-contain"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <IconComp size={48} className="text-gray-300" />
          )}
          {hasPromo && (
            <span className="absolute top-2 left-2 bg-[#CD0301] text-white text-xs font-bold px-2 py-1 rounded">
              -{discount}%
            </span>
          )}
          {product?.requiresPrescription && (
            <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <FileWarning size={10} /> Receita
            </span>
          )}
          <div className={`absolute right-1.5 ${product?.requiresPrescription ? 'top-8' : 'top-1.5'}`}>
            <FavoriteButton productId={product?.id} size={16} />
          </div>
          {outOfStock && (
            <span className="absolute bottom-2 left-2 bg-gray-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              Esgotado
            </span>
          )}
          {lowStock && (
            <span className="absolute bottom-2 left-2 bg-[#FFBC00] text-[#1A1A1A] text-[10px] font-bold px-2 py-0.5 rounded">
              Últimas unidades
            </span>
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/produto/${product?.id ?? ''}`}>
          <h3 className="text-sm font-medium text-[#1A1A1A] line-clamp-2 hover:text-[#CD0301] transition-colors min-h-[2.5rem]">
            {product?.name ?? 'Produto'}
          </h3>
        </Link>
        <p className="text-xs text-[#666666] mt-0.5">{product?.brand ?? ''}</p>
        {isGuest ? (
          <div className="mt-auto pt-2">
            <Link href="/login" className="w-full bg-[#FFF6E5] text-[#B57A00] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FFEFCC] transition">
              <Lock size={14} /> Entre para ver o preço
            </Link>
            <Link href="/cadastro" className="mt-2 w-full bg-[#CD0301] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#b00201] transition">
              Cadastre-se para comprar
            </Link>
          </div>
        ) : (
        <>
        <div className="mt-auto pt-2">
          <PriceDisplay price={product?.price ?? 0} promoPrice={product?.promoPrice} size="sm" />
        </div>
        <div className="mt-2">
          {outOfStock ? (
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              Esgotado
            </button>
          ) : qty > 0 ? (
            <div className="flex items-center justify-between bg-[#F8F8F8] rounded-lg px-2 py-1">
              <button
                onClick={() => handleQtyChange(qty - 1)}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-[#CD0301] hover:bg-red-50 transition disabled:opacity-50"
              >
                <Minus size={16} />
              </button>
              <span className="font-semibold text-sm">{qty}</span>
              <button
                onClick={() => handleQtyChange(qty + 1)}
                disabled={loading || qty >= stock}
                title={qty >= stock ? 'Quantidade máxima em estoque' : undefined}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-[#CD0301] hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={loading}
              className="w-full bg-[#CD0301] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#b00201] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShoppingCart size={16} />
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
