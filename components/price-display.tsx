'use client';

export function formatBRL(value: number | null | undefined): string {
  const num = value ?? 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PriceDisplay({ price, promoPrice, size = 'md' }: { price: number; promoPrice?: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const hasPromo = promoPrice != null && promoPrice < price;
  const mainSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const oldSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex flex-col">
      {hasPromo ? (
        <>
          <span className={`${oldSize} line-through text-gray-400`}>{formatBRL(price)}</span>
          <span className={`${mainSize} font-bold text-[#CD0301]`}>{formatBRL(promoPrice)}</span>
        </>
      ) : (
        <span className={`${mainSize} font-bold text-[#1A1A1A]`}>{formatBRL(price)}</span>
      )}
    </div>
  );
}
