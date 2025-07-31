// controllers/calculation.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');
const { CalculationItemType } = require('@prisma/client');

/**
 * Berekent de meest simpele impositie: hoeveel kleine rechthoeken passen in een grote.
 * Houdt geen rekening met snijmarges of complexe vormen, maar is de eerste cruciale stap.
 */
const calculateItemsPerSheet = (sheetW, sheetH, itemW, itemH) => {
    if (!sheetW || !sheetH || !itemW || !itemH) return 1; // Fallback

    const itemsNormal = Math.floor(sheetW / itemW) * Math.floor(sheetH / itemH);
    // Roteer het item 90 graden en kijk of er meer passen
    const itemsRotated = Math.floor(sheetW / itemH) * Math.floor(sheetH / itemW);

    return Math.max(itemsNormal, itemsRotated);
};


/**
 * De kern van de calculatie-engine.
 */
exports.runCalculation = async (req, res) => {
    const { companyId } = req.user;
    const {
        materialId,
        quantity,
        machineId,
        finishingIds,
        marginPercentage,
        // --- NIEUWE INPUTS VOOR IMPOSITIE ---
        productWidth_mm,
        productHeight_mm
    } = req.body;

    if (!materialId || !quantity || !machineId || !marginPercentage || !productWidth_mm || !productHeight_mm) {
        return res.status(400).json({ error: 'Niet alle calculatie-informatie (incl. productformaat) is aanwezig.' });
    }

    try {
        const [material, machine, finishings, laborRates] = await Promise.all([
            prisma.material.findFirst({ where: { id: materialId, companyId } }),
            prisma.machine.findFirst({ where: { id: machineId, companyId } }),
            prisma.finishing.findMany({ where: { id: { in: finishingIds || [] }, companyId } }),
            prisma.laborRate.findMany({ where: { companyId } })
        ]);

        if (!material || !machine) {
            return res.status(404).json({ error: 'Geselecteerd materiaal of machine niet gevonden.' });
        }

        const operatorRate = laborRates.find(r => r.roleName.toLowerCase().includes('operator'))?.costPerHour || 50;

        const calculationItems = [];
        let totalCost = 0;

        // --- STAP 2: DE SLIMME BEREKENING ---

        // 2a. Impositie & Materiaalkosten
        const itemsPerSheet = calculateItemsPerSheet(
            material.sheetWidth_mm, 
            material.sheetHeight_mm, 
            productWidth_mm, 
            productHeight_mm
        );
        
        if (itemsPerSheet === 0) {
            return res.status(400).json({ error: 'Productformaat is groter dan het materiaalformaat.' });
        }

        const sheetsNeededRaw = Math.ceil(quantity / itemsPerSheet);
        const sheetsWithWaste = Math.ceil(sheetsNeededRaw * 1.10); // 10% inschiet/afval

        const materialCost = sheetsWithWaste * material.price;
        calculationItems.push({
            type: CalculationItemType.MATERIAL,
            description: `${sheetsWithWaste} vellen ${material.name} (á ${itemsPerSheet} st/vel)`,
            quantity: sheetsWithWaste,
            unitCost: material.price,
            totalCost: materialCost
        });
        totalCost += materialCost;

        // 2b. Machine- & Arbeidskosten (nu gebaseerd op aantal vellen)
        const setupTimeHours = machine.setupTimeMinutes / 60;
        const runTimeHours = sheetsWithWaste / machine.runSpeedPerHour; // Tijd is afhankelijk van aantal vellen
        const totalMachineHours = setupTimeHours + runTimeHours;

        const machineCost = totalMachineHours * machine.costPerHour;
        calculationItems.push({
            type: CalculationItemType.MACHINE,
            description: `Machine: ${machine.name}`,
            quantity: totalMachineHours,
            unitCost: machine.costPerHour,
            totalCost: machineCost
        });
        totalCost += machineCost;

        const laborCost = totalMachineHours * operatorRate;
        calculationItems.push({
            type: CalculationItemType.LABOR,
            description: `Arbeid: Operator`,
            quantity: totalMachineHours,
            unitCost: operatorRate,
            totalCost: laborCost
        });
        totalCost += laborCost;
        
        // 2c. Afwerkingskosten (gebaseerd op eindproduct-aantal)
        for (const finishing of finishings) {
            const finishingCost = finishing.setupCost + (finishing.costPerItem * quantity);
            calculationItems.push({
                type: CalculationItemType.FINISHING,
                description: `Afwerking: ${finishing.name}`,
                quantity: quantity,
                unitCost: finishing.costPerItem,
                totalCost: finishingCost
            });
            totalCost += finishingCost;
        }

        // --- Stap 3 & 4 blijven hetzelfde ---
        const marginAmount = totalCost * (parseFloat(marginPercentage) / 100);
        const finalPrice = totalCost + marginAmount;

        const result = {
            totalCost: parseFloat(totalCost.toFixed(2)),
            marginPercentage: parseFloat(marginPercentage),
            finalPrice: parseFloat(finalPrice.toFixed(2)),
            items: calculationItems.map(item => ({...item, quantity: parseFloat(item.quantity.toFixed(2)), unitCost: parseFloat(item.unitCost.toFixed(2)), totalCost: parseFloat(item.totalCost.toFixed(2))}))
        };
        
        res.status(200).json(result);

    } catch (error) {
        logger.error(`Fout bij uitvoeren van calculatie voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon de calculatie niet uitvoeren.' });
    }
};