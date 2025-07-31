// controllers/subscription.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Activeert een "dummy" abonnement voor het bedrijf van de ingelogde eigenaar
exports.startDummyPlan = async (req, res) => {
    const { companyId } = req.user;
    const { planName } = req.body; // Verwacht 'PRO' of 'PREMIUM'

    // Validatie
    if (!planName || !['PRO', 'PREMIUM'].includes(planName)) {
        return res.status(400).json({ error: 'Ongeldige plannaam. Kies PRO of PREMIUM.' });
    }

    try {
        // Zoek het plan in de database op basis van de naam
        const planToActivate = await prisma.plan.findUnique({
            where: { name: planName }
        });

        if (!planToActivate) {
            return res.status(404).json({ error: `Plan '${planName}' niet gevonden in de database.` });
        }

        const updatedCompany = await prisma.company.update({
            where: {
                id: companyId,
            },
            data: {
                planId: planToActivate.id, // Koppel aan het juiste plan
                subscriptionStatus: 'active'
            }
        });

        logger.info(`Dummy ${planName} abonnement geactiveerd voor bedrijf ${companyId}`);
        res.status(200).json({
            message: `${planName} abonnement succesvol geactiveerd!`,
            company: updatedCompany
        });

    } catch (error) {
        logger.error(`Fout bij activeren van dummy ${planName} abonnement voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon abonnement niet activeren.' });
    }
};