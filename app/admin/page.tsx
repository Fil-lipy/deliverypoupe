'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { ShoppingCart, Send, TrendingUp, DollarSign, BarChart3, Package, UserPlus, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(() => import('./_components/dashboard-chart'), { ssr: false, loading: () => <div className="h-64 bg-white rounded-xl animate-pulse" /> });

const statCards = [
  { key: 'cartsToday', label: 'Carrinhos hoje', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
  { key: 'sentToday', label: 'Enviados ao WhatsApp', icon: Send, color: 'text-green-600 bg-green-50' },
  { key: 'convRate', label: 'Taxa de envio (%)', icon: TrendingUp, color: 'text-purple-600 bg-purple-50', suffix: '%' },
  { key: 'totalValue', label: 'Valor potencial do dia', icon: DollarSign, color: 'text-[#CD0301] bg-red-50', format: 'brl' },
  { key: 'avgTicket', label: 'Ticket médio potencial', icon: BarChart3, color: 'text-orange-600 bg-orange-50', format: 'brl' },
  { key: 'avgItems', label: 'Itens por carrinho', icon: Package, color: 'text-teal-600 bg-teal-50' },
  { key: 'newUsers', label: 'Novos cadastros hoje', icon: UserPlus, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'abandoned', label: 'Carrinhos abandonados', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
];

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  SENT_WHATSAPP: 'bg-blue-100 text-blue-700',
  CONVERTED: 'bg-green-100 text-green-700',
  ABANDONED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  CREATED: 'Criado',
  SENT_WHATSAPP: 'Enviado',
  CONVERTED: 'Convertido',
  ABANDONED: 'Abandonado',
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => {
          const val = data?.[card.key] ?? 0;
          return (
            <div key={card.key} className="bg-white rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color} mb-2`}>
                <card.icon size={16} />
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {card.format === 'brl' ? formatBRL(val) : `${val}${card.suffix ?? ''}`}
              </p>
              <p className="text-xs text-[#666666]">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="font-bold text-[#1A1A1A] mb-4">Carrinhos por dia — últimos 7 dias</h2>
        <DashboardChart data={data?.last7days ?? []} />
      </div>

      {/* Latest carts table */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-[#1A1A1A] mb-4">Últimas oportunidades</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666666] border-b">
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Itens</th>
                <th className="pb-2 font-medium">Total est.</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.latestCarts ?? []).map((c: any) => (
                <tr key={c?.id} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{c?.userName}</td>
                  <td className="py-2.5 text-[#666666]">{new Date(c?.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2.5">{c?.itemCount}</td>
                  <td className="py-2.5 font-medium">{formatBRL(c?.total ?? 0)}</td>
                  <td className="py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColors[c?.status] ?? 'bg-gray-100'}`}>
                      {statusLabels[c?.status] ?? c?.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
