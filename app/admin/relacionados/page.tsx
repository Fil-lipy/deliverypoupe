'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Link2, Search, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Sel = { value: string; label: string } | null;
type TypeKind = 'PRODUCT' | 'CATEGORY' | 'SUBCATEGORY' | 'DETAIL' | 'KEYWORD';

const TYPE_LABELS: Record<TypeKind, string> = {
  PRODUCT: 'Produto',
  CATEGORY: 'Categoria',
  SUBCATEGORY: 'Subcategoria',
  DETAIL: 'Detalhe',
  KEYWORD: 'Palavra-chave',
};

function ProductPicker({ onPick }: { onPick: (p: any) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(q.trim())}&limit=8`).then((r) => r.json()).then((d) => { setResults(d?.products ?? []); setOpen(true); }).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto pelo nome..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading ? <div className="p-3 text-sm text-[#666]">Buscando...</div> : results.length === 0 ? <div className="p-3 text-sm text-[#666]">Nenhum produto encontrado</div> : results.map((p: any) => (
            <button key={p?.id} onClick={() => { onPick(p); setQ(''); setResults([]); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
              <div className="w-9 h-9 bg-[#F8F8F8] rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p?.imageUrl ? <img src={p.imageUrl} alt={p?.name ?? ''} className="w-full h-full object-contain" /> : <Package size={16} className="text-gray-300" />}
              </div>
              <div className="min-w-0"><p className="text-sm font-medium line-clamp-1">{p?.name}</p><p className="text-xs text-[#666]">{p?.brand}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ValuePicker({ kind, cats, onChange }: { kind: TypeKind; cats: any[]; onChange: (s: Sel) => void }) {
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [det, setDet] = useState('');
  const [picked, setPicked] = useState<Sel>(null);

  const catObj = cats.find((c) => c.slug === cat || c.id === cat);
  const subObj = (catObj?.subcategories ?? []).find((s: any) => s.slug === sub);
  const detObj = (subObj?.detalhes ?? []).find((d: any) => d.slug === det);

  useEffect(() => {
    if (kind === 'CATEGORY') onChange(cat ? { value: cat, label: catObj?.name ?? cat } : null);
    else if (kind === 'SUBCATEGORY') onChange(cat && sub ? { value: `${cat}::${sub}`, label: `${catObj?.name} / ${subObj?.name}` } : null);
    else if (kind === 'DETAIL') onChange(cat && sub && det ? { value: `${cat}::${sub}::${det}`, label: `${catObj?.name} / ${subObj?.name} / ${detObj?.name}` } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, sub, det, kind]);

  if (kind === 'KEYWORD') {
    return <input onChange={(e) => onChange(e.target.value.trim() ? { value: e.target.value.trim(), label: `“${e.target.value.trim()}”` } : null)} placeholder="Ex.: nutri kids" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301]" />;
  }
  if (kind === 'PRODUCT') {
    return (
      <div>
        <ProductPicker onPick={(p) => { const s = { value: String(p.id), label: p.name }; setPicked(s); onChange(s); }} />
        {picked && <div className="mt-2 text-sm bg-red-50 rounded-lg p-2 flex items-center gap-2"><Package size={14} className="text-[#CD0301]" /> {picked.label}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <select value={cat} onChange={(e) => { setCat(e.target.value); setSub(''); setDet(''); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
        <option value="">Selecione a categoria...</option>
        {cats.map((c) => <option key={c.slug ?? c.id} value={c.slug ?? c.id}>{c.icon} {c.name}</option>)}
      </select>
      {(kind === 'SUBCATEGORY' || kind === 'DETAIL') && (
        <select value={sub} onChange={(e) => { setSub(e.target.value); setDet(''); }} disabled={!catObj} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40">
          <option value="">Selecione a subcategoria...</option>
          {(catObj?.subcategories ?? []).map((s: any) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      )}
      {kind === 'DETAIL' && (
        <select value={det} onChange={(e) => setDet(e.target.value)} disabled={!subObj} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40">
          <option value="">Selecione o detalhe...</option>
          {(subObj?.detalhes ?? []).map((d: any) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
        </select>
      )}
    </div>
  );
}

export default function AdminRelacionadosPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [relType, setRelType] = useState<'CROSS_SELL' | 'UP_SELL'>('CROSS_SELL');
  const [triggerType, setTriggerType] = useState<TypeKind>('DETAIL');
  const [targetType, setTargetType] = useState<TypeKind>('KEYWORD');
  const [triggerSel, setTriggerSel] = useState<Sel>(null);
  const [targetSel, setTargetSel] = useState<Sel>(null);
  const [targetLimit, setTargetLimit] = useState(4);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/relations').then((r) => r.json()).then((d) => setRules(Array.isArray(d?.rules) ? d.rules : [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/categories').then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []));
  }, [load]);

  const createRule = async () => {
    if (!triggerSel) { toast.error('Defina o gatilho da regra.'); return; }
    if (!targetSel) { toast.error('Defina o alvo da regra.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/relations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: relType, triggerType, triggerValue: triggerSel.value, triggerLabel: triggerSel.label,
          targetType, targetValue: targetSel.value, targetLabel: targetSel.label, targetLimit,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Erro ao criar regra.'); return; }
      toast.success('Regra criada!');
      setTriggerSel(null); setTargetSel(null);
      load();
    } catch { toast.error('Erro ao criar regra.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (rule: any) => {
    await fetch(`/api/admin/relations/${rule.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !rule.active }) });
    load();
  };
  const removeRule = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    const res = await fetch(`/api/admin/relations/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Erro ao excluir.'); return; }
    toast.success('Regra excluída.');
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link2 size={24} className="text-[#CD0301]" />
        <div>
          <h1 className="text-2xl font-bold">Regras de Relacionados</h1>
          <p className="text-sm text-[#666666] mt-1">Crie regras de cross-sell / up-sell por produto, categoria, subcategoria, detalhe ou palavra-chave.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-bold mb-4">Nova regra</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Quando o produto for (gatilho)</p>
            <select value={triggerType} onChange={(e) => { setTriggerType(e.target.value as TypeKind); setTriggerSel(null); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2">
              {Object.keys(TYPE_LABELS).map((k) => <option key={k} value={k}>{TYPE_LABELS[k as TypeKind]}</option>)}
            </select>
            <ValuePicker key={`trg-${triggerType}`} kind={triggerType} cats={cats} onChange={setTriggerSel} />
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Sugerir (alvo)</p>
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value as TypeKind); setTargetSel(null); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2">
              {Object.keys(TYPE_LABELS).map((k) => <option key={k} value={k}>{TYPE_LABELS[k as TypeKind]}</option>)}
            </select>
            <ValuePicker key={`tgt-${targetType}`} kind={targetType} cats={cats} onChange={setTargetSel} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="text-sm font-medium block mb-1">Tipo</label>
            <select value={relType} onChange={(e) => setRelType(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="CROSS_SELL">Compre junto</option>
              <option value="UP_SELL">Você também pode gostar</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Qtd. máx. sugerida</label>
            <input type="number" min={1} max={20} value={targetLimit} onChange={(e) => setTargetLimit(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={createRule} disabled={saving} className="ml-auto bg-[#CD0301] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#b30201] disabled:opacity-50">{saving ? 'Criando...' : 'Criar regra'}</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b font-bold">Regras cadastradas ({rules.length})</div>
        {loading ? <div className="p-6"><LoadingSpinner /></div> : rules.length === 0 ? (
          <div className="p-8 text-center text-[#666]">Nenhuma regra cadastrada.</div>
        ) : (
          <div className="divide-y">
            {rules.map((r) => (
              <div key={r.id} className={`flex items-center gap-3 p-4 ${r.active ? '' : 'opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{TYPE_LABELS[r.triggerType as TypeKind] ?? r.triggerType}</span>
                    <span className="truncate">{r.triggerLabel || r.triggerValue}</span>
                    <span className="text-[#CD0301] font-bold">→</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{TYPE_LABELS[r.targetType as TypeKind] ?? r.targetType}</span>
                    <span className="truncate">{r.targetLabel || r.targetValue}</span>
                  </div>
                  <div className="text-xs text-[#666] mt-0.5">{r.type === 'UP_SELL' ? 'Você também pode gostar' : 'Compre junto'} • até {r.targetLimit} item(ns){!r.active ? ' • inativa' : ''}</div>
                </div>
                <button title={r.active ? 'Desativar' : 'Ativar'} onClick={() => toggleActive(r)} className="p-1.5 text-gray-500 hover:text-gray-800">{r.active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button title="Excluir" onClick={() => removeRule(r.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
