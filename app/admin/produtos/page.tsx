'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { Search, ChevronLeft, ChevronRight, Database, FileWarning, Tags, X, CheckSquare, ImageIcon } from 'lucide-react';
import Link from 'next/link';

type Sub = { slug: string; name: string; active: boolean };
type Cat = { slug: string; name: string; icon: string; count: number; subcategories: Sub[] };

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [showReclassify, setShowReclassify] = useState(false);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (catFilter) params.set('categoryId', catFilter);
    if (subFilter) params.set('subId', subFilter);
    params.set('sort', sort);
    params.set('page', String(page));
    fetch(`/api/admin/products?${params}`).then((r) => { if (!r.ok) throw new Error('err'); return r.json(); }).then((d) => {
      setProducts(d?.products ?? []);
      setTotalPages(d?.totalPages ?? 1);
      setTotal(d?.total ?? 0);
      setConnError(false);
    }).catch(() => { setConnError(true); setProducts([]); }).finally(() => setLoading(false));
  }, [search, catFilter, subFilter, sort, page]);

  useEffect(() => {
    fetch('/api/admin/categories').then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const currentCat = cats.find((c) => c.slug === catFilter);

  const filterParams = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (catFilter) params.set('categoryId', catFilter);
    if (subFilter) params.set('subId', subFilter);
    return params;
  };

  const pageEans = products.map((p) => p?.barcode).filter((b: any) => typeof b === 'string' && b);
  const allPageSelected = pageEans.length > 0 && pageEans.every((e: string) => selected.has(e));

  const togglePageSelection = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allPageSelected) pageEans.forEach((e: string) => n.delete(e));
      else pageEans.forEach((e: string) => n.add(e));
      return n;
    });
  };
  const toggleOne = (ean: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(ean) ? n.delete(ean) : n.add(ean);
      return n;
    });
  };

  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const params = filterParams();
      params.set('idsOnly', 'true');
      const d = await fetch(`/api/admin/products?${params}`).then((r) => r.json());
      const eans: string[] = d?.eans ?? [];
      setSelected(new Set(eans));
    } finally {
      setSelectingAll(false);
    }
  };

  const clearSelection = () => setSelected(new Set());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-[#666666] mt-1 flex items-center gap-1.5">
            <Database size={14} /> {total} produtos ativos • selecione itens para reclassificar em massa
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Buscar por nome, marca ou princípio ativo..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setSubFilter(''); setPage(1); }} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="">Todas categorias</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>)}
        </select>
        <select value={subFilter} onChange={(e) => { setSubFilter(e.target.value); setPage(1); }} disabled={!currentCat} className="text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:opacity-40">
          <option value="">Todas subcategorias</option>
          {(currentCat?.subcategories ?? []).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="relevance">Relevância</option>
          <option value="name">Nome (A-Z)</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-[#FFBC00]/15 border border-[#FFBC00]/40 rounded-lg">
          <span className="text-sm font-semibold">{selected.size} selecionado(s)</span>
          <button onClick={() => setShowReclassify(true)} className="inline-flex items-center gap-1.5 bg-[#CD0301] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#b30201]">
            <Tags size={15} /> Reclassificar
          </button>
          <button onClick={clearSelection} className="text-sm text-[#666] hover:underline">Limpar seleção</button>
        </div>
      )}

      {connError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700 flex items-center gap-2"><span>⚠️</span> O catálogo de produtos está temporariamente indisponível. Verifique a conexão do banco de dados e <button onClick={fetchProducts} className="underline font-medium">tente novamente</button>.</div>}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 text-xs text-[#666]">
            <button onClick={selectAllMatching} disabled={selectingAll} className="inline-flex items-center gap-1 font-semibold text-[#CD0301] hover:underline disabled:opacity-50">
              <CheckSquare size={14} /> {selectingAll ? 'Selecionando...' : `Selecionar todos os ${total} do filtro`}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666666] border-b">
                <th className="p-3 w-10"><input type="checkbox" checked={allPageSelected} onChange={togglePageSelection} className="accent-[#CD0301]" /></th>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Categoria</th>
                <th className="p-3 font-medium">Subcategoria</th>
                <th className="p-3 font-medium">Preço Por</th>
                <th className="p-3 font-medium">Estoque</th>
                <th className="p-3 font-medium">Receita</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const ean = p?.barcode;
                const selectable = typeof ean === 'string' && !!ean;
                return (
                  <tr key={p?.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3">
                      <input type="checkbox" disabled={!selectable} checked={selectable && selected.has(ean)} onChange={() => selectable && toggleOne(ean)} className="accent-[#CD0301] disabled:opacity-30" />
                    </td>
                    <td className="p-3 font-medium"><Link href={`/admin/produtos/${p?.id}`} className="hover:text-[#CD0301] hover:underline">{p?.name}</Link><br /><span className="text-xs text-[#666666]">{p?.brand}</span></td>
                    <td className="p-3 text-[#666666]">{p?.category?.name ?? ''}</td>
                    <td className="p-3 text-[#666666]">{p?.subcategory?.name ?? '—'}</td>
                    <td className="p-3">{p?.promoPrice ? <span className="text-[#CD0301] font-semibold">{formatBRL(p.promoPrice)}</span> : formatBRL(p?.price ?? 0)}</td>
                    <td className="p-3">{p?.stock ?? 0}</td>
                    <td className="p-3">{p?.requiresPrescription ? <span className="inline-flex items-center gap-0.5 text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded"><FileWarning size={10} /> Sim</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-3 border-t">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded disabled:opacity-30"><ChevronLeft size={18} /></button>
              <span className="text-sm">Página {page} de {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
      )}

      {showReclassify && (
        <ReclassifyModal
          cats={cats}
          count={selected.size}
          onClose={() => setShowReclassify(false)}
          onDone={() => { setShowReclassify(false); clearSelection(); fetchProducts(); }}
          eans={Array.from(selected)}
        />
      )}
    </div>
  );
}

function ReclassifyModal({ cats, count, eans, onClose, onDone }: { cats: Cat[]; count: number; eans: string[]; onClose: () => void; onDone: () => void; }) {
  const [catSlug, setCatSlug] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const cat = cats.find((c) => c.slug === catSlug);
  const sub = cat?.subcategories.find((s) => s.slug === subSlug);

  const submit = async () => {
    if (!catSlug || !cat) { alert('Selecione a categoria de destino.'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/products/reclassify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eans, catSlug, catName: cat.name, subSlug: subSlug || null, subName: sub?.name ?? null }),
    });
    setBusy(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e?.error ?? 'Erro ao reclassificar.'); return; }
    const d = await res.json();
    alert(`${d?.count ?? count} produto(s) reclassificado(s) para ${cat.name}${sub ? ' / ' + sub.name : ''}.`);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Reclassificar {count} produto(s)</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Categoria de destino</label>
            <select value={catSlug} onChange={(e) => { setCatSlug(e.target.value); setSubSlug(''); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Subcategoria (opcional)</label>
            <select value={subSlug} onChange={(e) => setSubSlug(e.target.value)} disabled={!cat} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:opacity-40">
              <option value="">Sem subcategoria</option>
              {(cat?.subcategories ?? []).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-[#CD0301] text-white font-semibold hover:bg-[#b30201] disabled:opacity-50">{busy ? 'Aplicando...' : 'Reclassificar'}</button>
        </div>
      </div>
    </div>
  );
}
