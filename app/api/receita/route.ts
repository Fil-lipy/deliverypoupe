import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { salvarReceita } from "@/lib/orders-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/receita — upload da FOTO da receita (dado sensível de saúde — LGPD).
 * FormData: file, pedidoId. Sobe para um bucket S3 PRIVADO (nunca público).
 * OBS: se vocês já têm helpers em lib/s3.ts, use-os no lugar deste S3Client.
 */
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.RECEITAS_BUCKET || process.env.AWS_BUCKET_NAME || "";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ erro: "Não autenticado." }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const pedidoId = form.get("pedidoId") as string | null;
    if (!file || !pedidoId) return Response.json({ erro: "file e pedidoId obrigatórios." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ erro: "Arquivo acima de 8MB." }, { status: 413 });

    const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
    const key = `receitas/${pedidoId}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: bytes, ContentType: file.type || "image/jpeg",
      // privado: sem ACL public-read. Acesso só por URL assinada no painel.
    }));
    await salvarReceita(pedidoId, key);
    return Response.json({ ok: true, key });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "Falha no upload." }, { status: 500 });
  }
}
