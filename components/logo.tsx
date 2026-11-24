'use client';

import { Heart } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const heartSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  return (
    <div className="flex items-center gap-1">
      <span className={`${textSize} font-extrabold text-[#CD0301] tracking-tight`}>
        Poupefarma
      </span>
      <Heart size={heartSize} className="text-[#CD0301] fill-[#CD0301]" />
    </div>
  );
}
