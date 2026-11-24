'use client';

import { useEffect, useState } from 'react';
import { CustomerHeader } from '@/components/customer-header';
import { CheckCircle, MessageCircle, Home } from 'lucide-react';
import Link from 'next/link';

export default function EnviadoPage() {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/settings/public').then(r => r.json()).then(d => setSettings(d ?? {}));
  }, []);

  const whatsappNumber = settings?.whatsapp_number ?? '559491844905';

  return (
    <div className="min-h-screen bg-white">
      <CustomerHeader cartCount={0} />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-[#1A7A3C]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Seu carrinho foi preparado! 🛒</h1>
        <p className="text-sm text-[#666666] mb-2">Enviamos os dados para o WhatsApp. Nossa equipe irá confirmar estoque, receitas, frete e valor final.</p>
        <p className="text-sm text-[#1A7A3C] font-medium mb-8">Oportunidade gerada com sucesso</p>

        <div className="space-y-3">
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold hover:bg-[#1da851] transition">
            <MessageCircle size={20} /> Abrir WhatsApp
          </a>
          <Link href="/home" className="flex items-center justify-center gap-2 w-full border-2 border-[#CD0301] text-[#CD0301] py-3 rounded-xl font-semibold hover:bg-red-50 transition">
            <Home size={20} /> Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
