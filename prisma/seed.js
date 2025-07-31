const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Definieer de permissies
const permissionsToCreate = [
  { name: 'manage_materials', description: 'Kan materialen en prijzen beheren' },
  { name: 'manage_production', description: 'Kan productieplanningen inzien en beheren' },
  { name: 'manage_warehouse', description: 'Kan magazijnbeheer en voorraadniveaus aanpassen' },
  { name: 'manage_admin', description: 'Kan bedrijfsadministratie en facturatie inzien' },
  { name: 'manage_team', description: 'Kan teamleden en hun rechten beheren' },
  { name: 'manage_purchasing', description: 'Kan leveranciers en inkooporders beheren' }
];

// Definieer de abonnementen
const plansToCreate = [
    { name: 'FREE', description: 'Basisfunctionaliteit voor alle gebruikers.' },
    { name: 'PRO', description: 'Toegang tot geavanceerde modules zoals inkoop en magazijn.' },
    { name: 'PREMIUM', description: 'Volledige toegang tot alle modules en toekomstige features.' }
];

async function main() {
  console.log(`Start seeding ...`);

  // Maak de permissies aan/update ze
  for (const p of permissionsToCreate) {
    const permission = await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: {
        name: p.name,
        description: p.description,
      },
    });
    console.log(`Created or found permission: ${permission.name}`);
  }

  // Maak de abonnementen aan/update ze
  for (const planData of plansToCreate) {
      const plan = await prisma.plan.upsert({
          where: { name: planData.name },
          update: {},
          create: {
              name: planData.name,
              description: planData.description,
          }
      });
      console.log(`Created or found plan: ${plan.name}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });