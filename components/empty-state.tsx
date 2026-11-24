'use client';

import { PackageOpen } from 'lucide-react';
import Link from 'next/link';

export function EmptyState({ title = 'Nada por aqui', description = '', actionLabel, actionHref }: { title?: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <PackageOpen size={48} className="text-gray-300" />
      <h3 className="text-lg font-semibold text-[#1A1A1A]">{title}</h3>
      {description && <p className="text-sm text-[#666666] max-w-xs">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="bg-[#CD0301] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#b00201] transition">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
