'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CustomerHeader } from '@/components/customer-header';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingSpinner } from '@/components/loading-spinner';
import { EmptyState } from '@/components/empty-state';
import { useCart } from '@/hooks/use-cart';
import { ArrowLeft, Plus, MapPin, Star, Pencil, Trash2, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EnderecosPage() {
  const { data: session } = useSession() || {};
  const { totalItems } = useCart();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', street: '', number: '', complement: '', neighborhood: '', reference: '', zipCode: '', isDefault: false });

  const fetchAddresses = () => {
    fetch('/api/account/addresses').then(r => r.json()).then(d => setAddresses(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAddresses(); }, []);

  const resetForm = () => {
    setForm({ label: '', street: '', number: '', complement: '', neighborhood: '', reference: '', zipCode: '', isDefault: false });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.street || !form.number || !form.neighborhood || !form.zipCode) { toast.error('Preencha os campos obrigatórios.'); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { toast.success(editingId ? 'Endereço atualizado!' : 'Endereço adicionado!'); resetForm(); fetchAddresses(); }
      else toast.error('Erro.');
    } catch { toast.error('Erro.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este endereço?')) return;
    await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    toast.info('Endereço excluído.');
    fetchAddresses();
  };

  const handleSetDefault = async (id: string) => {
    await fetch(`/api/account/addresses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDefault: true }) });
    toast.success('Endereço padrão atualizado!');
    fetchAddresses();
  };

  const startEdit = (addr: any) => {
    setForm({ label: addr?.label ?? '', street: addr?.street ?? '', number: addr?.number ?? '', complement: addr?.complement ?? '', neighborhood: addr?.neighborhood ?? '', reference: addr?.reference ?? '', zipCode: addr?.zipCode ?? '', isDefault: addr?.isDefault ?? false });
    setEditingId(addr?.id);
    setShowForm(true);
  };

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={totalItems} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/conta" className="flex items-center gap-1 text-sm text-[#666666] mb-4"><ArrowLeft size={16} /> Voltar</Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Meus endereços</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#CD0301] text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-[#b00201]"><Plus size={16} /> Adicionar</button>
        </div>

        {showForm && (
          <div className="bg-[#F8F8F8] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{editingId ? 'Editar endereço' : 'Novo endereço'}</h3>
              <button onClick={resetForm}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Apelido do endereço (ex.: Casa, Trabalho)" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Rua *" value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Número *" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
                <input placeholder="Complemento" value={form.complement} onChange={e => setForm(p => ({ ...p, complement: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              </div>
              <input placeholder="Bairro *" value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="CEP *" value={form.zipCode} onChange={e => setForm(p => ({ ...p, zipCode: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Referência" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="accent-[#CD0301]" /> Endereço padrão</label>
              <button onClick={handleSave} disabled={saving} className="w-full bg-[#CD0301] text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {(addresses ?? []).length === 0 && !showForm ? (
          <EmptyState title="Nenhum endereço cadastrado" description="Adicione um endereço para facilitar suas entregas." />
        ) : (
          <div className="space-y-2">
            {(addresses ?? []).map((addr: any) => (
              <div key={addr?.id} className="bg-[#F8F8F8] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-[#CD0301] mt-0.5" />
                    <div>
                      {addr?.label && <p className="text-xs font-bold text-[#CD0301] mb-0.5">{addr.label}</p>}
                      <p className="text-sm font-medium">{addr?.street}, {addr?.number}{addr?.complement ? ` - ${addr.complement}` : ''}</p>
                      <p className="text-xs text-[#666666]">{addr?.neighborhood} • CEP {addr?.zipCode}</p>
                      {addr?.reference && <p className="text-xs text-[#666666]">{addr.reference}</p>}
                    </div>
                  </div>
                  {addr?.isDefault && <span className="flex items-center gap-0.5 text-[10px] text-[#FFBC00] font-bold"><Star size={10} /> Padrão</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  {!addr?.isDefault && <button onClick={() => handleSetDefault(addr?.id)} className="text-xs text-[#CD0301] font-medium hover:underline">Definir padrão</button>}
                  <button onClick={() => startEdit(addr)} className="text-xs text-[#666666] font-medium hover:underline flex items-center gap-0.5"><Pencil size={10} /> Editar</button>
                  <button onClick={() => handleDelete(addr?.id)} className="text-xs text-[#CD0301] font-medium hover:underline flex items-center gap-0.5"><Trash2 size={10} /> Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav cartCount={totalItems} />
    </div>
  );
}
