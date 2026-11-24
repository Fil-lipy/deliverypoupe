'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Info, Percent, CheckCircle2, XCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

type Caderno = { cadernoId: string; name: string; allowed: boolean; productCount: number };

export default function AdminCadernosPage() {
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch('/api/admin/cadernos')
      .then(r => r.json())
      .then(d => setCadernos(Array.isArray(d?.cadernos) ? d.cadernos : []))
      .catch(() => toast.error('Erro ao carregar cadernos.'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(cadernoId: string) {
    setCadernos(prev => prev.map(c => c.cadernoId === cadernoId ? { ...c, allowed: !c.allowed } : c));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/cadernos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: cadernos.map(c => ({ cadernoId: c.cadernoId, allowed: c.allowed })) }),
      });
      if (!r.ok) throw new Error();
      toast.success('Preços atualizados para o delivery.');
      setDirty(false);
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Preços e cadernos de oferta</h1>
        <p className="text-sm text-[#666666] mt-1 flex items-center gap-1.5">
          <Percent size={14} /> Controle quais ofertas do ERP valem no delivery
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-start gap-2 text-sm text-[#666666]">
          <Info size={18} className="text-[#FFBC00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              O sistema usa sempre o <strong>menor preço</strong> vigente de cada produto. Parte
              desses preços vem de <strong>cadernos de oferta da loja física</strong> (ex.:
              "Vira Mês", "Quarta da Beleza"), que muitas vezes <strong>não devem valer no delivery</strong>.
            </p>
            <p>
              Marque abaixo apenas os cadernos que <strong>podem</strong> ser aplicados no delivery.
              Para os cadernos <strong>desmarcados</strong>, o app usa o preço normal de venda do produto.
              As <em>listas de precificação</em> (preço base do delivery) já vêm marcadas.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {cadernos.length === 0 ? (
          <div className="p-8 text-center text-[#666666]">Nenhum caderno de oferta ativo na loja no momento.</div>
        ) : (
          <ul className="divide-y">
            {cadernos.map(c => (
              <li key={c.cadernoId} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-[#1A1A1A] truncate">{c.name}</p>
                  <p className="text-xs text-[#666666] mt-0.5">
                    {c.productCount} {c.productCount === 1 ? 'produto' : 'produtos'} com este preço
                    {' • '}
                    {c.allowed
                      ? <span className="text-green-600 inline-flex items-center gap-1"><CheckCircle2 size={12} />válido no delivery</span>
                      : <span className="text-[#CD0301] inline-flex items-center gap-1"><XCircle size={12} />usa preço normal</span>}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={c.allowed}
                  onClick={() => toggle(c.cadernoId)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${c.allowed ? 'bg-[#CD0301]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${c.allowed ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cadernos.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 bg-[#CD0301] text-white font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#b30201] transition"
          >
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  );
}