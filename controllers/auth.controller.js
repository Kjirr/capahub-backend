// controllers/auth.controller.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => { /* ... ongewijzigde code, zie vorige versie ... */ const { bedrijfsnaam, kvk, name, email, password } = req.body; logger.debug(`Nieuwe bedrijfsregistratie gestart voor ${bedrijfsnaam}`); try { await prisma.$transaction(async (tx) => { const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } }); if (!freePlan) { throw new Error("Het 'FREE' abonnement is niet gevonden in de database."); } const newCompany = await tx.company.create({ data: { name: bedrijfsnaam, kvk, planId: freePlan.id } }); const passwordHash = await bcrypt.hash(password, 10); await tx.user.create({ data: { name: name, email: email.toLowerCase(), passwordHash, companyId: newCompany.id, companyRole: 'owner', status: 'active' } }); }); res.status(201).json({ message: 'Bedrijf en account succesvol aangemaakt!' }); } catch (error) { if (error.code === 'P2002') { return res.status(409).json({ error: 'Een bedrijf met dit KvK-nummer of e-mailadres bestaat al.' }); } logger.error(`Fout bij registratie: ${error.message}`); res.status(500).json({ error: 'Kon account niet aanmaken.' }); } };

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        let user = await prisma.user.findUnique({ 
            where: { email: email.toLowerCase() },
            include: { 
                permissions: { select: { name: true } },
                company: {
                    include: {
                        plan: {
                            include: { permissions: true }
                        }
                    }
                }
            }
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Ongeldige e-mail of wachtwoord.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Uw account is niet actief.' });
        }
        
        // --- VERBETERDE FALLBACK LOGICA ---
        if (user.company && !user.company.plan) {
            const freePlan = await prisma.plan.findUnique({
                where: { name: 'FREE' },
                include: { permissions: true }
            });
            if (freePlan) {
                // Koppel het bedrijf nu ook daadwerkelijk aan het FREE plan in de database
                await prisma.company.update({
                    where: { id: user.companyId },
                    data: { planId: freePlan.id }
                });
                // Voeg de plan-informatie toe aan het user-object voor de token
                user.company.plan = freePlan; 
                logger.info(`Oud bedrijf ${user.companyId} permanent gekoppeld aan FREE plan.`);
            }
        }
        
        const payload = { 
            userId: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            companyId: user.companyId,
            companyRole: user.companyRole,
            bedrijfsnaam: user.company?.name || user.name, 
            permissions: user.permissions,
            subscription: user.company?.plan 
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        
        res.status(200).json({ message: 'Succesvol ingelogd!', token, user: payload });

    } catch (error) {
        logger.error(`Fout bij inloggen: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};