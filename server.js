const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const logger = require('./config/logger');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
    logger.error("FATALE FOUT: JWT_SECRET niet geladen.");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// --- Routes ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/jobs', require('./routes/job.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/offers', require('./routes/offer.routes'));
app.use('/api/quotes', require('./routes/quote.routes'));
app.use('/api/productions', require('./routes/production.routes'));
app.use('/api/archive', require('./routes/archive.routes'));
app.use('/api/marketplace', require('./routes/marketplace.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/team', require('./routes/team.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/materials', require('./routes/material.routes'));
app.use('/api/suppliers', require('./routes/supplier.routes'));
app.use('/api/purchase-orders', require('./routes/purchase-order.routes'));
app.use('/api/stock-locations', require('./routes/stock-location.routes.js'));
app.use('/api/subscriptions', require('./routes/subscription.routes.js'));

// --- ROUTES VOOR CALCULATIE-INSTELLINGEN ---
app.use('/api/calculation-settings/machines', require('./routes/machine.routes.js'));
app.use('/api/calculation-settings/labor-rates', require('./routes/labor-rate.routes.js'));
app.use('/api/calculation-settings/finishings', require('./routes/finishing.routes.js'));

// --- NIEUWE ROUTE VOOR DE CALCULATOR ---
app.use('/api/calculations', require('./routes/calculation.routes.js'));


app.listen(PORT, () => {
    logger.info(`PrntGo API Server draait nu op http://localhost:${PORT}`);
});