'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CustomerHeader } from '@/components/customer-header';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { useCart } from '@/hooks/use-cart';
import { Bike, Store, Loader2, ArrowLeft, CheckCircle, MapPin, Plus, Star, CreditCard, QrCode } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { gtmBeginCheckout } from '@/lib/gtm';

const norm = (s: string) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function ModalidadePage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const { cart, totalItems, fetchCart } = useCart();
  const [mode, setMode] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [payment, setPayment] = useState<'PIX' | 'CARTAO' | ''>('');
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/neighborhoods').then((r) => r.json()),
      fetch('/api/settings/public').then((r) => r.json()),
      fetch('/api/account/addresses').then((r) => r.json()),
    ])
      .then(([n, s, addr]) => {
        setNeighborhoods(Array.isArray(n) ? n : []);
        setSettings(s ?? {});
        const list = Array.isArray(addr) ? addr : [];
        setAddresses(list);
        if (cart?.deliveryMode) setMode(cart.deliveryMode as any);
        if (cart?.paymentMethod === 'PIX' || cart?.paymentMethod === 'CARTAO') setPayment(cart.paymentMethod);
        // Selecionar endereço: o do carrinho (por rua+número) ou o padrão
        const fromCart = list.find(
          (a: any) => cart?.addressStreet && a?.street === cart.addressStreet && a?.number === cart.addressNumber
        );
        const def = list.find((a: any) => a?.isDefault) ?? list[0];
        setSelectedAddressId((fromCart ?? def)?.id ?? '');
      })
      .finally(() => setLoading(false));
  }, [cart?.deliveryMode, cart?.addressStreet, cart?.addressNumber, cart?.paymentMethod]);

  // GTM: begin_checkout
  useEffect(() => {
    if (!loading && (cart?.items ?? []).length > 0) {
      gtmBeginCheckout(cart?.items ?? [], (cart?.subtotal ?? 0) - (cart?.discount ?? 0), cart?.coupon?.code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const selectedAddress = addresses.find((a: any) => a?.id === selectedAddressId);
  const matchedNbh = selectedAddress
    ? neighborhoods.find((nb: any) => norm(nb?.name) === norm(selectedAddress?.neighborhood))
    : undefined;
  const subtotal = cart?.subtotal ?? 0;
  const freeDelivery = matchedNbh?.freeDeliveryFrom && subtotal >= matchedNbh.freeDeliveryFrom;
  const fee = mode === 'PICKUP' ? 0 : freeDelivery ? 0 : matchedNbh?.deliveryFee ?? 0;
  const feeEnabled = settings?.delivery_fee_enabled === true;

  const handleConfirm = async () => {
    if (mode === 'DELIVERY') {
      if (!selectedAddress) {
        toast.error('Selecione um endereço de entrega.');
        return;
      }
    }
    if (!payment) {
      toast.error('Selecione a forma de pagamento.');
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/cart/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMode: mode,
          neighborhoodId: mode === 'DELIVERY' && matchedNbh ? String(matchedNbh.id) : null,
          addressStreet: mode === 'DELIVERY' ? selectedAddress?.street : null,
          addressNumber: mode === 'DELIVERY' ? selectedAddress?.number : null,
          addressComplement: mode === 'DELIVERY' ? selectedAddress?.complement : null,
          addressRef: mode === 'DELIVERY' ? selectedAddress?.reference : null,
          paymentMethod: payment,
        }),
      });
      await fetchCart();
      if (mode === 'PICKUP' && (payment === 'PIX' || payment === 'CARTAO')) router.push('/checkout/pagar');
      else router.push('/checkout/revisao');
    } catch {
      toast.error('Erro.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-white">
        <CustomerHeader cartCount={totalItems} />
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="min-h-screen bg-white pb-8">
      <CustomerHeader cartCount={totalItems} userName={(session?.user as any)?.name?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/carrinho" className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} /> Voltar ao carrinho
        </Link>
        <h1 className="text-xl font-bold mb-6">Como você quer receber?</h1>

        {/* Delivery */}
        <button
          onClick={() => setMode('DELIVERY')}
          className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition ${
            mode === 'DELIVERY' ? 'border-[#CD0301] bg-red-50/30' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bike size={24} className={mode === 'DELIVERY' ? 'text-[#CD0301]' : 'text-gray-400'} />
            <div>
              <p className="font-semibold text-[#1A1A1A]">Entrega em domicílio</p>
              <p className="text-xs text-[#666666]">A taxa é calculada pelo bairro do seu endereço</p>
            </div>
            {mode === 'DELIVERY' && <CheckCircle size={20} className="text-[#CD0301] ml-auto" />}
          </div>
        </button>

        {mode === 'DELIVERY' && (
          <div className="ml-1 mb-4 space-y-2">
            {addresses.length === 0 ? (
              <div className="bg-[#F8F8F8] rounded-lg p-4 text-center">
                <p className="text-sm text-[#666666] mb-3">Você ainda não tem endereços cadastrados.</p>
                <Link
                  href="/conta/enderecos"
                  className="inline-flex items-center gap-1 bg-[#CD0301] text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  <Plus size={16} /> Adicionar endereço
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-[#666666] uppercase tracking-wide">Endereço de entrega</p>
                {addresses.map((a: any) => {
                  const nb = neighborhoods.find((x: any) => norm(x?.name) === norm(a?.neighborhood));
                  const active = a?.id === selectedAddressId;
                  return (
                    <button
                      key={a?.id}
                      onClick={() => setSelectedAddressId(a?.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        active ? 'border-[#CD0301] bg-red-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className={active ? 'text-[#CD0301] mt-0.5' : 'text-gray-400 mt-0.5'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {a?.label && <span className="text-xs font-bold text-[#CD0301]">{a.label}</span>}
                            {a?.isDefault && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#FFBC00] font-bold">
                                <Star size={10} /> Padrão
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[#1A1A1A]">
                            {a?.street}, {a?.number}
                            {a?.complement ? ` - ${a.complement}` : ''}
                          </p>
                          <p className="text-xs text-[#666666]">{a?.neighborhood}</p>
                          {nb && feeEnabled && (
                            <p className="text-xs text-[#1A1A1A] mt-1">
                              Taxa: <span className="font-semibold">{formatBRL(nb.deliveryFee)}</span>
                            </p>
                          )}
                        </div>
                        {active && <CheckCircle size={18} className="text-[#CD0301]" />}
                      </div>
                    </button>
                  );
                })}
                <Link
                  href="/conta/enderecos"
                  className="inline-flex items-center gap-1 text-sm text-[#CD0301] font-medium mt-1"
                >
                  <Plus size={14} /> Adicionar novo endereço
                </Link>

                {selectedAddress && matchedNbh && (
                  <div className="bg-[#F8F8F8] rounded-lg p-3 text-sm space-y-1 mt-2">
                    {feeEnabled ? (
                      <>
                        <p>
                          Taxa de entrega:{' '}
                          <span className="font-semibold">{freeDelivery ? 'GRÁTIS' : formatBRL(matchedNbh.deliveryFee)}</span>
                        </p>
                        {matchedNbh.freeDeliveryFrom && (
                          <p className="text-xs text-green-600">
                            Frete grátis a partir de {formatBRL(matchedNbh.freeDeliveryFrom)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[#666666]">O valor do frete será informado pelo atendente no WhatsApp ao finalizar o pedido.</p>
                    )}
                    <p className="text-xs text-[#666666]">Pedido mínimo: {formatBRL(matchedNbh.minimumOrder)}</p>
                    {subtotal < matchedNbh.minimumOrder && (
                      <p className="text-xs text-[#CD0301] font-medium">
                        Pedido mínimo de {formatBRL(matchedNbh.minimumOrder)} não atingido.
                      </p>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        )}

        {/* Pickup */}
        <button
          onClick={() => setMode('PICKUP')}
          className={`w-full text-left p-4 rounded-xl border-2 mb-6 transition ${
            mode === 'PICKUP' ? 'border-[#CD0301] bg-red-50/30' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Store size={24} className={mode === 'PICKUP' ? 'text-[#CD0301]' : 'text-gray-400'} />
            <div>
              <p className="font-semibold text-[#1A1A1A]">Retirar na loja</p>
              <p className="text-xs text-[#666666]">{settings?.store_name ?? 'Poupefarma Rio Verde'}</p>
              <p className="text-xs text-[#666666]">{settings?.store_address ?? ''}</p>
              <p className="text-xs text-[#666666]">{settings?.store_hours ?? ''}</p>
              <p className="text-xs text-green-600 font-medium">Grátis</p>
            </div>
            {mode === 'PICKUP' && <CheckCircle size={20} className="text-[#CD0301] ml-auto" />}
          </div>
        </button>

        {/* Forma de pagamento */}
        <div className="mb-6">
          <h2 className="text-base font-bold mb-1">Forma de pagamento</h2>
          <p className="text-xs text-[#666666] mb-3">Escolha como deseja pagar. A cobrança é combinada com a equipe pelo WhatsApp.</p>
          <button
            onClick={() => setPayment('PIX')}
            className={`w-full text-left p-4 rounded-xl border-2 mb-3 transition ${
              payment === 'PIX' ? 'border-[#CD0301] bg-red-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode size={24} className={payment === 'PIX' ? 'text-[#CD0301]' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-[#1A1A1A]">PIX</p>
                <p className="text-xs text-[#666666]">Pagamento via chave PIX</p>
              </div>
              {payment === 'PIX' && <CheckCircle size={20} className="text-[#CD0301] ml-auto" />}
            </div>
          </button>
          <button
            onClick={() => setPayment('CARTAO')}
            className={`w-full text-left p-4 rounded-xl border-2 transition ${
              payment === 'CARTAO' ? 'border-[#CD0301] bg-red-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={24} className={payment === 'CARTAO' ? 'text-[#CD0301]' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-[#1A1A1A]">Cartão de Débito e Crédito</p>
                <p className="text-xs text-[#666666]">Via link de pagamento</p>
              </div>
              {payment === 'CARTAO' && <CheckCircle size={20} className="text-[#CD0301] ml-auto" />}
            </div>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving || !payment || (mode === 'DELIVERY' && !selectedAddress)}
          className="w-full bg-[#CD0301] text-white py-3.5 rounded-xl font-semibold hover:bg-[#b00201] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
