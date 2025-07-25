// prisma/setupAdmin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config({ path: '../.env' }); // Zorg dat we de .env uit de hoofdmap laden

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.log("--- Admin Setup Script ---");

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (!ADMIN_EMAIL) {
        console.error("❌ FOUT: ADMIN_EMAIL is niet ingesteld in uw .env bestand. Stop het script.");
        return;
    }

    // Controleer of de admin al bestaat
    const existingAdmin = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
        console.log(`✅ Admin-account met e-mailadres ${ADMIN_EMAIL} bestaat al.`);
        return;
    }

    console.log(`Een nieuw admin-account zal worden aangemaakt met het e-mailadres: ${ADMIN_EMAIL}`);

    rl.question('Voer een sterk wachtwoord in voor de admin: ', async (password) => {
        if (!password || password.length < 8) {
            console.error("❌ FOUT: Wachtwoord is te kort (minimaal 8 tekens). Probeer het opnieuw.");
            rl.close();
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                email: ADMIN_EMAIL,
                passwordHash: passwordHash,
                role: 'admin',
                status: 'active', // Admin is direct actief
                emailVerified: true, // Admin hoeft e-mail niet te verifiëren
                // Bedrijfsnaam en KvK worden bewust leeg gelaten
            },
        });

        console.log("✅ SUCCES! Admin-account is succesvol aangemaakt.");
        rl.close();
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
