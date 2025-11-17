/**
 * Custom ETF management service
 */

const financeService = require('./financeService');
const cacheService = require('./cacheService');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

// File path for storing custom ETF data
const CUSTOM_ETF_FILE = path.join(__dirname, '../local_data/customETFs.json');

/**
 * Custom ETF data structure
 * @typedef {Object} CustomETF
 * @property {string} ticker - ETF ticker symbol
 * @property {string} name - ETF name
 * @property {string} category - ETF category (STOCKS, BONDS, COMMODITIES, ALTERNATIVES, CUSTOM)
 * @property {number} expenseRatio - Expense ratio as decimal (e.g., 0.03 for 3%)
 * @property {string} inceptionDate - ETF inception date (YYYY-MM-DD)
 * @property {string} addedDate - Date when ETF was added
 * @property {boolean} isValid - Whether ETF data is valid and available
 * @property {string} lastValidation - Last validation date
 * @property {string} [notes] - Optional notes about the ETF
 * @property {string} [description] - ETF description
 * @property {string} [currency] - Currency (default: USD)
 * @property {string} [exchange] - Exchange where ETF is traded
 */

/**
 * Initialize custom ETF storage
 */
async function initializeCustomETFStorage() {
  try {
    const dataDir = path.dirname(CUSTOM_ETF_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    // Create empty file if it doesn't exist
    try {
      await fs.access(CUSTOM_ETF_FILE);
    } catch {
      await fs.writeFile(CUSTOM_ETF_FILE, JSON.stringify([], null, 2));
      logger.logInfo('Custom ETF storage initialized');
    }
  } catch (error) {
    logger.logError(error, 'Failed to initialize custom ETF storage');
    throw error;
  }
}

/**
 * Load custom ETFs from storage
 * @returns {Promise<CustomETF[]>}
 */
async function loadCustomETFs() {
  try {
    const data = await fs.readFile(CUSTOM_ETF_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.logError(error, 'Failed to load custom ETFs');
    return [];
  }
}

/**
 * Save custom ETFs to storage
 * @param {CustomETF[]} etfs - Array of custom ETFs
 */
async function saveCustomETFs(etfs) {
  try {
    await fs.writeFile(CUSTOM_ETF_FILE, JSON.stringify(etfs, null, 2));
  } catch (error) {
    logger.logError(error, 'Failed to save custom ETFs');
    throw error;
  }
}

/**
 * Validate an ETF ticker
 * @param {string} ticker - ETF ticker to validate
 * @returns {Promise<{valid: boolean, name?: string, error?: string}>}
 */
async function validateETF(ticker) {
  try {
    const cacheKey = `etf_validation_${ticker}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    logger.logInfo('Validating ETF ticker', { ticker });

    // Try to get basic info and price data
    const [name, priceData] = await Promise.all([
      financeService.getTickerName(ticker),
      financeService.getCurrentPrice(ticker)
    ]);

    if (!name || name === ticker) {
      const result = { valid: false, error: 'ETF name not found' };
      await cacheService.setCachedData(cacheKey, result, 3600); // Cache for 1 hour
      return result;
    }

    if (!priceData || !priceData.price) {
      const result = { valid: false, error: 'No price data available' };
      await cacheService.setCachedData(cacheKey, result, 3600);
      return result;
    }

    const result = { valid: true, name };
    await cacheService.setCachedData(cacheKey, result, 86400); // Cache for 24 hours
    return result;
  } catch (error) {
    logger.logError(error, 'ETF validation failed');
    const result = { valid: false, error: error.message };
    await cacheService.setCachedData(`etf_validation_${ticker}`, result, 3600);
    return result;
  }
}

/**
 * Get ETF metadata from Yahoo Finance
 * @param {string} ticker - ETF ticker
 * @returns {Promise<Object>} - ETF metadata
 */
async function getETFMetadata(ticker) {
  try {
    const cacheKey = `etf_metadata_${ticker}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    logger.logInfo('Fetching ETF metadata from Yahoo Finance', { ticker });
    const quoteData = await financeService.getQuote(ticker);

    const metadata = {
      name: quoteData.longName || quoteData.shortName || ticker,
      category: 'CUSTOM',
      expenseRatio: 0, // Default expense ratio
      inceptionDate: quoteData.firstTradeDate ? new Date(quoteData.firstTradeDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: quoteData.longName || quoteData.shortName || '',
      currency: quoteData.currency || 'USD',
      exchange: quoteData.exchange || 'N/A'
    };

    // Cache for 24 hours
    await cacheService.setCachedData(cacheKey, metadata, 86400);

    return metadata;
  } catch (error) {
    logger.logWarn('Failed to fetch ETF metadata, using defaults', { ticker, error: error.message });
    // Return default metadata if Yahoo Finance fails
    return {
      name: ticker,
      category: 'CUSTOM',
      expenseRatio: 0,
      inceptionDate: new Date().toISOString().split('T')[0],
      description: '',
      currency: 'USD',
      exchange: 'N/A'
    };
  }
}

/**
 * Add a custom ETF
 * @param {string} ticker - ETF ticker
 * @param {Object} [metadata] - Optional ETF metadata (if not provided, will be fetched from Yahoo Finance)
 * @param {string} [metadata.category] - ETF category (default: 'CUSTOM')
 * @param {number} [metadata.expenseRatio] - Expense ratio (default: 0)
 * @param {string} [metadata.inceptionDate] - Inception date (default: current date)
 * @param {string} [metadata.notes] - Optional notes
 * @returns {Promise<CustomETF>}
 */
async function addCustomETF(ticker, metadata = {}) {
  try {
    // Validate ETF first
    const validation = await validateETF(ticker);
    if (!validation.valid) {
      throw new Error(`Invalid ETF: ${validation.error}`);
    }

    // Load existing ETFs
    const existingETFs = await loadCustomETFs();

    // Check if ETF already exists
    const existingETF = existingETFs.find(etf => etf.ticker === ticker);
    if (existingETF) {
      throw new Error(`ETF ${ticker} already exists`);
    }

    // If minimal metadata provided, fetch additional data from Yahoo Finance
    let etfMetadata = { ...metadata };
    if (!metadata.name || !metadata.category) {
      const yahooMetadata = await getETFMetadata(ticker);
      etfMetadata = {
        ...yahooMetadata,
        ...metadata // User-provided metadata overrides Yahoo Finance data
      };
    }

    // Create new ETF object
    const newETF = {
      ticker: ticker.toUpperCase(),
      name: etfMetadata.name || validation.name,
      category: etfMetadata.category || 'CUSTOM',
      expenseRatio: etfMetadata.expenseRatio || 0,
      inceptionDate: etfMetadata.inceptionDate || new Date().toISOString().split('T')[0],
      addedDate: new Date().toISOString(),
      isValid: true,
      lastValidation: new Date().toISOString(),
      notes: etfMetadata.notes,
      description: etfMetadata.description,
      currency: etfMetadata.currency,
      exchange: etfMetadata.exchange
    };

    // Add to list and save
    existingETFs.push(newETF);
    await saveCustomETFs(existingETFs);

    logger.logInfo('Custom ETF added successfully', {
      ticker,
      category: newETF.category,
      name: newETF.name
    });
    return newETF;
  } catch (error) {
    logger.logError(error, 'Failed to add custom ETF');
    throw error;
  }
}

/**
 * Remove a custom ETF
 * @param {string} ticker - ETF ticker to remove
 * @returns {Promise<boolean>}
 */
async function removeCustomETF(ticker) {
  try {
    const existingETFs = await loadCustomETFs();
    const initialLength = existingETFs.length;

    const filteredETFs = existingETFs.filter(etf => etf.ticker !== ticker.toUpperCase());

    if (filteredETFs.length === initialLength) {
      throw new Error(`ETF ${ticker} not found`);
    }

    await saveCustomETFs(filteredETFs);

    // Clear validation cache
    await cacheService.deleteCachedData(`etf_validation_${ticker}`);

    logger.logInfo('Custom ETF removed', { ticker });
    return true;
  } catch (error) {
    logger.logError(error, 'Failed to remove custom ETF');
    throw error;
  }
}

/**
 * Get all custom ETFs
 * @returns {Promise<CustomETF[]>}
 */
async function getCustomETFs() {
  return await loadCustomETFs();
}

/**
 * Get combined ETF universe (default + custom)
 * @returns {Promise<Object>}
 */
async function getCombinedETFUniverse() {
  const customETFs = await loadCustomETFs();

  // Default ETF universe (from existing system)
  const defaultETFs = {
    STOCKS: ['VTI', 'VEA', 'VWO'],
    BONDS: ['TLT', 'BWX', 'BND'],
    COMMODITIES: ['PDBC', 'GLDM'],
    ALTERNATIVES: ['IBIT']
  };

  // Group custom ETFs by category
  const customByCategory = {};
  customETFs.forEach(etf => {
    if (!customByCategory[etf.category]) {
      customByCategory[etf.category] = [];
    }
    customByCategory[etf.category].push(etf.ticker);
  });

  // Merge with default ETFs
  const combined = { ...defaultETFs };
  Object.keys(customByCategory).forEach(category => {
    if (combined[category]) {
      combined[category] = [...combined[category], ...customByCategory[category]];
    } else {
      combined[category] = customByCategory[category];
    }
  });

  return combined;
}

/**
 * Validate all custom ETFs (background task)
 * @returns {Promise<{validated: number, invalid: number}>}
 */
async function validateAllCustomETFs() {
  try {
    const customETFs = await loadCustomETFs();
    let validated = 0;
    let invalid = 0;

    for (const etf of customETFs) {
      try {
        const validation = await validateETF(etf.ticker);
        etf.isValid = validation.valid;
        etf.lastValidation = new Date().toISOString();

        if (validation.valid) {
          validated++;
        } else {
          invalid++;
          logger.logWarn('Custom ETF validation failed', {
            ticker: etf.ticker,
            error: validation.error
          });
        }
      } catch (error) {
        etf.isValid = false;
        etf.lastValidation = new Date().toISOString();
        invalid++;
        logger.logError(error, `Validation failed for ${etf.ticker}`);
      }
    }

    // Save updated validation status
    await saveCustomETFs(customETFs);

    logger.logInfo('Custom ETF validation completed', { validated, invalid });
    return { validated, invalid };
  } catch (error) {
    logger.logError(error, 'Failed to validate custom ETFs');
    throw error;
  }
}

// Initialize storage on module load
initializeCustomETFStorage().catch(error => {
  logger.logError(error, 'Failed to initialize custom ETF storage');
});

module.exports = {
  addCustomETF,
  removeCustomETF,
  getCustomETFs,
  getCombinedETFUniverse,
  validateETF,
  validateAllCustomETFs
};