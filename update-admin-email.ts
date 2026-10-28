// Troca o e-mail de login de um administrador.
//
// Rodar: npx tsx scripts/update-admin-email.ts <email-antigo> <email-novo>
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_EMAIL = process.argv[2]?.trim();
const NEW_EMAIL = process.argv[3]?.trim();

if (!OLD_EMAIL || !NEW_EMAIL) {
  console.error("Uso: npx tsx scripts/update-admin-email.ts <email-antigo> <email-novo>");
  process.exit(1);
}

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });
  if (existing) {
    console.error(`✗ Já existe usuário com email ${NEW_EMAIL}`);
    process.exit(1);
  }
  const updated = await prisma.user.update({
    where: { email: OLD_EMAIL },
    data: { email: NEW_EMAIL },
    select: { email: true, name: true },
  });
  console.log(`✓ Email atualizado: ${OLD_EMAIL} → ${updated.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
