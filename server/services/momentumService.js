/**
 * Momentum calculation service
 */

const financeService = require('./financeService');
const cacheService = require('./cacheService');
const logger = require('../config/logger');
const { calculateReturnFromPrice, findClosestWeeklyPrice } = require('../utils/calculations');

/**
 * Calculate momentum for a ticker
 */
async function calculateMomentum(ticker, includeName = false) {
  try {
    const cacheKey = `momentum_${ticker}_${includeName}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Momentum data retrieved from cache', { ticker });
      return cached;
    }

    logger.logInfo('Calculating momentum for ticker', { ticker, includeName });

    // Get 2 years of weekly data for historical prices
    const weeklyQuotes = await financeService.getHistoricalWeeklyData(ticker, 2);

    if (weeklyQuotes.length === 0) {
      throw new Error('No historical data available');
    }

    // Get REAL current price from finance service (not from weekly data)
    let currentPrice;
    try {
      currentPrice = await financeService.getCurrentPrice(ticker);
      logger.logInfo('Real current price fetched for momentum calculation', {
        ticker,
        price: currentPrice,
        source: 'financeService.getCurrentPrice'
      });
    } catch (priceError) {
      logger.logWarn('Failed to get current price, falling back to latest weekly quote', {
        ticker,
        error: priceError.message
      });
      // Fallback to latest weekly quote
      const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
      currentPrice = latestQuote.close;
    }

    // Handle both object and number return types from getCurrentPrice
    const priceValue = typeof currentPrice === 'object' ? currentPrice.price || currentPrice : currentPrice;

    if (!priceValue || priceValue === 0) {
      throw new Error(`Invalid current price for ${ticker}: ${priceValue}`);
    }

    // Get name information (optional)
    let name = ticker;
    if (includeName) {
      name = await financeService.getTickerName(ticker);
    }

    // Calculate exact dates for momentum periods
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const nineMonthsAgo = new Date(today);
    nineMonthsAgo.setMonth(today.getMonth() - 9);

    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(today.getMonth() - 12);

    // Find closest weekly prices for each period
    const price3moAgo = findClosestWeeklyPrice(weeklyQuotes, threeMonthsAgo);
    const price6moAgo = findClosestWeeklyPrice(weeklyQuotes, sixMonthsAgo);
    const price9moAgo = findClosestWeeklyPrice(weeklyQuotes, nineMonthsAgo);
    const price12moAgo = findClosestWeeklyPrice(weeklyQuotes, twelveMonthsAgo);

    // Calculate returns for each period using the REAL current price
    const return3mo = calculateReturnFromPrice(price3moAgo, priceValue);
    const return6mo = calculateReturnFromPrice(price6moAgo, priceValue);
    const return9mo = calculateReturnFromPrice(price9moAgo, priceValue);
    const return12mo = calculateReturnFromPrice(price12moAgo, priceValue);

    const periods = {
      '3month': return3mo,
      '6month': return6mo,
      '9month': return9mo,
      '12month': return12mo,
    };

    // Calculate average return
    const average = (return3mo + return6mo + return9mo + return12mo) / 4;

    // Determine absolute momentum using composite score with recent bias
    const recentBias = 0.6; // 60% weight to recent 3-6 month performance
    const longTermBias = 0.4; // 40% weight to 9-12 month performance

    const recentPerformance = (return3mo + return6mo) / 2;
    const longTermPerformance = (return9mo + return12mo) / 2;

    const compositeScore = recentPerformance * recentBias + longTermPerformance * longTermBias;
    const absoluteMomentum = compositeScore > 0;

    const result = {
      ticker,
      name,
      periods,
      average,
      absoluteMomentum,
      price: priceValue, // Include the real current price in the result
    };

    await cacheService.setCachedData(cacheKey, result);
    logger.logInfo('Momentum calculation completed and cached', {
      ticker,
      absoluteMomentum,
      average,
      price: priceValue,
      dataPoints: weeklyQuotes.length
    });

    return result;
  } catch (error) {
    logger.logError(error, { ticker, includeName });
    throw new Error(`Failed to calculate momentum for ${ticker}: ${error.message}`);
  }
}

/**
 * Get detailed price data including 4 relevant historical prices + latest quote
 */
async function getDetailedPrices(ticker, includeName = false) {
  const cacheKey = `prices_${ticker}_${includeName}`;

  // Check cache first
  const cached = await cacheService.getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Get 2 years of weekly data for historical prices
  const weeklyQuotes = await financeService.getHistoricalWeeklyData(ticker, 2);

  if (weeklyQuotes.length === 0) {
    throw new Error('No historical data available');
  }

  // Get REAL current price from finance service (not from weekly data)
  let currentPrice;
  try {
    currentPrice = await financeService.getCurrentPrice(ticker);
    logger.logInfo('Real current price fetched for momentum calculation', {
      ticker,
      price: currentPrice,
      source: 'financeService.getCurrentPrice'
    });
  } catch (priceError) {
    logger.logWarn('Failed to get current price, falling back to latest weekly quote', {
      ticker,
      error: priceError.message
    });
    // Fallback to latest weekly quote
    const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
    currentPrice = latestQuote.close;
  }

  // Handle both object and number return types from getCurrentPrice
  const priceValue = typeof currentPrice === 'object' ? currentPrice.price || currentPrice : currentPrice;

  if (!priceValue || priceValue === 0) {
    throw new Error(`Invalid current price for ${ticker}: ${priceValue}`);
  }

  // Get name information (optional)
  let name = ticker;
  if (includeName) {
    name = await financeService.getTickerName(ticker);
  }

  // Calculate exact dates for momentum periods
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const nineMonthsAgo = new Date(today);
  nineMonthsAgo.setMonth(today.getMonth() - 9);

  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(today.getMonth() - 12);

  // Find closest weekly prices for each period
  const price3moAgo = findClosestWeeklyPrice(weeklyQuotes, threeMonthsAgo);
  const price6moAgo = findClosestWeeklyPrice(weeklyQuotes, sixMonthsAgo);
  const price9moAgo = findClosestWeeklyPrice(weeklyQuotes, nineMonthsAgo);
  const price12moAgo = findClosestWeeklyPrice(weeklyQuotes, twelveMonthsAgo);

  const result = {
    ticker,
    name,
    currentPrice: priceValue,
    historicalPrices: {
      '3month': price3moAgo,
      '6month': price6moAgo,
      '9month': price9moAgo,
      '12month': price12moAgo,
    },
    quote: {
      price: priceValue,
      change: 0, // We don't have daily change data from weekly quotes
      changePercent: 0,
      marketState: 'CLOSED', // Assume closed since we're using weekly data
      timestamp: new Date().toISOString(),
    },
  };

  cacheService.setCachedData(cacheKey, result);
  return result;
}

/**
 * Calculate momentum for multiple tickers in batch
 * Optimized for parallel processing with error handling
 */
async function calculateBatchMomentum(tickers, includeName = false) {
  const results = [];

  for (const ticker of tickers) {
    try {
      const result = await calculateMomentum(ticker, includeName);
      results.push(result);
    } catch (error) {
      results.push({
        ticker,
        periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
        average: 0,
        absoluteMomentum: false,
        error: `Failed to calculate momentum for ${ticker}: ${error.message}`,
      });
    }
  }

  return results;
}

module.exports = {
  calculateMomentum,
  calculateBatchMomentum,
  getDetailedPrices,
};
