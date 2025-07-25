// routes/user.routes.js

const express = require('express');
const router = express.Router();
const prisma = require('../prisma/prisma');
const { authMiddleware } = require('../middleware/auth');

// Deze route haalt een openbaar profiel op, en is beveiligd zodat alleen ingelogde gebruikers dit kunnen.
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { 
                id: true, 
                bedrijfsnaam: true, 
                capabilities: true, 
                reviews: { orderBy: { createdAt: 'desc' } } 
            }
        });
        if (!userProfile) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        }
        res.status(200).json(userProfile);
    } catch (error) { 
        res.status(500).json({ error: 'Kon openbaar profiel niet ophalen.' }); 
    }
});

module.exports = router;