// controllers/task.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle opdrachten op die aan de ingelogde gebruiker zijn toegewezen
exports.getMyAssignedTasks = async (req, res) => {
    const { userId } = req.user;
    logger.debug(`Functie 'getMyAssignedTasks' gestart voor gebruiker ${userId}`);

    try {
        const assignedJobs = await prisma.printJob.findMany({
            where: {
                assigneeId: userId,
                // We tonen alleen taken die nog actief zijn
                status: { notIn: ['completed', 'cancelled', 'rejected'] }
            },
            include: {
                company: { select: { name: true } } // Naam van de klant
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json(assignedJobs);
    } catch (error) { // DE FIX: Het openingshaakje { was hier vergeten
        logger.error(`Fout bij ophalen 'getMyAssignedTasks' voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};
