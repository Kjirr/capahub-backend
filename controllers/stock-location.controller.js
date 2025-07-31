// controllers/stock-location.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle locaties op die bij het bedrijf van de ingelogde gebruiker horen
exports.getLocations = async (req, res) => {
    const { companyId } = req.user;

    try {
        const locations = await prisma.stockLocation.findMany({
            where: {
                companyId: companyId
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.status(200).json(locations);
    } catch (error) {
        logger.error(`Fout bij ophalen van locaties voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon locaties niet ophalen.' });
    }
};

// Maakt een nieuwe locatie aan voor het bedrijf van de ingelogde gebruiker
exports.createLocation = async (req, res) => {
    const { companyId } = req.user;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'De naam van de locatie is verplicht.' });
    }

    try {
        const newLocation = await prisma.stockLocation.create({
            data: {
                companyId: companyId,
                name,
                description,
            }
        });

        logger.info(`Nieuwe locatie '${name}' aangemaakt voor bedrijf ${companyId}`);
        res.status(201).json(newLocation);
    } catch (error) {
        logger.error(`Fout bij aanmaken van locatie voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon nieuwe locatie niet aanmaken.' });
    }
};

// --- NIEUWE FUNCTIE ---
// Voert een handmatige voorraadcorrectie uit.
exports.correctStock = async (req, res) => {
    const { companyId } = req.user;
    const { materialId, locationId, newQuantity, reason } = req.body;

    if (!materialId || !locationId || newQuantity == null || !reason) {
        return res.status(400).json({ error: 'Niet alle velden voor de correctie zijn ingevuld.' });
    }

    try {
        const quantity = parseFloat(newQuantity);
        if (isNaN(quantity) || quantity < 0) {
            return res.status(400).json({ error: 'Ongeldige hoeveelheid ingevoerd.' });
        }

        // Gebruik 'upsert' om de voorraad bij te werken of een nieuw record aan te maken.
        // Dit is robuust: als een materiaal nog niet op een locatie was geboekt, wordt het record nu aangemaakt.
        await prisma.inventory.upsert({
            where: {
                materialId_locationId: {
                    materialId: materialId,
                    locationId: locationId
                }
            },
            create: {
                materialId: materialId,
                locationId: locationId,
                quantity: quantity
            },
            update: {
                quantity: quantity // We gebruiken 'set' (standaard), niet 'increment'
            }
        });
        
        // Log de correctie voor administratieve doeleinden. In de toekomst kan dit naar een aparte logtabel.
        logger.info(`Voorraadcorrectie door user ${req.user.userId} voor bedrijf ${companyId}. Materiaal: ${materialId}, Locatie: ${locationId}, Nieuwe hoeveelheid: ${quantity}. Reden: ${reason}`);

        res.status(200).json({ message: 'Voorraad succesvol bijgewerkt.' });

    } catch (error) {
        logger.error(`Fout bij voorraadcorrectie voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon voorraad niet corrigeren.' });
    }
};