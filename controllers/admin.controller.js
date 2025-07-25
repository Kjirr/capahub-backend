// controllers/admin.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET;

// Controleert of er al een admin-account bestaat.
exports.checkStatus = async (req, res) => {
    try {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        res.status(200).json({ adminExists: adminCount > 0 });
    } catch (error) {
        res.status(500).json({ error: 'Kon admin-status niet controleren.' });
    }
};

// Maakt het eerste admin-account aan.
exports.setupAdmin = async (req, res) => {
    try {
        const { email, password, secret } = req.body;
        if (secret !== SETUP_SECRET) {
            return res.status(403).json({ error: 'Ongeldige setup-sleutel.' });
        }
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount > 0) {
            return res.status(409).json({ error: 'Er bestaat al een admin-account.' });
        }
        if (!email || !password || email.toLowerCase() !== ADMIN_EMAIL) {
            return res.status(400).json({ error: 'Ongeldige data.' });
        }
        await prisma.$transaction(async (tx) => {
            const adminCompany = await tx.company.create({
                data: { name: 'CapaPrint Admin', kvk: `ADMIN-${Date.now()}` }
            });
            const passwordHash = await bcrypt.hash(password, 10);
            await tx.user.create({
                data: {
                    email: ADMIN_EMAIL, passwordHash, name: 'Administrator', role: 'admin',
                    status: 'active', emailVerified: true, companyId: adminCompany.id, companyRole: 'owner'
                },
            });
        });
        res.status(201).json({ message: 'Admin-account succesvol aangemaakt.' });
    } catch (error) {
        logger.error(`Fout bij admin setup: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout bij setup.' });
    }
};

// Haalt statistieken op voor het dashboard
exports.getStats = async (req, res) => {
    try {
        const companyCount = await prisma.company.count();
        const jobCount = await prisma.printJob.count();
        const pendingUsers = await prisma.user.count({ where: { status: 'pending_approval' } });

        res.status(200).json({ companyCount, jobCount, pendingUsers });
    } catch (error) {
        res.status(500).json({ error: 'Kon statistieken niet ophalen.' });
    }
};

// Haalt een lijst van alle gebruikers op
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, name: true, email: true, status: true, companyRole: true, createdAt: true,
                company: { select: { name: true } }
            }
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Kon gebruikers niet ophalen.' });
    }
};

// Keurt een specifieke gebruiker goed
exports.approveUser = async (req, res) => {
    const { userId } = req.params;
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'active' }
        });
        res.status(200).json({ message: 'Gebruiker succesvol goedgekeurd.' });
    } catch (error) {
        logger.error(`Fout bij goedkeuren gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Kon gebruiker niet goedkeuren.' });
    }
};

// Haalt een complete lijst van alle bedrijven op
exports.getAllCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true, jobs: true }
                }
            }
        });
        res.status(200).json(companies);
    } catch (error) {
        logger.error(`Fout bij ophalen alle bedrijven: ${error.message}`);
        res.status(500).json({ error: 'Kon bedrijven niet ophalen.' });
    }
};
