const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;

const app = express();
const PORT = process.env.PORT || 3001;

// Create Yahoo Finance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:80',
    'http://frontend:80',
    'http://frontend',
      'http://localhost'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached data
 */
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached data
 */
function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

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

// API Routes

/**
 * Get current quote
 */
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const cacheKey = `quote_${ticker}`;

    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const quoteData = await yahooFinance.quote(ticker);
    setCachedData(cacheKey, quoteData);

    res.json(quoteData);
  } catch (error) {
    console.error(`Error fetching quote for ${req.params.ticker}:`, error);
    res.status(500).json({ error: `Failed to fetch quote for ${req.params.ticker}` });
  }
});

/**
 * Calculate momentum for a ticker
 */
app.get('/api/momentum/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const includeName = req.query.includeName === 'true';
    const cacheKey = `momentum_${ticker}_${includeName}`;

    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get 2 years of weekly data - this includes the current price as the latest entry
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const weeklyQuotes = await yahooFinance.historical(ticker, {
      period1: twoYearsAgo.toISOString().split('T')[0] || '',
      period2: new Date().toISOString().split('T')[0] || '',
      interval: '1wk'
    });

    if (weeklyQuotes.length === 0) {
      throw new Error('No historical data available');
    }

    // Use the latest weekly quote as the current price
    const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
    const currentPrice = latestQuote.close;

    if (!currentPrice || currentPrice === 0) {
      throw new Error(`Invalid current price for ${ticker}`);
    }

    // Get name information from quote data (optional)
    let name = ticker;
    if (req.query.includeName === 'true') {
      const nameCacheKey = `${ticker}_name`;
      let cachedName = getCachedData(nameCacheKey);
      if (cachedName) {
        name = cachedName;
      } else {
        const quoteData = await yahooFinance.quote(ticker);
        name = quoteData.longName || quoteData.shortName || ticker;
        setCachedData(nameCacheKey, name);
      }
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

    // Determine absolute momentum (all periods positive)
    const absoluteMomentum = return3mo > 0 && return6mo > 0 && return9mo > 0 && return12mo > 0;

    const result = {
      ticker,
      name,
      periods,
      average,
      absoluteMomentum,
    };

    setCachedData(cacheKey, result);
    res.json(result);

  } catch (error) {
    console.error(`Error calculating momentum for ${req.params.ticker}:`, error);
    const errorResult = {
      ticker: req.params.ticker,
      periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
      average: 0,
      absoluteMomentum: false,
      error: error instanceof Error ? error.message : 'Failed to calculate momentum',
    };
    res.status(500).json(errorResult);
  }
});

/**
 * Get detailed price data including 4 relevant historical prices + latest quote
 */
app.get('/api/prices/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const includeName = req.query.includeName === 'true';
    const cacheKey = `prices_${ticker}_${includeName}`;

    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get 2 years of weekly data - this includes the current price as the latest entry
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const weeklyQuotes = await yahooFinance.historical(ticker, {
      period1: twoYearsAgo.toISOString().split('T')[0] || '',
      period2: new Date().toISOString().split('T')[0] || '',
      interval: '1wk'
    });

    if (weeklyQuotes.length === 0) {
      throw new Error('No historical data available');
    }

    // Use the latest weekly quote as the current price
    const latestQuote = weeklyQuotes[weeklyQuotes.length - 1];
    const currentPrice = latestQuote.close;

    if (!currentPrice || currentPrice === 0) {
      throw new Error(`Invalid current price for ${ticker}`);
    }

    // Get name information from quote data (optional)
    let name = ticker;
    if (req.query.includeName === 'true') {
      const nameCacheKey = `${ticker}_name`;
      let cachedName = getCachedData(nameCacheKey);
      if (cachedName) {
        name = cachedName;
      } else {
        const quoteData = await yahooFinance.quote(ticker);
        name = quoteData.longName || quoteData.shortName || ticker;
        setCachedData(nameCacheKey, name);
      }
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
        '12month': price12moAgo
      },
      quote: {
        price: currentPrice,
        change: 0, // We don't have daily change data from weekly quotes
        changePercent: 0,
        marketState: 'CLOSED', // Assume closed since we're using weekly data
        timestamp: latestQuote.date.toISOString()
      }
    };

    setCachedData(cacheKey, result);
    res.json(result);

  } catch (error) {
    console.error(`Error fetching prices for ${req.params.ticker}:`, error);
    res.status(500).json({
      error: `Failed to fetch price data for ${req.params.ticker}`,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Batch momentum calculation for multiple tickers
 */
app.post('/api/momentum/batch', async (req, res) => {
  try {
    const { tickers } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }

    const results = [];

    for (const ticker of tickers) {
      try {
        // Use individual momentum endpoint with caching
        const response = await fetch(`http://localhost:${PORT}/api/momentum/${ticker}`);
        const result = await response.json();
        results.push(result);

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
        results.push({
          ticker,
          periods: { '3month': 0, '6month': 0, '9month': 0, '12month': 0 },
          average: 0,
          absoluteMomentum: false,
          error: `Failed to calculate momentum for ${ticker}`
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error in batch momentum calculation:', error);
    res.status(500).json({ error: 'Failed to calculate batch momentum' });
  }
});

/**
 * Clear cache endpoint
 */
app.delete('/api/cache', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), mode: 'development', hotReload: 'working' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/quote/:ticker`);
  console.log(`   GET  /api/momentum/:ticker`);
  console.log(`   GET  /api/prices/:ticker`);
  console.log(`   POST /api/momentum/batch`);
  console.log(`   DELETE /api/cache`);
  console.log(`   GET  /health`);
});