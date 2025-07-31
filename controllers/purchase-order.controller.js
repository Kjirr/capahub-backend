// controllers/purchase-order.controller.js

const { Prisma, PurchaseOrderStatus } = require('@prisma/client');
const prisma = require('../prisma/prisma');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');

// Nodemailer configuratie...
let transporter;
if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: parseInt(process.env.SMTP_PORT || "587") === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    logger.info("SMTP transporter succesvol geconfigureerd.");
} else {
    logger.warn("SMTP configuratie niet gevonden in .env. E-mails worden naar de console gelogd.");
}

exports.getPurchaseOrders = async (req, res) => { /* ... ongewijzigde code ... */ const { companyId } = req.user; try { const purchaseOrders = await prisma.purchaseOrder.findMany({ where: { companyId: companyId }, include: { supplier: { select: { name: true } }, items: { select: { id: true } } }, orderBy: { orderDate: 'desc' } }); res.status(200).json(purchaseOrders); } catch (error) { logger.error(`Fout bij ophalen inkooporders voor bedrijf ${companyId}: ${error.message}`); res.status(500).json({ error: 'Kon inkooporders niet ophalen.' }); } };

// --- AANGEPASTE FUNCTIE ---
exports.getPurchaseOrderById = async (req, res) => {
    const { companyId } = req.user;
    const { poId } = req.params;
    try {
        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id: poId, companyId: companyId },
            include: {
                supplier: true,
                items: {
                    include: {
                        // De 'select' is hier aangepast
                        material: { 
                            select: { 
                                name: true 
                                // 'stockUnit' is hier verwijderd
                            } 
                        }
                    }
                }
            }
        });
        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Inkooporder niet gevonden.' });
        }
        res.status(200).json(purchaseOrder);
    } catch (error) {
        logger.error(`Fout bij ophalen van inkooporder ${poId}: ${error.message}`);
        res.status(500).json({ error: 'Kon inkooporder details niet ophalen.' });
    }
};

exports.createPurchaseOrder = async (req, res) => { /* ... ongewijzigde code ... */ const { companyId } = req.user; const { supplierId, notes, items } = req.body; if (!supplierId || !items || !Array.isArray(items) || items.length === 0) { return res.status(400).json({ error: 'Leverancier en minimaal één orderregel zijn verplicht.' }); } try { const newPurchaseOrder = await prisma.$transaction(async (tx) => { const po = await tx.purchaseOrder.create({ data: { companyId: companyId, supplierId: supplierId, notes: notes, poNumber: `PO-${Date.now()}` } }); const itemData = items.map(item => ({ purchaseOrderId: po.id, materialId: item.materialId, quantity: parseFloat(item.quantity), purchasePrice: parseFloat(item.purchasePrice) })); await tx.purchaseOrderItem.createMany({ data: itemData }); return po; }); logger.info(`Nieuwe inkooporder ${newPurchaseOrder.poNumber} aangemaakt voor bedrijf ${companyId}`); res.status(201).json(newPurchaseOrder); } catch (error) { logger.error(`Fout bij aanmaken van inkooporder voor bedrijf ${companyId}: ${error.message}`); res.status(500).json({ error: 'Kon nieuwe inkooporder niet aanmaken.' }); } };
exports.updatePurchaseOrderStatus = async (req, res) => { /* ... ongewijzigde code ... */ const { companyId } = req.user; const { poId } = req.params; const { status, locationId } = req.body; if (!status || !Object.values(PurchaseOrderStatus).includes(status)) { return res.status(400).json({ error: 'Ongeldige status meegegeven.' }); } try { const purchaseOrder = await prisma.purchaseOrder.findFirst({ where: { id: poId, companyId }, include: { items: true }, }); if (!purchaseOrder) { return res.status(404).json({ error: 'Inkooporder niet gevonden.' }); } if (status === PurchaseOrderStatus.RECEIVED) { if (!locationId) { return res.status(400).json({ error: 'Selecteer een magazijnlocatie om de order in te boeken.' }); } const inventoryUpdates = purchaseOrder.items.map(item => prisma.inventory.upsert({ where: { materialId_locationId: { materialId: item.materialId, locationId: locationId } }, create: { materialId: item.materialId, locationId: locationId, quantity: item.quantity }, update: { quantity: { increment: item.quantity } } })); const updatePoStatus = prisma.purchaseOrder.update({ where: { id: poId }, data: { status: PurchaseOrderStatus.RECEIVED } }); await prisma.$transaction([updatePoStatus, ...inventoryUpdates]); logger.info(`Inkooporder ${poId} ingeboekt op locatie ${locationId} en voorraad bijgewerkt.`); res.status(200).json({ message: 'Order ingeboekt en voorraad is bijgewerkt.' }); } else { await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: status } }); logger.info(`Status van inkooporder ${poId} bijgewerkt naar ${status}.`); res.status(200).json({ message: `Status succesvol bijgewerkt naar ${status}.` }); } } catch (error) { logger.error(`Fout bij updaten status van PO ${poId}: ${error.message}`); res.status(500).json({ error: 'Kon de status niet bijwerken.' }); } };

// --- AANGEPASTE FUNCTIE ---
exports.sendPurchaseOrder = async (req, res) => {
    const { companyId } = req.user;
    const { poId } = req.params;
    try {
        const po = await prisma.purchaseOrder.findFirst({
            where: { id: poId, companyId: companyId },
            include: {
                supplier: true,
                company: { select: { name: true } },
                items: { include: { material: true } }
            }
        });
        if (!po) { return res.status(404).json({ error: 'Inkooporder niet gevonden.' }); }
        if (po.status !== PurchaseOrderStatus.DRAFT) { return res.status(400).json({ error: 'Deze inkooporder is al besteld.' }); }
        if (!po.supplier.email) { return res.status(400).json({ error: 'Deze leverancier heeft geen e-mailadres.' }); }
        
        // De e-mail template is hier aangepast
        const itemsHtml = po.items.map(item => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.material.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€${item.purchasePrice.toFixed(2)}</td>
            </tr>
        `).join('');

        const emailHtml = `<h1>Inkooporder ${po.poNumber} van ${po.company.name}</h1><p>Beste ${po.supplier.name},</p><p>Hierbij onze bestelling:</p><table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Materiaal</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Aantal</th><th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Prijs p/st</th></tr></thead><tbody>${itemsHtml}</tbody></table><p>Met vriendelijke groet,</p><p>${po.company.name}</p>`;
        
        if (transporter) {
            await transporter.sendMail({ from: process.env.SMTP_USER, to: po.supplier.email, subject: `Nieuwe Inkooporder: ${po.poNumber} van ${po.company.name}`, html: emailHtml });
            logger.info(`Inkooporder ${po.poNumber} daadwerkelijk verstuurd naar ${po.supplier.email}`);
        } else {
            logger.info(`--- DUMMY EMAIL ---`);
            logger.info(`AAN: ${po.supplier.email}`);
            logger.info(`ONDERWERP: Nieuwe Inkooporder: ${po.poNumber} van ${po.company.name}`);
            logger.info(`BODY:\n${emailHtml}`);
            logger.info(`--- EINDE DUMMY EMAIL ---`);
        }
        await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: PurchaseOrderStatus.ORDERED } });
        res.status(200).json({ message: 'Inkooporder succesvol verstuurd!' });
    } catch (error) {
        logger.error(`Fout bij versturen van PO ${poId}: ${error.message}`);
        res.status(500).json({ error: 'Kon inkooporder niet versturen.' });
    }
};