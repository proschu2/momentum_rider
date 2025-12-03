/**
 * Utility functions for financial calculations
 */

/**
 * Calculate return percentage from a single historical price
 */
function calculateReturnFromPrice(historicalPrice, currentPrice) {
  if (!historicalPrice || historicalPrice === 0) return 0;
  const returnPercent = ((currentPrice - historicalPrice) / historicalPrice) * 100;
  return Math.round(returnPercent * 100) / 100; // Round to 2 decimal places
}

/**
 * Find the closest weekly price to a target date (on or before the target date)
 */
function findClosestWeeklyPrice(weeklyQuotes, targetDate) {
  let closestQuote = null;
  let closestDiff = Infinity;

  for (const quote of weeklyQuotes) {
    // Handle both Date objects and string dates
    const quoteDate = quote.date instanceof Date ? quote.date : new Date(quote.date);
    const diff = targetDate.getTime() - quoteDate.getTime();
    // Only consider quotes on or before the target date
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff;
      closestQuote = quote;
    }
  }

  // If no quote found on or before target date, use the earliest available
  if (!closestQuote && weeklyQuotes.length > 0) {
    closestQuote = weeklyQuotes[0];
  }

  return closestQuote?.close || 0;
}

/**
 * Find the closest daily price to a target date (on or before the target date)
 * Handles weekends and holidays by finding the nearest trading day
 */
function findClosestDailyPrice(dailyQuotes, targetDate) {
  let closestQuote = null;
  let closestDiff = Infinity;

  for (const quote of dailyQuotes) {
    // Handle both Date objects and string dates
    const quoteDate = quote.date instanceof Date ? quote.date : new Date(quote.date);
    const diff = targetDate.getTime() - quoteDate.getTime();
    // Only consider quotes on or before the target date
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff;
      closestQuote = quote;
    }
  }

  // If no quote found on or before target date, use the earliest available
  if (!closestQuote && dailyQuotes.length > 0) {
    closestQuote = dailyQuotes[0];
  }

  return closestQuote?.close || 0;
}

module.exports = {
  calculateReturnFromPrice,
  findClosestWeeklyPrice,
  findClosestDailyPrice,
};
