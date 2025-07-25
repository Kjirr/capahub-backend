// controllers/notification.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle notificaties op voor de ingelogde gebruiker
exports.getNotifications = async (req, res) => {
    const userId = req.user?.userId;
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(notifications);
    } catch (error) {
        logger.error(`Fout bij ophalen notificaties voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// NIEUW: Markeer een specifieke notificatie als gelezen
exports.markAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    try {
        await prisma.notification.update({
            where: { id: id, userId: userId }, // Veiligheidscheck
            data: { isRead: true }
        });
        res.status(200).json({ message: 'Notificatie als gelezen gemarkeerd.' });
    } catch (error) {
        logger.error(`Fout bij markeren notificatie ${id}: ${error.message}`);
        res.status(403).json({ error: 'Kon notificatie niet bijwerken.' });
    }
};
