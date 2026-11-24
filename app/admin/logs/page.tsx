'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ScrollText, ChevronLeft, ChevronRight, User } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou', update: 'Atualizou', delete: 'Removeu', login: 'Entrou', send: 'Enviou',
};
const ENTITY_LABELS: Record<string, string> = {
  banner: 'Banner', relation: 'Relacionado', user: 'Usuário', integration: 'Integração', cart: 'Carrinho',
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  } catch { return dt; }
}

export default function AdminLogsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page) });
    if (entity) qs.set('entity', entity);
    fetch(`/api/admin/logs?${qs.toString()}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [page, entity]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ScrollText size={24} className="text-[#CD0301]" />
        <div>
          <h1 className="text-2xl font-bold">Logs de Atividade</h1>
          <p className="text-sm text-[#666666] mt-1">Histórico de ações administrativas realizadas no painel</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[#666666]">Filtrar:</span>
        <button onClick={() => { if (entity === '' && page === 1) { load(); } else { setEntity(''); setPage(1); } }} className={`text-xs font-medium px-3 py-1.5 rounded-full ${entity === '' ? 'bg-[#CD0301] text-white' : 'bg-gray-100 text-[#666666]'}`}>Todos</button>
        {(data?.entities ?? []).map((e: string) => (
          <button key={e} onClick={() => { setEntity(e); setPage(1); }} className={`text-xs font-medium px-3 py-1.5 rounded-full ${entity === e ? 'bg-[#CD0301] text-white' : 'bg-gray-100 text-[#666666]'}`}>{ENTITY_LABELS[e] ?? e}</button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {(data?.logs ?? []).length === 0 ? (
            <p className="text-sm text-[#666666] p-6 text-center">Nenhum registro encontrado.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.logs ?? []).map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3.5">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0"><User size={15} className="text-[#CD0301]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1A1A]">
                      <span className="font-semibold">{log.userName || 'Sistema'}</span>{' '}
                      <span className="text-[#666666]">{ACTION_LABELS[log.action] ?? log.action}</span>{' '}
                      {log.entity && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ENTITY_LABELS[log.entity] ?? log.entity}</span>}
                    </p>
                    {log.details && <p className="text-xs text-[#666666] mt-0.5">{log.details}</p>}
                  </div>
                  <span className="text-xs text-[#999] flex-shrink-0">{fmt(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-[#666666]">Página {data.page} de {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
