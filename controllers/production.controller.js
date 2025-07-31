// controllers/production.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// --- NIEUWE FUNCTIE ---
// Haalt alle productiestappen op, gegroepeerd per status, voor het Kanban-bord
exports.getBoardData = async (req, res) => {
    const { companyId } = req.user;
    try {
        // Haal alle stappen op die horen bij opdrachten die dit bedrijf produceert
        const allSteps = await prisma.productionStep.findMany({
            where: {
                job: {
                    quotes: {
                        some: {
                            status: 'accepted',
                            companyId: companyId
                        }
                    }
                }
            },
            include: {
                job: {
                    select: { jobNumber: true, title: true }
                }
            },
            orderBy: {
                order: 'asc' // Sorteer de kaarten binnen een kolom op volgorde
            }
        });

        // Groepeer de stappen in kolommen op basis van hun status
        const boardData = {
            pending: allSteps.filter(step => step.status === 'pending'),
            in_progress: allSteps.filter(step => step.status === 'in_progress'),
            completed: allSteps.filter(step => step.status === 'completed'),
        };
        // Voeg hier eventuele andere statussen toe als je die gebruikt

        res.status(200).json(boardData);

    } catch (error) {
        logger.error(`Fout bij ophalen 'getBoardData' voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon data voor het planbord niet ophalen.' });
    }
};


// --- BESTAANDE FUNCTIES ---
exports.getMyProductions = async (req, res) => {
    const { companyId } = req.user;
    try {
        const productions = await prisma.printJob.findMany({
            where: { 
                quotes: {
                    some: { status: 'accepted', companyId: companyId }
                }
            },
            include: { 
                company: { select: { name: true } },
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

exports.addProductionStep = async (req, res) => {
    const { jobId } = req.params;
    const { title, order } = req.body;
    try {
        const newStep = await prisma.productionStep.create({
            data: { jobId, title, order: parseInt(order, 10), status: 'pending' } // Standaard status
        });
        res.status(201).json(newStep);
    } catch (error) {
        logger.error(`Fout bij toevoegen stap aan opdracht ${jobId}: ${error.message}`);
        res.status(500).json({ error: 'Kon productiestap niet toevoegen.' });
    }
};

exports.updateProductionStepStatus = async (req, res) => {
    const { stepId } = req.params;
    const { status } = req.body;
    try {
        const updatedStep = await prisma.productionStep.update({
            where: { id: stepId },
            data: { status },
            include: { 
                job: { 
                    select: { companyId: true, title: true }
                }
            } 
        });

        const ownerCompany = await prisma.company.findUnique({
            where: { id: updatedStep.job.companyId },
            include: { users: { where: { companyRole: 'owner' } } }
        });

        if (ownerCompany && ownerCompany.users.length > 0) {
            const owner = ownerCompany.users[0];
            const message = `Status van '${updatedStep.title}' voor opdracht '${updatedStep.job.title}' is nu: ${status}.`;
            await prisma.notification.create({
                data: { userId: owner.id, message: message }
            });
        }

        res.status(200).json(updatedStep);
    } catch (error) {
        logger.error(`Fout bij bijwerken status van stap ${stepId}: ${error.message}`);
        res.status(500).json({ error: 'Kon status van stap niet aanpassen.' });
    }
};