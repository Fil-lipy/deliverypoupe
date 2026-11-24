'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { Eye, ChevronLeft, ChevronRight, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = { CREATED: 'bg-gray-100 text-gray-700', SENT_WHATSAPP: 'bg-blue-100 text-blue-700', CONVERTED: 'bg-green-100 text-green-700', ABANDONED: 'bg-red-100 text-red-700' };
const statusLabels: Record<string, string> = { CREATED: 'Criado', SENT_WHATSAPP: 'Enviado', CONVERTED: 'Convertido', ABANDONED: 'Abandonado' };

export default function AdminCarrinhosPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detailCart, setDetailCart] = useState<any>(null);

  const fetch_ = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('page', String(page));
    fetch(`/api/admin/carts?${params}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetch_(); }, [statusFilter, page]);

  const markConverted = async (id: string) => {
    await fetch(`/api/admin/carts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONVERTED' }) });
    toast.success('Marcado como convertido!');
    fetch_(); setDetailCart(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Carrinhos e Oportunidades</h1>
      <div className="flex gap-2 mb-4">
        {['all', 'CREATED', 'SENT_WHATSAPP', 'CONVERTED', 'ABANDONED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-[#CD0301] text-white' : 'bg-gray-100 text-[#666666]'}`}>
            {s === 'all' ? 'Todos' : statusLabels[s] ?? s}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[#666666] border-b"><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Itens</th><th className="p-3">Total est.</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr></thead>
            <tbody>{(data?.carts??[]).map((c:any)=>(<tr key={c?.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3 font-medium">{c?.user?.name??'N/A'}<br/><span className="text-xs text-[#666666]">{c?.user?.email}</span></td><td className="p-3 text-[#666666]">{new Date(c?.createdAt).toLocaleDateString('pt-BR')}</td><td className="p-3">{c?.items?.length??0}</td><td className="p-3 font-medium">{formatBRL(c?.total??0)}</td><td className="p-3"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColors[c?.status]??''}`}>{statusLabels[c?.status]??c?.status}</span></td><td className="p-3"><button onClick={()=>setDetailCart(c)} className="p-1.5 rounded hover:bg-gray-100 text-[#666666]"><Eye size={14} /></button></td></tr>))}</tbody>
          </table>
          {(data?.totalPages??1)>1&&(<div className="flex items-center justify-center gap-2 p-3 border-t"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1 disabled:opacity-30"><ChevronLeft size={18}/></button><span className="text-sm">{page}/{data?.totalPages}</span><button onClick={()=>setPage(p=>Math.min(data?.totalPages??1,p+1))} disabled={page===(data?.totalPages??1)} className="p-1 disabled:opacity-30"><ChevronRight size={18}/></button></div>)}
        </div>
      )}

      {/* Detail drawer */}
      {detailCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailCart(null)} />
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Detalhes do Carrinho</h2><button onClick={()=>setDetailCart(null)}><X size={20}/></button></div>
            <div className="space-y-3">
              <div className="bg-[#F8F8F8] rounded-lg p-3"><p className="text-sm font-medium">{detailCart?.user?.name}</p><p className="text-xs text-[#666666]">{detailCart?.user?.email} • {detailCart?.user?.phone??''}</p></div>
              <div className="bg-[#F8F8F8] rounded-lg p-3"><p className="text-sm font-medium">{detailCart?.deliveryMode==='DELIVERY'?'Entrega':'Retirada'}</p>{detailCart?.neighborhood&&<p className="text-xs text-[#666666]">{detailCart.neighborhood.name}</p>}{detailCart?.addressStreet&&<p className="text-xs text-[#666666]">{detailCart.addressStreet}, {detailCart.addressNumber}</p>}</div>
              <div className="space-y-1">{(detailCart?.items??[]).map((i:any)=>(<div key={i?.id} className="flex justify-between text-sm bg-[#F8F8F8] rounded-lg px-3 py-2"><span>{i?.quantity}x {i?.product?.name}</span><span className="font-medium">{formatBRL(i?.subtotal??0)}</span></div>))}</div>
              <div className="bg-[#F8F8F8] rounded-lg p-3 space-y-1"><div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatBRL(detailCart?.subtotal??0)}</span></div>{(detailCart?.discount??0)>0&&<div className="flex justify-between text-sm text-green-600"><span>Desconto</span><span>-{formatBRL(detailCart.discount)}</span></div>}<div className="flex justify-between text-sm"><span>Frete</span><span>{formatBRL(detailCart?.deliveryFee??0)}</span></div><div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{formatBRL(detailCart?.total??0)}</span></div></div>
              {detailCart?.notes&&<div className="bg-[#F8F8F8] rounded-lg p-3"><p className="text-xs text-[#666666]"><strong>Obs:</strong> {detailCart.notes}</p></div>}
              {detailCart?.status==='SENT_WHATSAPP'&&(<button onClick={()=>markConverted(detailCart.id)} className="w-full bg-[#1A7A3C] text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"><CheckCircle size={16}/> Marcar como convertido</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
