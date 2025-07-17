
// FINALE VERSIE - STAP 12.2 (ALLE ROUTES COMPLEET EN GECORRIGEERD)

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();


// --- Configuratie ---
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3001;
const ADMIN_EMAIL = 'admin@printcap.com';

// --- Firebase Initialisatie ---
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("Fout bij het laden van serviceAccountKey.json.", error);
    process.exit(1);
}

const db = admin.firestore();
const app = express();

// --- E-MAIL CONFIGURATIE ---
let transporter;
async function setupEmail() {
    let testAccount = await nodemailer.createTestAccount();
    console.log('--- E-mail Test Account (voor ontwikkeling) ---');
    console.log(`User: ${testAccount.user}`);
    console.log(`Pass: ${testAccount.pass}`);
    console.log('--------------------------------------------');
    transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
}
setupEmail().catch(console.error);

async function sendEmail({ to, subject, html }) {
    if (!transporter) return;
    try {
        let info = await transporter.sendMail({
            from: '"PrintCap Platform" <noreply@printcap.com>',
            to,
            subject,
            html,
        });
        console.log("Email Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Fout bij versturen e-mail:", error);
    }
}


// --- Middleware & Helpers ---
app.use(cors()); 
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.originalUrl}`);
    next();
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Geen token, toegang geweigerd.' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token is niet geldig.' });
        req.user = user;
        next();
    });
};
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Toegang geweigerd. Adminrechten vereist.' });
    next();
};
async function deleteCollection(collectionRef, batchSize) {
    const query = collectionRef.orderBy('__name__').limit(batchSize);
    let snapshot = await query.get();
    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        snapshot = await query.get();
    }
}

// --- API Routes ---

// Authenticatie Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { bedrijfsnaam, email, password, kvk } = req.body;
        if (!bedrijfsnaam || !email || !password || !kvk) return res.status(400).json({ error: 'Basisvelden zijn verplicht.' });
        const userCheck = await db.collection('users').where('email', '==', email.toLowerCase()).get();
        if (!userCheck.empty) return res.status(409).json({ error: 'Een account met dit e-mailadres bestaat al.' });
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const newUser = {
            bedrijfsnaam, email: email.toLowerCase(), passwordHash, kvk,
            status: 'pending_email_verification', role: 'provider', emailVerified: false,
            emailVerificationToken, createdAt: new Date().toISOString(),
            capabilities: [], searchableMaterials: [], averageRating: 0, reviewCount: 0
        };
        await db.collection('users').add(newUser);
        const verificationUrl = `http://localhost:3000/#/verify/${emailVerificationToken}`;
        sendEmail({ to: email, subject: 'Verifieer uw e-mailadres voor PrintCap', html: `<p>Welkom! Klik hier om uw e-mailadres te verifiëren:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>` });
        res.status(201).json({ message: 'Registratie succesvol! Controleer uw e-mail voor de verificatielink.' });
    } catch (error) { res.status(500).json({ error: 'Fout bij registreren.' }); }
});

app.get('/api/auth/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const snapshot = await db.collection('users').where('emailVerificationToken', '==', token).limit(1).get();
        if (snapshot.empty) return res.status(404).json({ error: 'Verificatie token is ongeldig of verlopen.' });
        await snapshot.docs[0].ref.update({ status: 'pending_approval', emailVerified: true, emailVerificationToken: null });
        res.status(200).json({ message: 'E-mailadres succesvol geverifieerd.' });
    } catch (error) { res.status(500).json({ error: 'Fout bij het verifiëren van het e-mailadres.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'E-mail en wachtwoord zijn verplicht.' });
        const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ error: 'Ongeldige e-mail of wachtwoord.' });
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        if (!(await bcrypt.compare(password, userData.passwordHash))) return res.status(401).json({ error: 'Ongeldige e-mail of wachtwoord.' });
        if (userData.status !== 'active') return res.status(403).json({ error: 'Uw account is niet actief of nog niet goedgekeurd.' });
        const userRole = userData.email === ADMIN_EMAIL ? 'admin' : userData.role;
        const payload = { userId: userDoc.id, email: userData.email, bedrijfsnaam: userData.bedrijfsnaam, role: userRole };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Succesvol ingelogd!', token, user: payload });
    } catch (error) { res.status(500).json({ error: 'Fout bij inloggen.' }); }
});

// Profiel Routes
app.get('/api/users/:userId', async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.params.userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        const userData = userDoc.data();
        const reviewsSnapshot = await db.collection('users').doc(req.params.userId).collection('reviews').orderBy('createdAt', 'desc').get();
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        const publicProfile = { bedrijfsnaam: userData.bedrijfsnaam, plaats: userData.plaats, capabilities: userData.capabilities || [], averageRating: userData.averageRating || 0, reviewCount: userData.reviewCount || 0, reviews: reviews };
        res.status(200).json(publicProfile);
    } catch (error) { res.status(500).json({ error: 'Kon openbaar profiel niet ophalen.' }); }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        const { passwordHash, ...userData } = userDoc.data();
        res.status(200).json(userData);
    } catch (error) { res.status(500).json({ error: 'Kon profiel niet ophalen.' }); }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const profileData = req.body;
        delete profileData.email; delete profileData.role; delete profileData.status; delete profileData.capabilities;
        await db.collection('users').doc(userId).update(profileData);
        res.status(200).json({ message: 'Profiel succesvol bijgewerkt.' });
    } catch (error) { res.status(500).json({ error: 'Kon profiel niet bijwerken.' }); }
});

app.put('/api/profile/capabilities', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const { capabilities } = req.body;
        if (!Array.isArray(capabilities)) return res.status(400).json({ error: 'Capabilities moet een array zijn.' });
        const searchableMaterials = new Set();
        capabilities.forEach(cap => {
            if (cap.materials) { cap.materials.split(',').map(m => m.trim().toLowerCase()).filter(m => m).forEach(m => searchableMaterials.add(m)); }
        });
        await db.collection('users').doc(userId).update({ capabilities, searchableMaterials: Array.from(searchableMaterials) });
        res.status(200).json({ message: 'Capaciteiten succesvol bijgewerkt.' });
    } catch (error) { res.status(500).json({ error: 'Kon capaciteiten niet bijwerken.' }); }
});

// Opdrachten (Jobs), Offertes (Quotes) & Marktplaats Routes
app.post('/api/jobs', authMiddleware, async (req, res) => {
    try {
        const { userId, bedrijfsnaam, email } = req.user;
        const { title, description, format, quantity, material, deadline, location, isPublic } = req.body;
        if (!title || !description || !quantity || !material) return res.status(400).json({ error: 'Vul alle vereiste velden in.' });
        const newJob = { customerId: userId, customerName: bedrijfsnaam, customerEmail: email, title, description, specifications: { format: format || 'N.v.t.', quantity, material, location: location || null }, deadline: deadline || null, status: 'quoting', createdAt: new Date().toISOString(), winnerProviderId: null, isPublic: isPublic || false };
        const jobRef = await db.collection('print_jobs').add(newJob);
        let query = db.collection('users').where('status', '==', 'active').where('searchableMaterials', 'array-contains', material.trim().toLowerCase());
        if (location && location.trim() !== '') { query = query.where('plaats', '==', location.trim()); }
        const providersSnapshot = await query.get();
        for (const providerDoc of providersSnapshot.docs) {
            const provider = providerDoc.data();
            if (providerDoc.id === userId) continue;
            await db.collection('quote_requests').add({ jobId: jobRef.id, jobTitle: title, providerId: providerDoc.id, createdAt: new Date().toISOString() });
            sendEmail({ to: provider.email, subject: `Nieuwe offerteaanvraag: ${title}`, html: `<p>Beste ${provider.bedrijfsnaam},</p><p>Er is een nieuwe offerteaanvraag die mogelijk interessant is voor u: "<strong>${title}</strong>".</p>` });
        }
        res.status(201).json({ message: 'Opdracht succesvol geplaatst!' });
    } catch (error) { res.status(500).json({ error: 'Kon de opdracht niet plaatsen.' }); }
});

app.get('/api/jobs/marketplace', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const snapshot = await db.collection('print_jobs').where('status', '==', 'quoting').where('isPublic', '==', true).get();
        const allPublicJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const jobsForOthers = allPublicJobs.filter(job => job.customerId !== userId);
        res.status(200).json(jobsForOthers);
    } catch (error) { res.status(500).json({ error: 'Kon marktplaats opdrachten niet ophalen.' }); }
});

app.get('/api/jobs/my-jobs', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const snapshot = await db.collection('print_jobs').where('customerId', '==', userId).orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { res.status(500).json({ error: 'Kon mijn opdrachten niet ophalen.' }); }
});

app.get('/api/jobs/production', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const snapshot = await db.collection('print_jobs').where('winnerProviderId', '==', userId).orderBy('createdAt', 'desc').get();
        res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { res.status(500).json({ error: 'Kon productie-opdrachten niet ophalen.' }); }
});

app.get('/api/jobs/:id', authMiddleware, async (req, res) => {
    try {
        const jobDoc = await db.collection('print_jobs').doc(req.params.id).get();
        if(!jobDoc.exists) return res.status(404).json({ error: "Opdracht niet gevonden." });
        res.status(200).json({ id: jobDoc.id, ...jobDoc.data() });
    } catch (error) { res.status(500).json({ error: 'Kon opdrachtdetails niet ophalen.' }); }
});

app.get('/api/jobs/:jobId/quotes', authMiddleware, async (req, res) => {
    try {
        const snapshot = await db.collection('print_jobs').doc(req.params.jobId).collection('quotes').orderBy('createdAt', 'asc').get();
        res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { res.status(500).json({ error: 'Kon offertes niet ophalen.' }); }
});

app.get('/api/quote-requests', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const snapshot = await db.collection('quote_requests').where('providerId', '==', userId).where('status', '==', 'pending').get();
        res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch(error) { res.status(500).json({ error: 'Kon offerteverzoeken niet ophalen.' }); }
});

app.get('/api/quotes/my-submitted', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const snapshot = await db.collectionGroup('quotes').where('providerId', '==', userId).orderBy('createdAt', 'desc').get();
        const quotes = [];
        for (const doc of snapshot.docs) {
            const quoteData = doc.data();
            const jobRef = doc.ref.parent.parent;
            const jobDoc = await jobRef.get();
            const jobData = jobDoc.data();
            quotes.push({ id: doc.id, ...quoteData, jobId: jobRef.id, jobTitle: jobData.title });
        }
        res.status(200).json(quotes);
    } catch(error) { res.status(500).json({ error: 'Kon ingediende offertes niet ophalen.' }); }
});

app.post('/api/jobs/:jobId/quotes', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId, bedrijfsnaam } = req.user;
        const { price, deliveryTime, comments } = req.body;
        if (!price || !deliveryTime) return res.status(400).json({ error: 'Prijs en levertijd zijn verplicht.' });
        const jobDoc = await db.collection('print_jobs').doc(jobId).get();
        if (!jobDoc.exists) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        const jobData = jobDoc.data();
        const newQuote = { providerId: userId, providerName: bedrijfsnaam, price, deliveryTime, comments: comments || '', status: 'offered', createdAt: new Date().toISOString() };
        await jobDoc.ref.collection('quotes').add(newQuote);
        const requestQuery = await db.collection('quote_requests').where('jobId', '==', jobId).where('providerId', '==', userId).limit(1).get();
        if (!requestQuery.empty) await requestQuery.docs[0].ref.update({ status: 'submitted' });
        sendEmail({ to: jobData.customerEmail, subject: `Nieuwe offerte ontvangen voor: ${jobData.title}`, html: `<p>Beste ${jobData.customerName},</p><p>U heeft een nieuwe offerte ontvangen van <strong>${bedrijfsnaam}</strong>.</p>` });
        res.status(201).json({ message: 'Offerte succesvol ingediend.' });
    } catch (error) { res.status(500).json({ error: 'Kon offerte niet indienen.' }); }
});

app.post('/api/jobs/:jobId/quotes/:quoteId/accept', authMiddleware, async (req, res) => {
    const { jobId, quoteId } = req.params;
    const { userId } = req.user;
    const jobRef = db.collection('print_jobs').doc(jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists || jobDoc.data().customerId !== userId) return res.status(403).json({ error: 'Geen toegang.' });
    if (jobDoc.data().status !== 'quoting') return res.status(400).json({ error: 'Opdracht niet open voor offertes.' });
    try {
        const batch = db.batch();
        const acceptedQuoteRef = jobRef.collection('quotes').doc(quoteId);
        const acceptedQuoteDoc = await acceptedQuoteRef.get();
        const winnerProviderId = acceptedQuoteDoc.data().providerId;
        batch.update(jobRef, { status: 'in_production', winnerProviderId: winnerProviderId });
        batch.update(acceptedQuoteRef, { status: 'accepted' });
        const allQuotesSnapshot = await jobRef.collection('quotes').get();
        allQuotesSnapshot.docs.forEach(doc => { if (doc.id !== quoteId) batch.update(doc.ref, { status: 'rejected' }); });
        await batch.commit();
        for (const doc of allQuotesSnapshot.docs) {
            const quoteData = doc.data();
            const providerQuery = await db.collection('users').where('bedrijfsnaam', '==', quoteData.providerName).limit(1).get();
            if (providerQuery.empty) continue;
            const providerEmail = providerQuery.docs[0].data().email;
            if (doc.id === quoteId) {
                sendEmail({ to: providerEmail, subject: `Gefeliciteerd! Uw offerte voor "${jobDoc.data().title}" is geaccepteerd!`, html: `<p>Beste ${quoteData.providerName},</p><p>Gefeliciteerd! Uw offerte voor "<strong>${jobDoc.data().title}</strong>" is geaccepteerd.</p>` });
            } else {
                sendEmail({ to: providerEmail, subject: `Update over uw offerte voor "${jobDoc.data().title}"`, html: `<p>Beste ${quoteData.providerName},</p><p>De klant heeft een andere keuze gemaakt voor de opdracht "<strong>${jobDoc.data().title}</strong>".</p>` });
            }
        }
        res.status(200).json({ message: 'Offerte succesvol geaccepteerd!' });
    } catch (error) { res.status(500).json({ error: 'Kon offerte niet accepteren.' }); }
});

app.put('/api/jobs/:jobId/status', authMiddleware, async (req, res) => {
    const { jobId } = req.params;
    const { userId } = req.user;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Nieuwe status is verplicht.' });
    try {
        const jobRef = db.collection('print_jobs').doc(jobId);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) return res.status(404).json({ error: 'Opdracht niet gevonden.' });
        if (jobDoc.data().winnerProviderId !== userId) return res.status(403).json({ error: 'Alleen de winnende drukkerij kan de status aanpassen.' });
        await jobRef.update({ status: status });
        res.status(200).json({ message: `Status bijgewerkt naar: ${status}` });
    } catch (error) { res.status(500).json({ error: 'Kon de status niet bijwerken.' }); }
});

app.post('/api/jobs/:jobId/reviews', authMiddleware, async (req, res) => {
    const { jobId } = req.params;
    const { userId } = req.user;
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Een score tussen 1 en 5 is verplicht." });
    try {
        const jobRef = db.collection('print_jobs').doc(jobId);
        const jobDoc = await jobRef.get();
        if (!jobDoc.exists) return res.status(404).json({ error: "Opdracht niet gevonden." });
        const jobData = jobDoc.data();
        if (jobData.customerId !== userId) return res.status(403).json({ error: "Alleen de opdrachtgever kan een review achterlaten." });
        if (jobData.status !== 'completed') return res.status(400).json({ error: "Reviews kunnen alleen voor voltooide opdrachten." });
        if (jobData.reviewSubmitted) return res.status(400).json({ error: "Er is al een review ingediend." });
        const providerId = jobData.winnerProviderId;
        const providerRef = db.collection('users').doc(providerId);
        await providerRef.collection('reviews').add({ jobId, rating, comment: comment || "", customerName: jobData.customerName, createdAt: new Date().toISOString() });
        const providerDoc = await providerRef.get();
        const providerData = providerDoc.data();
        const oldRatingTotal = (providerData.averageRating || 0) * (providerData.reviewCount || 0);
        const newReviewCount = (providerData.reviewCount || 0) + 1;
        const newAverageRating = (oldRatingTotal + rating) / newReviewCount;
        await providerRef.update({ averageRating: newAverageRating, reviewCount: newReviewCount });
        await jobRef.update({ reviewSubmitted: true });
        res.status(201).json({ message: "Bedankt voor uw review!" });
    } catch (error) { res.status(500).json({ error: "Kon de review niet indienen." }); }
});

// Capaciteit Aanbod (Offers) Routes
app.get('/api/offers/search', authMiddleware, async (req, res) => {
    try {
        let offersRef = db.collection('offers');
        if (req.query.machineType) offersRef = offersRef.where('machineType', '==', req.query.machineType);
        const snapshot = await offersRef.get();
        let offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (req.query.excludeOwner) offers = offers.filter(offer => offer.ownerId !== req.user.userId);
        res.status(200).json(offers);
    } catch (error) { res.status(500).json({ error: 'Kon zoekresultaten niet ophalen.' }); }
});

app.post('/api/offers', authMiddleware, async (req, res) => {
    try {
        const { bedrijfsnaam, userId } = req.user;
        const newOffer = { ...req.body, owner: bedrijfsnaam, ownerId: userId, createdAt: new Date().toISOString() };
        await db.collection('offers').add(newOffer);
        res.status(201).json({ message: 'Aanbod geplaatst!' });
    } catch (error) { res.status(500).json({ error: 'Kon aanbieding niet toevoegen.' }); }
});

app.get('/api/offers/:id', authMiddleware, async (req, res) => {
    try {
        const offerId = req.params.id;
        const offerDoc = await db.collection('offers').doc(offerId).get();
        if (!offerDoc.exists) return res.status(404).json({ error: 'Aanbod niet gevonden.' });
        res.status(200).json({ id: offerDoc.id, ...offerDoc.data() });
    } catch (error) { res.status(500).json({ error: 'Kon aanbod niet ophalen.' }); }
});

app.delete('/api/offers/:id', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.user;
        const offerRef = db.collection('offers').doc(req.params.id);
        const offerDoc = await offerRef.get();
        if (!offerDoc.exists) return res.status(404).json({ error: 'Aanbod niet gevonden.' });
        if (offerDoc.data().ownerId !== userId) return res.status(403).json({ error: 'Niet geautoriseerd.' });
        await offerRef.delete();
        res.status(200).json({ message: 'Aanbod succesvol verwijderd.' });
    } catch (error) { res.status(500).json({ error: 'Kon het aanbod niet verwijderen.' }); }
});

// Admin Routes
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => { const { passwordHash, ...data } = doc.data(); return { id: doc.id, ...data }; });
        res.status(200).json(users);
    } catch (error) { res.status(500).json({ error: 'Kon gebruikers niet ophalen.' }); }
});

app.post('/api/admin/users/:userId/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await db.collection('users').doc(req.params.userId).update({ status: 'active' });
        res.status(200).json({ message: 'Gebruiker succesvol goedgekeurd.' });
    } catch (error) { res.status(500).json({ error: 'Kon gebruiker niet goedkeuren.' }); }
});

app.delete('/api/admin/users/:userId/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await db.collection('users').doc(req.params.userId).delete();
        res.status(200).json({ message: 'Gebruiker succesvol afgewezen en verwijderd.' });
    } catch (error) { res.status(500).json({ error: 'Kon gebruiker niet afwijzen.' }); }
});

app.delete('/api/admin/reset-data', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Promise.all([
            deleteCollection(db.collection('offers'), 100),
            deleteCollection(db.collection('print_jobs'), 100),
            deleteCollection(db.collection('quote_requests'), 100)
        ]);
        const usersSnapshot = await db.collection('users').get();
        const batch = db.batch();
        usersSnapshot.docs.forEach(doc => { if (doc.data().email !== ADMIN_EMAIL) { batch.delete(doc.ref); } });
        await batch.commit();
        res.status(200).json({ message: 'Alle platform data (behalve admin) is succesvol verwijderd.' });
    } catch (error) {
        res.status(500).json({ error: 'Kon de platform data niet resetten.' });
    }
});

app.post('/api/admin/users/:userId/force-verify', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const userRef = db.collection('users').doc(req.params.userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
        await userRef.update({ status: 'pending_approval', emailVerified: true, emailVerificationToken: null });
        res.status(200).json({ message: 'E-mailadres van gebruiker handmatig geverifieerd.' });
    } catch (error) {
        res.status(500).json({ error: 'Kon e-mailadres niet handmatig verifiëren.' });
    }
});


// --- Start de server ---
app.listen(PORT, () => {
    console.log(`PrintCap API Server draait nu op http://localhost:${PORT}`);
});