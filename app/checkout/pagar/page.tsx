'use client';

/**
 * /checkout/pagar — Pagar e retirar na loja (Pix). Lê o carrinho real (/api/cart) e o
 * perfil do cliente (/api/account). A modalidade manda pra cá quando o cliente escolhe
 * RETIRADA + pagamento online. O fluxo de WhatsApp (/checkout/revisao) continua intacto.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerHeader } from '@/components/customer-header';
import { LoadingSpinner } from '@/components/loading-spinner';
import { formatBRL } from '@/components/price-display';
import { Info, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Fase = 'revisao' | 'pix' | 'confirmado';
type ItemView = { ean: string; nome: string; preco: number; qty: number; exigeReceita: boolean };

export default function CheckoutPagarPage() {
  const router = useRouter();
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [itens, setItens] = useState<ItemView[]>([]);
  const [total, setTotal] = useState(0);
  const [cupom, setCupom] = useState<string | null>(null);
  const [desconto, setDesconto] = useState(0);
  const [cliente, setCliente] = useState<{ nome: string; cpf: string; celular: string }>({ nome: '', cpf: '', celular: '' });

  const [fase, setFase] = useState<Fase>('revisao');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [pix, setPix] = useState<{ copiaECola: string; qr: string } | null>(null);
  const [pedido, setPedido] = useState<{ id: string; ref: string; codigo_retirada: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/cart').then((r) => r.json()).catch(() => null),
      fetch('/api/account').then((r) => r.json()).catch(() => null),
    ]).then(([cart, acc]) => {
      const rawItens: any[] = cart?.items ?? [];
      setItens(rawItens.map((i: any) => ({
        ean: String(i?.product?.ean ?? i?.ean ?? ''),
        nome: i?.productName ?? i?.product?.name ?? 'Item',
        preco: Number(i?.unitPrice ?? i?.product?.price ?? 0),
        qty: Number(i?.quantity ?? 1),
        exigeReceita: Boolean(i?.requiresPrescription ?? i?.product?.requiresPrescription),
      })));
      setDesconto(Number(cart?.discount ?? 0));
      setCupom(cart?.coupon?.code ?? null);
      setTotal(Number(cart?.subtotal ?? 0) - Number(cart?.discount ?? 0));
      setCliente({
        nome: acc?.name ?? acc?.nome ?? '',
        cpf: String(acc?.cpf ?? acc?.document ?? '').replace(/\D/g, ''),
        celular: String(acc?.phone ?? acc?.celular ?? acc?.whatsapp ?? ''),
      });
    }).finally(() => setCarregandoDados(false));
  }, []);

  const precisaReceita = itens.some((i) => i.exigeReceita);

  async function pagar() {
    setErro('');
    if (!cliente.cpf) { setErro('Seu cadastro precisa de CPF. Atualize em Minha conta.'); return; }
    if (!itens.length) { setErro('Seu carrinho está vazio.'); return; }
    if (precisaReceita && !fileRef.current?.files?.[0]) { setErro('Anexe a foto da receita para continuar.'); return; }
    setLoading(true);
    try {
      const rPed = await fetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente, lojaId: 1, itens, cupom, desconto }),
      });
      const jPed = await rPed.json();
      if (!rPed.ok) throw new Error(jPed.erro);
      const ped = jPed.pedido;
      setPedido(ped);

      const file = fileRef.current?.files?.[0];
      if (precisaReceita && file) {
        const fd = new FormData(); fd.append('file', file); fd.append('pedidoId', ped.id);
        const rUp = await fetch('/api/receita', { method: 'POST', body: fd });
        if (!rUp.ok) throw new Error((await rUp.json()).erro || 'Falha ao enviar a receita.');
      }

      const rPix = await fetch('/api/pagamento/pix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedidoId: ped.id }),
      });
      const jPix = await rPix.json();
      if (!rPix.ok) throw new Error(jPix.erro);
      setPix({ copiaECola: jPix.pixCopiaECola, qr: jPix.pixQrBase64 });
      setFase('pix');
      poll(ped.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no pagamento.');
    } finally {
      setLoading(false);
    }
  }

  function poll(id: string) {
    const t = setInterval(async () => {
      try {
        const j = await (await fetch(`/api/pedidos/status?id=${id}`)).json();
        if (j.pagamento_status === 'confirmado' || ['em_separacao', 'em_analise_receita', 'pronto_retirada'].includes(j.status)) {
          clearInterval(t); setFase('confirmado');
        }
      } catch { /* continua */ }
    }, 4000);
    setTimeout(() => clearInterval(t), 10 * 60 * 1000);
  }

  if (carregandoDados) {
    return <div className="min-h-screen bg-white"><CustomerHeader /><LoadingSpinner /></div>;
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      <CustomerHeader userName={cliente.nome?.split(' ')?.[0] ?? ''} />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Link href="/checkout/modalidade" className="flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] mb-4">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-xl font-bold mb-4">Pagar e retirar na loja</h1>

        {fase === 'revisao' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-[#F8F8F8] p-4 text-sm">
              <b>Retirada:</b> Loja 03 — Poupefarma União<br />
              <span className="text-[#666666]">Av. União, 1200 · Parauapebas/PA</span>
            </div>

            <div className="space-y-1 text-sm">
              {itens.map((i, k) => (
                <div key={k} className="flex justify-between">
                  <span>{i.qty}× {i.nome}{i.exigeReceita && <span className="font-semibold text-sky-600"> · receita</span>}</span>
                  <span>{formatBRL(i.preco * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold">
              <span>Total</span><span className="text-[#CD0301]">{formatBRL(total)}</span>
            </div>
            {desconto > 0 && <div className="text-xs text-emerald-700">Cupom {cupom}: − {formatBRL(desconto)}</div>}

            {precisaReceita && (
              <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900">
                <div className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Há item que exige receita</div>
                <p className="text-sm">Anexe a foto. Você paga agora; se a farmacêutica reprovar, estornamos só aquele item.</p>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="text-sm" />
              </div>
            )}

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button onClick={pagar} disabled={loading}
              className="w-full rounded-lg bg-[#CD0301] py-3 font-semibold text-white hover:bg-[#B00301] disabled:opacity-60">
              {loading ? 'Gerando Pix…' : `Pagar ${formatBRL(total)} com Pix`}
            </button>
            <p className="text-center text-xs text-[#666666]">A NFC-e é emitida na retirada, no balcão.</p>
          </div>
        )}

        {fase === 'pix' && pix && (
          <div className="flex flex-col items-center gap-4 text-center">
            <b>Escaneie para pagar</b>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/png;base64,${pix.qr}`} alt="QR Pix" width={220} height={220} className="rounded-lg border" />
            <div className="w-full">
              <p className="mb-1 text-xs text-[#666666]">ou copie o código Pix:</p>
              <p className="break-all rounded bg-[#F8F8F8] p-2 text-[11px]">{pix.copiaECola}</p>
              <button onClick={() => navigator.clipboard?.writeText(pix.copiaECola)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50">
                <Copy className="h-4 w-4" /> Copiar código
              </button>
            </div>
            <p className="text-sm text-[#666666]">Aguardando o pagamento… a tela avança sozinha ao confirmar.</p>
          </div>
        )}

        {fase === 'confirmado' && (
          <div className="flex flex-col items-center gap-4 pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <b className="text-xl">Pagamento confirmado!</b>
            <p className="text-sm">Pedido <b>{pedido?.ref}</b>. Mostre o código de retirada no balcão:</p>
            <div className="text-3xl font-extrabold tracking-widest text-[#CD0301]">{pedido?.codigo_retirada}</div>
            {precisaReceita && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900 text-sm">
                A farmacêutica vai validar sua receita. Se algo não puder ser dispensado, o valor é estornado.
              </div>
            )}
            <button onClick={() => router.push('/home')} className="w-full rounded-lg bg-[#CD0301] py-3 font-semibold text-white hover:bg-[#B00301]">
              Voltar ao catálogo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
