'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Image as ImageIcon, GripVertical } from 'lucide-react';

const POSITIONS: Record<string, string> = {
  home_hero: 'Topo da home (destaque)',
  home_promo: 'Faixa promocional',
};

const emptyForm = {
  id: '', title: '', subtitle: '', imageUrl: '', linkUrl: '',
  bgColor: '#CD0301', textColor: '#FFFFFF', position: 'home_hero', order: 0, active: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/banners').then(r => r.json()).then(d => setBanners(d?.banners ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setShowForm(true); };
  const openEdit = (b: any) => { setForm({ ...emptyForm, ...b, subtitle: b.subtitle ?? '', imageUrl: b.imageUrl ?? '', linkUrl: b.linkUrl ?? '' }); setShowForm(true); };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Informe um título.'); return; }
    setSaving(true);
    try {
      const isEdit = Boolean(form.id);
      const res = await fetch(isEdit ? `/api/admin/banners/${form.id}` : '/api/admin/banners', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, order: Number(form.order) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Banner atualizado!' : 'Banner criado!');
      setShowForm(false);
      load();
    } catch { toast.error('Erro ao salvar banner.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Banner removido.');
      load();
    } catch { toast.error('Erro ao remover.'); }
  };

  const toggleActive = async (b: any) => {
    try {
      await fetch(`/api/admin/banners/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, active: !b.active }) });
      load();
    } catch { toast.error('Erro.'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-sm text-[#666666] mt-1">Gerencie os destaques exibidos na home do app.</p>
        </div>
        <button onClick={openNew} className="bg-[#CD0301] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-[#b00201]">
          <Plus size={16} /> Novo banner
        </button>
      </div>

      <div className="grid gap-3">
        {banners.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-[#666666]">Nenhum banner cadastrado ainda.</div>}
        {banners.map((b) => (
          <div key={b.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-64 h-28 flex items-center px-5 relative flex-shrink-0" style={{ backgroundColor: b.bgColor, color: b.textColor }}>
              {b.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
              ) : null}
              <div className="relative z-10">
                <p className="font-bold text-sm leading-tight">{b.title}</p>
                {b.subtitle && <p className="text-xs opacity-90">{b.subtitle}</p>}
              </div>
            </div>
            <div className="flex-1 p-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="inline-block bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-full mb-1">{POSITIONS[b.position] ?? b.position}</span>
                <p className="text-[#666666] text-xs flex items-center gap-1"><GripVertical size={12} /> Ordem: {b.order}</p>
                {b.linkUrl && <p className="text-[#666666] text-xs truncate max-w-[220px]">Link: {b.linkUrl}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(b)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.active ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => openEdit(b)} className="p-2 text-[#666666] hover:text-[#CD0301]"><Pencil size={16} /></button>
                <button onClick={() => remove(b.id)} className="p-2 text-[#666666] hover:text-[#CD0301]"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{form.id ? 'Editar banner' : 'Novo banner'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#666666]">Título *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: Ofertas da semana" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666]">Subtítulo</label>
                <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ex: Até 30% off em medicamentos" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] flex items-center gap-1"><ImageIcon size={12} /> URL da imagem (opcional)</label>
                <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="https://i.pinimg.com/736x/0e/09/2c/0e092c6f9d7cfd0dc0ff61375fba91cc.jpg" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666]">Link ao clicar (opcional)</label>
                <input value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="/ofertas ou /categoria/beleza-e-cosmeticos" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#666666]">Cor de fundo</label>
                  <input type="color" value={form.bgColor} onChange={e => setForm({ ...form, bgColor: e.target.value })} className="w-full h-10 border rounded-lg mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#666666]">Cor do texto</label>
                  <input type="color" value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })} className="w-full h-10 border rounded-lg mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#666666]">Posição</label>
                  <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 bg-white">
                    {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#666666]">Ordem</label>
                  <input type="number" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Banner ativo
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2.5 text-sm font-semibold">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-[#CD0301] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
