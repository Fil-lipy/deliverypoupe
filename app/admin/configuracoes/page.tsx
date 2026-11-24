'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Settings, Database, Store, Phone, MapPin, Clock } from 'lucide-react';

export default function AdminConfiguracoesPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => setSettings(d ?? {})).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings size={24} className="text-[#CD0301]" />
        <div>
          <h1 className="text-2xl font-bold">Configurações da Loja</h1>
          <p className="text-sm text-[#666666] flex items-center gap-1.5 mt-1">
            <Database size={14} /> Dados da loja sincronizados do ERP via Supabase
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-lg space-y-5">
        <div className="flex items-start gap-3">
          <Store size={20} className="text-[#CD0301] mt-0.5" />
          <div>
            <label className="text-sm font-medium text-[#666666]">Nome da loja</label>
            <p className="text-base font-semibold mt-0.5">{settings?.store_name || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone size={20} className="text-[#CD0301] mt-0.5" />
          <div>
            <label className="text-sm font-medium text-[#666666]">WhatsApp</label>
            <p className="text-base font-semibold mt-0.5">{settings?.whatsapp_number || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin size={20} className="text-[#CD0301] mt-0.5" />
          <div>
            <label className="text-sm font-medium text-[#666666]">Endereço</label>
            <p className="text-base font-semibold mt-0.5">{settings?.store_address || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock size={20} className="text-[#CD0301] mt-0.5" />
          <div>
            <label className="text-sm font-medium text-[#666666]">Horário de funcionamento</label>
            <p className="text-base font-semibold mt-0.5">{settings?.store_hours || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
