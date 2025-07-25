
// controllers/auth.controller.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
    // DE FIX: Zorg ervoor dat 'name' wordt meegenomen uit de request body
    const { bedrijfsnaam, kvk, name, email, password } = req.body;
    logger.debug(`Nieuwe bedrijfsregistratie gestart voor ${bedrijfsnaam}`);
    
    try {
        const newUserData = await prisma.$transaction(async (tx) => {
            const newCompany = await tx.company.create({
                data: { name: bedrijfsnaam, kvk }
            });

            const passwordHash = await bcrypt.hash(password, 10);
            const user = await tx.user.create({
                data: {
                    name: name, // DE FIX: Sla de naam van de gebruiker op
                    email: email.toLowerCase(),
                    passwordHash,
                    companyId: newCompany.id,
                    companyRole: 'owner',
                    status: 'active'
                }
            });
            return user;
        });
        res.status(201).json({ message: 'Bedrijf en account succesvol aangemaakt!' });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Een bedrijf met dit KvK-nummer of e-mailadres bestaat al.' });
        }
        logger.error(`Fout bij registratie: ${error.message}`);
        res.status(500).json({ error: 'Kon account niet aanmaken.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Ongeldige e-mail of wachtwoord.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Uw account is niet actief.' });
        }
        
        const company = await prisma.company.findUnique({ where: { id: user.companyId } });

        const payload = { 
            userId: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            companyId: user.companyId,
            companyRole: user.companyRole,
            bedrijfsnaam: company?.name || user.name
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Succesvol ingelogd!', token, user: payload });
    } catch (error) {
        logger.error(`Fout bij inloggen: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};
