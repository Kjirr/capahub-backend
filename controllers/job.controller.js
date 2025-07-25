const prisma = require('../prisma/prisma');
const logger = require('../config/logger');

// Functie om een uniek opdrachtnummer te genereren
const generateJobNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `OP-${year}${month}-`;
    const lastJob = await prisma.printJob.findFirst({
        where: { jobNumber: { startsWith: prefix } },
        orderBy: { jobNumber: 'desc' },
    });
    let sequence = 1;
    if (lastJob) {
        sequence = parseInt(lastJob.jobNumber.split('-').pop()) + 1;
    }
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Haalt de opdrachten op die door het bedrijf van de gebruiker zijn geplaatst
exports.getMyJobs = async (req, res) => {
    const { companyId } = req.user;
    try {
        const jobs = await prisma.printJob.findMany({
            where: { companyId: companyId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { quotes: true } } }
        });
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Haalt details van één opdracht op
exports.getJobById = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const job = await prisma.printJob.findUnique({
            where: { id: id },
            include: { 
                company: { select: { id: true, name: true } }, 
                quotes: { include: { company: { select: { id: true, name: true } } } },
                productionSteps: { orderBy: { order: 'asc' } } 
            }
        });
        if (!job) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        if (!job.isPublic && job.companyId !== companyId) {
            return res.status(403).json({ error: 'Geen toegang tot deze opdracht.' });
        }
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Maakt een nieuwe opdracht aan namens het bedrijf
exports.createJob = async (req, res) => {
    const { userId, companyId } = req.user;
    try {
        const { title, description, quantity, material, format, isPublic, deadline, quotingDeadline } = req.body;
        const jobNumber = await generateJobNumber();
        const newJob = await prisma.printJob.create({
            data: {
                jobNumber, title, description, quantity: parseInt(quantity, 10), material, format, isPublic,
                deadline: deadline ? new Date(deadline) : null,
                quotingDeadline: quotingDeadline ? new Date(quotingDeadline) : null,
                companyId: companyId,
                creatorId: userId
            }
        });
        res.status(201).json(newJob);
    } catch (error) {
        res.status(500).json({ error: 'Interne serverfout.' });
    }
};

// Werkt een opdracht bij
exports.updateJob = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        const { title, description, quantity, material, format, isPublic, deadline, quotingDeadline } = req.body;
        const updatedJob = await prisma.printJob.update({
            where: { id: id, companyId: companyId },
            data: {
                title, description, quantity: parseInt(quantity, 10), material, format, isPublic,
                deadline: deadline ? new Date(deadline) : null,
                quotingDeadline: quotingDeadline ? new Date(quotingDeadline) : null
            }
        });
        res.status(200).json(updatedJob);
    } catch (error) {
        res.status(403).json({ error: 'Kon opdracht niet bijwerken.' });
    }
};

// Verwijdert een opdracht
exports.deleteJob = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    try {
        await prisma.printJob.delete({
            where: { id: id, companyId: companyId }
        });
        res.status(200).json({ message: 'Opdracht succesvol verwijderd.' });
    } catch (error) {
        res.status(403).json({ error: 'Kon opdracht niet verwijderen.' });
    }
};

// NIEUW: Wijst een opdracht toe aan de ingelogde gebruiker
exports.assignJobToSelf = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    try {
        const job = await prisma.printJob.findUnique({ where: { id } });
        if (job.assigneeId) {
            return res.status(409).json({ error: 'Deze opdracht is al door iemand anders toegewezen.' });
        }
        const updatedJob = await prisma.printJob.update({
            where: { id: id },
            data: { assigneeId: userId }
        });
        res.status(200).json(updatedJob);
    } catch (error) {
        logger.error(`Fout bij toewijzen opdracht ${id} aan gebruiker ${userId}: ${error.message}`);
        res.status(500).json({ error: 'Kon opdracht niet toewijzen.' });
    }
};