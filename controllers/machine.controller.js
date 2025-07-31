// controllers/machine.controller.js

const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Haalt alle machines op die bij het bedrijf van de gebruiker horen
exports.getMachines = async (req, res) => {
    const { companyId } = req.user;
    try {
        const machines = await prisma.machine.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(machines);
    } catch (error) {
        logger.error(`Fout bij ophalen van machines voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon machines niet ophalen.' });
    }
};

// Maakt een nieuwe machine aan
exports.createMachine = async (req, res) => {
    const { companyId } = req.user;
    const { name, setupTimeMinutes, runSpeedPerHour, costPerHour } = req.body;

    if (!name || setupTimeMinutes == null || runSpeedPerHour == null || costPerHour == null) {
        return res.status(400).json({ error: 'Niet alle verplichte velden zijn ingevuld.' });
    }

    try {
        const newMachine = await prisma.machine.create({
            data: {
                companyId,
                name,
                setupTimeMinutes: parseInt(setupTimeMinutes),
                runSpeedPerHour: parseInt(runSpeedPerHour),
                costPerHour: parseFloat(costPerHour),
            }
        });
        logger.info(`Nieuwe machine '${name}' aangemaakt voor bedrijf ${companyId}`);
        res.status(201).json(newMachine);
    } catch (error) {
        logger.error(`Fout bij aanmaken van machine voor bedrijf ${companyId}: ${error.message}`);
        res.status(500).json({ error: 'Kon nieuwe machine niet aanmaken.' });
    }
};

// Werkt een bestaande machine bij
exports.updateMachine = async (req, res) => {
    const { companyId } = req.user;
    const { machineId } = req.params;
    const { name, setupTimeMinutes, runSpeedPerHour, costPerHour } = req.body;

    try {
        const updatedMachine = await prisma.machine.updateMany({
            where: {
                id: machineId,
                companyId: companyId // Veiligheidscheck: update alleen als het van dit bedrijf is
            },
            data: {
                name,
                setupTimeMinutes: parseInt(setupTimeMinutes),
                runSpeedPerHour: parseInt(runSpeedPerHour),
                costPerHour: parseFloat(costPerHour),
            }
        });

        if (updatedMachine.count === 0) {
            return res.status(404).json({ error: 'Machine niet gevonden of u heeft geen rechten om deze te bewerken.' });
        }

        logger.info(`Machine ${machineId} bijgewerkt voor bedrijf ${companyId}`);
        res.status(200).json({ message: 'Machine succesvol bijgewerkt.' });
    } catch (error) {
        logger.error(`Fout bij bijwerken van machine ${machineId}: ${error.message}`);
        res.status(500).json({ error: 'Kon machine niet bijwerken.' });
    }
};

// Verwijder een machine
exports.deleteMachine = async (req, res) => {
    const { companyId } = req.user;
    const { machineId } = req.params;

    try {
        const deletedMachine = await prisma.machine.deleteMany({
            where: {
                id: machineId,
                companyId: companyId // Veiligheidscheck: verwijder alleen als het van dit bedrijf is
            }
        });

        if (deletedMachine.count === 0) {
            return res.status(404).json({ error: 'Machine niet gevonden of u heeft geen rechten om deze te verwijderen.' });
        }

        logger.info(`Machine ${machineId} verwijderd voor bedrijf ${companyId}`);
        res.status(204).send(); // 204 No Content is een standaard response voor een succesvolle delete
    } catch (error) {
        logger.error(`Fout bij verwijderen van machine ${machineId}: ${error.message}`);
        res.status(500).json({ error: 'Kon machine niet verwijderen.' });
    }
};