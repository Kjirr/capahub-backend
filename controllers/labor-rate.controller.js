const prisma = require('../prisma/prisma');

exports.getLaborRates = async (req, res) => {
    const { companyId } = req.user;
    try {
        const rates = await prisma.laborRate.findMany({ where: { companyId }, orderBy: { roleName: 'asc' } });
        res.status(200).json(rates);
    } catch (error) { res.status(500).json({ error: 'Kon arbeidskosten niet ophalen.' }); }
};

exports.createLaborRate = async (req, res) => {
    const { companyId } = req.user;
    const { roleName, costPerHour } = req.body;
    if (!roleName || costPerHour == null) return res.status(400).json({ error: 'Rolnaam en kosten per uur zijn verplicht.' });
    try {
        const newRate = await prisma.laborRate.create({ data: { companyId, roleName, costPerHour: parseFloat(costPerHour) } });
        res.status(201).json(newRate);
    } catch (error) { res.status(500).json({ error: 'Kon arbeidskosten niet aanmaken.' }); }
};

exports.updateLaborRate = async (req, res) => {
    const { companyId } = req.user;
    const { rateId } = req.params;
    const { roleName, costPerHour } = req.body;
    try {
        const result = await prisma.laborRate.updateMany({ where: { id: rateId, companyId }, data: { roleName, costPerHour: parseFloat(costPerHour) } });
        if (result.count === 0) return res.status(404).json({ error: 'Tarief niet gevonden.' });
        res.status(200).json({ message: 'Arbeidskosten bijgewerkt.' });
    } catch (error) { res.status(500).json({ error: 'Kon arbeidskosten niet bijwerken.' }); }
};

exports.deleteLaborRate = async (req, res) => {
    const { companyId } = req.user;
    const { rateId } = req.params;
    try {
        const result = await prisma.laborRate.deleteMany({ where: { id: rateId, companyId } });
        if (result.count === 0) return res.status(404).json({ error: 'Tarief niet gevonden.' });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Kon arbeidskosten niet verwijderen.' }); }
};