/**
 * Simple Moving Average (SMA) calculation service
 */

const financeService = require('./financeService');
const cacheService = require('./cacheService');
const logger = require('../config/logger');

/**
 * Calculate Simple Moving Average for a ticker
 * @param {string} ticker - ETF ticker
 * @param {number} period - SMA period in days (default: 200)
 * @returns {Promise<{sma: number, currentPrice: number, trend: string, signal: string}>}
 */
async function calculateSMA(ticker, period = 200) {
  try {
    const cacheKey = `sma_${ticker}_${period}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('SMA data retrieved from cache', { ticker, period });
      return cached;
    }

    logger.logInfo('Calculating SMA for ticker', { ticker, period });

    // Get daily price data for sufficient period
    const daysNeeded = Math.ceil(period * 1.2); // Get extra data for buffer
    const dailyQuotes = await financeService.getHistoricalDailyData(ticker, daysNeeded);

    if (dailyQuotes.length < period) {
      throw new Error(`Insufficient data for ${period}-day SMA calculation`);
    }

    // Get current price
    const currentPrice = dailyQuotes[dailyQuotes.length - 1].close;

    // Calculate SMA
    const sma = calculateSimpleMovingAverage(dailyQuotes, period);

    // Determine trend and signal
    const trend = currentPrice > sma ? 'uptrend' : 'downtrend';
    const signal = currentPrice > sma ? 'bullish' : 'bearish';

    const result = {
      sma: Math.round(sma * 100) / 100, // Round to 2 decimal places
      currentPrice: Math.round(currentPrice * 100) / 100,
      trend,
      signal,
      priceVsSMA: Math.round(((currentPrice - sma) / sma) * 100 * 100) / 100, // Percentage difference
      period,
      timestamp: new Date().toISOString()
    };

    // Cache for 4 hours
    await cacheService.setCachedData(cacheKey, result, 14400);

    return result;
  } catch (error) {
    logger.logError(error, 'Failed to calculate SMA');
    throw error;
  }
}

/**
 * Calculate Simple Moving Average from price data
 * @param {Array} quotes - Array of price quotes
 * @param {number} period - SMA period
 * @returns {number}
 */
function calculateSimpleMovingAverage(quotes, period) {
  // Use closing prices for SMA calculation
  const closingPrices = quotes.map(quote => quote.close);

  // Calculate SMA for the most recent period
  const recentPrices = closingPrices.slice(-period);
  const sum = recentPrices.reduce((total, price) => total + price, 0);

  return sum / period;
}

/**
 * Get SMA trend signal for a ticker
 * @param {string} ticker - ETF ticker
 * @param {number} period - SMA period (default: 200)
 * @returns {Promise<{signal: string, strength: number, details: Object}>}
 */
async function getTrendSignal(ticker, period = 200) {
  try {
    const smaData = await calculateSMA(ticker, period);

    // Calculate signal strength based on price vs SMA percentage
    const strength = Math.min(Math.abs(smaData.priceVsSMA) / 10, 1); // Normalize to 0-1

    return {
      signal: smaData.signal,
      strength: Math.round(strength * 100) / 100,
      details: smaData
    };
  } catch (error) {
    logger.logError(error, 'Failed to get SMA trend signal');
    throw error;
  }
}

/**
 * Detect SMA crossovers for a ticker
 * @param {string} ticker - ETF ticker
 * @param {number} period - SMA period (default: 200)
 * @returns {Promise<{crossovers: Array, currentSignal: string}>}
 */
async function getSMACrossovers(ticker, period = 200) {
  try {
    const cacheKey = `sma_crossovers_${ticker}_${period}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    logger.logInfo('Detecting SMA crossovers for ticker', { ticker, period });

    // Get extended historical data for crossover analysis
    const extendedPeriod = Math.ceil(period * 2.5); // Get enough data for analysis
    const dailyQuotes = await financeService.getHistoricalDailyData(ticker, extendedPeriod);

    if (dailyQuotes.length < period + 50) {
      throw new Error(`Insufficient data for SMA crossover analysis`);
    }

    const crossovers = [];
    let previousSignal = null;

    // Calculate SMA for each day and detect crossovers
    for (let i = period; i < dailyQuotes.length; i++) {
      const currentPrices = dailyQuotes.slice(i - period, i);
      const sma = calculateSimpleMovingAverage(currentPrices, period);
      const currentPrice = dailyQuotes[i].close;

      const currentSignal = currentPrice > sma ? 'bullish' : 'bearish';

      // Detect crossover
      if (previousSignal && previousSignal !== currentSignal) {
        crossovers.push({
          date: dailyQuotes[i].date,
          price: currentPrice,
          sma: sma,
          type: currentSignal === 'bullish' ? 'golden-cross' : 'death-cross',
          signal: currentSignal
        });
      }

      previousSignal = currentSignal;
    }

    // Get current signal
    const currentSMA = await calculateSMA(ticker, period);

    const result = {
      crossovers: crossovers.slice(-10), // Last 10 crossovers
      currentSignal: currentSMA.signal,
      totalCrossovers: crossovers.length,
      period
    };

    // Cache for 24 hours
    await cacheService.setCachedData(cacheKey, result, 86400);

    return result;
  } catch (error) {
    logger.logError(error, 'Failed to detect SMA crossovers');
    throw error;
  }
}

/**
 * Calculate SMA-based allocation for multiple ETFs
 * @param {string[]} etfUniverse - Array of ETF tickers
 * @param {Object} parameters - Strategy parameters
 * @param {number} parameters.smaPeriod - SMA period (default: 200)
 * @param {number} parameters.trendThreshold - Minimum trend strength (0-1)
 * @returns {Promise<Object>} - Allocation percentages
 */
async function calculateSMAAllocation(etfUniverse, parameters = {}) {
  try {
    const { smaPeriod = 200, trendThreshold = 0 } = parameters;

    // Calculate SMA signals for all ETFs
    const smaResults = await Promise.all(
      etfUniverse.map(async ticker => {
        try {
          const trendSignal = await getTrendSignal(ticker, smaPeriod);
          return {
            ticker,
            signal: trendSignal.signal,
            strength: trendSignal.strength,
            details: trendSignal.details
          };
        } catch (error) {
          logger.logWarn('Failed to calculate SMA for ETF', { ticker, error: error.message });
          return {
            ticker,
            signal: 'unknown',
            strength: 0,
            details: null
          };
        }
      })
    );

    // Filter ETFs with bullish signals and sufficient strength
    const bullishETFs = smaResults.filter(etf =>
      etf.signal === 'bullish' && etf.strength >= trendThreshold
    );

    if (bullishETFs.length === 0) {
      // If no bullish ETFs, consider cash position or alternative strategy
      return {};
    }

    // Calculate allocation based on trend strength
    const totalStrength = bullishETFs.reduce((sum, etf) => sum + etf.strength, 0);

    const allocation = {};
    bullishETFs.forEach(etf => {
      // Allocate proportionally to trend strength
      allocation[etf.ticker] = Math.round((etf.strength / totalStrength) * 100 * 100) / 100;
    });

    // Normalize to ensure total is 100%
    const totalAllocation = Object.values(allocation).reduce((sum, percent) => sum + percent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      const normalizationFactor = 100 / totalAllocation;
      Object.keys(allocation).forEach(ticker => {
        allocation[ticker] = Math.round(allocation[ticker] * normalizationFactor * 100) / 100;
      });
    }

    return allocation;
  } catch (error) {
    logger.logError(error, 'Failed to calculate SMA allocation');
    throw error;
  }
}

/**
 * Batch calculate SMA for multiple tickers
 * @param {string[]} tickers - Array of tickers
 * @param {number} period - SMA period (default: 200)
 * @returns {Promise<Object>}
 */
async function batchCalculateSMA(tickers, period = 200) {
  try {
    const results = {};

    // Calculate SMA for each ticker in parallel
    await Promise.all(
      tickers.map(async ticker => {
        try {
          const smaData = await calculateSMA(ticker, period);
          results[ticker] = smaData;
        } catch (error) {
          logger.logWarn('Failed to calculate SMA for ticker', { ticker, error: error.message });
          results[ticker] = { error: error.message };
        }
      })
    );

    return {
      results,
      period,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.logError(error, 'Failed to batch calculate SMA');
    throw error;
  }
}

module.exports = {
  calculateSMA,
  getTrendSignal,
  getSMACrossovers,
  calculateSMAAllocation,
  batchCalculateSMA
};