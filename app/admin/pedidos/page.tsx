"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Item { id: string; produto_nome: string; qtd: number; preco_total: number; exige_receita: boolean; status: string; }
interface Pedido {
  id: string; ref: string; status: string; total: number; total_estornado: number;
  pagamento_status: string; codigo_retirada: string | null; cliente_nome: string | null; cliente_celular: string | null; itens: Item[];
}

const PROX: Record<string, { label: string; proximo?: string }> = {
  pago: { label: "Pago" },
  em_analise_receita: { label: "Em análise de receita" },
  em_separacao: { label: "Em separação", proximo: "pronto_retirada" },
  pronto_retirada: { label: "Pronto para retirada", proximo: "retirado" },
  em_rota: { label: "Em rota", proximo: "retirado" },
  retirado: { label: "Retirado" },
  cancelado: { label: "Cancelado" },
};

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/pedidos");
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || "Falha");
      setPedidos(j.pedidos || []); setErro("");
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha"); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const acao = async (body: Record<string, unknown>) => {
    await fetch("/api/admin/pedidos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    carregar();
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-zinc-900">Retaguarda — Pedidos</h1>
        <Button onClick={carregar} className="bg-[#CD0301] hover:bg-[#B00301]">Atualizar</Button>
      </div>
      {erro && <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-600">{erro}</p>}
      {pedidos.length === 0 && !erro && <p className="text-zinc-500">Nenhum pedido ainda.</p>}

      <div className="space-y-3">
        {pedidos.map((p) => {
          const f = PROX[p.status] ?? { label: p.status };
          return (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-extrabold text-zinc-900">{p.ref} · {p.cliente_nome || "—"}</div>
                  <div className="text-xs text-zinc-500">
                    Retirada: <b>{p.codigo_retirada}</b> · Total {brl(p.total)}
                    {p.total_estornado > 0 && <> · estornado {brl(p.total_estornado)}</>}
                  </div>
                </div>
                <Badge className="bg-[#CD0301]">{f.label}</Badge>
              </div>

              <div className="mt-3 space-y-1">
                {p.itens?.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 border-t py-1.5 text-sm">
                    <span className="flex-1">{it.qtd}× {it.produto_nome} <span className="text-zinc-400">· {brl(it.preco_total)}</span></span>
                    {it.exige_receita && <Badge variant="outline" className="border-sky-300 text-sky-700">RECEITA · {it.status}</Badge>}
                    {it.exige_receita && it.status === "incluido" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => acao({ acao: "receita_item", itemId: it.id, aprovado: true })}>Aprovar</Button>
                        <Button size="sm" variant="destructive" onClick={() => acao({ acao: "receita_item", itemId: it.id, aprovado: false })}>Reprovar (estorna)</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {f.proximo && (
                <Button className="mt-3 bg-[#CD0301] hover:bg-[#B00301]" onClick={() => acao({ acao: "status", pedidoId: p.id, novoStatus: f.proximo })}>
                  Marcar: {PROX[f.proximo]?.label}
                </Button>
              )}
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}

function brl(n: number) { return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); }
