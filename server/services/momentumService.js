/**
 * Momentum calculation service
 */

const financeService = require('./financeService');
const cacheService = require('./cacheService');
const { calculateReturnFromPrice, findClosestWeeklyPrice } = require('../utils/calculations');

/**
 * Calculate momentum for a ticker
 */
async function calculateMomentum(ticker, includeName = false) {
  const cacheKey = `momentum_${ticker}_${includeName}`;

  // Check cache first
  const cached = await cacheService.getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // Get 2 years of weekly data
  const weeklyQuotes = await financeService.getHistoricalWeeklyData(ticker, 2);

  if (weeklyQuotes.length === 0) {
    throw new Error('No historical data available');
  }

  // Use the latest weekly quote as the current price
  const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
  const currentPrice = latestQuote.close;

  if (!currentPrice || currentPrice === 0) {
    throw new Error(`Invalid current price for ${ticker}`);
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

  // Calculate returns for each period
  const return3mo = calculateReturnFromPrice(price3moAgo, currentPrice);
  const return6mo = calculateReturnFromPrice(price6moAgo, currentPrice);
  const return9mo = calculateReturnFromPrice(price9moAgo, currentPrice);
  const return12mo = calculateReturnFromPrice(price12moAgo, currentPrice);

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
  };

  cacheService.setCachedData(cacheKey, result);
  return result;
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

  // Get 2 years of weekly data
  const weeklyQuotes = await financeService.getHistoricalWeeklyData(ticker, 2);

  if (weeklyQuotes.length === 0) {
    throw new Error('No historical data available');
  }

  // Use the latest weekly quote as the current price
  const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
  const currentPrice = latestQuote.close;

  if (!currentPrice || currentPrice === 0) {
    throw new Error(`Invalid current price for ${ticker}`);
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
    currentPrice,
    historicalPrices: {
      '3month': price3moAgo,
      '6month': price6moAgo,
      '9month': price9moAgo,
      '12month': price12moAgo,
    },
    quote: {
      price: currentPrice,
      change: 0, // We don't have daily change data from weekly quotes
      changePercent: 0,
      marketState: 'CLOSED', // Assume closed since we're using weekly data
      timestamp: latestQuote.date.toISOString(),
    },
  };

  cacheService.setCachedData(cacheKey, result);
  return result;
}

module.exports = {
  calculateMomentum,
  getDetailedPrices,
};
