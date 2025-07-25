const prisma = require('../prisma/prisma');

exports.createJob = async (req, res) => {
    try {
        const { title, description, format, quantity, material, deadline, isPublic } = req.body;
        if (!title || !description || !quantity || !material) return res.status(400).json({ error: 'Titel, omschrijving, oplage en materiaal zijn verplicht.' });
        const newJob = await prisma.printJob.create({
            data: { title, description, quantity: parseInt(quantity, 10), material, format, isPublic, deadline: deadline ? new Date(deadline) : null, customerId: req.user.userId }
        });
        res.status(201).json({ message: 'Opdracht succesvol geplaatst!', job: newJob });
    } catch (error) { res.status(500).json({ error: 'Kon de opdracht niet plaatsen.' }); }
};

exports.getMarketplaceJobs = async (req, res) => {
    try {
        const jobs = await prisma.printJob.findMany({
            where: { status: 'quoting', isPublic: true, customerId: { not: req.user.userId }, deadline: { gte: new Date() } },
            include: { customer: { select: { bedrijfsnaam: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(jobs);
    } catch (error) { res.status(500).json({ error: 'Kon marktplaats opdrachten niet ophalen.' }); }
};

exports.getMyJobs = async (req, res) => {
    try {
        const myJobs = await prisma.printJob.findMany({
            where: { customerId: req.user.userId, status: { not: 'archived' } },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { quotes: true } } },
        });
        res.status(200).json(myJobs);
    } catch (error) { res.status(500).json({ error: 'Kon mijn opdrachten niet ophalen.' }); }
};

exports.getJobById = async (req, res) => {
    try {
        const job = await prisma.printJob.findUnique({
            where: { id: req.params.id },
            include: { 
                customer: { select: { id: true, bedrijfsnaam: true } }, 
                quotes: { include: { provider: { select: { id: true, bedrijfsnaam: true } } }, orderBy: { createdAt: 'asc' } },
                productionSteps: { orderBy: { order: 'asc' } } 
            }
        });
        if (!job) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        res.status(200).json(job);
    } catch (error) { res.status(500).json({ error: 'Kon opdrachtdetails niet ophalen.' }); }
};

exports.updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { title, description, format, quantity, material, deadline, isPublic } = req.body;
        await prisma.printJob.update({
            where: { id: jobId, customerId: req.user.userId },
            data: { title, description, format, quantity: parseInt(quantity, 10), material, deadline: deadline ? new Date(deadline) : null, isPublic }
        });
        res.status(200).json({ message: 'Opdracht succesvol bijgewerkt.' });
    } catch (error) { res.status(403).json({ error: 'Kon opdracht niet bijwerken.' }); }
};

exports.archiveJob = async (req, res) => {
    try {
        await prisma.printJob.update({
            where: { id: req.params.jobId, customerId: req.user.userId },
            data: { status: 'archived' }
        });
        res.status(200).json({ message: 'Opdracht succesvol gearchiveerd.' });
    } catch (error) { res.status(403).json({ error: 'Kon opdracht niet archiveren.' }); }
};

exports.updateJobStatus = async (req, res) => {
    try {
        const { status: newStatus } = req.body;
        if (!newStatus) return res.status(400).json({ error: 'Nieuwe status is verplicht.' });
        await prisma.printJob.update({
            where: { id: req.params.jobId, winnerProviderId: req.user.userId },
            data: { status: newStatus }
        });
        res.status(200).json({ message: `Status succesvol bijgewerkt naar: ${newStatus}` });
    } catch (error) { res.status(403).json({ error: 'Kon status niet bijwerken.' }); }
};