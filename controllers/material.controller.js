// controllers/material.controller.js

const { Prisma } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle materialen op, inclusief de gedetailleerde voorraad per locatie
exports.getMaterials = async (req, res) => {
    const { companyId } = req.user;
    try {
        const materials = await prisma.material.findMany({
            where: { companyId: companyId },
            include: {
                inventoryItems: {
                    select: {
                        quantity: true,
                        location: { select: { name: true } }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(materials);
    } catch (error) {
        logger.error(`Fout bij ophalen van materialen voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon materialen niet ophalen.' });
    }
};

// Maakt een nieuw materiaal aan (nu inclusief eenheid en dikte)
exports.createMaterial = async (req, res) => {
    const { companyId } = req.user;
    const { 
        name, type, unit, thickness, pricingModel, price, 
        sheetWidth_mm, sheetHeight_mm, rollWidth_mm 
    } = req.body;

    // Basisvalidatie
    if (!name || !type || !unit || !pricingModel || !price) {
        return res.status(400).json({ error: 'Niet alle verplichte velden zijn ingevuld.' });
    }

    try {
        const newMaterial = await prisma.material.create({
            data: {
                companyId: companyId,
                name,
                type,
                unit,
                thickness, // NIEUW
                pricingModel,
                price: parseFloat(price),
                sheetWidth_mm: sheetWidth_mm ? parseInt(sheetWidth_mm) : null,
                sheetHeight_mm: sheetHeight_mm ? parseInt(sheetHeight_mm) : null,
                rollWidth_mm: rollWidth_mm ? parseInt(rollWidth_mm) : null,
            }
        });

        logger.info(`Nieuw materiaal '${name}' aangemaakt voor bedrijf ${companyId}`);
        res.status(201).json(newMaterial);
    } catch (error) {
        logger.error(`Fout bij aanmaken van materiaal voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon nieuw materiaal niet aanmaken.' });
    }
};