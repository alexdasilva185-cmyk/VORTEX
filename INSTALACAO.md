# Instalação manual do Vórtex Pay

Este é o passo a passo completo, na ordem. Se preferir que o Claude Code faça com você, use o
[PROMPT-DE-INSTALACAO.md](PROMPT-DE-INSTALACAO.md).

**Termos que aparecem aqui:**

- **Terminal**: a janela onde você digita comandos (no Mac, o app "Terminal"; no Windows, o "PowerShell").
- **Variável de ambiente**: uma configuração secreta do sistema (chave da Pagar.me, endereço do banco…).
  No seu computador elas ficam no arquivo `.env`; na Vercel, numa tela de configurações.
- **Deploy / publicar**: colocar o sistema no ar, num endereço da internet.
- **Webhook**: um aviso automático que um sistema manda pra outro quando algo acontece (ex.: "venda paga").

---

## 1. Contas

Crie (ou separe) estas contas antes de começar:

| Conta | Pra quê | Custo |
|---|---|---|
| [GitHub](https://github.com) | Guardar o código | Grátis |
| [Supabase](https://supabase.com) | Banco de dados | Grátis (projeto parado por 1 semana é pausado; pra vender todo dia, considere o plano pago) |
| [Vercel](https://vercel.com) | Colocar no ar | Hobby grátis (uso pessoal; cron 1x por dia) ou Pro (uso comercial) |
| [Pagar.me](https://pagar.me) | Receber pagamentos | Taxa por venda. Chaves de teste na hora; produção depois da aprovação da conta |
| [Resend](https://resend.com) | E-mails (opcional) | Grátis até 3.000/mês; precisa de um domínio seu |

No seu computador você vai precisar de:

- **Node.js 22 ou mais novo** ([nodejs.org](https://nodejs.org), versão LTS). Confira com `node -v`.
- **Git** ([git-scm.com](https://git-scm.com)). Confira com `git --version`.
- **CLI da Vercel** (opcional, só se for publicar pelo terminal): `npm i -g vercel`.

A CLI do Supabase **não** é necessária: neste sistema quem cria as tabelas é o **Prisma** (uma
ferramenta que já vem no projeto).

## 2. Baixar o código

```bash
git clone https://github.com/matheustillimt-tech/vortex-pay.git
cd vortex-pay
npm install
cp .env.example .env
```

O último comando cria o arquivo `.env` a partir do modelo. É nele que você vai colar as configurações.
Use `.env` (e não `.env.local`): o Prisma só lê o `.env`.

## 3. Criar o banco no Supabase e aplicar a estrutura

1. Em [supabase.com](https://supabase.com), clique em **New project**.
2. Dê um nome, escolha a região **South America (São Paulo)** e crie uma **senha do banco** forte.
   Guarde essa senha (dica: use só letras e números, pra não precisar codificar símbolos no endereço).
3. Com o projeto criado, clique em **Connect** (no topo) → aba **ORMs** → **Prisma**.
   Aparecem duas linhas:
   - `DATABASE_URL` (porta **6543**, termina com `?pgbouncer=true`) → copie pro `DATABASE_URL` do `.env`.
   - `DIRECT_URL` (porta **5432**) → copie pro `DIRECT_URL` do `.env`.
   Nas duas, troque `[YOUR-PASSWORD]` pela senha do banco.
   Se o Supabase não mostrar a aba ORMs, use a conexão **Transaction pooler** no `DATABASE_URL`
   (acrescente `?pgbouncer=true&connection_limit=1` no fim) e a **Session pooler** no `DIRECT_URL`.
4. No terminal, dentro da pasta do projeto, crie as tabelas:

   ```bash
   npx prisma db push
   ```

   Deve terminar com "Your database is now in sync with your Prisma schema".

> Toda vez que o sistema for publicado na Vercel, o `npm run build` roda esse mesmo comando e aplica
> mudanças novas na estrutura do banco. Se uma mudança fosse apagar dados, a publicação para com erro
> em vez de apagar (de propósito).

## 4. Variáveis de ambiente

Preencha o `.env` (e depois a Vercel) com estas variáveis. Pra gerar segredos aleatórios, use no
terminal `openssl rand -base64 32` ou `openssl rand -hex 24`.

| Variável | Pra que serve | Onde pegar | Obrigatória? |
|---|---|---|---|
| `DATABASE_URL` | Conexão do app com o banco | Supabase → Connect → ORMs → Prisma (porta 6543) | **Sim** |
| `DIRECT_URL` | Conexão usada pra criar/alterar tabelas | Supabase → Connect → ORMs → Prisma (porta 5432) | **Sim** |
| `AUTH_SECRET` | Assina o login do painel | Gere: `openssl rand -base64 32` | **Sim** (o sistema não sobe em produção sem ela) |
| `ADMIN_EMAIL` | E-mail do primeiro administrador | Você escolhe | Só pro `npm run db:seed` (não vai pra Vercel) |
| `ADMIN_PASSWORD` | Senha do primeiro administrador (10+ caracteres) | Você escolhe | Só pro `npm run db:seed` (não vai pra Vercel) |
| `NEXT_PUBLIC_APP_URL` | Endereço público do checkout, sem barra no fim | O endereço da Vercel ou o seu domínio | **Sim** |
| `NEXT_PUBLIC_APP_NAME` | Nome do sistema no painel e nos e-mails | Você escolhe (padrão: "Vórtex Pay") | Não |
| `PAGARME_API_KEY` | Chave secreta da Pagar.me (`sk_…`) | Pagar.me → Configurações → Chaves | **Sim** pra cobrar (sem ela, o checkout roda em "modo simulação") |
| `PAGARME_PUBLIC_KEY` | Chave pública da Pagar.me (`pk_…`), transforma o cartão em token | Pagar.me → Configurações → Chaves | **Sim** em produção |
| `PAGARME_WEBHOOK_SECRET` | Senha do aviso que a Pagar.me manda quando a venda muda | Gere: `openssl rand -hex 24` | **Sim** em produção |
| `PAGARME_WEBHOOK_PASS` | Alternativa ao de cima, se usar usuário/senha no webhook | Você escolhe | Não |
| `PAGARME_STATEMENT_DESCRIPTOR` | Nome na fatura do cartão (até 13 letras) | Você escolhe | Não (padrão: nome do produto) |
| `CRON_SECRET` | Protege o reenvio automático de webhooks | Gere: `openssl rand -hex 24` | **Sim** em produção |
| `RESEND_API_KEY` | Envio de e-mails | Resend → API Keys | Não (sem ela, não manda e-mail) |
| `RESEND_FROM_EMAIL` | Remetente, ex.: `Sua Empresa <contato@seu-dominio.com.br>` | Domínio verificado no Resend | Não (junto com a de cima) |
| `VAPID_PUBLIC_KEY` | Notificação no celular (chave pública) | Gere: `npx web-push generate-vapid-keys` | Não |
| `VAPID_PRIVATE_KEY` | Notificação no celular (chave privada) | Mesmo comando | Não |
| `VAPID_SUBJECT` | Contato do dono, ex.: `mailto:contato@seu-dominio.com.br` | Você escolhe | Não |
| `STORE_ID` | Valor do campo `store_id` nos webhooks de saída | Você escolhe | Não (padrão: `default`) |
| `INTEGRACAO_CHAVE` | Liga a API de integração (40+ caracteres) | Gere: `openssl rand -hex 32` | Não (vazia = desligada) |
| `INTEGRACAO_MINIMO_CENTAVOS` | Menor preço que a integração pode criar (99700 = R$ 997) | Você escolhe | Não (padrão: 100 = R$ 1) |
| `INTEGRACAO_URL_PUBLICA` | Domínio dos links de oferta, se for diferente do `NEXT_PUBLIC_APP_URL` | Você escolhe | Não |

Teste no seu computador antes de publicar:

```bash
npm run dev
```

Abra http://localhost:3000. O painel fica em http://localhost:3000/admin (o login vem no passo 6).

## 5. Publicar na Vercel

1. Suba o código pra um repositório **privado** seu no GitHub (no site do GitHub: **New repository**;
   depois siga as instruções de "push an existing repository"). Confira que o `.env` **não** foi junto
   (o `.gitignore` já impede).
2. Na [Vercel](https://vercel.com), clique em **Add New → Project** e importe esse repositório.
   A Vercel reconhece o Next.js sozinha; não mude o comando de build.
3. Na seção **Environment Variables** da tela de importação, cadastre as variáveis do `.env`
   (dá pra colar o conteúdo do arquivo inteiro de uma vez), **menos** `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
   Em `NEXT_PUBLIC_APP_URL`, use o endereço que a Vercel vai dar (ex.: `https://seu-projeto.vercel.app`)
   ou o seu domínio. Se ainda não souber o endereço, publique, copie o endereço, corrija a variável e
   publique de novo (**Deployments → ⋯ → Redeploy**).
4. **Cron (agendamento):** o arquivo `vercel.json` manda a Vercel chamar `/api/cron/webhooks` a cada
   5 minutos, pra reenviar webhooks que falharam. A Vercel envia o `CRON_SECRET` sozinha.
   - No plano **Hobby** (grátis), a Vercel só aceita cron uma vez por dia e a publicação falha com o de
     5 minutos. Troque no `vercel.json` o `"*/5 * * * *"` por `"0 12 * * *"`, faça commit e publique.
   - Pra conferir: no projeto da Vercel, **Settings → Cron Jobs**.
5. Clique em **Deploy**. Quando terminar, abra o endereço.

Depois de mudar qualquer variável na Vercel, faça um novo deploy pra ela valer.

## 6. Criar o primeiro administrador

O administrador é criado pelo seu computador, no mesmo banco que a Vercel usa:

1. No `.env`, preencha `ADMIN_EMAIL` e `ADMIN_PASSWORD` (senha com 10+ caracteres; não existe senha
   padrão).
2. Rode:

   ```bash
   npm run db:seed
   ```

   Ele cria o administrador e um produto de exemplo (`/c/produto-exemplo`). A senha não aparece na tela.
3. Entre em `https://SEU-ENDERECO/admin` com esse e-mail e senha.

Pra trocar a senha depois: no painel, em **Perfil**; ou mude `ADMIN_PASSWORD` no `.env` e rode
`npm run db:seed` de novo; ou rode `npx tsx scripts/reset-password.ts seu@email.com` (ele pede a
senha nova no terminal). Pra trocar o e-mail: `npx tsx scripts/update-admin-email.ts antigo@email nova@email`.

Depois de criar o administrador, você pode apagar a `ADMIN_PASSWORD` do `.env`.

## 7. Ligar as integrações

### Pagar.me (pagamentos)

1. No painel da Pagar.me, pegue as chaves de **teste** (`sk_test_…` e `pk_test_…`) em
   **Configurações → Chaves** (em algumas contas aparece como **Desenvolvimento → Chaves**).
   Coloque em `PAGARME_API_KEY` e `PAGARME_PUBLIC_KEY` (no `.env` e na Vercel). As duas precisam ser do
   mesmo ambiente (as duas de teste ou as duas de produção).
2. Cadastre o webhook (o aviso de "venda mudou de status"): em **Configurações → Webhooks**, crie um
   com a URL

   ```
   https://SEU-ENDERECO/api/pagarme/webhook?secret=SEU_PAGARME_WEBHOOK_SECRET
   ```

   e marque os eventos de pedido (`order.paid`, `order.payment_failed`, `order.canceled`) e de
   cobrança (`charge.paid`, `charge.payment_failed`, `charge.refunded`, `charge.chargedback`).
   Marcar todos os `order.*` e `charge.*` também funciona.
3. **Coprodutores:** cada coprodutor precisa ser um **recebedor** na sua conta da Pagar.me (crie no
   painel da Pagar.me, em Recebedores). Copie o id dele (começa com `rp_`) e, no Vórtex Pay, abra o
   produto → aba **Coprodutores** → informe o nome, o id e a porcentagem.
4. **Vender de verdade:** quando a Pagar.me aprovar a sua conta, troque as chaves pelas de produção
   (`sk_live_…` e `pk_live_…`) na Vercel, cadastre o webhook também no ambiente de produção da Pagar.me
   e faça um novo deploy.

### E-mails (Resend) — opcional

Sem isso, o sistema funciona, mas não manda o e-mail de "compra aprovada" nem o de "esqueci minha senha".

1. Em [resend.com](https://resend.com), adicione e verifique o seu domínio (**Domains**).
2. Crie uma chave em **API Keys** e coloque em `RESEND_API_KEY`.
3. Em `RESEND_FROM_EMAIL`, use um remetente desse domínio, ex.: `Sua Empresa <contato@seu-dominio.com.br>`.
4. No produto, aba **Página de Obrigado**, preencha o **Link de acesso**: é o botão do e-mail de compra
   aprovada. Produto sem link de acesso não manda e-mail.

### Notificação de venda no celular — opcional

1. No terminal: `npx web-push generate-vapid-keys`. Coloque as duas chaves em `VAPID_PUBLIC_KEY` e
   `VAPID_PRIVATE_KEY`, e em `VAPID_SUBJECT` um `mailto:` seu. Publique de novo.
2. No celular, abra `https://SEU-ENDERECO/admin`. No iPhone (iOS 16.4 ou mais novo): Safari →
   Compartilhar → **Adicionar à Tela de Início**, abra pelo ícone e toque no sino → **Ativar notificações**.

### Webhooks de saída (avisar outros sistemas)

No painel, **Webhooks → Adicionar webhook**: informe a URL de destino, os eventos e os produtos. Opcionalmente, um
**token** (vai no campo `access_token` do corpo) e um **secret** (gera a assinatura
`X-Webhook-Signature`, HMAC-SHA256 do corpo). O formato completo está no próprio painel, em
**Webhooks → Documentação**. Se o destino falhar, o sistema tenta de novo sozinho (até 10 vezes, por
~2 dias).

### API de integração (CRM ou outro sistema) — opcional

Ligue colocando uma `INTEGRACAO_CHAVE` (40+ caracteres). Toda chamada leva o cabeçalho
`Authorization: Bearer SUA_INTEGRACAO_CHAVE`.

| Rota | O que faz |
|---|---|
| `GET /api/integracao/produtos` | Lista os produtos ativos (id, nome, slug, preço em centavos) |
| `POST /api/integracao/ofertas` | Cria (ou reaproveita) uma oferta com preço próprio e devolve o link. Corpo: `{"produtoId": "...", "valorCentavos": 149700, "autor": "Ana"}` |
| `GET /api/integracao/pedidos?q=...` | Busca até 5 pedidos por nome, e-mail ou telefone |

O preço da oferta não pode ser menor que `INTEGRACAO_MINIMO_CENTAVOS`.

### Domínio próprio — opcional

Na Vercel, **Settings → Domains** → adicione, por exemplo, `pagamentos.seu-dominio.com.br` e siga as
instruções de DNS. Depois atualize `NEXT_PUBLIC_APP_URL`, a URL do webhook na Pagar.me e publique de novo.

## 8. Checklist de teste

Faça com as chaves de **teste** da Pagar.me:

- [ ] `https://SEU-ENDERECO/admin` abre a tela de login e você entra.
- [ ] Crie um produto (ou use o de exemplo) e abra o link `/c/...`.
- [ ] Compra com cartão de teste aprovado (veja o "simulador de cartão" na documentação da Pagar.me),
      usando um CPF válido. A página de obrigado abre e a venda aparece como **Paga** em **Vendas**.
- [ ] Compra com cartão de teste recusado: o checkout mostra o motivo e não vai pra página de obrigado.
- [ ] Compra no Pix: o QR Code e o "copia e cola" aparecem.
- [ ] Em **Webhooks**, cadastre um destino de teste (ex.: uma URL do [webhook.site](https://webhook.site))
      e clique em **Testar**: o aviso chega lá.
- [ ] Na venda paga, **Reenviar webhooks** funciona e o histórico mostra as tentativas.
- [ ] Na Vercel, **Settings → Cron Jobs** mostra `/api/cron/webhooks`.
- [ ] (Se ligou o Resend) o e-mail de compra aprovada chega, e o **Esqueci minha senha** também.
- [ ] (Se ligou o push) com as notificações ativadas, o botão de teste ao lado do sino manda uma notificação pro celular.

## 9. Problemas comuns

| O que acontece | O que fazer |
|---|---|
| `Environment variable not found: DIRECT_URL` | Falta o `DIRECT_URL` no `.env` ou na Vercel. |
| `Can't reach database server` no `prisma db push` ou no build | Confira o `DIRECT_URL` (porta 5432, pooler "Session") e a senha. Senha com símbolos (`@`, `#`, `/`…) precisa ser codificada; mais fácil trocar a senha do banco por uma só com letras e números. Projeto do Supabase pausado: reative no painel. |
| O site abre, mas dá erro 500 em tudo | Falta `AUTH_SECRET` na Vercel (em produção ele é obrigatório). |
| Login volta pra tela de login | Trocou o `AUTH_SECRET`? Entre de novo. Confira também se está acessando pelo `https://`. |
| Aparece "modo simulação" / venda fica pendente sem cobrar | Falta `PAGARME_API_KEY`. |
| "Cartão inválido ou recusado pelo emissor" em todo cartão | A chave pública e a secreta são de ambientes diferentes (teste × produção), ou o cartão de teste não é o do simulador. |
| Venda paga na Pagar.me continua "Pendente" no painel | O webhook da Pagar.me não chegou: confira a URL e o `?secret=` (o log da Vercel mostra `401`). Na venda, o botão **Sincronizar com Pagar.me** busca o status na hora. |
| Publicação na Vercel falha falando de cron | Plano Hobby: troque o cron do `vercel.json` pra `"0 12 * * *"`. |
| Webhooks de saída não são reenviados | Falta `CRON_SECRET` na Vercel, ou o cron não aparece em Settings → Cron Jobs. |
| E-mail não chega | Domínio não verificado no Resend, ou `RESEND_FROM_EMAIL` de outro domínio. Produto sem **link de acesso** não manda o e-mail de compra. |
| `npm run db:seed` diz pra definir `ADMIN_PASSWORD` | Coloque uma senha com 10+ caracteres no `.env` (não use a do exemplo). |
| Notificação não chega no iPhone | Só funciona com o painel adicionado à Tela de Início, iOS 16.4+, e com as chaves VAPID na Vercel. |

## 10. Personalizar

- **Nome do sistema:** variável `NEXT_PUBLIC_APP_NAME`. O nome e o ícone do app no celular ficam em
  `public/vortex-pay.webmanifest` e `public/icons/`.
- **Cor do checkout:** por produto, no painel. Cor do painel: `tailwind.config.ts` (cores `brand`).
- **Juros e parcelas:** `src/lib/installments.ts` (taxa ao mês, máximo de parcelas, parcela mínima).
- **Meta da barra do topo do painel:** `src/app/admin/_components/topbar.tsx` (`GOAL_CENTS`).
- **Textos do e-mail de compra aprovada:** `src/lib/access-email.ts`.

Se for usar o Claude Code pra personalizar, o arquivo [CLAUDE.md](CLAUDE.md) explica onde fica cada coisa.
