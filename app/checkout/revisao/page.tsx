'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CustomerHeader } from '@/components/customer-header';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { useCart } from '@/hooks/use-cart';
import { Smartphone, ArrowLeft, Info, User, MapPin, Package, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { gtmPurchase } from '@/lib/gtm';

export default function RevisaoPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const { cart, totalItems, fetchCart } = useCart();
  const [account, setAccount] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [addresses, setAddresses] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/account').then(r => r.json()),
      fetch('/api/settings/public').then(r => r.json()),
      fetch('/api/account/addresses').then(r => r.json()),
    ]).then(([acc, s, addr]) => {
      setAccount(acc);
      setSettings(s ?? {});
      setAddresses(Array.isArray(addr) ? addr : []);
    }).finally(() => setLoading(false));
  }, []);

  const defaultAddress = (addresses ?? []).find((a: any) => a?.isDefault) ?? addresses?.[0];
  const isDelivery = cart?.deliveryMode === 'DELIVERY';
  const feeEnabled = settings?.delivery_fee_enabled === true;
  const minOrder = typeof settings?.min_order_value === 'number' ? settings.min_order_value : 30;
  const goodsValue = (cart?.subtotal ?? 0) - (cart?.discount ?? 0);
  const belowMin = minOrder > 0 && goodsValue < minOrder;

  const buildWhatsAppMessage = () => {
    const items = (cart?.items ?? []).map((i: any) => {
      const p = i?.product ?? {};
      const ean = p?.barcode ? `EAN: ${p.barcode}` : 'EAN: n\u00e3o informado';
      const fab = p?.brand ? `Fabricante: ${p.brand}` : 'Fabricante: n\u00e3o informado';
      const qty = i?.quantity ?? 0;
      const unit = formatBRL(i?.unitPrice ?? 0);
      const sub = formatBRL(i?.subtotal ?? 0);
      return `\u2022 *${p?.name ?? ''}*\n   ${ean}\n   ${fab}\n   Qtd: ${qty} x ${unit} = ${sub}`;
    }).join('\n\n');

    let msg = `\ud83d\uded2 *Ol\u00e1! Gostaria de confirmar meu or\u00e7amento da Poupefarma.*\n\n`;
    const birth = account?.birthDate
      ? new Date(account.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : 'N\u00e3o informado';
    msg += `*Cliente:* ${account?.name ?? ''}\n`;
    msg += `*Telefone:* ${account?.phone ?? 'N\u00e3o informado'}\n`;
    msg += `*E-mail:* ${account?.email ?? 'N\u00e3o informado'}\n`;
    msg += `*Data de nascimento:* ${birth}\n\n`;
    msg += `*Modalidade:* ${isDelivery ? 'Entrega' : 'Retirada na loja'}\n`;
    const payLabel = cart?.paymentMethod === 'PIX'
      ? 'PIX'
      : cart?.paymentMethod === 'CARTAO'
      ? 'Cart\u00e3o de D\u00e9bito e Cr\u00e9dito (via link de pagamento)'
      : 'A combinar';
    msg += `*Forma de pagamento:* ${payLabel}\n`;
    if (isDelivery && defaultAddress) {
      const bairro = cart?.neighborhood?.name ?? defaultAddress.neighborhood;
      if (bairro) msg += `*Bairro:* ${bairro}\n`;
      msg += `*Endere\u00e7o:* ${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? ' - ' + defaultAddress.complement : ''}\n`;
    }
    msg += `\n*Produtos:*\n${items}\n\n`;
    msg += `*Subtotal:* ${formatBRL(cart?.subtotal ?? 0)}\n`;
    if ((cart?.discount ?? 0) > 0) {
      msg += `*Desconto${cart?.coupon ? ` (${cart.coupon.code})` : ''}:* -${formatBRL(cart?.discount ?? 0)}\n`;
    }
    if (feeEnabled) {
      msg += `*Frete estimado:* ${formatBRL(cart?.deliveryFee ?? 0)}\n`;
    } else {
      msg += `*Frete:* a combinar com o atendente\n`;
    }
    msg += `*Total estimado:* ${formatBRL(cart?.total ?? 0)}${feeEnabled ? '' : ' (sem frete)'}\n`;
    if (notes.trim()) msg += `\n*Observa\u00e7\u00f5es:* ${notes}\n`;
    msg += `\n_Valores e disponibilidade sujeitos \u00e0 confirma\u00e7\u00e3o._`;
    return msg;
  };

  const handleSend = async () => {
    if (belowMin) {
      toast.error(`O pedido mínimo é de ${formatBRL(minOrder)}. Adicione mais itens ao carrinho.`);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/cart/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart?.id,
          deliveryMode: cart?.deliveryMode,
          neighborhoodId: cart?.neighborhoodId,
          addressStreet: defaultAddress?.street,
          addressNumber: defaultAddress?.number,
          addressComplement: defaultAddress?.complement,
          addressRef: defaultAddress?.reference,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? 'Erro ao enviar carrinho.');
        return;
      }

      // GTM: purchase
      gtmPurchase(
        String(cart?.id ?? Date.now()),
        cart?.items ?? [],
        cart?.total ?? 0,
        cart?.deliveryFee ?? 0,
        cart?.coupon?.code,
      );

      const whatsappNumber = settings?.whatsapp_number ?? '559491844905';
      const message = encodeURIComponent(buildWhatsAppMessage());
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
      router.replace('/checkout/enviado');
    } catch {
      toast.error('Erro ao enviar carrinho.');
    } finally {
      setSending(false);
    }
  };

  const missing = Math.max(0, minOrder - goodsValue);

  if (loading) return <div className="min-h-screen bg-white"><CustomerHeader cartCount={totalItems} /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-white pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/checkout/modalidade" className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl font-bold mb-6">Revise seu orçamento</h1>

        {/* Client info */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-[#CD0301]" />
            <span className="text-sm font-semibold">Você</span>
          </div>
          <p className="text-sm">{account?.name}</p>
          <p className="text-sm text-[#666666]">{account?.phone || 'Telefone não cadastrado'}</p>
        </div>

        {/* Delivery info */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-[#CD0301]" />
            <span className="text-sm font-semibold">{isDelivery ? 'Entrega' : 'Retirada na loja'}</span>
          </div>
          {isDelivery ? (
            <>
              <p className="text-sm">Bairro: {cart?.neighborhood?.name ?? defaultAddress?.neighborhood ?? 'Não informado'}</p>
              {defaultAddress && <p className="text-sm text-[#666666]">{defaultAddress.street}, {defaultAddress.number}</p>}
            </>
          ) : (
            <>
              <p className="text-sm">{settings?.store_name}</p>
              <p className="text-sm text-[#666666]">{settings?.store_address}</p>
            </>
          )}
        </div>

        {/* Payment info */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-[#CD0301]" />
            <span className="text-sm font-semibold">Forma de pagamento</span>
          </div>
          <p className="text-sm">
            {cart?.paymentMethod === 'PIX'
              ? 'PIX'
              : cart?.paymentMethod === 'CARTAO'
              ? 'Cartão de Débito e Crédito (via link de pagamento)'
              : 'A combinar'}
          </p>
        </div>

        {/* Products */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-[#CD0301]" />
            <span className="text-sm font-semibold">Produtos</span>
          </div>
          <div className="space-y-2">
            {(cart?.items ?? []).map((item: any) => (
              <div key={item?.id} className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]">{item?.quantity}x {item?.product?.name}</span>
                <span className="font-medium">{formatBRL(item?.subtotal ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#F8F8F8] rounded-xl p-4 mb-3 space-y-2">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-medium">{formatBRL(cart?.subtotal ?? 0)}</span></div>
          {(cart?.discount ?? 0) > 0 && <div className="flex justify-between text-sm text-green-600"><span>Desconto{cart?.coupon ? ` (${cart.coupon.code})` : ''}</span><span>-{formatBRL(cart?.discount ?? 0)}</span></div>}
          {feeEnabled ? (
            <div className="flex justify-between text-sm"><span>Frete estimado</span><span className="font-medium">{formatBRL(cart?.deliveryFee ?? 0)}</span></div>
          ) : (
            <div className="flex items-start justify-between text-sm gap-2"><span>Frete</span><span className="text-right italic text-[#666666] max-w-[65%]">informado pelo atendente no WhatsApp</span></div>
          )}
          <div className="border-t pt-2 flex justify-between"><span className="font-bold">Total estimado</span><span className="font-bold text-lg">{formatBRL(cart?.total ?? 0)}</span></div>
          {!feeEnabled && <p className="text-xs text-[#666666]">O valor do frete será informado pelo atendente no WhatsApp.</p>}
        </div>

        {/* Notes */}
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações (opcional)" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#CD0301] mb-3" rows={3} />

        {/* Warning */}
        <div className="bg-[#FFBC00]/10 border border-[#FFBC00]/30 rounded-lg p-3 flex gap-2 mb-4">
          <Info size={16} className="text-[#FFBC00] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#666666]">Os valores e a disponibilidade serão confirmados pela nossa equipe no WhatsApp. Este não é um pedido confirmado.</p>
        </div>

        {belowMin && (
          <div className="bg-[#CD0301]/5 border border-[#CD0301]/30 rounded-lg p-3 flex gap-2 mb-3">
            <Info size={16} className="text-[#CD0301] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#CD0301]">Pedido mínimo de {formatBRL(minOrder)}. Faltam {formatBRL(missing)} em produtos para continuar.</p>
          </div>
        )}

        <button onClick={handleSend} disabled={sending || belowMin} className="w-full bg-[#CD0301] text-white py-4 rounded-xl font-semibold hover:bg-[#b00201] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base h-14">
          {sending ? <Loader2 size={20} className="animate-spin" /> : <><Smartphone size={20} /> Continuar atendimento no WhatsApp</>}
        </button>
      </div>
    </div>
  );
}
