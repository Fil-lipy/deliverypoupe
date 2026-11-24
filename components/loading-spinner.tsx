'use client';

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 size={32} className="animate-spin text-[#CD0301]" />
      <p className="text-sm text-[#666666]">{text}</p>
    </div>
  );
}
