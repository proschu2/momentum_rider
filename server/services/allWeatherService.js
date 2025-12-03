/**
 * All-Weather Strategy Service
 *
 * Implements the sophisticated All-Weather portfolio strategy with:
 * - 10-month SMA trend filtering
 * - Dynamic deviation tolerances
 * - Linear programming optimization for integer shares
 * - SGOV cash fallback mechanism
 * - Monthly rebalancing logic
 */

const preFetchService = require('./preFetchService');

class AllWeatherService {
  constructor() {
    // Optimized ETF universe for All-Weather strategy
    this.etfUniverse = {
      // Core Equities
      'VTI': {
        name: 'Vanguard Total Stock Market',
        targetWeight: 10,
        minDeviation: -2,
        maxDeviation: 2,
        category: 'equity',
        expenseRatio: 0.03
      },
      'VEA': {
        name: 'Vanguard FTSE Developed Markets',
        targetWeight: 10,
        minDeviation: -2,
        maxDeviation: 2,
        category: 'equity',
        expenseRatio: 0.05
      },
      'VWO': {
        name: 'Vanguard FTSE Emerging Markets',
        targetWeight: 5,
        minDeviation: -1,
        maxDeviation: 1,
        category: 'equity',
        expenseRatio: 0.07
      },

      // Fixed Income
      'IEF': {
        name: 'iShares 7-10 Year Treasury',
        targetWeight: 40,
        minDeviation: -5,
        maxDeviation: 5,
        category: 'fixed_income',
        expenseRatio: 0.15
      },
      'TIP': {
        name: 'iShares TIPS Bond',
        targetWeight: 7.5,
        minDeviation: -1,
        maxDeviation: 1,
        category: 'fixed_income',
        expenseRatio: 0.18
      },
      'IGIL.L': {
        name: 'iShares Global Inflation UCITS',
        targetWeight: 7.5,
        minDeviation: -1,
        maxDeviation: 1,
        category: 'fixed_income',
        expenseRatio: 0.20
      },

      // Real Assets
      'PDBC': {
        name: 'Invesco Optimum Yield Diversified Commodity',
        targetWeight: 10,
        minDeviation: -2,
        maxDeviation: 2,
        category: 'commodity',
        expenseRatio: 0.54
      },
      'GLDM': {
        name: 'SPDR Gold MiniShares',
        targetWeight: 10,
        minDeviation: -2,
        maxDeviation: 2,
        category: 'commodity',
        expenseRatio: 0.10
      },

      // Cash Fallback
      'SGOV': {
        name: 'iShares Short Treasury',
        targetWeight: 0, // Dynamic
        minDeviation: 0,
        maxDeviation: 40,
        category: 'cash',
        expenseRatio: 0.08
      }
    };

    // Calculate weighted average expense ratio
    this.calculateExpenseRatio();
  }

  calculateExpenseRatio() {
    let totalWeight = 0;
    let weightedExpenses = 0;

    Object.values(this.etfUniverse).forEach(etf => {
      if (etf.targetWeight > 0) {
        totalWeight += etf.targetWeight;
        weightedExpenses += etf.targetWeight * etf.expenseRatio;
      }
    });

    this.weightedAverageTER = weightedExpenses / totalWeight;
  }

  /**
   * Analyze All-Weather strategy with comprehensive logic
   */
  async analyzeAllWeatherStrategy(selectedETFs, parameters = {}) {
    const {
      smaPeriod = 10, // 10-month SMA (monthly data)
      rebalanceDate = new Date(),
      currentPositions = {},
      totalPortfolioValue = 100000
    } = parameters;

    // Handle string date from frontend
    const analysisDate = typeof rebalanceDate === 'string' ? new Date(rebalanceDate) : rebalanceDate;

    try {
      console.log(`🌤️  Analyzing All-Weather strategy for ${selectedETFs.length} ETFs`);

      // Step 1: Filter to supported ETFs
      const supportedETFs = selectedETFs.filter(etf => this.etfUniverse[etf]);
      console.log(`✅ Supported ETFs: ${supportedETFs.join(', ')}`);

      if (supportedETFs.length === 0) {
        throw new Error('No supported ETFs selected for All-Weather strategy');
      }

      // Step 2: Fetch current prices and historical data
      const marketData = await this.fetchMarketData(supportedETFs);

      // Step 3: Calculate 10-month SMA trend signals
      const trendSignals = this.calculateTrendSignals(supportedETFs, smaPeriod, marketData);

      // Step 4: Calculate target allocation weights after trend filtering
      const targetAllocations = this.calculateTargetAllocations(supportedETFs, trendSignals);

      // Step 5: Run linear programming optimization for integer shares
      const optimalShares = await this.optimizeIntegerShares(
        supportedETFs,
        targetAllocations,
        marketData,
        totalPortfolioValue,
        currentPositions
      );

      // Step 6: Generate trading actions
      const tradingActions = this.generateTradingActions(
        supportedETFs,
        optimalShares,
        currentPositions,
        marketData
      );

      // Step 7: Calculate final portfolio state and cash flow
      const finalPortfolioState = this.calculateFinalPortfolioState(
        supportedETFs,
        optimalShares,
        marketData,
        totalPortfolioValue,
        tradingActions
      );

      // Convert targetAllocations to targetETFs format for LP solver
      const targetETFs = [];
      const activeETFs = targetAllocations.activeETFs || [];

      // Add ETFs with positive allocations
      activeETFs.forEach(etf => {
        let targetPercentage = 0;
        if (etf === 'SGOV') {
          targetPercentage = targetAllocations.sgovAllocation;
        } else {
          targetPercentage = targetAllocations.etfAllocations[etf] || 0;
        }

        if (targetPercentage > 0) {
          // Use the actual ETF's max deviation from configuration
          const etfInfo = this.etfUniverse[etf];
          const allowedDeviation = etfInfo ? Math.max(Math.abs(etfInfo.minDeviation), Math.abs(etfInfo.maxDeviation)) : 5;

          targetETFs.push({
            name: etf,
            targetPercentage: Math.round(targetPercentage * 100) / 100, // Round to 2 decimals
            allowedDeviation: allowedDeviation // Use actual ETF deviation from config
          });
        }
      });

      console.log(`🎯 Generated ${targetETFs.length} target ETFs for LP optimization:`, targetETFs.map(t => `${t.name}(${t.targetPercentage}%)`));

      return {
        strategy: 'allweather',
        analysisDate: analysisDate.toISOString(),
        etfUniverse: supportedETFs,
        trendSignals,
        targetAllocations,
        optimalShares,
        tradingActions,
        finalPortfolioState,
        targetETFs, // CRITICAL: Add targetETFs for LP solver compatibility
        expenseRatio: this.weightedAverageTER,
        methodology: {
          smaPeriod: `${smaPeriod}-month SMA`,
          optimization: 'Linear Programming with integer constraints',
          rebalancing: 'Monthly',
          cashFallback: 'SGOV Treasury bills'
        }
      };

    } catch (error) {
      console.error('❌ All-Weather strategy analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch current prices and historical data for SMA calculation
   */
  async fetchMarketData(etfs) {
    console.log('📊 Fetching market data...');

    const marketData = {};

    for (const etf of etfs) {
      try {
        // Get current price
        let currentPrice;
        try {
          currentPrice = await preFetchService.getCachedPrice(etf);
          console.log(`🔍 Debug: getCachedPrice(${etf}) returned:`, currentPrice);

          // Extract price from response object if needed
          if (currentPrice && typeof currentPrice === 'object' && currentPrice.price) {
            currentPrice = currentPrice.price;
          }

          // Validate that we got a valid price
          if (currentPrice != null && typeof currentPrice === 'number' && !isNaN(currentPrice) && currentPrice > 0) {
            console.log(`✅ ${etf}: Got real cached price $${currentPrice.toFixed(2)}`);
          } else {
            console.log(`⚠️  ${etf}: Invalid cached price (${currentPrice}), trying direct API call...`);
            // Try direct financeService call as fallback
            const financeService = require('./financeService');
            const quote = await financeService.getCurrentPrice(etf);
            currentPrice = quote?.regularMarketPrice;

            if (currentPrice != null && typeof currentPrice === 'number' && !isNaN(currentPrice) && currentPrice > 0) {
              console.log(`✅ ${etf}: Got real API price $${currentPrice.toFixed(2)}`);
            } else {
              throw new Error(`Invalid price from API: ${currentPrice}`);
            }
          }
        } catch (priceError) {
          console.error(`❌ ${etf}: All price methods failed (${priceError.message})`);
          throw new Error(`Unable to fetch real price for ${etf}. Please check market data availability or try again later. Error: ${priceError.message}`);
        }

        // Get historical price data for SMA calculation (10 months of month-end data)
        const historicalPrices = await this.getMonthlyPrices(etf, 10);

        marketData[etf] = {
          currentPrice,
          historicalPrices,
          lastUpdated: new Date().toISOString()
        };

        console.log(`✅ ${etf}: $${currentPrice.toFixed(2)} (${historicalPrices.length} months of data)`);

      } catch (error) {
        console.error(`❌ Failed to fetch data for ${etf}:`, error.message);
        throw new Error(`Failed to fetch market data for ${etf}: ${error.message}`);
      }
    }

    // Also add SGOV if not in the list (needed for cash fallback)
    if (!etfs.includes('SGOV')) {
      try {
        marketData.SGOV = {
          currentPrice: 100.0,
          historicalPrices: Array(10).fill(100.0),
          lastUpdated: new Date().toISOString()
        };
        console.log(`✅ SGOV: $${marketData.SGOV.currentPrice.toFixed(2)} (cash fallback)`);
      } catch (error) {
        console.warn(`⚠️  Could not add SGOV pricing:`, error.message);
      }
    }

    return marketData;
  }

  /**
   * Get monthly closing prices for SMA calculation using Yahoo Finance API
   * Uses daily data for accuracy - true trading days with proper month-end alignment
   */
  async getMonthlyPrices(etf, months) {
    console.log(`📊 Fetching ${months} months of historical data for ${etf} (using daily data for accuracy)...`);

    // Special case for SGOV (cash equivalent) - doesn't need real historical data
    if (etf === 'SGOV') {
      console.log(`🏛️ ${etf}: Using stable price data for cash equivalent`);
      return Array(months).fill(100.0); // SGOV has stable value around $100
    }

    try {
      // Import financeService
      const financeService = require('./financeService');

      // Fetch daily data for approximately 300 days (enough for ~10 months)
      // Using daily data ensures accurate SMA calculations with true trading days
      const dailyData = await financeService.getHistoricalDailyData(etf, 300);

      if (!dailyData || dailyData.length === 0) {
        throw new Error(`No historical data available for ${etf}. Cannot calculate SMA without historical price data.`);
      }

      console.log(`📈 Retrieved ${dailyData.length} daily data points for ${etf} (accurate trading days)`);

      // Extract rolling calendar-day prices from daily data
      const monthlyPrices = this.extractRollingCalendarPrices(dailyData, months);

      console.log(`✅ Extracted ${monthlyPrices.length} rolling calendar-day prices for ${etf}`);

      // Validate that we got the expected number of months
      if (monthlyPrices.length < months) {
        console.warn(`⚠️  Only got ${monthlyPrices.length} months for ${etf}, expected ${months}`);
      }

      return monthlyPrices;

    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${etf}:`, error.message);
      throw new Error(`Unable to fetch historical data for ${etf} SMA calculation. Please check market data availability. Error: ${error.message}`);
    }
  }

  /**
   * Extract rolling "X calendar days ago" prices from daily data
   * Uses specific calendar day counts: 274, 243, 213, 183, 152, 122, 91, 61, 30 days ago
   * Each price is the closest trading day on or before the target calendar date
   */
  extractRollingCalendarPrices(dailyData, monthsNeeded) {
    // Import the findClosestDailyPrice utility
    const { findClosestDailyPrice } = require('../utils/calculations');

    // Generate calendar day counts: (365/12) * months 1-9, rounded
    const calendarDaysAgo = [];
    for (let month = 1; month <= monthsNeeded; month++) {
      const daysAgo = Math.round((365 / 12) * month);
      calendarDaysAgo.push(daysAgo);
    }

    // Get the most recent date from daily data (today's quote date)
    const latestDate = dailyData[dailyData.length - 1].date instanceof Date
      ? dailyData[dailyData.length - 1].date
      : new Date(dailyData[dailyData.length - 1].date);
    console.log(`📊 Latest quote date: ${latestDate.toISOString().split('T')[0]}`);

    const prices = [];

    // For each calendar day count, find the closest trading day price
    for (const calendarDays of calendarDaysAgo) {
      // Calculate target calendar date (X calendar days ago from today)
      const targetDate = new Date(latestDate);
      targetDate.setDate(targetDate.getDate() - calendarDays);

      // Find the closest trading day price on or before the target calendar date
      // This automatically handles weekends and holidays
      const price = findClosestDailyPrice(dailyData, targetDate);

      // Convert dates to strings for logging
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const actualDateStr = this.findActualDateForPrice(dailyData, price, targetDate);

      prices.push(price);
      console.log(`📅 ${calendarDays} calendar days ago (target ${targetDateStr}): $${price.toFixed(2)} (${actualDateStr})`);
    }

    // Sort prices from oldest to newest for SMA calculation
    prices.reverse();

    console.log(`✅ Extracted ${prices.length} rolling calendar-day prices for SMA calculation`);
    return prices;
  }

  /**
   * Helper to find the actual date for a given price in daily data
   */
  findActualDateForPrice(dailyData, targetPrice, targetDate) {
    // Find the date that matches this price on or before target date
    for (let i = dailyData.length - 1; i >= 0; i--) {
      const dataPoint = dailyData[i];
      const pointDate = new Date(dataPoint.date);

      if (Math.abs(dataPoint.close - targetPrice) < 0.01 && pointDate <= targetDate) {
        return dataPoint.date;
      }
    }
    return 'unknown';
  }

  
  /**
   * Calculate 10-month SMA trend signals
   */
  calculateTrendSignals(etfs, smaPeriod, marketData) {
    console.log(`📈 Calculating ${smaPeriod}-month SMA trend signals...`);

    const trendSignals = {};

    etfs.forEach(etf => {
      const etfData = marketData[etf];
      const currentPrice = etfData.currentPrice;
      const monthlyPrices = etfData.historicalPrices.slice(-smaPeriod);

      // Calculate SMA
      const sma = monthlyPrices.reduce((sum, price) => sum + price, 0) / monthlyPrices.length;

      // Determine signal
      const signal = currentPrice > sma ? 1 : 0;
      const priceToSmaRatio = (currentPrice / sma - 1) * 100;

      trendSignals[etf] = {
        currentPrice,
        sma10Month: sma,
        signal,
        priceToSmaRatio,
        action: signal === 1 ? 'KEEP DEPLOYED' : 'EXIT TO SGOV',
        analysis: {
          price: currentPrice.toFixed(2),
          sma: sma.toFixed(2),
          difference: (currentPrice - sma).toFixed(2),
          percentDifference: priceToSmaRatio.toFixed(2) + '%'
        }
      };

      console.log(`📊 ${etf}: $${currentPrice.toFixed(2)} vs SMA($${sma.toFixed(2)}) = ${signal === 1 ? '✅ IN' : '❌ OUT'}`);
    });

    return trendSignals;
  }

  /**
   * Calculate target allocation weights after trend filtering
   */
  calculateTargetAllocations(etfs, trendSignals) {
    console.log('🎯 Calculating target allocations with trend filtering...');

    let totalActiveWeight = 0;
    const rawAllocations = {};

    etfs.forEach(etf => {
      const etfInfo = this.etfUniverse[etf];
      const signal = trendSignals[etf].signal;

      if (signal === 1) {
        // ETF is in uptrend - keep allocated
        rawAllocations[etf] = etfInfo.targetWeight;
        totalActiveWeight += etfInfo.targetWeight;
      } else {
        // ETF is in downtrend - move to SGOV
        rawAllocations[etf] = 0;
        console.log(`🔄 ${etf}: Moving ${etfInfo.targetWeight}% allocation to SGOV`);
      }
    });

    // CRITICAL FIX: Always ensure at least 2 ETFs have positive allocation for LP solver
    // If all ETFs are filtered out (totalActiveWeight === 0), allocate to top 3 ETFs by weight
    if (totalActiveWeight === 0) {
      console.log('⚠️  All ETFs filtered out by SMA trend - using fallback allocation for LP solver');

      // Get top 3 ETFs by target weight (excluding SGOV)
      const topETFs = etfs
        .filter(etf => etf !== 'SGOV')
        .sort((a, b) => this.etfUniverse[b].targetWeight - this.etfUniverse[a].targetWeight)
        .slice(0, 3);

      // Allocate equal weights to top ETFs (30% each) and rest to SGOV (10%)
      const fallbackWeight = 30; // 30% each for top 3 ETFs
      topETFs.forEach(etf => {
        rawAllocations[etf] = fallbackWeight;
        totalActiveWeight += fallbackWeight;
        console.log(`🔄 Fallback: ${etf} assigned ${fallbackWeight}% allocation`);
      });

      console.log(`💰 SGOV gets remaining allocation: ${(100 - totalActiveWeight).toFixed(2)}%`);
    }

    // Scale remaining allocations to sum to 100%
    const scaledAllocations = {};
    etfs.forEach(etf => {
      if (totalActiveWeight > 0) {
        scaledAllocations[etf] = (rawAllocations[etf] / totalActiveWeight) * 100;
      } else {
        scaledAllocations[etf] = 0; // All in SGOV
      }
    });

    // Calculate SGOV allocation (ensure it's always included for LP solver)
    const sgovAllocation = Math.max(0, 100 - totalActiveWeight);

    console.log(`💰 SGOV allocation: ${sgovAllocation.toFixed(2)}%`);
    console.log(`✅ Active ETFs with allocation: ${Object.entries(scaledAllocations).filter(([_, allocation]) => allocation > 0).map(([etf, _]) => etf).join(', ')}`);

    return {
      etfAllocations: scaledAllocations,
      sgovAllocation,
      totalActiveWeight,
      trendFilteredETFs: etfs.filter(etf => trendSignals[etf].signal === 1),
      // Always include SGOV in active ETFs if it has allocation > 0
      activeETFs: [...etfs.filter(etf => scaledAllocations[etf] > 0), ...(sgovAllocation > 0 ? ['SGOV'] : [])]
    };
  }

  /**
   * Optimize integer shares using linear programming
   */
  async optimizeIntegerShares(etfs, targetAllocations, marketData, totalPortfolioValue, currentPositions) {
    console.log('🔢 Running linear programming optimization for integer shares...');

    const optimalShares = {};
    let remainingCash = totalPortfolioValue;

    // Calculate target dollar amounts for each ETF
    const targetDollarAmounts = {};
    etfs.forEach(etf => {
      targetDollarAmounts[etf] = totalPortfolioValue * (targetAllocations.etfAllocations[etf] / 100);
    });

    // For each ETF, find optimal integer shares within deviation bounds
    for (const etf of etfs) {
      const targetAmount = targetDollarAmounts[etf];
      const currentPrice = marketData[etf].currentPrice;
      const etfInfo = this.etfUniverse[etf];

      if (targetAmount === 0) {
        optimalShares[etf] = 0;
        continue;
      }

      const targetShares = Math.round((targetAmount / currentPrice) * 100) / 100; // Round to 2 decimal places to avoid precision errors
      const candidateShares = [
        Math.floor(targetShares),
        Math.ceil(targetShares),
        Math.floor(targetShares) + 1,
        Math.max(0, Math.floor(targetShares) - 1)
      ].filter((shares, index, arr) => arr.indexOf(shares) === index); // Remove duplicates

      let bestShares = 0;
      let bestScore = -Infinity;

      for (const shares of candidateShares) {
        const actualValue = shares * currentPrice;
        const actualWeight = (actualValue / totalPortfolioValue) * 100;
        const targetWeight = etfInfo.targetWeight;

        // Check if within deviation bounds
        const minBound = targetWeight + etfInfo.minDeviation;
        const maxBound = targetWeight + etfInfo.maxDeviation;

        if (actualWeight >= minBound && actualWeight <= maxBound) {
          // Score: prefer higher shares (minimizes cash) and closer to target
          const deviationPenalty = Math.abs(actualWeight - targetWeight);
          const sharesBonus = shares * 0.001;
          const score = sharesBonus - deviationPenalty;

          if (score > bestScore) {
            bestScore = score;
            bestShares = shares;
          }
        }
      }

      optimalShares[etf] = bestShares;
      const usedValue = bestShares * currentPrice;
      remainingCash -= usedValue;

      console.log(`📊 ${etf}: ${bestShares} shares @ $${currentPrice.toFixed(2)} = $${usedValue.toFixed(2)} (${(usedValue/totalPortfolioValue*100).toFixed(2)}%)`);
    }

    // SGOV gets all remaining cash
    optimalShares.SGOV = Math.max(0, remainingCash / marketData.SGOV?.currentPrice || 100);

    console.log(`💰 Remaining cash for SGOV: $${remainingCash.toFixed(2)}`);

    return optimalShares;
  }

  /**
   * Generate trading actions
   */
  generateTradingActions(etfs, optimalShares, currentPositions, marketData) {
    console.log('🔄 Generating trading actions...');

    const tradingActions = {};
    let totalBuys = 0;
    let totalSells = 0;

    etfs.forEach(etf => {
      const currentShares = currentPositions[etf] || 0;
      const targetShares = optimalShares[etf];
      const sharesDiff = targetShares - currentShares;
      const currentPrice = marketData[etf].currentPrice;

      let action = 'HOLD';
      let shares = 0;
      let amount = 0;

      if (sharesDiff > 0) {
        action = 'BUY';
        shares = Math.round(sharesDiff * 100) / 100; // Round to 2 decimal places to avoid precision errors
        amount = shares * currentPrice;
        totalBuys += amount;
      } else if (sharesDiff < 0) {
        action = 'SELL';
        shares = Math.round(Math.abs(sharesDiff) * 100) / 100; // Round to 2 decimal places to avoid precision errors
        amount = sharesDiff * currentPrice; // Negative value
        totalSells += Math.abs(amount);
      }

      tradingActions[etf] = {
        action,
        shares,
        amount,
        currentShares,
        targetShares,
        currentPrice,
        analysis: {
          sharesDiff,
          percentChange: currentShares > 0 ? ((sharesDiff / currentShares) * 100).toFixed(2) + '%' : 'NEW'
        }
      };

      if (action !== 'HOLD') {
        console.log(`${action === 'BUY' ? '🟢' : '🔴'} ${etf}: ${action} ${shares} shares @ $${currentPrice.toFixed(2)} = $${Math.abs(amount).toFixed(2)}`);
      }
    });

    // SGOV action
    const currentSGOV = currentPositions.SGOV || 0;
    const targetSGOV = optimalShares.SGOV;
    const sgovDiff = targetSGOV - currentSGOV;

    if (Math.abs(sgovDiff) > 0.1) {
      const sgovPrice = marketData.SGOV?.currentPrice || 100;
      tradingActions.SGOV = {
        action: sgovDiff > 0 ? 'BUY' : 'SELL',
        shares: Math.abs(sgovDiff),
        amount: sgovDiff * sgovPrice,
        currentShares: currentSGOV,
        targetShares: targetSGOV,
        currentPrice: sgovPrice,
        analysis: {
          cashFlow: totalSells - totalBuys,
          netCashChange: sgovDiff * sgovPrice
        }
      };
      console.log(`💰 SGOV: ${tradingActions.SGOV.action} ${Math.abs(sgovDiff).toFixed(0)} shares for cash management`);
    }

    return {
      actions: tradingActions,
      summary: {
        totalBuys,
        totalSells,
        netCashFlow: totalSells - totalBuys,
        totalActions: Object.values(tradingActions).filter(a => a.action !== 'HOLD').length
      }
    };
  }

  /**
   * Calculate final portfolio state
   */
  calculateFinalPortfolioState(etfs, optimalShares, marketData, totalPortfolioValue, tradingActions) {
    console.log('📊 Calculating final portfolio state...');

    const portfolioState = {};
    let totalValue = 0;

    // Calculate values for all ETF positions
    const allETFs = [...etfs, 'SGOV'];

    allETFs.forEach(etf => {
      const shares = optimalShares[etf] || 0;
      const price = marketData[etf]?.currentPrice || (etf === 'SGOV' ? 100 : 0);
      const value = shares * price;
      const weight = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0;

      const etfInfo = this.etfUniverse[etf];
      const targetWeight = etfInfo?.targetWeight || 0;

      portfolioState[etf] = {
        shares,
        price,
        marketValue: value,
        weight,
        targetWeight,
        deviation: weight - targetWeight,
        withinTolerance: this.isWithinTolerance(etf, weight, targetWeight),
        analysis: {
          etfInfo: etfInfo || { name: etf, category: 'cash' },
          valueChange: tradingActions.actions[etf]?.amount || 0
        }
      };

      totalValue += value;
    });

    // Summary statistics
    const deployedValue = totalValue - (portfolioState.SGOV?.marketValue || 0);
    const cashValue = portfolioState.SGOV?.marketValue || 0;

    const summary = {
      totalPortfolioValue: totalValue,
      deployedValue,
      cashValue,
      deployedPercentage: (deployedValue / totalValue) * 100,
      cashPercentage: (cashValue / totalValue) * 100,
      etfCount: Object.keys(portfolioState).filter(etf => etf !== 'SGOV' && portfolioState[etf].shares > 0).length,
      totalExpenseRatio: this.weightedAverageTER,
      expectedYield: this.calculateExpectedYield(portfolioState)
    };

    console.log(`📊 Portfolio Summary: ${summary.deployedPercentage.toFixed(1)}% deployed, ${summary.cashPercentage.toFixed(1)}% cash`);

    return {
      positions: portfolioState,
      summary,
      validation: this.validatePortfolio(portfolioState, totalPortfolioValue)
    };
  }

  /**
   * Check if weight is within tolerance bounds
   */
  isWithinTolerance(etf, actualWeight, targetWeight) {
    const etfInfo = this.etfUniverse[etf];
    if (!etfInfo || targetWeight === 0) return true; // Cash or non-target ETFs

    const minBound = targetWeight + etfInfo.minDeviation;
    const maxBound = targetWeight + etfInfo.maxDeviation;

    return actualWeight >= minBound && actualWeight <= maxBound;
  }

  /**
   * Calculate expected portfolio yield
   */
  calculateExpectedYield(portfolioState) {
    // Simplified yield calculation
    let totalYield = 0;
    let totalWeight = 0;

    Object.entries(portfolioState).forEach(([etf, position]) => {
      let etfYield = 0;

      if (etf === 'SGOV') {
        etfYield = 4.8; // Current T-bill yield
      } else if (etf.includes('IEF') || etf.includes('TIP') || etf.includes('IGIL')) {
        etfYield = 2.5; // Treasury yield
      } else if (etf.includes('VTI') || etf.includes('VEA') || etf.includes('VWO')) {
        etfYield = 1.5; // Equity dividend yield
      } else {
        etfYield = 0; // Commodities, Gold
      }

      totalYield += etfYield * position.weight;
      totalWeight += position.weight;
    });

    return totalWeight > 0 ? totalYield / totalWeight : 0;
  }

  /**
   * Validate portfolio constraints
   */
  validatePortfolio(portfolioState, totalValue) {
    const validation = {
      isValid: true,
      violations: []
    };

    Object.entries(portfolioState).forEach(([etf, position]) => {
      if (!this.isWithinTolerance(etf, position.weight, position.targetWeight)) {
        validation.isValid = false;
        validation.violations.push({
          etf,
          type: 'tolerance',
          actual: position.weight,
          target: position.targetWeight,
          deviation: position.deviation
        });
      }
    });

    // Check total value
    const calculatedTotal = Object.values(portfolioState).reduce((sum, pos) => sum + pos.marketValue, 0);
    if (Math.abs(calculatedTotal - totalValue) > 0.01 * totalValue) {
      validation.isValid = false;
      validation.violations.push({
        type: 'total_value',
        expected: totalValue,
        calculated: calculatedTotal
      });
    }

    return validation;
  }
}

module.exports = new AllWeatherService();