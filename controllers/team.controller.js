// controllers/team.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');
const crypto = require('crypto');

exports.getTeamMembers = async (req, res) => {
    const { companyId } = req.user;
    try {
        const members = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, email: true, companyRole: true, status: true }
        });
        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ error: 'Kon teamleden niet ophalen.' });
    }
};

// Nodigt een nieuw teamlid uit
exports.inviteMember = async (req, res) => {
    const { companyId } = req.user;
    const { name, email } = req.body;
    try {
        // --- DE FIX: Controleer eerst of de gebruiker al bestaat ---
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Een gebruiker met dit e-mailadres bestaat al in het systeem.' });
        }

        const activationToken = crypto.randomBytes(32).toString('hex');
        const newUser = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                companyId,
                companyRole: 'member',
                status: 'pending_invitation',
                activationToken,
            }
        });
        
        const activationLink = `http://localhost:5173/#accept-invitation/${activationToken}`;
        logger.info(`UITNODIGINGSLINK voor ${email}: ${activationLink}`);

        res.status(201).json({ message: 'Uitnodiging succesvol verstuurd.' });
    } catch (error) {
        // Vang andere, onverwachte fouten op
        logger.error(`Fout bij uitnodigen teamlid: ${error.message}`);
        res.status(500).json({ error: 'Kon teamlid niet uitnodigen.' });
    }
};
