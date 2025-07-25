// controllers/archive.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

exports.getArchivedJobs = async (req, res) => {
    const { companyId } = req.user; // Gebruik companyId uit de token
    logger.debug(`Functie 'getArchivedJobs' gestart voor bedrijf ${companyId}`);

    try {
        const archivedJobs = await prisma.printJob.findMany({
            where: {
                status: {
                    in: ['completed', 'cancelled']
                },
                // DE FIX: Controleer of het bedrijf van de gebruiker ofwel de klant
                // ofwel de winnaar van de opdracht was.
                OR: [
                    { companyId: companyId },
                    { 
                        quotes: {
                            some: {
                                status: 'accepted',
                                companyId: companyId
                            }
                        }
                    }
                ]
            },
            orderBy: {
                updatedAt: 'desc',
            }
        });

        logger.info(`Succesvol ${archivedJobs.length} gearchiveerde opdrachten opgehaald voor bedrijf ${companyId}`);
        res.status(200).json(archivedJobs);

    } catch (error) {
        logger.error(`Fout bij ophalen 'getArchivedJobs' voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout bij ophalen van het archief.' });
    }
};
