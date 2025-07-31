const logger = require('../config/logger');

// Definieer hier welke permissies ALTIJD een betaald abonnement vereisen.
const PAID_PERMISSIONS = [
    'manage_team',
    'manage_materials',
    'manage_purchasing',
    'manage_warehouse',
    'manage_production',
    'manage_admin'
];

// Middleware om te checken of een gebruiker toegang heeft tot een module.
const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ message: 'Authenticatie vereist.' });
    }
    
    // --- NIEUWE, HARDE CONTROLE VOOR HET FREE ABONNEMENT ---
    // Als de gebruiker een FREE abonnement heeft en een betaalde permissie probeert te gebruiken,
    // blokkeer dan direct de toegang.
    if (user.subscription?.name === 'FREE' && PAID_PERMISSIONS.includes(requiredPermission)) {
        logger.warn(`Toegang geweigerd voor FREE user ${user.userId}. Poging tot toegang tot betaalde module '${requiredPermission}'.`);
        return res.status(403).json({ message: `Upgrade uw abonnement om toegang te krijgen tot deze module.` });
    }

    // --- De bestaande logica voor betaalde abonnementen blijft hetzelfde ---

    // Stap 1: Controleer het abonnement van het bedrijf.
    const planPermissions = user.subscription?.permissions.map(p => p.name) || [];
    const planHasPermission = planPermissions.includes(requiredPermission);

    if (!planHasPermission) {
        logger.warn(`Toegang geweigerd voor user ${user.userId} (plan: ${user.subscription?.name}). Vereist recht '${requiredPermission}' niet in abonnement.`);
        return res.status(403).json({ message: `Toegang geweigerd. Uw huidige abonnement (${user.subscription?.name}) geeft geen toegang tot deze module.` });
    }

    // Stap 2: Als het abonnement toegang geeft, check de rol van de gebruiker.
    if (user.companyRole === 'owner') {
      return next();
    }
    
    const userHasPermission = user.permissions?.some(p => p.name === requiredPermission);
    
    if (userHasPermission) {
      return next();
    }

    logger.warn(`Toegang geweigerd voor member ${user.userId}. Heeft het recht '${requiredPermission}' niet persoonlijk toegewezen gekregen.`);
    return res.status(403).json({ message: 'Toegang geweigerd. U heeft niet de vereiste rechten voor deze actie.' });
  };
};

module.exports = authorizePermission;