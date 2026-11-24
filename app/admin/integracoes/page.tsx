'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Plug, MessageCircle, BarChart2, Facebook, Webhook, Info, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminIntegracoesPage() {
  const [form, setForm] = useState<any>({ whatsapp_number: '', google_analytics_id: '', facebook_pixel_id: '', webhook_url: '', webhook_enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/integrations').then(r => r.json()).then(d => setForm({
      whatsapp_number: d?.whatsapp_number ?? '', google_analytics_id: d?.google_analytics_id ?? '',
      facebook_pixel_id: d?.facebook_pixel_id ?? '', webhook_url: d?.webhook_url ?? '', webhook_enabled: Boolean(d?.webhook_enabled),
    })).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/integrations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao salvar.'); return; }
      toast.success('Integrações salvas!');
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const testWhatsapp = () => {
    const num = String(form.whatsapp_number ?? '').replace(/[^0-9]/g, '');
    if (num.length < 10) { toast.error('Informe um número de WhatsApp válido (com DDD e código do país) antes de testar.'); return; }
    const msg = encodeURIComponent('✅ Mensagem de teste do painel Poupefarma Delivery. Se você recebeu isto, o número configurado para receber os pedidos está correto.');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank', 'noopener,noreferrer');
    toast.success('Abrimos o WhatsApp com uma mensagem de teste. Confirme se a conversa é com o número correto e envie a mensagem.');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Plug size={24} className="text-[#CD0301]" />
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-sm text-[#666666] mt-1">Conecte seu app a ferramentas externas de atendimento e análise</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm max-w-2xl space-y-6">
        <div>
          <label className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 mb-1"><MessageCircle size={16} className="text-[#25D366]" /> Número de WhatsApp para pedidos</label>
          <p className="text-xs text-[#666666] mb-2">Número (com DDD e código do país) que recebe os pedidos enviados pelos clientes. Ex.: 5566999999999</p>
          <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value.replace(/[^0-9]/g, ''))} placeholder="5566999999999" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
          <button type="button" onClick={testWhatsapp} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1da851] transition"><Send size={15} /> Enviar mensagem de teste</button>
          <p className="text-xs text-[#666666] mt-1.5">O teste abre o WhatsApp com uma mensagem para o número informado acima, para você confirmar que os pedidos chegarão ao destino certo. Salve as integrações para que os clientes passem a enviar para este número.</p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 mb-1"><BarChart2 size={16} className="text-[#E37400]" /> Google Analytics (GA4)</label>
          <p className="text-xs text-[#666666] mb-2">ID de medição do Google Analytics para acompanhar o tráfego. Ex.: G-XXXXXXXXXX</p>
          <input value={form.google_analytics_id} onChange={e => set('google_analytics_id', e.target.value.trim())} placeholder="G-XXXXXXXXXX" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 mb-1"><Facebook size={16} className="text-[#1877F2]" /> Facebook / Meta Pixel</label>
          <p className="text-xs text-[#666666] mb-2">ID do Pixel da Meta para remarketing e mensuração de campanhas. Ex.: 123456789012345</p>
          <input value={form.facebook_pixel_id} onChange={e => set('facebook_pixel_id', e.target.value.replace(/[^0-9]/g, ''))} placeholder="123456789012345" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
        </div>

        <div className="border-t border-gray-100 pt-5">
          <label className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 mb-1"><Webhook size={16} className="text-[#CD0301]" /> Webhook de pedidos</label>
          <p className="text-xs text-[#666666] mb-2">Envie automaticamente cada pedido enviado para um sistema externo (ERP, CRM). Informe a URL que receberá os dados via POST.</p>
          <input value={form.webhook_url} onChange={e => set('webhook_url', e.target.value.trim())} placeholder="https://seu-sistema.com/webhook" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" checked={form.webhook_enabled} onChange={e => set('webhook_enabled', e.target.checked)} className="w-4 h-4 accent-[#CD0301]" />
            <span className="text-sm text-[#1A1A1A]">Ativar envio automático para o webhook</span>
          </label>
        </div>

        <div className="bg-[#FFBC00]/10 border border-[#FFBC00]/30 rounded-lg p-3 flex gap-2">
          <Info size={16} className="text-[#B07A00] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#666666]">Integrações mais profundas (ERP de estoque, meios de pagamento, emissão fiscal) exigem um projeto dedicado. Fale com o suporte para avaliar essas conexões.</p>
        </div>

        <button onClick={save} disabled={saving} className="w-full py-3 rounded-lg bg-[#CD0301] text-white text-sm font-semibold hover:bg-[#b00201] disabled:opacity-50 flex items-center justify-center gap-2"><Save size={16} /> {saving ? 'Salvando...' : 'Salvar integrações'}</button>
      </div>
    </div>
  );
}
