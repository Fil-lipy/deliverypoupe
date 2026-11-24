'use client';

import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { ArrowLeft, FileWarning, Database, Upload, Trash2, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function VisualizarProdutoPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProduct = () => {
    setLoading(true);
    fetch(`/api/admin/products/${params.id}`)
      .then(r => r.json())
      .then(d => setProduct(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProduct(); }, [params.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem (jpg, png, webp).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10 MB.');
      return;
    }
    const ean = product?.barcode;
    if (!ean) {
      toast.error('Produto sem código de barras — não é possível anexar imagem.');
      return;
    }
    setUploading(true);
    try {
      // 1) Obter URL pressinada
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${ean}.${ext}`;
      const presignRes = await fetch(`/api/admin/products/image?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(file.type)}`);
      if (!presignRes.ok) throw new Error('Erro ao obter URL de upload');
      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // 2) Upload direto ao S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Erro no upload da imagem');

      // 3) Confirmar no backend
      const confirmRes = await fetch('/api/admin/products/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ean, cloud_storage_path, contentType: file.type }),
      });
      if (!confirmRes.ok) throw new Error('Erro ao salvar imagem');

      toast.success('Imagem atualizada!');
      // Atualizar dados do produto (invalidar cache do backend)
      setTimeout(loadProduct, 500);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    const ean = product?.barcode;
    if (!ean) return;
    if (!confirm('Remover a imagem deste produto?')) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/products/image?ean=${encodeURIComponent(ean)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');
      toast.success('Imagem removida.');
      setTimeout(loadProduct, 500);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao remover imagem.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return <div className="p-8 text-center">Produto não encontrado. <Link href="/admin/produtos" className="text-[#CD0301]">Voltar</Link></div>;

  const imageUrl = product?.imageUrl;

  return (
    <div>
      <Link href="/admin/produtos" className="inline-flex items-center gap-1 text-sm text-[#CD0301] mb-4 hover:underline"><ArrowLeft size={16} /> Voltar</Link>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
        {/* Coluna esquerda: Imagem */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-1.5"><ImageIcon size={16} className="text-[#CD0301]" /> Imagem do Produto</h2>
          <div className="aspect-square rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-3">
            {imageUrl ? (
              <img src={imageUrl} alt={product?.name} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-[#999] text-sm"><ImageIcon size={32} className="mx-auto mb-1 opacity-40" />Sem imagem</div>
            )}
          </div>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2.5 cursor-pointer transition ${uploading ? 'bg-gray-100 text-[#999] pointer-events-none' : 'bg-[#CD0301] text-white hover:bg-[#b00200]'}`}>
              <Upload size={15} />
              {uploading ? 'Enviando...' : (imageUrl ? 'Trocar imagem' : 'Enviar imagem')}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              <button onClick={handleRemove} disabled={removing} className="flex items-center gap-1 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2.5 hover:bg-red-50 disabled:opacity-50 transition">
                <Trash2 size={15} /> {removing ? '...' : 'Remover'}
              </button>
            )}
          </div>
          {product?.barcode && <p className="text-[10px] text-[#999] mt-2 text-center">EAN: {product.barcode}</p>}
        </div>

        {/* Coluna direita: Dados do ERP */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-xs text-[#666666] flex items-center gap-1 mb-4"><Database size={12} /> Dados do ERP (somente leitura)</p>
          <h1 className="text-lg font-bold mb-1">{product?.name}</h1>
          <p className="text-sm text-[#666666] mb-4">{product?.brand} {product?.presentation ? `• ${product.presentation}` : ''}</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#666666]">Categoria</span><span>{product?.category?.name ?? '—'}</span></div>
            {product?.subcategory?.name && <div className="flex justify-between"><span className="text-[#666666]">Subcategoria</span><span>{product.subcategory.name}</span></div>}
            <div className="flex justify-between"><span className="text-[#666666]">Preço De</span><span>{formatBRL(product?.price ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-[#666666]">Preço Por</span><span className="text-[#CD0301] font-semibold">{product?.promoPrice ? formatBRL(product.promoPrice) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#666666]">Estoque</span><span>{product?.stock ?? 0} un</span></div>
            <div className="flex justify-between"><span className="text-[#666666]">Código barras</span><span>{product?.barcode ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#666666]">Princípio ativo</span><span>{product?.activeIngredient ?? '—'}</span></div>
            {product?.requiresPrescription && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-blue-700 text-sm">
                <FileWarning size={16} /> Requer receita médica
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
