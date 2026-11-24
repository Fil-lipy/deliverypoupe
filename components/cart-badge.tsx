'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export function CartBadge({ count = 0 }: { count?: number }) {
  return (
    <Link href="/carrinho" className="relative p-2">
      <ShoppingCart size={24} className="text-[#1A1A1A]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#CD0301] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
