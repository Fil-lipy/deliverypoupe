'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Logo } from './logo';
import { CartBadge } from './cart-badge';
import { Search, User, LogIn } from 'lucide-react';
import Link from 'next/link';

export function CustomerHeader({ cartCount = 0, userName = '' }: { cartCount?: number; userName?: string }) {
  const router = useRouter();
  const { status } = useSession() || {};
  const isGuest = status === 'unauthenticated';
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <Link href="/home">
          <Logo size="sm" />
        </Link>
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8F8F8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301] focus:bg-white border border-transparent focus:border-gray-200"
          />
        </form>
        <CartBadge count={cartCount} />
        {isGuest ? (
          <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#CD0301] hover:bg-[#b00201] transition px-3 py-2 rounded-lg">
            <LogIn size={16} />
            <span className="hidden md:inline">Entrar</span>
          </Link>
        ) : (
          <Link href="/conta" className="hidden md:flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#1A1A1A]">
            <div className="w-8 h-8 bg-[#F8F8F8] rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <span className="max-w-[100px] truncate">{userName || 'Conta'}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
