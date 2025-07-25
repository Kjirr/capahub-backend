// controllers/quote.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Functie om een uniek offertenummer te genereren
const generateQuoteNumber = async () => {
    const prefix = `OF-${new Date().getFullYear().toString().slice(-2)}-`;
    const lastQuote = await prisma.quote.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: 'desc' },
    });
    let sequence = 1;
    if (lastQuote) {
        sequence = parseInt(lastQuote.quoteNumber.split('-').pop()) + 1;
    }
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Haalt de offertes op die door de gebruiker zijn ingediend
exports.getMySubmittedQuotes = async (req, res) => {
    const { userId } = req.user;
    try {
        const quotes = await prisma.quote.findMany({
            where: { submitterId: userId }, // DE FIX: Filter op submitterId
            include: { job: { select: { title: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(quotes);
    } catch (error) {
        logger.error(`Fout bij ophalen 'getMySubmittedQuotes' voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Dient een nieuwe offerte in namens het bedrijf
exports.submitQuote = async (req, res) => {
    const { jobId } = req.params;
    const { userId, companyId } = req.user;
    const { price, deliveryTime, comments } = req.body;
    try {
        const job = await prisma.printJob.findUnique({ where: { id: jobId } });
        if (job?.companyId === companyId) {
            return res.status(403).json({ error: 'U kunt geen offerte indienen voor een opdracht van uw eigen bedrijf.' });
        }

        const quoteNumber = await generateQuoteNumber();
        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber,
                price: parseFloat(price),
                deliveryTime,
                comments,
                jobId,
                companyId: companyId,   // DE FIX
                submitterId: userId,  // DE FIX
            }
        });
        
        // Stuur notificatie naar de eigenaar van de opdracht
        const jobOwnerCompany = await prisma.company.findUnique({ where: { id: job.companyId }, include: { users: true } });
        if (jobOwnerCompany && jobOwnerCompany.users.length > 0) {
            await prisma.notification.create({
                data: {
                    userId: jobOwnerCompany.users[0].id, // Stuur naar de eerste gebruiker van het bedrijf
                    message: `U heeft een nieuwe offerte ontvangen voor uw opdracht '${job.title}'.`
                }
            });
        }

        res.status(201).json(newQuote);
    } catch (error) {
        logger.error(`Fout bij indienen offerte voor opdracht ${jobId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Werkt een bestaande offerte bij
exports.updateQuote = async (req, res) => {
    const { quoteId } = req.params;
    const { userId } = req.user;
    const { price, deliveryTime, comments } = req.body;
    try {
        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId, submitterId: userId }, // Veiligheidscheck
            data: { price: parseFloat(price), deliveryTime, comments }
        });
        res.status(200).json(updatedQuote);
    } catch (error) {
        res.status(403).json({ error: 'Kon offerte niet bijwerken.' });
    }
};

// Accepteert een offerte
exports.acceptQuote = async (req, res) => {
    const { quoteId } = req.params;
    const { companyId } = req.user;
    try {
        const acceptedQuote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { job: true } });
        if (!acceptedQuote || acceptedQuote.job.companyId !== companyId) {
            return res.status(403).json({ error: 'Geen toestemming om deze offerte te accepteren.' });
        }
        
        // ... (De rest van de acceptatie logica blijft hetzelfde)
    } catch (error) {
        // ...
    }
};

// Haalt details van één offerte op
exports.getQuoteById = async (req, res) => {
    // ...
};
