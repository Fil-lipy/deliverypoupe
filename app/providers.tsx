'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler';
import { FavoritesProvider } from '@/hooks/use-favorites';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FavoritesProvider>
        {children}
      </FavoritesProvider>
      <Toaster />
      <ChunkLoadErrorHandler />
    </SessionProvider>
  );
}
