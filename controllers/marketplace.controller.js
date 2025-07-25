const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

exports.getPublicJobs = async (req, res) => {
    const { companyId } = req.user;
    try {
        const publicJobs = await prisma.printJob.findMany({
            where: {
                isPublic: true,
                status: 'quoting',
                companyId: { not: companyId },
                assigneeId: null // DE FIX: Toon alleen opdrachten die nog niet zijn toegewezen
            },
            include: {
                company: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(publicJobs);
    } catch (error) {
        logger.error(`Fout bij ophalen marktplaats: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};