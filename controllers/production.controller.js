// controllers/production.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt de lijst van producties op voor het bedrijf van de gebruiker
exports.getMyProductions = async (req, res) => {
    const { companyId } = req.user; // Gebruik companyId uit de token
    try {
        const productions = await prisma.printJob.findMany({
            where: { 
                // Een productie is een opdracht waarbij een offerte van uw bedrijf is geaccepteerd
                quotes: {
                    some: {
                        status: 'accepted',
                        companyId: companyId
                    }
                }
            },
            include: { 
                company: { select: { name: true } }, // DE FIX: heet nu 'company'
                productionSteps: true 
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(productions);
    } catch (error) {
        logger.error(`Fout bij ophalen 'getMyProductions' voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Voegt een productiestap toe aan een opdracht
exports.addProductionStep = async (req, res) => {
    const { jobId } = req.params;
    const { title, order } = req.body;
    try {
        const newStep = await prisma.productionStep.create({
            data: { jobId, title, order: parseInt(order, 10) }
        });
        res.status(201).json(newStep);
    } catch (error) {
        logger.error(`Fout bij toevoegen stap aan opdracht ${jobId}: ${error.message}`);
        res.status(500).json({ error: 'Kon productiestap niet toevoegen.' });
    }
};

// Werkt de status van een productiestap bij en stuurt een notificatie
exports.updateProductionStepStatus = async (req, res) => {
    const { stepId } = req.params;
    const { status } = req.body;
    try {
        const updatedStep = await prisma.productionStep.update({
            where: { id: stepId },
            data: { status },
            include: { 
                job: { 
                    select: { 
                        companyId: true,
                        title: true 
                    }
                }
            } 
        });

        // Zoek de eigenaar van het bedrijf om een notificatie te sturen
        const ownerCompany = await prisma.company.findUnique({
            where: { id: updatedStep.job.companyId },
            include: { users: { where: { companyRole: 'owner' } } }
        });

        if (ownerCompany && ownerCompany.users.length > 0) {
            const owner = ownerCompany.users[0];
            const message = `Status van '${updatedStep.title}' voor opdracht '${updatedStep.job.title}' is nu: ${status}.`;
            await prisma.notification.create({
                data: {
                    userId: owner.id,
                    message: message,
                }
            });
        }

        res.status(200).json(updatedStep);
    } catch (error) {
        logger.error(`Fout bij bijwerken status van stap ${stepId}: ${error.message}`);
        res.status(500).json({ error: 'Kon status van stap niet aanpassen.' });
    }
};
