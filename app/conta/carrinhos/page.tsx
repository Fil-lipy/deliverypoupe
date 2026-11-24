'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { formatBRL } from '@/components/price-display';
import { useCart } from '@/hooks/use-cart';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

const statusLabels: Record<string, { label: string; color: string }> = {
  SENT_WHATSAPP: { label: 'Enviado ao WhatsApp', color: 'bg-blue-100 text-blue-700' },
  CONVERTED: { label: 'Convertido', color: 'bg-green-100 text-green-700' },
};

export default function CarrinhosAnterioresPage() {
  const { data: session } = useSession() || {};
  const { totalItems } = useCart();
  const [carts, setCarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/account/carts').then(r => r.json()).then(d => setCarts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={totalItems} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/conta" className="flex items-center gap-1 text-sm text-[#666666] mb-4"><ArrowLeft size={16} /> Voltar</Link>
        <h1 className="text-xl font-bold mb-4">Carrinhos anteriores</h1>
        {(carts ?? []).length === 0 ? (
          <EmptyState title="Nenhum carrinho enviado ainda" actionLabel="Ir às compras" actionHref="/home" />
        ) : (
          <div className="space-y-3">
            {carts.map((c: any) => {
              const st = statusLabels[c?.status] ?? { label: c?.status ?? '', color: 'bg-gray-100 text-gray-700' };
              const isOpen = expanded === c?.id;
              return (
                <div key={c?.id} className="bg-[#F8F8F8] rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : c?.id)} className="w-full text-left p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{new Date(c?.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-[#666666]">{c?.items?.length ?? 0} {(c?.items?.length ?? 0) === 1 ? 'item' : 'itens'} • {formatBRL(c?.total ?? 0)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-1">
                      {(c?.items ?? []).map((item: any) => (
                        <div key={item?.id} className="flex justify-between text-sm">
                          <span>{item?.quantity}x {item?.product?.name}</span>
                          <span className="font-medium">{formatBRL(item?.subtotal ?? 0)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                        <span>Total estimado</span>
                        <span>{formatBRL(c?.total ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
