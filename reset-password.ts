// Troca a senha de um administrador direto no banco (quando você perdeu o
// acesso e o "Esqueci minha senha" ainda não está ligado).
//
// Rodar: npx tsx scripts/reset-password.ts <email-do-admin>
// A nova senha é pedida no terminal (não fica no histórico de comandos).
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Uso: npx tsx scripts/reset-password.ts <email-do-admin>");
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const senha = (await rl.question("Nova senha (10+ caracteres): ")).trim();
  rl.close();
  if (senha.length < 10) {
    console.error("✗ Senha curta demais. Use 10 caracteres ou mais.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 10);
  const u = await prisma.user.update({
    where: { email },
    data: { password: hash },
    select: { email: true },
  });
  console.log(`✓ Senha trocada para ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
