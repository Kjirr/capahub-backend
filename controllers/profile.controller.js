// controllers/profile.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Functie om het volledige, actuele profiel op te halen
exports.getProfile = async (req, res) => {
    const { userId } = req.user;
    logger.debug(`Functie 'getProfile' gestart voor gebruiker ${userId}`);
    try {
        // Haal de gebruiker op en voeg het volledige bedrijfsprofiel INCLUSIEF abonnement toe
        const userWithCompany = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                company: {
                    include: {
                        plan: true // Deze regel zorgt ervoor dat het abonnement wordt meegestuurd
                    }
                },
            },
        });

        if (!userWithCompany) {
            return res.status(404).json({ error: 'Profiel niet gevonden.' });
        }
        
        res.status(200).json(userWithCompany);

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
        const { name: userName, bedrijfsnaam, plaats, adres, postcode, telefoon, iban } = req.body;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { name: userName }
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