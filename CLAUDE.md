# CLAUDE.md — Vórtex Pay

Guia pro Claude Code mexer neste template. Quem usa normalmente **não é programador**: explique o que
vai fazer em português simples, antes de fazer, e confirme antes de qualquer coisa que mexa em dinheiro,
em dados do banco ou que publique o sistema.

## O que é

Checkout próprio para infoprodutos: página de pagamento por produto (Pix e cartão pela Pagar.me, em até
12x, 2 cartões, Cartão + Pix), order bumps, ofertas (vários preços por produto), coprodutores com split
na Pagar.me, página de obrigado, e-mail de compra aprovada (Resend), webhooks de saída com fila e
reenvio, painel admin (instalável no celular, com push de venda) e uma API de integração opcional.

Stack: Next.js 15 (App Router) + TypeScript + Tailwind, Prisma + Postgres (Supabase), Pagar.me API v5,
Resend, web-push. Hospedagem na Vercel, com um cron (`vercel.json`).

## Onde está cada coisa

| Caminho | O que tem |
|---|---|
| `prisma/schema.prisma` | Estrutura do banco (User, Product, Offer, OrderBump, Coproducer, Order, OutgoingWebhook, WebhookDelivery, WebhookAttempt, PushSubscription) |
| `prisma/seed.ts` | Cria o 1º administrador (`ADMIN_EMAIL`/`ADMIN_PASSWORD`, sem senha padrão) e o produto de exemplo |
| `scripts/` | Trocar senha (`reset-password.ts`, pede a senha no terminal) e e-mail (`update-admin-email.ts`) de um admin |
| `src/app/c/[slug]/` | Checkout público (`checkout-client.tsx` é a tela; `[offerSlug]/` é o link de oferta) |
| `src/app/obrigado/[orderId]/` | Página de obrigado (QR do Pix, polling de status) |
| `src/app/admin/` | Painel (dashboard, produtos, vendas, webhooks, coprodutores, perfil, login, recuperação de senha) |
| `src/app/api/checkout/` | Cria a venda e a cobrança na Pagar.me (`route.ts`), tokeniza cartão, status |
| `src/app/api/pagarme/webhook/` | Recebe os avisos da Pagar.me (protegido por `PAGARME_WEBHOOK_SECRET`) |
| `src/app/api/cron/webhooks/` | Cron da Vercel: reenvia webhooks de saída pendentes (protegido por `CRON_SECRET`) |
| `src/app/api/integracao/` | API de integração (desligada sem `INTEGRACAO_CHAVE`) |
| `src/lib/pagarme.ts` | Cliente da API da Pagar.me, mensagens de erro amigáveis, nome na fatura |
| `src/lib/order-sync.ts` | Fonte única do status da venda (lido das cobranças na Pagar.me) |
| `src/lib/webhooks.ts` | Payload, fila, assinatura HMAC e backoff dos webhooks de saída |
| `src/lib/installments.ts` | Juros e parcelas (usado pelo checkout e pela cobrança) |
| `src/lib/marca.ts` | Nome do sistema nas telas (`NEXT_PUBLIC_APP_NAME`) |
| `src/lib/access-email.ts` | E-mail de compra aprovada |
| `src/lib/integracao-regra.ts` | Regras puras da API de integração (testadas em `tests/`) |
| `src/middleware.ts` | Protege `/admin/*` (sessão JWT em cookie) |
| `public/` | Ícones, manifesto do app (`vortex-pay.webmanifest`), service worker (`sw.js`), som de venda |

## Como rodar

```bash
npm install
cp .env.example .env        # preencher (ver INSTALACAO.md); é .env, não .env.local (o Prisma só lê .env)
npx prisma db push          # cria/atualiza as tabelas no banco do DIRECT_URL
npm run db:seed             # 1º administrador + produto de exemplo
npm run dev                 # http://localhost:3000 (painel em /admin)
npm test                    # testes automáticos (node --test, sem banco)
```

- `npm run build` roda `prisma db push` antes do `next build`, então **precisa de um banco acessível**.
  Pra só conferir se compila, sem tocar no banco: `npx prisma generate && npx next build` (com valores
  falsos em `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` no comando).
- Sem `PAGARME_API_KEY`, o checkout cria a venda em "modo simulação" (não cobra). Útil pra testar telas.
- Lista completa de variáveis: `.env.example` e a tabela do `INSTALACAO.md`.

## Como personalizar

- **Nome do sistema:** `NEXT_PUBLIC_APP_NAME` (ou o padrão em `src/lib/marca.ts`). Nome/ícone do app no
  celular: `public/vortex-pay.webmanifest`, `public/icons/` e os textos de reserva em `public/sw.js`.
- **Cores do painel e do checkout padrão:** `tailwind.config.ts` (`brand`) e `src/app/globals.css`.
  A cor de cada checkout é configurada por produto no painel.
- **Juros, máximo de parcelas e parcela mínima:** constantes em `src/lib/installments.ts`.
- **Meta da barra do topo:** `GOAL_CENTS` em `src/app/admin/_components/topbar.tsx`.
- **Textos dos e-mails:** `src/lib/access-email.ts` e `src/app/api/auth/forgot-password/route.ts`.
- **Texto da página inicial (`/`):** `src/app/page.tsx`.
- **Formato dos webhooks de saída:** `buildOrderPayload` em `src/lib/webhooks.ts`. Mudou o formato?
  Atualize também a página `src/app/admin/webhooks/docs/page.tsx`.

## Regras

- **Nunca versionar `.env`** (nem nenhum `.env.*` além do `.env.example`). Nunca escrever chave, senha
  ou segredo em código, em comentário ou no chat. Variável nova: ler com `process.env.NOME`, colocar no
  `.env.example` com comentário e na tabela do `INSTALACAO.md`.
- **Nunca pedir pra pessoa colar segredo no chat.** Abra o `.env` pra ela colar, ou gere com `openssl`
  e escreva direto no arquivo sem mostrar.
- **Banco:** a estrutura vem do `schema.prisma` aplicada com `prisma db push` (não há pasta de
  migrações). Mudança nova = editar o schema **acrescentando** (campo novo opcional ou com `@default`),
  nunca renomear/apagar coluna com dados sem combinar com a pessoa. Nunca use `--accept-data-loss`,
  `--force-reset` ou `prisma migrate reset` sem autorização explícita. Se um dia o projeto passar a usar
  `prisma migrate`, migração nova vai sempre no fim da fila, sem editar as antigas.
- **Dinheiro:** valores são sempre em **centavos** (inteiros). Status da venda só muda por
  `applyPagarmeOrder` (`src/lib/order-sync.ts`); não crie outro caminho.
- **Push na `main` pode publicar:** se o repositório estiver ligado à Vercel, cada push na `main` vira
  deploy (e roda `prisma db push` no banco de produção). Confirme com a pessoa antes de dar push.
- Depois de mudar código, rode `npm test` e `npx tsc --noEmit` antes de propor o push.
