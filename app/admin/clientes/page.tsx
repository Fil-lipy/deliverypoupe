'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminClientesPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('page', String(page));
    fetch(`/api/admin/clients?${params}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [search, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <div className="relative max-w-sm mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Buscar por nome ou e-mail" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[#666666] border-b"><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Celular</th><th className="p-3">Bairro</th><th className="p-3">Cadastro</th><th className="p-3">Carrinhos</th></tr></thead>
            <tbody>{(data?.clients??[]).map((c:any)=>(<tr key={c?.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3 font-medium">{c?.name}</td><td className="p-3 text-[#666666]">{c?.email}</td><td className="p-3">{c?.phone??'—'}</td><td className="p-3">{c?.addresses?.[0]?.neighborhood??'—'}</td><td className="p-3 text-[#666666]">{new Date(c?.createdAt).toLocaleDateString('pt-BR')}</td><td className="p-3">{c?._count?.carts??0}</td></tr>))}</tbody>
          </table>
          {(data?.totalPages??1)>1&&(<div className="flex items-center justify-center gap-2 p-3 border-t"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 disabled:opacity-30"><ChevronLeft size={18}/></button><span className="text-sm">{page}/{data?.totalPages}</span><button onClick={()=>setPage(p=>Math.min(data?.totalPages??1,p+1))} disabled={page===(data?.totalPages??1)} className="p-1 disabled:opacity-30"><ChevronRight size={18}/></button></div>)}
        </div>
      )}
    </div>
  );
}
