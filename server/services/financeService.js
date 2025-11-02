/**
 * Yahoo Finance API service
 */

const YahooFinance = require('yahoo-finance2').default;
const cacheService = require('./cacheService');
const { findClosestWeeklyPrice, calculateReturnFromPrice } = require('../utils/calculations');

// Create Yahoo Finance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

/**
 * Get current quote for a ticker
 */
async function getQuote(ticker) {
  const cacheKey = `quote_${ticker}`;

  // Check cache first
  const cached = await cacheService.getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const quoteData = await yahooFinance.quote(ticker);
  cacheService.setCachedData(cacheKey, quoteData);

  return quoteData;
}

/**
 * Get historical weekly data for a ticker
 */
async function getHistoricalWeeklyData(ticker, years = 2) {
  const cacheKey = `historical_weekly_${ticker}_${years}y`;

  // Check cache first
  const cached = await cacheService.getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  const weeklyQuotes = await yahooFinance.historical(ticker, {
    period1: startDate.toISOString().split('T')[0] || '',
    period2: new Date().toISOString().split('T')[0] || '',
    interval: '1wk',
  });

  cacheService.setCachedData(cacheKey, weeklyQuotes);
  return weeklyQuotes;
}

/**
 * Get ticker name (longName or shortName)
 */
async function getTickerName(ticker) {
  const cacheKey = `${ticker}_name`;

  // Check cache first
  const cached = await cacheService.getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const quoteData = await yahooFinance.quote(ticker);
  const name = quoteData.longName || quoteData.shortName || ticker;
  cacheService.setCachedData(cacheKey, name);

  return name;
}

module.exports = {
  getQuote,
  getHistoricalWeeklyData,
  getTickerName,
  findClosestWeeklyPrice,
  calculateReturnFromPrice,
};
