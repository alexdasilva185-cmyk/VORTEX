// Cria (ou atualiza) o primeiro administrador e um produto de exemplo.
//
// Rodar: npm run db:seed
// Lê ADMIN_EMAIL e ADMIN_PASSWORD do .env (ou do ambiente). Não existe senha
// padrão: sem as duas variáveis, o seed para. Rodar de novo com outra
// ADMIN_PASSWORD troca a senha desse administrador.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// carrega o .env (o que já estiver no ambiente tem prioridade)
try {
  process.loadEnvFile(".env");
} catch {
  // sem .env: usa só as variáveis do ambiente
}

const prisma = new PrismaClient();

const SENHAS_PROIBIDAS = new Set([
  "admin123",
  "troque-essa-senha",
  "troque-esta-senha",
  "senha123",
  "12345678",
  "1234567890",
]);

function lerAdmin(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !email.includes("@")) {
    throw new Error("Defina ADMIN_EMAIL no .env (o e-mail de login do painel).");
  }
  if (password.length < 10 || SENHAS_PROIBIDAS.has(password.toLowerCase())) {
    throw new Error(
      "Defina ADMIN_PASSWORD no .env com uma senha forte (10+ caracteres, diferente do exemplo)."
    );
  }
  return { email, password };
}

async function main() {
  const { email, password } = lerAdmin();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { password: hashed },
    create: {
      email,
      password: hashed,
      name: "Admin",
    },
  });

  // a senha não é impressa: ela já está no seu .env
  console.log(`✓ Administrador pronto: ${email}`);

  // produto exemplo
  const exists = await prisma.product.findUnique({
    where: { slug: "produto-exemplo" },
  });
  if (!exists) {
    await prisma.product.create({
      data: {
        name: "Curso de Exemplo",
        slug: "produto-exemplo",
        description:
          "Este é um produto de exemplo. Edite ou exclua no painel admin.",
        priceCents: 9700,
        active: true,
        thankYouTitle: "Obrigado pela compra!",
        thankYouMessage:
          "Você receberá os dados de acesso por e-mail nos próximos minutos.",
        primaryColor: "#10b981",
      },
    });
    console.log("✓ Produto de exemplo criado em /c/produto-exemplo");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
