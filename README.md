# Vórtex Pay

Checkout próprio para vender infoprodutos com **Pix e cartão** pela Pagar.me, com order bumps,
coprodutores, ofertas, webhooks e um painel de administração que você instala nas suas contas.

## O que ele faz

- **Página de pagamento por produto** (`/c/nome-do-produto`), com a sua cor, banner no topo, banners
  na lateral, caixa de destaque, texto de rodapé e contador regressivo opcional.
- **Pix** (QR Code e "copia e cola", válido por 1 hora) e **cartão de crédito** em até 12x, com juros
  embutidos na parcela.
- **Compra em 2 cartões** e **Cartão + Pix** (parte no cartão, parte no Pix).
- **Order bumps**: até 3 ofertas extras dentro do checkout, com preço promocional.
- **Ofertas**: vários preços para o mesmo produto, cada um com o seu link (`/c/produto/oferta`).
- **Coprodutores com divisão automática** (split): cada coprodutor recebe a porcentagem dele direto na
  conta dele da Pagar.me.
- **Página de obrigado** personalizável, ou redirecionamento para a sua página (só quando o pagamento
  é aprovado).
- **E-mail de compra aprovada** com o botão de acesso ao produto (opcional, pelo Resend).
- **Webhooks de saída**: avisa o seu CRM, área de membros, N8N, Make ou Zapier a cada venda
  (compra aprovada, recusada, reembolsada, Pix gerado), com assinatura de segurança, histórico de
  tentativas e reenvio automático por até ~2 dias se o destino estiver fora do ar.
- **Painel de administração**: faturamento com gráfico e filtros, lista de vendas com busca, detalhe
  da venda (sincronizar com a Pagar.me, ver o motivo de uma recusa, reembolsar, reenviar webhooks),
  produtos, webhooks, coprodutores e troca de e-mail e senha.
- **App do painel no celular**: dá pra adicionar o painel à Tela de Início e receber notificação (com
  som) a cada venda aprovada.
- **API de integração** (opcional): um sistema seu (ex.: um CRM) pode listar produtos, criar um link
  de oferta com preço próprio e buscar pedidos por nome, e-mail ou telefone.
- **Checkout preenchido pelo link**: `?name=…&email=…&phone=…` já preenche os dados do comprador.

## Como funciona

1. Você cadastra o produto no painel e divulga o link do checkout.
2. O comprador preenche nome, e-mail, WhatsApp e CPF e escolhe Pix ou cartão.
3. O Vórtex Pay cria a cobrança na **Pagar.me** (com a divisão entre coprodutores, se houver).
4. Quando a Pagar.me confirma o pagamento, ela avisa o Vórtex Pay. A venda vira "paga", o comprador
   recebe o e-mail de acesso e os seus webhooks são disparados.
5. Você acompanha tudo no painel (`/admin`).

O dinheiro cai direto na sua conta da Pagar.me: o Vórtex Pay não guarda dinheiro nem dados de cartão.

## Com o que é feito

- **Next.js 15** (React) + TypeScript + Tailwind CSS — o site e o painel
- **Prisma** + **Postgres** (no Supabase) — o banco de dados
- **Pagar.me API v5** — pagamentos
- **Resend** — e-mails (opcional)
- **Web Push** — notificação no celular (opcional)
- **Vercel** — hospedagem, com um agendamento (cron) que reenvia webhooks que falharam

## De quais contas você precisa

| Conta | Pra quê | Tem plano grátis? |
|---|---|---|
| [GitHub](https://github.com) | Guardar o seu código | Sim |
| [Supabase](https://supabase.com) | Banco de dados (Postgres) | Sim (500 MB). Projeto grátis parado por uma semana é pausado: pra vender todo dia, considere o plano pago |
| [Vercel](https://vercel.com) | Colocar o checkout no ar | Sim (Hobby), mas a Vercel pede o plano Pro pra uso comercial, e no Hobby o reenvio automático de webhooks roda só 1x por dia |
| [Pagar.me](https://pagar.me) | Receber os pagamentos | Sem mensalidade: cobra uma taxa por venda. Chaves de teste na hora; pra vender de verdade a conta precisa ser aprovada |
| [Resend](https://resend.com) (opcional) | Mandar e-mails de acesso e de recuperação de senha | Sim (3.000 e-mails/mês). Precisa de um domínio seu |
| Domínio próprio (opcional) | Ex.: `pagamentos.seu-dominio.com.br` | Não (registro anual) |

## Instalar com o Claude Code

Abra o **Claude Code** (aba **Code**) numa **pasta vazia**, cole o prompt abaixo e siga a conversa. Ele
confere o que falta no seu computador, baixa o código, te guia em cada conta (uma de cada vez), cria o
banco, publica e roda o checklist. Ele nunca vai pedir pra você colar senha ou chave no chat.

```text
Você vai instalar o Vórtex Pay comigo, do zero, nesta pasta (que está vazia). O Vórtex Pay é um checkout
próprio para vender infoprodutos com Pagar.me (Pix e cartão), com painel de administração.
Repositório: https://github.com/matheustillimt-tech/vortex-pay
O passo a passo completo está no arquivo INSTALACAO.md do repositório: leia-o depois de baixar o código
e siga a mesma ordem.

Eu não sou programador. Explique cada passo em português simples, com frases curtas, e espere eu
confirmar antes de ir pro próximo.

REGRAS (siga sempre):
1. NUNCA me peça pra colar chave, senha, token ou segredo aqui no chat. Quando eu precisar colocar um
   valor secreto, abra o arquivo .env pra mim (ex.: `open -e .env` no Mac, `notepad .env` no Windows)
   e me diga em qual linha colar. Segredos que você mesmo gerar (com openssl) escreva direto no .env,
   sem mostrar o valor na tela.
2. Neste projeto as variáveis ficam no arquivo .env (não use .env.local: o Prisma só lê o .env).
   Nunca faça commit do .env.
3. Uma conta por vez: me diga o site, o que clicar e o que copiar, e espere eu dizer "pronto".
4. Se der erro, me explique o erro numa frase e proponha a correção antes de tentar de novo.
5. Nunca rode comandos que apaguem dados do banco (ex.: `prisma migrate reset`, `--force-reset`,
   `--accept-data-loss`) sem me perguntar.

PASSOS:
1. Pré-requisitos: confira se tenho Node.js 22 ou mais novo (`node -v`), Git (`git --version`) e a CLI
   da Vercel (`vercel --version`). Instale o que faltar (Mac: Homebrew; Windows: me passe o instalador
   oficial e espere). A CLI do Supabase não é necessária neste projeto.
2. Baixe o código nesta pasta: `git clone https://github.com/matheustillimt-tech/vortex-pay.git .`
   e depois `npm install`.
3. Crie o .env com `cp .env.example .env` e abra o arquivo pra eu ver.
4. Supabase (o banco de dados, plano grátis): me guie pra criar a conta em supabase.com e um projeto
   novo (região São Paulo). Eu escolho e guardo a senha do banco. Depois me mostre onde ficam as
   conexões (botão "Connect" → aba "ORMs" → "Prisma") e eu colo no .env: a de porta 6543 em
   DATABASE_URL e a de porta 5432 em DIRECT_URL, trocando [YOUR-PASSWORD] pela senha do banco.
5. Segredos: gere AUTH_SECRET (`openssl rand -base64 32`), CRON_SECRET e PAGARME_WEBHOOK_SECRET
   (`openssl rand -hex 24`) e escreva direto no .env, sem mostrar. Pergunte o meu e-mail de login e
   coloque em ADMIN_EMAIL. Abra o .env pra eu digitar uma senha forte (10+ caracteres) em ADMIN_PASSWORD.
6. Banco: rode `npx prisma db push` (cria as tabelas) e `npm run db:seed` (cria o meu usuário de
   administrador e um produto de exemplo). Confira que os dois terminaram sem erro.
7. Teste no meu computador: rode `npm run dev`, abra http://localhost:3000/admin e eu faço login.
   Mostre também o checkout de exemplo em http://localhost:3000/c/produto-exemplo (sem as chaves da
   Pagar.me ele funciona em "modo simulação", sem cobrar).
8. Pagar.me: me guie pra criar a conta em pagar.me e achar as chaves de TESTE (sk_test_… e pk_test_…).
   Abra o .env pra eu colar em PAGARME_API_KEY e PAGARME_PUBLIC_KEY.
9. GitHub: crie um repositório PRIVADO na minha conta e suba o código (use `gh` se eu tiver; se não,
   me guie pelo site). Antes do push, confira com `git status` que o .env NÃO está indo junto.
10. Vercel: me guie pra criar a conta (entrar com o GitHub) e importar o repositório. Pergunte qual
    plano eu vou usar. No plano Hobby (grátis) a Vercel só aceita cron uma vez por dia: nesse caso,
    troque no vercel.json o "*/5 * * * *" por "0 12 * * *" e faça commit antes de publicar.
    Variáveis na Vercel: todas do .env, MENOS ADMIN_EMAIL e ADMIN_PASSWORD. Jeito mais simples: eu abro
    o .env, copio as linhas e colo na tela de variáveis da Vercel (ela aceita colar o .env inteiro).
    Se preferir pelo terminal, rode um laço que lê o .env e passa cada valor pro `vercel env add NOME
    production` sem imprimir nada. NEXT_PUBLIC_APP_URL na Vercel = o endereço que a Vercel der (ou o meu
    domínio), sem barra no fim. Publique e me dê o link.
11. Webhook da Pagar.me: me guie pra cadastrar, no painel da Pagar.me (Configurações → Webhooks), a URL
    https://MEU-ENDERECO/api/pagarme/webhook?secret=SEGREDO com os eventos de pedido (order.*) e de
    cobrança (charge.*). O SEGREDO é o PAGARME_WEBHOOK_SECRET: abra o .env pra eu copiar de lá.
12. Opcionais, um de cada vez, perguntando se eu quero: e-mails pelo Resend (RESEND_API_KEY e
    RESEND_FROM_EMAIL, com domínio verificado), notificação de venda no celular (gere as chaves com
    `npx web-push generate-vapid-keys` e grave direto no .env e na Vercel, sem mostrar a privada),
    nome próprio no painel (NEXT_PUBLIC_APP_NAME), domínio próprio na Vercel, API de integração
    (INTEGRACAO_CHAVE). Depois de mudar variável na Vercel, faça um novo deploy.
13. Checklist final, comigo, no endereço publicado e ainda com as chaves de TESTE:
    - login no /admin funciona;
    - criar um produto, abrir o link /c/... e fazer uma compra de teste com cartão de teste da Pagar.me
      (o número de cartão aprovado está na documentação "simulador de cartão" da Pagar.me);
    - a venda aparece em Vendas como paga e a página de obrigado abre;
    - uma compra no Pix gera o QR Code;
    - cadastrar um webhook de saída apontando pra https://webhook.site e clicar em "Testar";
    - na Vercel, em Settings → Cron Jobs, o cron /api/cron/webhooks aparece.
14. No fim, me diga o que falta pra vender de verdade: trocar as chaves de teste pelas de produção
    (sk_live_ e pk_live_) depois que a Pagar.me aprovar a conta, e fazer um novo deploy.
```

Prefere fazer na mão? O passo a passo completo está no **[INSTALACAO.md](INSTALACAO.md)**.

## Estrutura de pastas

```
prisma/
  schema.prisma          estrutura do banco (produtos, ofertas, vendas, webhooks…)
  seed.ts                cria o primeiro administrador e um produto de exemplo
scripts/                 trocar senha ou e-mail de administrador pelo terminal
public/                  ícones e manifesto do app do celular, som de venda
src/
  app/
    c/[slug]/            página de pagamento (checkout)
    obrigado/[orderId]/  página de obrigado (QR Code do Pix, confirmação)
    admin/               painel de administração
    api/                 rotas do servidor (checkout, webhook da Pagar.me, cron, integração…)
  lib/
    pagarme.ts           conversa com a Pagar.me
    installments.ts      parcelamento e juros
    webhooks.ts          webhooks de saída (fila e reenvio)
    order-sync.ts        status da venda a partir da Pagar.me
    marca.ts             nome do sistema nas telas
tests/                   testes automáticos (npm test)
vercel.json              agendamento (cron) do reenvio de webhooks
```

## Licença

[MIT](LICENSE): pode usar, mudar e vender o que você construir com ele.

---

Feito pelo Grupo Vórtex · entregue na Plataforma Vórtex IA
