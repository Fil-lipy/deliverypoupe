'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, X, FolderTree } from 'lucide-react';

type Sub = { slug: string; name: string; active: boolean; isCustom: boolean; order: number };
type Cat = { slug: string; name: string; icon: string; order: number; active: boolean; isCustom: boolean; count: number; subcategories: Sub[] };

type ModalState =
  | { kind: 'cat-new' }
  | { kind: 'cat-edit'; cat: Cat }
  | { kind: 'sub-new'; catSlug: string; catName: string }
  | { kind: 'sub-edit'; catSlug: string; sub: Sub }
  | null;

export default function AdminCategoriasPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/categories')
      .then((r) => { if (!r.ok) throw new Error('err'); return r.json(); })
      .then((d) => { setCats(Array.isArray(d) ? d : []); setConnError(false); })
      .catch(() => { setConnError(true); setCats([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (slug: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(slug) ? n.delete(slug) : n.add(slug);
      return n;
    });
  };

  const saveCat = async (payload: any) => {
    setBusy(true);
    const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e?.error ?? 'Erro ao salvar.'); return false; }
    setModal(null); load(); return true;
  };

  const saveSub = async (payload: any) => {
    setBusy(true);
    const res = await fetch('/api/admin/categories/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e?.error ?? 'Erro ao salvar.'); return false; }
    setModal(null); load(); return true;
  };

  const toggleCatActive = async (c: Cat) => {
    await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: c.slug, name: c.name, active: !c.active }) });
    load();
  };
  const toggleSubActive = async (catSlug: string, s: Sub) => {
    await fetch('/api/admin/categories/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ catSlug, slug: s.slug, name: s.name, active: !s.active }) });
    load();
  };

  const deleteCat = async (c: Cat) => {
    if (!confirm(`Excluir a categoria "${c.name}"? Os produtos reclassificados para ela voltam à classificação original.`)) return;
    const res = await fetch(`/api/admin/categories?slug=${encodeURIComponent(c.slug)}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e?.error ?? 'Erro.'); return; }
    load();
  };
  const deleteSub = async (catSlug: string, s: Sub) => {
    if (!confirm(`Excluir a subcategoria "${s.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/subcategories?catSlug=${encodeURIComponent(catSlug)}&slug=${encodeURIComponent(s.slug)}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e?.error ?? 'Erro.'); return; }
    load();
  };

  if (loading) return <LoadingSpinner />;
  if (connError) return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Categorias</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
        <span>⚠️</span> O catálogo está temporariamente indisponível. <button onClick={load} className="underline font-medium">Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-[#666666] mt-1 flex items-center gap-1.5">
            <FolderTree size={14} /> Crie, edite e organize categorias e subcategorias • {cats.length} categorias
          </p>
        </div>
        <button onClick={() => setModal({ kind: 'cat-new' })} className="inline-flex items-center gap-1.5 bg-[#CD0301] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#b30201]">
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        {cats.map((c) => {
          const open = expanded.has(c.slug);
          return (
            <div key={c.slug} className={c.active ? '' : 'opacity-50'}>
              <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
                <button onClick={() => toggleExpand(c.slug)} className="p-1 text-gray-500">
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.name}
                    {c.isCustom && <span className="text-[10px] bg-[#FFBC00]/20 text-[#8a6d00] px-1.5 py-0.5 rounded font-semibold">CUSTOM</span>}
                    {!c.active && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">INATIVA</span>}
                  </div>
                  <div className="text-xs text-[#666666]">{c.slug} • {c.count} produtos • {c.subcategories.length} subcategorias</div>
                </div>
                <button title={c.active ? 'Desativar' : 'Ativar'} onClick={() => toggleCatActive(c)} className="p-1.5 text-gray-500 hover:text-gray-800">
                  {c.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button title="Editar" onClick={() => setModal({ kind: 'cat-edit', cat: c })} className="p-1.5 text-gray-500 hover:text-[#CD0301]"><Pencil size={16} /></button>
                {c.isCustom && <button title="Excluir" onClick={() => deleteCat(c)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>}
              </div>

              {open && (
                <div className="pl-12 pr-3 pb-3">
                  <div className="border border-gray-100 rounded-lg divide-y">
                    {c.subcategories.length === 0 && <div className="p-3 text-xs text-[#999]">Nenhuma subcategoria.</div>}
                    {c.subcategories.map((s) => (
                      <div key={s.slug} className={`flex items-center gap-2 p-2.5 ${s.active ? '' : 'opacity-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {s.name}
                            {s.isCustom && <span className="text-[10px] bg-[#FFBC00]/20 text-[#8a6d00] px-1.5 py-0.5 rounded font-semibold">CUSTOM</span>}
                            {!s.active && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">INATIVA</span>}
                          </div>
                          <div className="text-[11px] text-[#999]">{s.slug}</div>
                        </div>
                        <button title={s.active ? 'Desativar' : 'Ativar'} onClick={() => toggleSubActive(c.slug, s)} className="p-1.5 text-gray-500 hover:text-gray-800">{s.active ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                        <button title="Editar" onClick={() => setModal({ kind: 'sub-edit', catSlug: c.slug, sub: s })} className="p-1.5 text-gray-500 hover:text-[#CD0301]"><Pencil size={15} /></button>
                        {s.isCustom && <button title="Excluir" onClick={() => deleteSub(c.slug, s)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setModal({ kind: 'sub-new', catSlug: c.slug, catName: c.name })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#CD0301] hover:underline">
                    <Plus size={14} /> Adicionar subcategoria
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {cats.length === 0 && <div className="p-8 text-center text-[#666666]">Nenhuma categoria.</div>}
      </div>

      {modal && <CategoryModal modal={modal} busy={busy} onClose={() => setModal(null)} onSaveCat={saveCat} onSaveSub={saveSub} />}
    </div>
  );
}

function CategoryModal({ modal, busy, onClose, onSaveCat, onSaveSub }: { modal: NonNullable<ModalState>; busy: boolean; onClose: () => void; onSaveCat: (p: any) => Promise<boolean>; onSaveSub: (p: any) => Promise<boolean>; }) {
  const isCat = modal.kind === 'cat-new' || modal.kind === 'cat-edit';
  const editingCat = modal.kind === 'cat-edit' ? modal.cat : null;
  const editingSub = modal.kind === 'sub-edit' ? modal.sub : null;
  const [name, setName] = useState(editingCat?.name ?? editingSub?.name ?? '');
  const [icon, setIcon] = useState(editingCat?.icon ?? '📦');

  const title = modal.kind === 'cat-new' ? 'Nova categoria' : modal.kind === 'cat-edit' ? 'Editar categoria' : modal.kind === 'sub-new' ? 'Nova subcategoria' : 'Editar subcategoria';

  const submit = async () => {
    if (!name.trim()) { alert('Informe um nome.'); return; }
    if (isCat) {
      await onSaveCat({ slug: editingCat?.slug, name: name.trim(), icon });
    } else if (modal.kind === 'sub-new') {
      await onSaveSub({ catSlug: modal.catSlug, name: name.trim() });
    } else if (modal.kind === 'sub-edit') {
      await onSaveSub({ catSlug: modal.catSlug, slug: modal.sub.slug, name: name.trim() });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Nome</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex.: Lenços umedecidos" />
          </div>
          {isCat && (
            <div>
              <label className="text-sm font-medium block mb-1">Ícone (emoji)</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-lg text-center" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-[#CD0301] text-white font-semibold hover:bg-[#b30201] disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
