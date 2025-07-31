// controllers/quote.controller.js

const { Prisma } = require('@prisma/client');
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
            where: { submitterId: userId },
            include: { job: { select: { title: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(quotes);
    } catch (error) {
        logger.error(`Fout bij ophalen 'getMySubmittedQuotes' voor gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// --- HERSCHREVEN FUNCTIE ---
// Dient een nieuwe offerte in, inclusief de volledige calculatie
exports.submitQuote = async (req, res) => {
    const { jobId } = req.params;
    const { userId, companyId } = req.user;
    // We verwachten nu het volledige 'calculation' object van de frontend
    const { price, deliveryTime, comments, calculation } = req.body;

    if (!calculation) {
        return res.status(400).json({ error: 'Calculatiegegevens ontbreken.' });
    }

    try {
        const job = await prisma.printJob.findUnique({ where: { id: jobId } });
        if (job?.companyId === companyId) {
            return res.status(403).json({ error: 'U kunt geen offerte indienen voor een opdracht van uw eigen bedrijf.' });
        }

        const quoteNumber = await generateQuoteNumber();

        // We gebruiken een transactie om de Offerte, de Calculatie, en alle Calculatie-items
        // in één veilige operatie op te slaan.
        const newQuote = await prisma.$transaction(async (tx) => {
            // 1. Maak de Offerte aan
            const quote = await tx.quote.create({
                data: {
                    quoteNumber,
                    price: parseFloat(price),
                    deliveryTime,
                    comments,
                    jobId,
                    companyId: companyId,
                    submitterId: userId,
                }
            });

            // 2. Maak de hoofd-Calculatie aan, gekoppeld aan de nieuwe offerte
            const calc = await tx.calculation.create({
                data: {
                    quoteId: quote.id,
                    totalCost: calculation.totalCost,
                    marginPercentage: calculation.marginPercentage,
                    finalPrice: calculation.finalPrice,
                    notes: "Gegenereerd via calculatie-engine"
                }
            });

            // 3. Bereid de data voor alle calculatie-items voor
            const calculationItemsData = calculation.items.map(item => ({
                calculationId: calc.id,
                type: item.type,
                description: item.description,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost
            }));

            // 4. Maak alle calculatie-items in één keer aan
            await tx.calculationItem.createMany({
                data: calculationItemsData
            });

            return quote;
        });
        
        // Stuur notificatie naar de eigenaar van de opdracht
        const jobOwnerCompany = await prisma.company.findUnique({ where: { id: job.companyId }, include: { users: true } });
        if (jobOwnerCompany && jobOwnerCompany.users.length > 0) {
            await prisma.notification.create({
                data: {
                    userId: jobOwnerCompany.users[0].id,
                    message: `U heeft een nieuwe offerte van €${price.toFixed(2)} ontvangen voor uw opdracht '${job.title}'.`
                }
            });
        }

        res.status(201).json(newQuote);
    } catch (error) {
        logger.error(`Fout bij indienen offerte voor opdracht ${jobId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// ... de rest van de functies (updateQuote, acceptQuote, etc.) blijven ongewijzigd ...
exports.updateQuote = async (req, res) => { /* ... */ };
exports.acceptQuote = async (req, res) => { /* ... */ };
exports.getQuoteById = async (req, res) => { /* ... */ };