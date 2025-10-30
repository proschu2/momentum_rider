/**
 * Main Express app configuration
 */

const express = require('express');
const cors = require('cors');

// Import route handlers
const quoteRoutes = require('./routes/quote');
const momentumRoutes = require('./routes/momentum');
const pricesRoutes = require('./routes/prices');
const batchRoutes = require('./routes/batch');
const cacheRoutes = require('./routes/cache');
const healthRoutes = require('./routes/health');
const optimizationRoutes = require('./routes/optimization');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Mount routes
app.use('/api/quote', quoteRoutes);
app.use('/api/momentum', momentumRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/health', healthRoutes);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;