const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- Configuratie ---
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATALE FOUT: JWT_SECRET is niet geladen. Controleer je .env bestand.");
    process.exit(1);
}

const PORT = process.env.PORT || 3001;
const ADMIN_EMAIL = 'admin@printcap.com'; 

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    next();
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Geen token, toegang geweigerd.' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token is niet geldig.' });
        req.user = user;
        next();
    });
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Toegang geweigerd. Adminrechten vereist.' });
    next();
};

// ===============================================
// API ROUTES
// ===============================================

// --- Authenticatie Routes ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { bedrijfsnaam, email, password, kvk } = req.body;
        if (!bedrijfsnaam || !email || !password || !kvk) return res.status(400).json({ error: 'Alle velden zijn verplicht.' });
        const existingUser = await prisma.user.findFirst({ where: { OR: [{ email: email.toLowerCase() }, { kvk: kvk }] } });
        if (existingUser) {
            const message = existingUser.email === email.toLowerCase() ? 'Een account met dit e-mailadres bestaat al.' : 'Een account met dit KvK-nummer bestaat al.';
            return res.status(409).json({ error: message });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        await prisma.user.create({ data: { bedrijfsnaam, email: email.toLowerCase(), passwordHash, kvk, emailVerificationToken, status: 'pending_email_verification' } });
        res.status(201).json({ message: 'Registratie succesvol! Account in afwachting van goedkeuring.' });
    } catch (error) {
        console.error("Fout bij registreren:", error);
        res.status(500).json({ error: 'Fout bij registreren.' });
    }
});

app.get('/api/auth/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const userToVerify = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
        if (!userToVerify) return res.status(404).json({ error: 'Verificatie token is ongeldig of verlopen.' });
        await prisma.user.update({
            where: { id: userToVerify.id },
            data: { status: 'pending_approval', emailVerified: true, emailVerificationToken: null },
        });
        res.status(200).json({ message: 'E-mailadres succesvol geverifieerd.' });
    } catch (error) { res.status(500).json({ error: 'Fout bij het verifiëren van het e-mailadres.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail en wachtwoord zijn verplicht.' });
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Ongeldige e-mail of wachtwoord.' });
        if (user.status !== 'active') return res.status(403).json({ error: 'Uw account is niet actief of nog niet goedgekeurd.' });
        const payload = { userId: user.id, email: user.email, bedrijfsnaam: user.bedrijfsnaam, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Succesvol ingelogd!', token, user: payload });
    } catch (error) {
        console.error("Fout bij inloggen:", error);
        res.status(500).json({ error: 'Fout bij inloggen.' });
    }
});

// --- Profiel & Gebruiker Routes ---

app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, email: true, bedrijfsnaam: true, kvk: true, status: true, role: true, capabilities: true }
        });
        if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        res.status(200).json(user);
    } catch (error) { res.status(500).json({ error: 'Kon profiel niet ophalen.' }); }
});

app.put('/api/profile/capabilities', authMiddleware, async (req, res) => {
    try {
        const { capabilities } = req.body;
        if (!Array.isArray(capabilities)) return res.status(400).json({ error: 'Capabilities moet een array zijn.' });
        await prisma.user.update({ where: { id: req.user.userId }, data: { capabilities } });
        res.status(200).json({ message: 'Capaciteiten succesvol bijgewerkt.' });
    } catch (error) { res.status(500).json({ error: 'Kon capaciteiten niet bijwerken.' }); }
});

app.get('/api/users/:userId', authMiddleware, async (req, res) => {
    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: { id: true, bedrijfsnaam: true, capabilities: true, reviews: { orderBy: { createdAt: 'desc' } } }
        });
        if (!userProfile) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        res.status(200).json(userProfile);
    } catch (error) { res.status(500).json({ error: 'Kon openbaar profiel niet ophalen.' }); }
});

// --- Opdrachten, Offertes & Productie Routes ---

app.post('/api/jobs', authMiddleware, async (req, res) => {
    try {
        const { title, description, format, quantity, material, deadline, isPublic } = req.body;
        if (!title || !description || !quantity || !material) return res.status(400).json({ error: 'Titel, omschrijving, oplage en materiaal zijn verplicht.' });
        const newJob = await prisma.printJob.create({
            data: { title, description, quantity: parseInt(quantity, 10), material, format, isPublic, deadline: deadline ? new Date(deadline) : null, customerId: req.user.userId }
        });
        res.status(201).json({ message: 'Opdracht succesvol geplaatst!', job: newJob });
    } catch (error) { res.status(500).json({ error: 'Kon de opdracht niet plaatsen.' }); }
});

app.get('/api/jobs/marketplace', authMiddleware, async (req, res) => {
    try {
        const jobs = await prisma.printJob.findMany({
            where: {
                status: 'quoting',
                isPublic: true,
                customerId: { not: req.user.userId },
                deadline: { gte: new Date() },
            },
            include: { customer: { select: { bedrijfsnaam: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Kon marktplaats opdrachten niet ophalen.' });
    }
});

app.get('/api/jobs/my-jobs', authMiddleware, async (req, res) => {
    try {
        const myJobs = await prisma.printJob.findMany({
            where: { 
                customerId: req.user.userId,
                status: { not: 'archived' } // <-- VOEG DEZE CONTROLE TOE
            },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { quotes: true } } },
        });
        res.status(200).json(myJobs);
    } catch (error) {
        res.status(500).json({ error: 'Kon mijn opdrachten niet ophalen.' });
    }
});

app.get('/api/jobs/production', authMiddleware, async (req, res) => {
    try {
        const productionJobs = await prisma.printJob.findMany({ 
            where: { winnerProviderId: req.user.userId }, 
            orderBy: { createdAt: 'desc' },
            include: { 
                customer: { 
                    select: { bedrijfsnaam: true } 
                },
                // DEZE REGEL IS TOEGEVOEGD:
                productionSteps: true 
            }
        });
        res.status(200).json(productionJobs);
    } catch (error) { 
        res.status(500).json({ error: 'Kon productie-opdrachten niet ophalen.' }); 
    }
});

app.get('/api/jobs/:id', authMiddleware, async (req, res) => {
    try {
        const job = await prisma.printJob.findUnique({
            where: { id: req.params.id },
            include: { 
                customer: { select: { id: true, bedrijfsnaam: true } }, 
                quotes: { include: { provider: { select: { id: true, bedrijfsnaam: true } } }, orderBy: { createdAt: 'asc' } },
                productionSteps: { orderBy: { order: 'asc' } } 
            }
        });
        if (!job) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        res.status(200).json(job);
    } catch (error) { 
        console.error("Fout bij ophalen job details:", error);
        res.status(500).json({ error: 'Kon opdrachtdetails niet ophalen.' }); 
    }
});

app.put('/api/jobs/:jobId', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { title, description, format, quantity, material, deadline, isPublic } = req.body;

        const updatedJob = await prisma.printJob.update({
            where: { id: jobId, customerId: req.user.userId },
            data: { title, description, format, quantity: parseInt(quantity, 10), material, deadline: deadline ? new Date(deadline) : null, isPublic }
        });
        res.status(200).json({ message: 'Opdracht succesvol bijgewerkt.', job: updatedJob });
    } catch (error) {
        res.status(403).json({ error: 'Kon opdracht niet bijwerken.' });
    }
});

app.put('/api/jobs/:jobId/archive', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.user;

        // Veiligheidscontrole: update alleen als de gebruiker de eigenaar is
        await prisma.printJob.update({
            where: {
                id: jobId,
                customerId: userId,
            },
            data: {
                status: 'archived',
            }
        });
        res.status(200).json({ message: 'Opdracht succesvol gearchiveerd.' });
    } catch (error) {
        // Vangt de fout op als de opdracht niet bestaat of niet van de gebruiker is
        res.status(403).json({ error: 'Kon opdracht niet archiveren.' });
    }
});

app.post('/api/jobs/:jobId/steps', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { title, order } = req.body;
        const newStep = await prisma.productionStep.create({
            data: { jobId, title, order }
        });
        res.status(201).json(newStep);
    } catch (error) {
        res.status(500).json({ error: 'Kon productiestap niet toevoegen.' });
    }
});

app.put('/api/steps/:stepId', authMiddleware, async (req, res) => {
    try {
        const { stepId } = req.params;
        const { status } = req.body;
        const updatedStep = await prisma.productionStep.update({
            where: { id: stepId },
            data: { status },
            include: { job: { select: { customerId: true } } } 
        });

        if (updatedStep.job.customerId) {
            const message = `De status van productiestap '${updatedStep.title}' voor uw opdracht is bijgewerkt naar: ${status}.`;
            await prisma.notification.create({
                data: { userId: updatedStep.job.customerId, message: message }
            });
        }
        res.json(updatedStep);
    } catch (error) {
        console.error("Fout bij updaten productiestap:", error);
        res.status(500).json({ error: 'Kon status van stap niet aanpassen.' });
    }
});

app.get('/api/quote-requests', authMiddleware, async (req, res) => {
    try {
        const jobs = await prisma.printJob.findMany({
            where: { status: 'quoting', isPublic: true, customerId: { not: req.user.userId } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(jobs);
    } catch(error) { res.status(500).json({ error: 'Kon offerteverzoeken niet ophalen.' }); }
});

app.get('/api/quotes/my-submitted', authMiddleware, async (req, res) => {
    try {
        const quotes = await prisma.quote.findMany({
            where: { providerId: req.user.userId },
            include: { job: { select: { title: true, id: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(quotes.map(q => ({...q, jobId: q.job.id})));
    } catch(error) { res.status(500).json({ error: 'Kon ingediende offertes niet ophalen.' }); }
});

app.post('/api/jobs/:jobId/quotes', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.user;
        const job = await prisma.printJob.findUnique({ where: { id: jobId } });
        if (!job) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        if (job.customerId === userId) return res.status(403).json({ error: 'U kunt geen offerte indienen voor uw eigen opdracht.' });
        
        const { price, deliveryTime, comments } = req.body;
        if (!price || !deliveryTime) return res.status(400).json({ error: 'Prijs en levertijd zijn verplicht.' });

        const newQuote = await prisma.quote.create({
            data: { price: parseFloat(price), deliveryTime, comments, jobId: jobId, providerId: userId }
        });
        res.status(201).json({ message: 'Offerte succesvol ingediend.', quote: newQuote });
    } catch (error) { res.status(500).json({ error: 'Kon offerte niet indienen.' }); }
});

app.post('/api/jobs/:jobId/quotes/:quoteId/accept', authMiddleware, async (req, res) => {
    try {
        const { jobId, quoteId } = req.params;
        const acceptedQuote = await prisma.quote.findUnique({ where: { id: quoteId } });
        if (!acceptedQuote) return res.status(404).json({ error: 'Offerte niet gevonden.' });
        
        const allQuotes = await prisma.quote.findMany({ where: { jobId: jobId } });
        await prisma.$transaction([
            prisma.printJob.update({ where: { id: jobId }, data: { status: 'in_production', winnerProviderId: acceptedQuote.providerId } }),
            prisma.quote.update({ where: { id: quoteId }, data: { status: 'accepted' } }),
            prisma.quote.updateMany({ where: { jobId: jobId, id: { not: quoteId } }, data: { status: 'rejected' } })
        ]);

        for (const quote of allQuotes) {
            let message = quote.id === quoteId ? `Gefeliciteerd! Je offerte voor opdracht #${jobId.slice(-6).toUpperCase()} is geaccepteerd.` : `Helaas, je offerte voor opdracht #${jobId.slice(-6).toUpperCase()} is afgewezen.`;
            await prisma.notification.create({ data: { userId: quote.providerId, message: message } });
        }
        res.status(200).json({ message: 'Offerte succesvol geaccepteerd!' });
    } catch (error) { res.status(500).json({ error: 'Kon offerte niet accepteren.' }); }
});


// --- Capaciteit Aanbod (Offers) Routes ---

app.get('/api/offers/my-offers', authMiddleware, async (req, res) => {
    try {
        const offers = await prisma.offer.findMany({
            where: { ownerId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(offers);
    } catch (error) { res.status(500).json({ error: 'Kon mijn aanbod niet ophalen.' }); }
});

app.get('/api/offers/search', authMiddleware, async (req, res) => {
    try {
        const offers = await prisma.offer.findMany({
            where: { ownerId: { not: req.user.userId } },
            include: { owner: { select: { bedrijfsnaam: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(offers);
    } catch (error) { res.status(500).json({ error: 'Kon aanbod niet ophalen.' }); }
});

app.post('/api/offers', authMiddleware, async (req, res) => {
    try {
        const { machineType, material, capacityDetails, price } = req.body;
        await prisma.offer.create({ data: { machineType, material, capacityDetails, price, ownerId: req.user.userId } });
        res.status(201).json({ message: 'Aanbod succesvol geplaatst!' });
    } catch (error) { res.status(500).json({ error: 'Kon aanbieding niet toevoegen.' }); }
});

app.get('/api/offers/:id', authMiddleware, async (req, res) => {
    try {
        const offer = await prisma.offer.findUnique({
            where: { id: req.params.id },
            include: { owner: { select: { bedrijfsnaam: true } } }
        });
        if (!offer) return res.status(404).json({ error: 'Aanbod niet gevonden.' });
        res.status(200).json(offer);
    } catch (error) { res.status(500).json({ error: 'Kon aanbod niet ophalen.' }); }
});


// --- Notificatie Routes ---
app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Kon notificaties niet ophalen.' });
    }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.user.userId },
            data: { isRead: true },
        });
        res.status(200).json({ message: 'Notificatie als gelezen gemarkeerd.' });
    } catch (error) {
        res.status(500).json({ error: 'Kon notificatie niet bijwerken.' });
    }
});


// --- Admin Routes ---

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, bedrijfsnaam: true, email: true, kvk: true, status: true, role: true, emailVerified: true }
        });
        res.status(200).json(users);
    } catch (error) { res.status(500).json({ error: 'Kon gebruikers niet ophalen.' }); }
});

app.post('/api/admin/users/:userId/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await prisma.user.update({ where: { id: req.params.userId }, data: { status: 'active' } });
        res.status(200).json({ message: 'Gebruiker succesvol goedgekeurd.' });
    } catch (error) { res.status(500).json({ error: 'Kon gebruiker niet goedkeuren.' }); }
});

app.post('/api/admin/users/:userId/force-verify', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await prisma.user.update({
            where: { id: req.params.userId },
            data: { status: 'pending_approval', emailVerified: true, emailVerificationToken: null }
        });
        res.status(200).json({ message: 'E-mailadres van gebruiker handmatig geverifieerd.' });
    } catch (error) { res.status(500).json({ error: 'Kon e-mailadres niet handmatig verifiëren.' }); }
});

app.delete('/api/admin/users/:userId/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.userId } });
        res.status(200).json({ message: 'Gebruiker succesvol afgewezen en verwijderd.' });
    } catch (error) { res.status(500).json({ error: 'Kon gebruiker niet afwijzen.' }); }
});

app.delete('/api/admin/jobs/:jobId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await prisma.printJob.delete({ where: { id: req.params.jobId } });
        res.status(200).json({ message: 'Opdracht succesvol verwijderd door admin.' });
    } catch (error) { res.status(500).json({ error: "Kon opdracht niet verwijderen." }); }
});

// In server.js

app.get('/api/archive', authMiddleware, async (req, res) => {
    try {
        const { searchTerm, startDate, endDate } = req.query; // Haal zoekparameters op
        
        let whereClause = {
            OR: [
                { customerId: req.user.userId },
                { winnerProviderId: req.user.userId }
            ],
            status: 'archived'
        };

        // Voeg zoekterm toe aan de query als die er is
        if (searchTerm) {
            whereClause.title = {
                contains: searchTerm,
                mode: 'insensitive' // Niet hoofdlettergevoelig
            };
        }

        // Voeg datumfilters toe als die er zijn
        if (startDate && endDate) {
            whereClause.updatedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const archivedJobs = await prisma.printJob.findMany({
            where: whereClause, // Gebruik de opgebouwde 'where' clause
            include: {
                customer: { select: { bedrijfsnaam: true } },
                winner: { select: { bedrijfsnaam: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json(archivedJobs);
    } catch (error) {
        console.error("Fout bij ophalen archief:", error);
        res.status(500).json({ error: 'Kon archief niet ophalen.' });
    }
});

// --- Start de server ---
app.listen(PORT, () => {
    console.log(`CapaHub API Server draait nu op http://localhost:${PORT}`);
});