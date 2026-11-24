'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { MapPin, Plus, Pencil, Trash2, X, Save, Truck } from 'lucide-react';
import { toast } from 'sonner';

type Bairro = {
  id: string;
  name: string;
  variacoes: string[];
  deliveryFee: number;
  minimumOrder: number;
  freeDeliveryFrom: number | null;
  prazo: string | null;
  atendido: boolean;
  active: boolean;
  order: number;
};

const emptyForm = { name: '', variacoes: '', deliveryFee: '', minimumOrder: '', freeDeliveryFrom: '', prazo: '', atendido: true, active: true };

export default function AdminBairrosPage() {
  const [items, setItems] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Bairro | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/neighborhoods')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d?.neighborhoods) ? d.neighborhoods : []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch('/api/admin/delivery/settings')
      .then(r => r.json())
      .then(d => setFeeEnabled(d?.delivery_fee_enabled === true))
      .catch(() => setFeeEnabled(false));
  }, []);

  const toggleFee = async (next: boolean) => {
    setFeeSaving(true);
    try {
      const res = await fetch('/api/admin/delivery/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_fee_enabled: next }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao salvar.'); return; }
      setFeeEnabled(next);
      toast.success(next ? 'Frete na cesta ativado.' : 'Frete na cesta desativado — será informado pelo atendente.');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setFeeSaving(false);
    }
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (b: Bairro) => {
    setEditing(b);
    setForm({
      name: b.name,
      variacoes: (b.variacoes ?? []).join(', '),
      deliveryFee: String(b.deliveryFee ?? ''),
      minimumOrder: String(b.minimumOrder ?? ''),
      freeDeliveryFrom: b.freeDeliveryFrom != null ? String(b.freeDeliveryFrom) : '',
      prazo: b.prazo ?? '',
      atendido: b.atendido,
      active: b.active,
    });
    setModal(true);
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    const name = String(form.name ?? '').trim();
    if (!name) { toast.error('Informe o nome do bairro.'); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        variacoes: String(form.variacoes ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
        deliveryFee: form.deliveryFee === '' ? 0 : Number(form.deliveryFee),
        minimumOrder: form.minimumOrder === '' ? 0 : Number(form.minimumOrder),
        freeDeliveryFrom: form.freeDeliveryFrom === '' ? null : Number(form.freeDeliveryFrom),
        prazo: String(form.prazo ?? '').trim() || null,
        atendido: Boolean(form.atendido),
        active: Boolean(form.active),
      };
      const url = editing ? `/api/admin/neighborhoods/${editing.id}` : '/api/admin/neighborhoods';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao salvar.'); return; }
      toast.success(editing ? 'Bairro atualizado!' : 'Bairro cadastrado!');
      setModal(false);
      load();
    } catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const remove = async (b: Bairro) => {
    if (!confirm(`Remover o bairro “${b.name}”? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/admin/neighborhoods/${b.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao remover.'); return; }
      toast.success('Bairro removido.');
      load();
    } catch { toast.error('Erro ao remover.'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Bairros e Fretes</h1>
          <p className="text-sm text-[#666666] mt-1 flex items-center gap-1.5">
            <MapPin size={14} className="text-[#CD0301]" /> {items.length} bairro(s) cadastrado(s) • gerencie taxas, pedido mínimo e frete grátis
          </p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#CD0301] text-white text-sm font-semibold hover:bg-[#b00201] transition"><Plus size={16} /> Novo bairro</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#CD0301]/10 flex items-center justify-center flex-shrink-0">
              <Truck size={20} className="text-[#CD0301]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1A1A1A]">Cálculo do frete na cesta</h2>
              <p className="text-sm text-[#666666] mt-0.5 max-w-xl">
                Quando <b>desativado</b>, o app não soma o frete ao total da cesta e mostra ao cliente que o valor será informado pelo atendente no WhatsApp. As taxas por bairro abaixo continuam salvas e voltam a ser usadas assim que você reativar.
              </p>
              <p className="text-xs font-medium mt-1.5">
                Status atual: {feeEnabled
                  ? <span className="text-green-700">frete somado à cesta (usando as taxas por bairro)</span>
                  : <span className="text-[#CD0301]">frete informado pelo atendente no WhatsApp</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleFee(!feeEnabled)}
            disabled={feeSaving}
            role="switch"
            aria-checked={feeEnabled}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${feeEnabled ? 'bg-green-500' : 'bg-gray-300'} ${feeSaving ? 'opacity-60' : ''}`}
            title={feeEnabled ? 'Desativar frete na cesta' : 'Ativar frete na cesta'}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${feeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#666666] border-b">
              <th className="p-3">Bairro</th>
              <th className="p-3">Taxa de entrega</th>
              <th className="p-3">Pedido mínimo</th>
              <th className="p-3">Frete grátis a partir de</th>
              <th className="p-3">Prazo</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#CD0301]" />{n.name}</span>
                  {(n.variacoes ?? []).length > 0 && <span className="block text-xs text-[#999] mt-0.5 pl-5">Variações: {n.variacoes.join(', ')}</span>}
                </td>
                <td className="p-3">{formatBRL(n.deliveryFee ?? 0)}</td>
                <td className="p-3">{formatBRL(n.minimumOrder ?? 0)}</td>
                <td className="p-3">{n.freeDeliveryFrom ? formatBRL(n.freeDeliveryFrom) : '—'}</td>
                <td className="p-3 text-[#666666]">{n.prazo || '—'}</td>
                <td className="p-3">
                  {n.active
                    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Ativo</span>
                    : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inativo</span>}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(n)} className="p-2 rounded-lg hover:bg-gray-100 text-[#666666]" title="Editar"><Pencil size={16} /></button>
                    <button onClick={() => remove(n)} className="p-2 rounded-lg hover:bg-red-50 text-[#CD0301]" title="Remover"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="p-8 text-center text-[#666666]">Nenhum bairro cadastrado. Clique em “Novo bairro” para começar.</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Editar bairro' : 'Novo bairro'}</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold">Nome do bairro *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Cidade Nova" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
              </div>
              <div>
                <label className="text-sm font-semibold">Variações de escrita (opcional)</label>
                <input value={form.variacoes} onChange={e => set('variacoes', e.target.value)} placeholder="Separe por vírgula. Ex.: Cid. Nova, Cidade-Nova" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                <p className="text-xs text-[#666666] mt-1">Ajuda a reconhecer o bairro quando o cliente digita de forma diferente.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Taxa de entrega (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} placeholder="0,00" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Pedido mínimo (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.minimumOrder} onChange={e => set('minimumOrder', e.target.value)} placeholder="0,00" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Frete grátis a partir de (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.freeDeliveryFrom} onChange={e => set('freeDeliveryFrom', e.target.value)} placeholder="Deixe vazio p/ não oferecer" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Prazo de entrega</label>
                  <input value={form.prazo} onChange={e => set('prazo', e.target.value)} placeholder="Ex.: 30 a 60 min" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-[#CD0301]" />
                  <span className="text-sm">Ativo (disponível para os clientes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.atendido} onChange={e => set('atendido', e.target.checked)} className="w-4 h-4 accent-[#CD0301]" />
                  <span className="text-sm">Atendido pela loja</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t">
              <button onClick={() => setModal(false)} disabled={saving} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#CD0301] text-white text-sm font-semibold hover:bg-[#b00201] disabled:opacity-50"><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
