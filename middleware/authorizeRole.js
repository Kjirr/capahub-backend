const logger = require('../config/logger');

const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    // We gaan ervan uit dat 'authenticateToken' de user info in req.user heeft gezet
    if (!req.user || req.user.companyRole !== requiredRole) {
      logger.warn(`Autorisatie geweigerd voor user ${req.user?.id}. Vereiste rol: ${requiredRole}, gebruiker heeft rol: ${req.user?.companyRole}`);
      return res.status(403).json({ message: 'Toegang geweigerd. U heeft niet de vereiste rechten.' });
    }
    next();
  };
};

module.exports = authorizeRole;