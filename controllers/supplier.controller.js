// controllers/supplier.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle leveranciers op die bij het bedrijf van de ingelogde gebruiker horen
exports.getSuppliers = async (req, res) => {
    const { companyId } = req.user;

    try {
        const suppliers = await prisma.supplier.findMany({
            where: {
                companyId: companyId
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.status(200).json(suppliers);
    } catch (error) {
        logger.error(`Fout bij ophalen van leveranciers voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon leveranciers niet ophalen.' });
    }
};

// Maakt een nieuwe leverancier aan voor het bedrijf van de ingelogde gebruiker
exports.createSupplier = async (req, res) => {
    const { companyId } = req.user;
    // Haal alle mogelijke velden voor een leverancier uit de request body
    const { name, contactPerson, email, phone, address, postcode, city } = req.body;

    // Een naam is minimaal vereist
    if (!name) {
        return res.status(400).json({ error: 'De naam van de leverancier is verplicht.' });
    }

    try {
        const newSupplier = await prisma.supplier.create({
            data: {
                companyId: companyId, // Koppel aan het juiste bedrijf
                name,
                contactPerson,
                email,
                phone,
                address,
                postcode,
                city,
            }
        });

        logger.info(`Nieuwe leverancier '${name}' aangemaakt voor bedrijf ${companyId}`);
        res.status(201).json(newSupplier);
    } catch (error) {
        logger.error(`Fout bij aanmaken van leverancier voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon nieuwe leverancier niet aanmaken.' });
    }
};