# Deploy na Vercel — Delivery Poupefarma

Banco consolidado no Supabase **Hub** (projeto `zorspkvuoknakwhgplrm`). As 16 tabelas do
app (User, Cart, Banner, etc.) já foram criadas lá com RLS ligado. O app Prisma conecta
como `postgres` e ignora RLS, então funciona normal; a API pública não lê essas tabelas.

## 1. Pegar as strings de conexão (Supabase)

No painel do Supabase do projeto Hub → botão **Connect** (topo):

- **Transaction pooler** (porta 6543) → usa em `DATABASE_URL` e `SUPABASE_DATABASE_URL`
- **Direct connection** (porta 5432) → usa em `DATABASE_DIRECT_URL` (opcional, só migração)

Troque `[YOUR-PASSWORD]` pela senha do banco. Se você não a tem salva:
Settings → Database → **Reset database password**. Isso só quebra conexões que usam a
senha do Postgres (o app antigo no Abacus, que vamos aposentar). As ferramentas internas
que usam as **chaves de API** do Supabase continuam funcionando normalmente.

## 2. Importar na Vercel

1. vercel.com → **Add New… → Project**
2. **Import Git Repository** → `Fil-lipy/deliverypoupe`
3. Framework: **Next.js** (detecta sozinho). Root: `./`. Build/Install: padrão.
4. Antes de **Deploy**, abra **Environment Variables** e cole a lista do item 3.
5. Deploy.

> O `.npmrc` do repo já tem `legacy-peer-deps=true`, então o install na Vercel passa.

## 3. Variáveis de ambiente (Settings → Environment Variables)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do **Transaction pooler** + `?pgbouncer=true&connection_limit=1` |
| `DATABASE_DIRECT_URL` | string da **Direct connection** (opcional) |
| `SUPABASE_DATABASE_URL` | mesma string do **Transaction pooler** |
| `NEXTAUTH_SECRET` | gere com `openssl rand -base64 32` |
| `NEXTAUTH_URL` | a URL que a Vercel te der (ex.: `https://deliverypoupe.vercel.app`) |
| `ASAAS_API_KEY` | sua chave Asaas (sandbox `aact_hmlg_...`) |
| `ASAAS_BASE_URL` | `https://api-sandbox.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | token que você definir no painel do Asaas |
| `RECEITAS_BUCKET` | `receitas-delivery` |

AWS/S3: **não precisa** para o lançamento (só o upload de imagem de produto no admin usa).

## 4. Depois do primeiro deploy

- **NEXTAUTH_URL**: se a URL final for diferente, ajuste a variável e faça redeploy.
- **Webhook Asaas**: cadastre `https://SUA_URL/api/pagamento/webhook` com header
  `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN`. É a fonte da verdade do "pago".
- **Usuário admin**: o banco está zerado. Peça pra eu criar o primeiro admin (ou cadastre
  um cliente e eu promovo pra ADMIN).
- **Receita (foto)**: hoje o upload usa AWS S3. Posso trocar para **Supabase Storage**
  (bucket `receitas-delivery` já existe) pra não depender da AWS.
