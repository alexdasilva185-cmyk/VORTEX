# Prompt de instalação (Claude Code)

Abra o **Claude Code** (aba **Code**) numa **pasta vazia** do seu computador, cole o texto abaixo inteiro e
mande. O Claude vai instalar o Vórtex Pay com você, um passo de cada vez.

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
