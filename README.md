# Controle de Vendas — versão estática para GitHub e Vercel

Este projeto é um PWA estático. **Não usa Prisma, npm, Next.js ou banco de dados.** Não execute `npm run build`.

## Publicação correta

1. No GitHub, use um repositório dedicado para este aplicativo.
2. Suba **o conteúdo desta pasta** para a raiz do repositório, incluindo `index.html`, `vercel.json`, `sw.js`, `manifest.webmanifest` e ícones.
3. No painel Vercel, importe este repositório. Em **Settings > Build and Deployment**:
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: **Override ligado, campo vazio** (pular build)
   - Output Directory: padrão (`.`)
4. Publique novamente pela aba Deployments (Redeploy).
5. Se aparecer `prisma`, `schema.prisma`, `npm run build` ou `package.json` no log, o projeto da Vercel está apontando para outro código ou há uma configuração de build anterior. Confira o repositório e a pasta-raiz associados.

## Dados

Os registros ficam no armazenamento local do navegador, por aparelho; faça backup JSON no aplicativo regularmente. O GitHub e a Vercel não sincronizam vendas entre aparelhos.

## Se seu projeto atual usa Prisma

Este pacote NÃO é um patch para aplicações Prisma. Na aplicação Prisma separada, `DIRECT_URL` deve ser definida nas variáveis de ambiente da Vercel, com a string de conexão direta fornecida pelo provedor do banco. Configure também `DATABASE_URL`, preserve a URL secreta fora do GitHub e publique novamente. Não substitua `DIRECT_URL` automaticamente por `DATABASE_URL` sem entender a configuração do banco.
