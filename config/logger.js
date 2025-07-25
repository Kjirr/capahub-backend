const winston = require('winston');

const logger = winston.createLogger({
  // Bepaal het 'niveau' van de log. 'info' betekent dat alles van niveau info, warn, en error wordt gelogd.
  level: 'info',
  
  // Definieer het formaat van de log.
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Voeg een tijdstempel toe
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`) // Definieer de opmaak
  ),

  // Definieer waar de logs naartoe moeten ('transports').
  transports: [
    // Schrijf alle logs met niveau 'error' of lager naar `error.log`
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Schrijf alle logs met niveau 'info' of lager naar `combined.log`
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Als we niet in productie zijn, log dan ook naar de console met een kleurrijk, simpel formaat.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(), // Voeg kleuren toe
      winston.format.simple()
    ),
  }));
}

module.exports = logger;