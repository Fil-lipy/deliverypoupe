'use client';

import { useSession, signOut } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { useCart } from '@/hooks/use-cart';
import Link from 'next/link';
import { User, MapPin, ShoppingBag, Heart, LogOut, ChevronRight } from 'lucide-react';

export default function ContaPage() {
  const { data: session } = useSession() || {};
  const { totalItems } = useCart();
  const userName = (session?.user as any)?.name ?? '';
  const initial = userName?.charAt(0)?.toUpperCase() ?? 'U';

  const menuItems = [
    { label: 'Dados pessoais', href: '/conta/dados', icon: User },
    { label: 'Meus endereços', href: '/conta/enderecos', icon: MapPin },
    { label: 'Meus favoritos', href: '/favoritos', icon: Heart },
    { label: 'Carrinhos anteriores', href: '/conta/carrinhos', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={userName?.split(' ')?.[0]} />
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">Minha Conta</h1>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#CD0301] rounded-full flex items-center justify-center text-white text-xl font-bold">
            {initial}
          </div>
          <div>
            <p className="font-semibold text-[#1A1A1A]">{userName}</p>
            <p className="text-sm text-[#666666]">{(session?.user as any)?.email ?? ''}</p>
          </div>
        </div>

        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-xl hover:bg-gray-100 transition">
              <item.icon size={20} className="text-[#CD0301]" />
              <span className="flex-1 font-medium text-[#1A1A1A]">{item.label}</span>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          ))}
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 p-4 w-full bg-[#F8F8F8] rounded-xl hover:bg-gray-100 transition">
            <LogOut size={20} className="text-[#CD0301]" />
            <span className="flex-1 text-left font-medium text-[#1A1A1A]">Sair</span>
          </button>
        </div>
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
