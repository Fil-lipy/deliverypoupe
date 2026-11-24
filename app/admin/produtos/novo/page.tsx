'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NovoProdutoPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/produtos'); }, [router]);
  return <div className="p-8 text-center text-[#666666]">Produtos são gerenciados pelo ERP. Redirecionando...</div>;
}
