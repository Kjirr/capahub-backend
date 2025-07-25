const prisma = require('../prisma/prisma');

exports.getPublicProfile = async (req, res) => {
    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, bedrijfsnaam: true, capabilities: true, reviews: { orderBy: { createdAt: 'desc' } } }
        });
        if (!userProfile) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        res.status(200).json(userProfile);
    } catch (error) { res.status(500).json({ error: 'Kon openbaar profiel niet ophalen.' }); }
};