'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { Database, Tag, Info, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCuponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponsEnabled, setCouponsEnabled] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    fetch('/api/admin/coupons').then(r => r.json()).then(d => setCoupons(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    fetch('/api/admin/coupons/settings').then(r => r.json()).then(d => {
      if (typeof d?.coupons_enabled === 'boolean') setCouponsEnabled(d.coupons_enabled);
    }).catch(() => {});
  }, []);

  async function toggleCoupons(next: boolean) {
    setSavingToggle(true);
    setCouponsEnabled(next);
    try {
      const r = await fetch('/api/admin/coupons/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupons_enabled: next }),
      });
      if (!r.ok) throw new Error();
      toast.success(next ? 'Campo de cupons exibido para os clientes.' : 'Campo de cupons ocultado dos clientes.');
    } catch {
      setCouponsEnabled(!next);
      toast.error('Não foi possível salvar a alteração.');
    } finally {
      setSavingToggle(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Cupons</h1>
        <p className="text-sm text-[#666666] mt-1 flex items-center gap-1.5">
          <Database size={14} /> Cupons gerenciados pelo ERP • {coupons.length} cupons ativos
        </p>
      </div>

      {/* Aviso explicativo + controle de exibição */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-start gap-2 text-sm text-[#666666] mb-4">
          <Info size={18} className="text-[#FFBC00] shrink-0 mt-0.5" />
          <p>
            Os cupons são importados automaticamente do seu ERP e não podem ser criados,
            editados ou apagados aqui pelo app. Se você não configurou nenhum cupom e não
            quer que o campo de cupom apareça para os clientes durante a compra, basta
            <strong> desativar a exibição</strong> abaixo.
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            {couponsEnabled ? <Eye size={18} className="text-green-600" /> : <EyeOff size={18} className="text-[#999999]" />}
            <div>
              <p className="font-medium text-[#333333]">Mostrar campo de cupom para os clientes</p>
              <p className="text-xs text-[#666666]">
                {couponsEnabled
                  ? 'Os clientes veem o campo "Adicionar cupom" no carrinho.'
                  : 'O campo de cupom fica oculto para os clientes.'}
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={couponsEnabled}
            disabled={savingToggle}
            onClick={() => toggleCoupons(!couponsEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${couponsEnabled ? 'bg-[#CD0301]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${couponsEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#666666] border-b">
              <th className="p-3">Código</th>
              <th className="p-3">Benefício</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Mínimo</th>
              <th className="p-3">Teto</th>
              <th className="p-3">Validade</th>
            </tr>
          </thead>
          <tbody>
            {(coupons ?? []).map((c: any) => (
              <tr key={c?.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3"><span className="inline-flex items-center gap-1 font-bold text-[#CD0301]"><Tag size={14} />{c?.code}</span></td>
                <td className="p-3 text-[#666666]">{c?.beneficio ?? '—'}</td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c?.type === 'PERCENTAGE' ? 'bg-purple-100 text-purple-700' : c?.type === 'FRETE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {c?.type === 'PERCENTAGE' ? 'Percentual' : c?.type === 'FRETE' ? 'Frete' : 'Valor fixo'}
                  </span>
                </td>
                <td className="p-3">{c?.type === 'PERCENTAGE' ? `${c?.value}%` : formatBRL(c?.value ?? 0)}</td>
                <td className="p-3">{c?.minOrder ? formatBRL(c.minOrder) : '—'}</td>
                <td className="p-3">{c?.maxDiscount ? formatBRL(c.maxDiscount) : '—'}</td>
                <td className="p-3 text-[#666666]">{c?.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && (
          <div className="p-8 text-center text-[#666666]">Nenhum cupom ativo no momento.</div>
        )}
      </div>
    </div>
  );
}