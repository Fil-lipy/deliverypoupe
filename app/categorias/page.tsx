'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useCart } from '@/hooks/use-cart';
import Link from 'next/link';
import { Pill, Sparkles, Bath, Baby, Dumbbell, ShoppingBag, Home, Package, ChevronRight } from 'lucide-react';

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

export default function CategoriasPage() {
  const { data: session } = useSession() || {};
  const { totalItems } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Categorias</h1>
        {loading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {(categories ?? []).map((cat: any) => {
              const IconComp = categoryIcons[cat?.slug] ?? Package;
              return (
                <Link key={cat?.id} href={`/categoria/${cat?.slug}`} className="flex items-center gap-3 p-4 bg-[#F8F8F8] rounded-xl hover:bg-gray-100 transition">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <IconComp size={20} className="text-[#CD0301]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#1A1A1A]">{cat?.name}</p>
                    <p className="text-xs text-[#666666]">{cat?._count?.products ?? 0} produtos</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
