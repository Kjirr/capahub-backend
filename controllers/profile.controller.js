// controllers/profile.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Functie om het profiel op te halen
exports.getProfile = async (req, res) => {
    const { userId, companyId } = req.user;
    logger.debug(`Functie 'getProfile' gestart voor gebruiker ${userId}`);
    try {
        // Haal zowel de gebruiker als de bedrijfsgegevens op
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, kvk: true, plaats: true, adres: true, postcode: true, telefoon: true, iban: true }
        });

        if (!user || !company) {
            return res.status(404).json({ error: 'Profiel niet gevonden.' });
        }

        // Combineer de data
        const profileData = {
            name: user.name,
            email: user.email,
            bedrijfsnaam: company.name,
            kvk: company.kvk,
            plaats: company.plaats,
            adres: company.adres,
            postcode: company.postcode,
            telefoon: company.telefoon,
            iban: company.iban
        };
        
        res.status(200).json(profileData);
    } catch (error) {
        logger.error(`Fout bij ophalen profiel voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Functie om het profiel bij te werken
exports.updateProfile = async (req, res) => {
    const { userId, companyId } = req.user;
    logger.debug(`Functie 'updateProfile' gestart voor gebruiker ${userId}`);
    try {
        const { name, bedrijfsnaam, plaats, adres, postcode, telefoon, iban } = req.body;

        // Update de twee tabellen in één transactie
        const [updatedUser, updatedCompany] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { name }
            }),
            prisma.company.update({
                where: { id: companyId },
                data: { name: bedrijfsnaam, plaats, adres, postcode, telefoon, iban }
            })
        ]);
        
        logger.info(`Profiel voor gebruiker ${userId} succesvol bijgewerkt.`);
        res.status(200).json({ message: 'Profiel succesvol bijgewerkt.' });
    } catch (error) {
        logger.error(`Fout bij bijwerken profiel voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};
