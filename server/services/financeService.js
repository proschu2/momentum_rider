/**
 * Yahoo Finance API service
 */

const YahooFinance = require('yahoo-finance2').default;
const cacheService = require('./cacheService');
const logger = require('../config/logger');
const { findClosestWeeklyPrice, calculateReturnFromPrice } = require('../utils/calculations');

// Create Yahoo Finance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

/**
 * Get current quote for a ticker
 */
async function getQuote(ticker) {
  try {
    const cacheKey = `quote_${ticker}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Quote retrieved from cache', { ticker });
      return cached;
    }

    logger.logInfo('Fetching quote from Yahoo Finance API', { ticker });
    const quoteData = await yahooFinance.quote(ticker);

    await cacheService.setCachedData(cacheKey, quoteData);
    logger.logInfo('Quote fetched and cached successfully', { ticker });

    return quoteData;
  } catch (error) {
    logger.logError(error, { ticker });
    throw new Error(`Failed to fetch quote for ${ticker}: ${error.message}`);
  }
}

/**
 * Get historical weekly data for a ticker
 */
async function getHistoricalWeeklyData(ticker, years = 2) {
  try {
    const cacheKey = `historical_weekly_${ticker}_${years}y`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Historical data retrieved from cache', { ticker, years });
      return cached;
    }

    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    logger.logInfo('Fetching historical data from Yahoo Finance API', { ticker, years });
    const weeklyQuotes = await yahooFinance.historical(ticker, {
      period1: startDate.toISOString().split('T')[0] || '',
      period2: new Date().toISOString().split('T')[0] || '',
      interval: '1wk',
    });

    await cacheService.setCachedData(cacheKey, weeklyQuotes);
    logger.logInfo('Historical data fetched and cached successfully', {
      ticker,
      years,
      dataPoints: weeklyQuotes.length
    });

    return weeklyQuotes;
  } catch (error) {
    logger.logError(error, { ticker, years });
    throw new Error(`Failed to fetch historical data for ${ticker}: ${error.message}`);
  }
}

/**
 * Get ticker name (longName or shortName)
 */
async function getTickerName(ticker) {
  try {
    const cacheKey = `${ticker}_name`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Ticker name retrieved from cache', { ticker });
      return cached;
    }

    logger.logInfo('Fetching ticker name from Yahoo Finance API', { ticker });
    const quoteData = await yahooFinance.quote(ticker);
    const name = quoteData.longName || quoteData.shortName || ticker;

    await cacheService.setCachedData(cacheKey, name);
    logger.logInfo('Ticker name fetched and cached successfully', { ticker, name });

    return name;
  } catch (error) {
    logger.logError(error, { ticker });
    logger.logWarn('Using ticker as fallback name', { ticker });
    return ticker; // Return ticker as fallback
  }
}

module.exports = {
  getQuote,
  getHistoricalWeeklyData,
  getTickerName,
  findClosestWeeklyPrice,
  calculateReturnFromPrice,
};
