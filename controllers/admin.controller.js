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
            const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
            if (!freePlan) {
                throw new Error("Het 'FREE' abonnement is niet gevonden in de database. Draai eerst de seed.");
            }
            
            const adminCompany = await tx.company.create({
                data: { 
                    name: 'PrntGo Admin', 
                    kvk: `ADMIN-${Date.now()}`,
                    planId: freePlan.id 
                }
            });
            
            const passwordHash = await bcrypt.hash(password, 10);
            await tx.user.create({
                data: {
                    email: ADMIN_EMAIL, 
                    passwordHash, 
                    name: 'Administrator', 
                    role: 'admin',
                    status: 'active', 
                    emailVerified: true, 
                    companyId: adminCompany.id, 
                    companyRole: 'owner'
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
            include: {
                company: true
            }
        });
        res.status(200).json(users);
    } catch (error) {
        logger.error(`Fout bij ophalen van alle gebruikers: ${error.message}`);
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
                plan: true,
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

// --- FUNCTIES VOOR ABONNEMENTENBEHEER ---
exports.getPlans = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            include: {
                permissions: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(plans);
    } catch (error) {
        logger.error(`Fout bij ophalen van plannen: ${error.message}`);
        res.status(500).json({ error: 'Kon plannen niet ophalen.' });
    }
};

exports.getPermissions = async (req, res) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });
        res.status(200).json(permissions);
    } catch (error) {
        logger.error(`Fout bij ophalen van permissies: ${error.message}`);
        res.status(500).json({ error: 'Kon permissies niet ophalen.' });
    }
};

exports.updatePlanPermissions = async (req, res) => {
    const { planId } = req.params;
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ error: 'Input moet een array van permission IDs zijn.' });
    }
    try {
        await prisma.plan.update({
            where: { id: planId },
            data: {
                permissions: {
                    set: permissionIds.map(id => ({ id: id }))
                }
            }
        });
        logger.info(`Permissies voor plan ${planId} bijgewerkt door admin ${req.user.userId}`);
        res.status(200).json({ message: 'Permissies succesvol bijgewerkt.' });
    } catch (error) {
        logger.error(`Fout bij bijwerken van permissies voor plan ${planId}: ${error.message}`);
        res.status(500).json({ error: 'Kon permissies niet bijwerken.' });
    }
};

// --- NIEUWE FUNCTIES VOOR DASHBOARD DATA ---
exports.getPendingUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { status: 'pending_approval' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { company: { select: { name: true } } }
        });
        res.status(200).json(users);
    } catch (error) {
        logger.error(`Fout bij ophalen van wachtende gebruikers: ${error.message}`);
        res.status(500).json({ error: 'Kon wachtende gebruikers niet ophalen.' });
    }
};

exports.getRecentCompanies = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { plan: true }
        });
        res.status(200).json(companies);
    } catch (error) {
        logger.error(`Fout bij ophalen van recente bedrijven: ${error.message}`);
        res.status(500).json({ error: 'Kon recente bedrijven niet ophalen.' });
    }
};