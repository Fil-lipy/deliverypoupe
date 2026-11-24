import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ===== TEST ACCOUNT (hidden) =====
  const testHash = await bcrypt.hash('cLv57W6Y*H', 10);
  await prisma.user.upsert({
    where: { email: 'abacus-6f57402f@example.com' },
    update: {},
    create: {
      name: 'Test Admin',
      email: 'abacus-6f57402f@example.com',
      password: testHash,
      role: 'ADMIN',
    },
  });

  // ===== ADMIN USER =====
  const adminHash = await bcrypt.hash('Admin@2024', 10);
  await prisma.user.upsert({
    where: { email: 'admin@poupefarma.com.br' },
    update: {},
    create: {
      name: 'Administrador Poupefarma',
      email: 'admin@poupefarma.com.br',
      password: adminHash,
      role: 'ADMIN',
    },
  });

  // ===== SETTINGS =====
  // Produtos, categorias, cupons e bairros vêm do Supabase (read-only)
  const settings = [
    { key: 'whatsapp_number', value: '559491844905' },
    { key: 'store_name', value: 'Poupefarma Rio Verde' },
    { key: 'store_address', value: 'Rua do Comércio, 88 — Bairro Rio Verde, Parauapebas/PA' },
    { key: 'store_hours', value: 'Seg–Sáb: 07h–22h | Dom: 08h–20h' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });