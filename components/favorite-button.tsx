'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: number;
  variant?: 'overlay' | 'inline';
}

export function FavoriteButton({ productId, className = '', size = 18, variant = 'overlay' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = await toggleFavorite(productId);
    toast.success(nowFav ? 'Adicionado aos favoritos!' : 'Removido dos favoritos.');
  };

  const base =
    variant === 'overlay'
      ? 'bg-white/90 shadow-sm hover:bg-white'
      : 'bg-transparent hover:bg-red-50';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      title={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`flex items-center justify-center rounded-full p-1.5 transition ${base} ${className}`}
    >
      <Heart size={size} className={fav ? 'fill-[#CD0301] text-[#CD0301]' : 'text-[#666666]'} />
    </button>
  );
}
