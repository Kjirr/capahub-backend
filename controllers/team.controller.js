// controllers/team.controller.js

const { UserStatus, CompanyRole } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const logger = require('../config/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// --- BESTAANDE FUNCTIES ---

exports.getTeamMembers = async (req, res) => {
    const { companyId } = req.user;
    try {
        const members = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, email: true, companyRole: true, status: true }
        });
        res.status(200).json(members);
    } catch (error) {
        logger.error(`Fout bij ophalen teamleden: ${error.message}`);
        res.status(500).json({ error: 'Kon teamleden niet ophalen.' });
    }
};

exports.inviteMember = async (req, res) => {
    // ... bestaande code voor inviteMember blijft ongewijzigd ...
    const { companyId } = req.user;
    const { name, email } = req.body;
    try {
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
                companyRole: CompanyRole.member,
                status: UserStatus.pending_approval,
                activationToken,
            }
        });
        
        const activationLink = `http://localhost:5173/#accept-invitation/${activationToken}`;
        logger.info(`UITNODIGINGSLINK voor ${email}: ${activationLink}`);

        res.status(201).json({ message: 'Uitnodiging succesvol verstuurd.' });
    } catch (error) {
        logger.error(`Fout bij uitnodigen teamlid: ${error.message}`);
        res.status(500).json({ error: 'Kon teamlid niet uitnodigen.' });
    }
};

exports.addMemberDirectly = async (req, res) => {
    // ... bestaande code voor addMemberDirectly blijft ongewijzigd ...
    const { companyId } = req.user;
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: 'Naam en wachtwoord zijn verplicht.' });
    }

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const sanitizedName = name.toLowerCase().replace(/\s+/g, '.');
        const uniqueIdentifier = crypto.randomBytes(4).toString('hex');
        const email = `${sanitizedName}.${uniqueIdentifier}@team.prntgo.local`;

        const newMember = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                companyId,
                companyRole: CompanyRole.member,
                status: UserStatus.active,
                emailVerified: true,
            }
        });

        res.status(201).json({
            id: newMember.id,
            name: newMember.name,
            email: newMember.email,
            companyRole: newMember.companyRole,
            status: newMember.status,
            message: 'Teamlid succesvol aangemaakt.'
        });

    } catch (error) {
        logger.error(`Fout bij direct toevoegen van teamlid: ${error.message}`);
        res.status(500).json({ error: 'Kon teamlid niet aanmaken.' });
    }
};

exports.suspendMember = async (req, res) => {
    // ... bestaande code voor suspendMember blijft ongewijzigd ...
    const { id: ownerId, companyId } = req.user;
    const { memberId } = req.params;

    if (ownerId === memberId) {
        return res.status(400).json({ error: 'U kunt uzelf niet verwijderen.' });
    }

    try {
        const memberToSuspend = await prisma.user.findFirst({
            where: {
                id: memberId,
                companyId: companyId,
            }
        });

        if (!memberToSuspend) {
            return res.status(404).json({ error: 'Teamlid niet gevonden of u heeft geen rechten voor deze actie.' });
        }

        if (memberToSuspend.companyRole === 'owner') {
            return res.status(403).json({ error: 'U kunt geen andere eigenaar deactiveren.' });
        }

        const suspendedUser = await prisma.user.update({
            where: {
                id: memberId,
            },
            data: {
                status: UserStatus.suspended,
            }
        });

        logger.info(`Gebruiker ${suspendedUser.id} gedeactiveerd door eigenaar ${ownerId}`);
        res.status(200).json({ message: `Teamlid '${suspendedUser.name}' succesvol gedeactiveerd.` });

    } catch (error) {
        logger.error(`Fout bij deactiveren van teamlid ${memberId}: ${error.message}`);
        res.status(500).json({ error: 'Kon teamlid niet deactiveren.' });
    }
};

// --- NIEUWE FUNCTIES VOOR RECHTENBEHEER ---

// Haalt alle mogelijke rechten op uit de database
exports.getAllPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            select: { id: true, name: true, description: true }
        });
        res.status(200).json(permissions);
    } catch (error) {
        logger.error(`Fout bij ophalen van permissies: ${error.message}`);
        res.status(500).json({ error: 'Kon permissies niet ophalen.' });
    }
};

// Haalt de huidige rechten van een specifiek teamlid op
exports.getMemberPermissions = async (req, res) => {
    const { companyId } = req.user;
    const { memberId } = req.params;

    try {
        const member = await prisma.user.findFirst({
            where: { id: memberId, companyId: companyId },
            include: { permissions: { select: { id: true } } }
        });

        if (!member) {
            return res.status(404).json({ error: 'Teamlid niet gevonden.' });
        }
        
        // Stuur alleen de array van permissies terug
        res.status(200).json(member.permissions);
    } catch (error) {
        logger.error(`Fout bij ophalen permissies voor lid ${memberId}: ${error.message}`);
        res.status(500).json({ error: 'Kon permissies van lid niet ophalen.' });
    }
};

// Update de rechten voor een specifiek teamlid
exports.updateMemberPermissions = async (req, res) => {
    const { id: ownerId, companyId } = req.user;
    const { memberId } = req.params;
    const { permissionIds } = req.body; // Verwacht een array van permission IDs, bv: ['id1', 'id2']

    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ error: 'Ongeldige input: permissionIds moet een array zijn.' });
    }

    if (ownerId === memberId) {
        return res.status(400).json({ error: 'U kunt uw eigen rechten niet aanpassen.' });
    }

    try {
        // Check of het lid wel bestaat en bij het bedrijf hoort
        const memberToUpdate = await prisma.user.findFirst({
            where: { id: memberId, companyId: companyId }
        });

        if (!memberToUpdate) {
            return res.status(404).json({ error: 'Teamlid niet gevonden.' });
        }

        // Een eigenaar kan geen rechten van een andere eigenaar aanpassen
        if (memberToUpdate.companyRole === 'owner') {
            return res.status(403).json({ error: 'U kunt geen rechten van een andere eigenaar aanpassen.' });
        }

        // Voer de update uit. De 'set' operator vervangt alle bestaande rechten
        // met de nieuwe set die wordt meegestuurd.
        await prisma.user.update({
            where: { id: memberId },
            data: {
                permissions: {
                    set: permissionIds.map(id => ({ id: id }))
                }
            }
        });
        
        logger.info(`Rechten voor gebruiker ${memberId} aangepast door eigenaar ${ownerId}`);
        res.status(200).json({ message: 'Rechten succesvol bijgewerkt.' });

    } catch (error) {
        logger.error(`Fout bij updaten van permissies voor lid ${memberId}: ${error.message}`);
        res.status(500).json({ error: 'Kon permissies niet bijwerken.' });
    }
};