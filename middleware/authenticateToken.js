const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    // Startbericht om te zien of de functie wordt aangeroepen.
    console.log('--- AUTH MIDDLEWARE START ---');
    
    // Log de 'Authorization' header die van de frontend binnenkomt.
    const authHeader = req.headers['authorization'];
    console.log('1. Ontvangen Authorization header:', authHeader);

    // Haal de token uit de header.
    const token = authHeader && authHeader.split(' ')[1];
    console.log('2. Geëxtraheerde token:', token);

    // Controleer of de token bestaat.
    if (token == null) {
        console.log('❌ FOUT: Geen token gevonden. Toegang wordt geweigerd.');
        return res.status(401).json({ error: 'Toegang geweigerd: geen token.' });
    }

    // Als er een token is, probeer deze te verifiëren.
    console.log('3. Token gevonden, ga proberen te verifiëren...');
    jwt.verify(token, JWT_SECRET, (err, user) => {
        // Controleer op verificatiefouten (bv. token verlopen, ongeldige handtekening).
        if (err) {
            console.log('❌ FOUT: Token verificatie mislukt. Fout:', err.message);
            return res.status(403).json({ error: 'Toegang geweigerd: token is ongeldig.' });
        }
        
        // Als de token geldig is.
        console.log('✅ SUCCES: Token is geldig.');
        console.log('4. Gebruikersdata uit token:', user);
        
        // Voeg de gebruikersdata toe aan het request object.
        req.user = user;
        
        // Ga door naar de volgende stap in de keten (de controller).
        console.log('5. Roep next() aan om door te gaan naar de controller...');
        next();
    });
}

module.exports = authenticateToken;