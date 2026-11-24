// Seeds Item 5 cross-sell rules: every Fralda or Papinhas/Leites item cross-sells
// MeNutri Kids + Lencos Umedecidos + Sabonete Liquido Granado.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const triggers = [
  { type: 'DETAIL', value: 'maternidade-e-infantil::higiene-do-bebe::fraldas', label: 'Fraldas' },
  { type: 'DETAIL', value: 'maternidade-e-infantil::alimentacao-infantil::papinhas-e-leites', label: 'Papinhas e Leites' },
];

const targets = [
  { type: 'KEYWORD', value: 'nutri kids', label: 'MeNutri Kids' },
  { type: 'DETAIL', value: 'maternidade-e-infantil::higiene-do-bebe::lencos-umedecidos', label: 'Lenços Umedecidos' },
  { type: 'KEYWORD', value: 'sab liq granado', label: 'Sabonete Líquido Granado' },
];

async function main() {
  let created = 0, skipped = 0, order = 0;
  for (const t of triggers) {
    for (const g of targets) {
      order += 1;
      const existing = await prisma.relationRule.findFirst({
        where: {
          triggerType: t.type,
          triggerValue: t.value,
          targetType: g.type,
          targetValue: g.value,
          type: 'CROSS_SELL',
        },
      });
      if (existing) {
        console.log('SKIP (exists):', t.label, '->', g.label);
        skipped += 1;
        continue;
      }
      await prisma.relationRule.create({
        data: {
          name: `${t.label} → ${g.label}`,
          type: 'CROSS_SELL',
          triggerType: t.type,
          triggerValue: t.value,
          triggerLabel: t.label,
          targetType: g.type,
          targetValue: g.value,
          targetLabel: g.label,
          targetLimit: 1,
          order,
          active: true,
        },
      });
      console.log('CREATED:', t.label, '->', g.label);
      created += 1;
    }
  }
  console.log(`\nDone. created=${created} skipped=${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
