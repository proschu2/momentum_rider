/**
 * Yahoo Finance API service
 */

const YahooFinance = require('yahoo-finance2').default;
const cacheService = require('./cacheService');
const logger = require('../config/logger');
const { findClosestWeeklyPrice, calculateReturnFromPrice } = require('../utils/calculations');

// Create Yahoo Finance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Simple in-memory price cache for instant access (avoid API calls entirely)
const priceCache = new Map();
const CACHE_DURATION_HOURS = 6; // Cache prices for 6 hours

/**
 * Get cached price from memory (fastest possible)
 */
function getCachedPrice(ticker) {
  const cached = priceCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_HOURS * 60 * 60 * 1000) {
    return cached.price;
  }
  return null;
}

/**
 * Set price in memory cache
 */
function setCachedPrice(ticker, price) {
  priceCache.set(ticker, {
    price,
    timestamp: Date.now()
  });
}

/**
 * Get common ETF prices without API calls (fallback values)
 */
function getFallbackPrice(ticker) {
  const fallbackPrices = {
    // Stock ETFs
    'VTI': 250,      // Vanguard Total Stock Market
    'VEA': 60,       // Vanguard Developed Markets
    'VWO': 55,       // Vanguard Emerging Markets
    'SPY': 500,      // SPDR S&P 500
    'QQQ': 450,      // Invesco QQQ Trust

    // Bond ETFs
    'TLT': 100,      // iShares 20+ Year Treasury
    'BND': 75,       // Vanguard Total Bond Market
    'BWX': 50,       // SPDR Bloomberg International Treasury
    'SGOV': 100,     // iShares 0-3 Month Treasury Bond

    // Commodity ETFs
    'PDBC': 20,      // Invesco DB Commodity Index
    'GLDM': 25,      // SPDR Gold Shares

    // Alternative ETFs
    'IBIT': 50,      // iShares Bitcoin Trust
  };

  return fallbackPrices[ticker] || 100;
}

/**
 * Get current quote for a ticker with enhanced rate limiting
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

    // Add small delay to help prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));

    const quoteData = await yahooFinance.quote(ticker);

    // Cache with extended TTL to reduce API pressure (4 hours)
    await cacheService.setCachedData(cacheKey, quoteData, 14400); // 4 hours
    logger.logInfo('Quote fetched and cached successfully', { ticker });

    return quoteData;
  } catch (error) {
    logger.logError(error, { ticker });

    // Enhanced error handling for rate limiting
    if (error.message && (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')
    )) {
      logger.logWarn('Rate limit detected for quote API', { ticker, error: error.message });
      throw new Error(`Rate limit exceeded for ${ticker} quote: ${error.message}`);
    }

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
 * Get historical daily data for a ticker with caching
 */
async function getHistoricalDailyData(ticker, days = 500) {
  try {
    const cacheKey = `historical_daily_${ticker}_${days}d`;

    // Check cache first with longer TTL for historical data
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Historical daily data retrieved from cache', { ticker, days });
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    logger.logInfo('Fetching historical daily data from Yahoo Finance API', { ticker, days });

    // Add delay to help prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 150));

    const dailyQuotes = await yahooFinance.historical(ticker, {
      period1: startDate.toISOString().split('T')[0] || '',
      period2: new Date().toISOString().split('T')[0] || '',
      interval: '1d',
    });

    // Cache historical data for 6 hours (21600 seconds) - it's historical so changes infrequently
    await cacheService.setCachedData(cacheKey, dailyQuotes, 21600);
    logger.logInfo('Historical daily data fetched and cached successfully', {
      ticker,
      days,
      dataPoints: dailyQuotes.length
    });

    return dailyQuotes;
  } catch (error) {
    logger.logError(error, { ticker, days });

    // Enhanced error handling for rate limiting
    if (error.message && (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')
    )) {
      logger.logWarn('Rate limit detected for historical data API', { ticker, error: error.message });
      throw new Error(`Rate limit exceeded for ${ticker} historical data: ${error.message}`);
    }

    throw new Error(`Failed to fetch historical daily data for ${ticker}: ${error.message}`);
  }
}

/**
 * Get current price for a ticker with smart caching (memory first, then API)
 */
async function getCurrentPrice(ticker) {
  try {
    // Check in-memory cache first (fastest)
    const memoryCachedPrice = getCachedPrice(ticker);
    if (memoryCachedPrice) {
      logger.logDebug('Price retrieved from memory cache', { ticker, price: memoryCachedPrice });
      // Always return consistent object structure
      return {
        price: memoryCachedPrice,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: 'memory_cache'
      };
    }

    // Check Redis cache second
    const cacheKey = `current_price_${ticker}`;
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Price retrieved from Redis cache', { ticker, price: cached.price });
      // Store in memory cache for future instant access
      setCachedPrice(ticker, cached.price);
      // Always return consistent object structure
      return {
        price: cached.price,
        currency: cached.currency || 'USD',
        timestamp: cached.timestamp || new Date().toISOString(),
        source: cached.source || 'redis_cache'
      };
    }

    logger.logInfo('Fetching current price from Yahoo Finance API', { ticker });

    // Add delay to help prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    const quoteData = await yahooFinance.quote(ticker);
    const price = quoteData.regularMarketPrice || quoteData.previousClose;
    const priceData = {
      price,
      currency: quoteData.currency || 'USD',
      timestamp: new Date().toISOString(),
      source: 'yahoo_finance'
    };

    // Cache for 4 hours (14400 seconds) to minimize API calls
    await cacheService.setCachedData(cacheKey, priceData, 14400);

    // Also store in memory cache for instant access
    setCachedPrice(ticker, price);

    logger.logInfo('Current price fetched and cached successfully', { ticker, price });

    return priceData;
  } catch (error) {
    logger.logError(error, { ticker });

    // For any error, use fallback price instead of throwing
    const fallbackPrice = getFallbackPrice(ticker);
    logger.logWarn('Using fallback price due to API error', {
      ticker,
      fallbackPrice,
      error: error.message
    });

    // Cache fallback price for 1 hour to avoid repeated API failures
    const cacheKey = `current_price_${ticker}`;
    const fallbackData = {
      price: fallbackPrice,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: 'fallback'
    };
    await cacheService.setCachedData(cacheKey, fallbackData, 3600);
    setCachedPrice(ticker, fallbackPrice);

    return fallbackData;
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
  getHistoricalDailyData,
  getCurrentPrice,
  getTickerName,
  findClosestWeeklyPrice,
  calculateReturnFromPrice,
  getFallbackPrice,
  getCachedPrice,
  setCachedPrice,
};
