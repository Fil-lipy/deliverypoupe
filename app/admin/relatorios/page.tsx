'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, Percent, Package, Users, Truck, Store, Tag } from 'lucide-react';

const ReportsChart = dynamic(() => import('../_components/reports-chart'), { ssr: false });

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-[#CD0301]" />
        <span className="text-xs text-[#666666]">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#1A1A1A]">{value}</p>
      {sub && <p className="text-xs text-[#666666] mt-0.5">{sub}</p>}
    </div>
  );
}

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function AdminRelatoriosPage() {
  const [from, setFrom] = useState(todayStr(-29));
  const [to, setTo] = useState(todayStr(0));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/reports?from=${from}&to=${to}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary ?? {};

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={24} className="text-[#CD0301]" />
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-[#666666] mt-1">Análise de pedidos enviados via WhatsApp no período</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-[#666666] block mb-1">De</label>
          <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
        </div>
        <div>
          <label className="text-xs font-medium text-[#666666] block mb-1">Até</label>
          <input type="date" value={to} min={from} max={todayStr(0)} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFrom(todayStr(-6)); setTo(todayStr(0)); }} className="text-xs font-medium px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">7 dias</button>
          <button onClick={() => { setFrom(todayStr(-29)); setTo(todayStr(0)); }} className="text-xs font-medium px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">30 dias</button>
          <button onClick={() => { setFrom(todayStr(-89)); setTo(todayStr(0)); }} className="text-xs font-medium px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">90 dias</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !data ? (
        <p className="text-sm text-[#666666]">Erro ao carregar relatório.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={ShoppingBag} label="Pedidos enviados" value={String(s.sentCount ?? 0)} sub={`${s.cartsCreated ?? 0} carrinhos criados`} />
            <StatCard icon={DollarSign} label="Receita estimada" value={formatBRL(s.revenue ?? 0)} sub={`Ticket médio ${formatBRL(s.avgTicket ?? 0)}`} />
            <StatCard icon={Percent} label="Conversão" value={`${s.convRate ?? 0}%`} sub={`${s.withCoupon ?? 0} com cupom`} />
            <StatCard icon={Package} label="Itens vendidos" value={String(s.totalItems ?? 0)} sub={`${s.avgItems ?? 0} itens/pedido`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Truck} label="Entregas" value={String(s.deliveryCount ?? 0)} />
            <StatCard icon={Store} label="Retiradas" value={String(s.pickupCount ?? 0)} />
            <StatCard icon={Tag} label="Descontos concedidos" value={formatBRL(s.totalDiscount ?? 0)} />
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
            <h2 className="font-bold text-[#1A1A1A] mb-3 flex items-center gap-2"><TrendingUp size={18} className="text-[#CD0301]" /> Receita por dia</h2>
            <ReportsChart data={data.series ?? []} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="font-bold text-[#1A1A1A] mb-3 flex items-center gap-2"><Package size={18} className="text-[#CD0301]" /> Produtos mais vendidos</h2>
              {(data.topProducts ?? []).length === 0 ? <p className="text-sm text-[#666666]">Sem dados no período.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-[#666666] border-b border-gray-100"><th className="py-2">Produto</th><th className="py-2 text-right">Qtd</th><th className="py-2 text-right">Receita</th></tr></thead>
                    <tbody>
                      {(data.topProducts ?? []).map((p: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-2"><span className="line-clamp-1">{p.name}</span><span className="text-xs text-[#999]">{p.brand}</span></td>
                          <td className="py-2 text-right font-semibold">{p.qty}</td>
                          <td className="py-2 text-right">{formatBRL(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="font-bold text-[#1A1A1A] mb-3 flex items-center gap-2"><Users size={18} className="text-[#CD0301]" /> Melhores clientes</h2>
              {(data.topCustomers ?? []).length === 0 ? <p className="text-sm text-[#666666]">Sem dados no período.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-[#666666] border-b border-gray-100"><th className="py-2">Cliente</th><th className="py-2 text-right">Pedidos</th><th className="py-2 text-right">Receita</th></tr></thead>
                    <tbody>
                      {(data.topCustomers ?? []).map((c: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-2"><span className="line-clamp-1">{c.name}</span></td>
                          <td className="py-2 text-right font-semibold">{c.orders}</td>
                          <td className="py-2 text-right">{formatBRL(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
