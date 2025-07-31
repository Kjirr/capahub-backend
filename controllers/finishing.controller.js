const prisma = require('../prisma/prisma');

exports.getFinishings = async (req, res) => {
    const { companyId } = req.user;
    try {
        const finishings = await prisma.finishing.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
        res.status(200).json(finishings);
    } catch (error) { res.status(500).json({ error: 'Kon afwerkingen niet ophalen.' }); }
};

exports.createFinishing = async (req, res) => {
    const { companyId } = req.user;
    const { name, costPerItem, setupCost } = req.body;
    if (!name || costPerItem == null || setupCost == null) return res.status(400).json({ error: 'Alle velden zijn verplicht.' });
    try {
        const newFinishing = await prisma.finishing.create({ data: { companyId, name, costPerItem: parseFloat(costPerItem), setupCost: parseFloat(setupCost) } });
        res.status(201).json(newFinishing);
    } catch (error) { res.status(500).json({ error: 'Kon afwerking niet aanmaken.' }); }
};

exports.updateFinishing = async (req, res) => {
    const { companyId } = req.user;
    const { finishingId } = req.params;
    const { name, costPerItem, setupCost } = req.body;
    try {
        const result = await prisma.finishing.updateMany({ where: { id: finishingId, companyId }, data: { name, costPerItem: parseFloat(costPerItem), setupCost: parseFloat(setupCost) } });
        if (result.count === 0) return res.status(404).json({ error: 'Afwerking niet gevonden.' });
        res.status(200).json({ message: 'Afwerking bijgewerkt.' });
    } catch (error) { res.status(500).json({ error: 'Kon afwerking niet bijwerken.' }); }
};

exports.deleteFinishing = async (req, res) => {
    const { companyId } = req.user;
    const { finishingId } = req.params;
    try {
        const result = await prisma.finishing.deleteMany({ where: { id: finishingId, companyId } });
        if (result.count === 0) return res.status(404).json({ error: 'Afwerking niet gevonden.' });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Kon afwerking niet verwijderen.' }); }
};