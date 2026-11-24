'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, Tag, ShoppingCart, User } from 'lucide-react';

export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname() ?? '';
  const items = [
    { href: '/home', icon: Home, label: 'Início' },
    { href: '/categorias', icon: Grid3X3, label: 'Categorias' },
    { href: '/ofertas', icon: Tag, label: 'Ofertas' },
    { href: '/carrinho', icon: ShoppingCart, label: 'Carrinho', badge: cartCount },
    { href: '/conta', icon: User, label: 'Conta' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 px-2 py-1 relative ${active ? 'text-[#CD0301]' : 'text-[#666666]'}`}>
            <div className="relative">
              <item.icon size={20} />
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#CD0301] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {(item.badge ?? 0) > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
