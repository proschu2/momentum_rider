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
    const diff = targetDate.getTime() - quote.date.getTime();
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

module.exports = {
  calculateReturnFromPrice,
  findClosestWeeklyPrice,
};
