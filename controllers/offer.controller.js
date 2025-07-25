// controllers/offer.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Functie om een uniek aanbodnummer te genereren
const generateOfferNumber = async () => {
    const prefix = `AN-${new Date().getFullYear().toString().slice(-2)}-`;
    const lastOffer = await prisma.offer.findFirst({
        where: { offerNumber: { startsWith: prefix } },
        orderBy: { offerNumber: 'desc' },
    });
    let sequence = 1;
    if (lastOffer) {
        sequence = parseInt(lastOffer.offerNumber.split('-').pop()) + 1;
    }
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Haalt de lijst van aanbod op voor het bedrijf van de gebruiker
exports.getMyOffers = async (req, res) => {
    const { companyId } = req.user; // Gebruik companyId uit de token
    try {
        const offers = await prisma.offer.findMany({
            where: { companyId: companyId }, // DE FIX: Filter op companyId
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(offers);
    } catch (error) {
        logger.error(`Fout bij ophalen 'getMyOffers' voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Maakt een nieuw aanbod aan
exports.createOffer = async (req, res) => {
    const { userId, companyId } = req.user;
    try {
        const { machineType, material, capacityDetails, price, location } = req.body;
        if (!machineType || !material || !capacityDetails || !price) {
            return res.status(400).json({ error: 'Alle velden zijn verplicht.' });
        }
        const offerNumber = await generateOfferNumber();
        const newOffer = await prisma.offer.create({
            data: {
                offerNumber,
                machineType,
                material,
                capacityDetails,
                price,
                location,
                companyId: companyId,
                creatorId: userId
            }
        });
        res.status(201).json(newOffer);
    } catch (error) {
        logger.error(`Fout bij aanmaken aanbod door gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Haalt de details van één specifiek aanbod op
exports.getOfferById = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const offer = await prisma.offer.findUnique({ where: { id } });
        if (!offer || offer.companyId !== companyId) {
            return res.status(404).json({ error: 'Aanbod niet gevonden of geen toegang.' });
        }
        res.status(200).json(offer);
    } catch (error) {
        logger.error(`Fout bij ophalen aanbod ${id}: ${error.message}`);
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Werkt een bestaand aanbod bij
exports.updateOffer = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const { machineType, material, capacityDetails, price, location } = req.body;
        const updatedOffer = await prisma.offer.update({
            where: { id: id, companyId: companyId },
            data: { machineType, material, capacityDetails, price, location }
        });
        res.status(200).json(updatedOffer);
    } catch (error) {
        logger.error(`Fout bij bijwerken aanbod ${id}: ${error.message}`);
        res.status(403).json({ error: 'Kon aanbod niet bijwerken.' });
    }
};

// Verwijdert een aanbod
exports.deleteOffer = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        await prisma.offer.delete({
            where: { id: id, companyId: companyId }
        });
        res.status(200).json({ message: 'Aanbod succesvol verwijderd.' });
    } catch (error) {
        logger.error(`Fout bij verwijderen aanbod ${id}: ${error.message}`);
        res.status(403).json({ error: 'Kon aanbod niet verwijderen.' });
    }
};
