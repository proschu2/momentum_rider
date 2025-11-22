/**
 * Portfolio analysis and optimization service
 */

const financeService = require('./financeService');
const customETFService = require('./customETFService');
const portfolioOptimizationService = require('./portfolioOptimizationService');
const preFetchService = require('./preFetchService');
const allWeatherService = require('./allWeatherService');
const logger = require('../config/logger');
const {
  ALL_WEATHER_ETFS,
  isAllWeatherETF,
  isMomentumETF,
  getStrategyTypeForETF,
  STRATEGY_TYPES
} = require('../config/strategies');

class PortfolioService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current price with pre-fetch service caching (optimized)
   * Falls back to financeService if not available in cache
   */
  async getCurrentPriceOptimized(ticker) {
    try {
      // Try pre-fetch service first (Redis-first caching)
      const cachedPrice = await preFetchService.getCachedPrice(ticker);
      if (cachedPrice) {
        logger.logDebug('Price retrieved from pre-fetch cache', { ticker });
        return cachedPrice;
      }
    } catch (error) {
      logger.logDebug('Pre-fetch service unavailable, falling back to finance service', {
        ticker,
        error: error.message
      });
    }

    // Fallback to original financeService
    try {
      const price = await financeService.getCurrentPrice(ticker);
      logger.logDebug('Price retrieved from finance service (fallback)', { ticker });
      return price;
    } catch (fallbackError) {
      logger.logError('Both pre-fetch and finance service failed', {
        ticker,
        preFetchError: error?.message,
        financeError: fallbackError.message
      });
      throw fallbackError;
    }
  }

  /**
   * Analyze strategy and generate target allocation
   */
  async analyzeStrategy({ strategy, selectedETFs, additionalCapital, currentHoldings }) {
    try {
      // Get current portfolio value
      const currentPortfolioValue = await this.calculatePortfolioValue(currentHoldings);
      const totalInvestment = currentPortfolioValue + additionalCapital;

      let targetAllocations = {};
      let momentumScores = {};
      let allWeatherResult = null; // Declare outside switch

      switch (strategy.type) {
        case 'momentum':
          console.log('Debug: About to call analyzeMomentumStrategy...');
          const momentumResult = await this.analyzeMomentumStrategy(selectedETFs, strategy.parameters);
          console.log('Debug: analyzeMomentumStrategy returned. GLDM has price:', 'GLDM' in momentumResult.momentumScores ? 'price' in momentumResult.momentumScores['GLDM'] : 'GLDM not found');
          targetAllocations = momentumResult.allocations;
          momentumScores = momentumResult.momentumScores;
          console.log('Debug: After assignment. GLDM has price:', 'GLDM' in momentumScores ? 'price' in momentumScores['GLDM'] : 'GLDM not found');
          break;
        case 'allweather':
          allWeatherResult = await allWeatherService.analyzeAllWeatherStrategy(selectedETFs, strategy.parameters);
          // Extract targetAllocations from All-Weather targetETFs
          targetAllocations = {};
          if (allWeatherResult && allWeatherResult.targetETFs) {
            allWeatherResult.targetETFs.forEach(etf => {
              targetAllocations[etf.name] = etf.targetPercentage;
            });
            console.log('🎯 Extracted All-Weather target allocations:', targetAllocations);
          }
          break;
        case 'custom':
          targetAllocations = strategy.parameters.allocations || {};
          break;
        default:
          throw new Error(`Unknown strategy type: ${strategy.type}`);
      }

      // Normalize allocations to 100%
      const totalAllocation = Object.values(targetAllocations).reduce((sum, val) => sum + val, 0);
      if (totalAllocation > 0) {
        Object.keys(targetAllocations).forEach(etf => {
          targetAllocations[etf] = (targetAllocations[etf] / totalAllocation) * 100;
        });
      }

      // Calculate target values
      const targetValues = {};
      console.log('Calculating target values:', {
        totalInvestment,
        targetAllocations,
        totalInvestmentValid: totalInvestment != null && totalInvestment > 0
      });
      
      Object.entries(targetAllocations).forEach(([etf, percentage]) => {
        const targetValue = (totalInvestment * percentage) / 100;
        targetValues[etf] = targetValue;
        console.log(`Target value for ${etf}:`, {
          percentage,
          totalInvestment,
          calculatedValue: targetValue,
          isValid: targetValue != null && targetValue >= 0
        });
      });

      // Get current values
      const currentValues = {};
      console.log('Calculating current values for holdings:', currentHoldings);
      for (const holding of currentHoldings) {
        try {
          console.log(`Getting price for ${holding.etf}...`);
          const priceData = await this.getCurrentPriceOptimized(holding.etf);
          console.log(`Price data received for ${holding.etf}:`, {
            priceData,
            dataType: typeof priceData,
            hasPriceProperty: priceData && typeof priceData === 'object' && 'price' in priceData,
            priceValue: priceData && typeof priceData === 'object' ? priceData.price : priceData,
            holdingShares: holding.shares
          });
          
          // financeService now always returns object structure with price property
          const price = priceData.price;
          const currentValue = holding.shares * price;
          currentValues[holding.etf] = currentValue;
          
          console.log(`Current value calculated for ${holding.etf}:`, {
            price,
            shares: holding.shares,
            currentValue,
            isValid: currentValue != null && currentValue >= 0
          });
        } catch (error) {
          console.error(`Error calculating current value for ${holding.etf}:`, error);
          currentValues[holding.etf] = 0;
        }
      }

      // Debug: Check momentumScores before final return
      console.log('Debug: momentumScores in analyzeStrategy return:', JSON.stringify(momentumScores, null, 2));

      // Add strategyAnalysis for frontend compatibility
      let strategyAnalysis = null;
      if (strategy.type === 'allweather' && allWeatherResult) {
        strategyAnalysis = {
          targetETFs: allWeatherResult.targetETFs || []
        };
      }

      const result = {
        totalInvestment,
        currentPortfolioValue,
        targetAllocations,
        targetValues,
        currentValues,
        strategy: strategy.type,
        selectedETFs,
        momentumScores,
        strategyAnalysis, // CRITICAL: Add strategyAnalysis for frontend
        analysisTimestamp: new Date().toISOString()
      };

      console.log('Debug: Final result momentumScores GLDM has price:', 'GLDM' in result.momentumScores ? 'price' in result.momentumScores['GLDM'] : 'GLDM not found');

      return result;

    } catch (error) {
      logger.logError(error, 'Strategy analysis failed');
      throw error;
    }
  }

  /**
   * Analyze momentum strategy
   */
  async analyzeMomentumStrategy(selectedETFs, parameters) {
    const { topN = 3, includeIBIT = true, fallbackETF = 'SGOV' } = parameters;

    try {
      // Calculate momentum scores for all selected ETFs
      const momentumScores = await this.calculateMomentumScores(selectedETFs);

      // Filter positive momentum ETFs first
      const allPositiveETFs = momentumScores
        .filter(etf => etf.score > 0)
        .sort((a, b) => b.score - a.score);

      // Select top N regular ETFs (IBIT is additional)
      const regularTopN = topN;
      const positiveETFs = allPositiveETFs.slice(0, regularTopN);

      // Enhanced debugging for momentum analysis
      const debugInfo = {
        totalETFs: momentumScores.length,
        positiveETFsFound: allPositiveETFs.length,
        regularTopN,
        includeIBIT,
        selectedRegularETFs: positiveETFs.map(e => e.ticker),
        scores: momentumScores.map(s => ({
          ticker: s.ticker,
          score: s.score,
          momentum3m: s.momentum3m,
          momentum6m: s.momentum6m,
          momentum9m: s.momentum9m,
          momentum12m: s.momentum12m,
          price: s.price
        })),
        parameters: { topN, includeIBIT, fallbackETF }
      };

      console.log('Momentum analysis results:', debugInfo);

      // Write debug info to file for complete analysis
      const fs = require('fs').promises;
      try {
        await fs.writeFile('/tmp/momentum-debug.json', JSON.stringify(debugInfo, null, 2));
        console.log('Debug info written to /tmp/momentum-debug.json');
      } catch (err) {
        console.error('Failed to write debug file:', err);
      }

      // Add IBIT only if specified AND its momentum is positive
      if (includeIBIT && !positiveETFs.find(etf => etf.ticker === 'IBIT')) {
        // Check IBIT momentum first
        const momentumService = require('./momentumService');
        let ibitMomentum;

        try {
          ibitMomentum = await momentumService.calculateMomentum('IBIT');
          console.log('IBIT momentum check:', {
            includeIBIT,
            compositeScore: ibitMomentum.average,
            absoluteMomentum: ibitMomentum.absoluteMomentum,
            willInclude: ibitMomentum.absoluteMomentum
          });
        } catch (momentumError) {
          console.warn(`Failed to calculate IBIT momentum:`, momentumError.message);
          ibitMomentum = { absoluteMomentum: false, average: 0 };
        }

        // Only add IBIT if its momentum is positive
        if (ibitMomentum.absoluteMomentum) {
          let ibitPrice = 52.0; // Reasonable fallback price for IBIT
          try {
            const priceResult = await this.getCurrentPriceOptimized('IBIT');
            ibitPrice = priceResult.price || ibitPrice;
          } catch (priceError) {
            console.warn(`Failed to get current price for IBIT:`, priceError.message);
          }

          positiveETFs.push({
            ticker: 'IBIT',
            score: ibitMomentum.average, // Use actual momentum score instead of 0
            price: ibitPrice
          });

          console.log('IBIT included in momentum strategy - momentum is positive');
        } else {
          console.log('IBIT excluded from momentum strategy - momentum is negative');
        }
      }

      // If no positive ETFs, use fallback
      if (positiveETFs.length === 0) {
        let fallbackPrice = 100.0; // Reasonable fallback price
        try {
          const priceResult = await this.getCurrentPriceOptimized(fallbackETF);
          fallbackPrice = priceResult.price || fallbackPrice;
        } catch (priceError) {
          console.warn(`Failed to get current price for fallback ETF ${fallbackETF}:`, priceError.message);
        }

        positiveETFs.push({
          ticker: fallbackETF,
          score: 0,
          price: fallbackPrice
        });
      }

      // Calculate equal allocations (IBIT gets fixed 4% only if included with positive momentum)
      const allocations = {};
      const activeETFs = positiveETFs.filter(etf => etf.ticker !== 'IBIT');
      const ibitIncluded = positiveETFs.find(etf => etf.ticker === 'IBIT');
      const remainingAllocation = ibitIncluded ? 96 : 100;

      if (activeETFs.length > 0) {
        const equalAllocation = remainingAllocation / activeETFs.length;
        activeETFs.forEach(etf => {
          allocations[etf.ticker] = equalAllocation;
        });
      }

      // Only add IBIT allocation if it's included (has positive momentum)
      if (ibitIncluded) {
        allocations.IBIT = 4;
      }

      // Debug: Check what's in momentumScores before returning
      console.log('Debug: momentumScores before return:', JSON.stringify(momentumScores[0], null, 2));

      const momentumScoresObj = momentumScores.reduce((acc, score) => {
        acc[score.ticker] = score;
        return acc;
      }, {});

      // Debug: Check what's in the reduced object
      console.log('Debug: momentumScores object has price for GLDM:', 'GLDM' in momentumScoresObj ? 'price' in momentumScoresObj['GLDM'] : 'GLDM not found');

      return {
        allocations,
        momentumScores: momentumScoresObj
      };

    } catch (error) {
      logger.logError(error, 'Momentum strategy analysis failed');
      throw error;
    }
  }

  /**
   * Analyze all-weather strategy using comprehensive All-Weather service
   */
  async analyzeAllWeatherStrategy(selectedETFs, parameters, portfolioData = {}) {
    try {
      console.log('🌤️  PortfolioService: Analyzing All-Weather strategy...');

      // Delegate to the dedicated All-Weather service
      const allWeatherAnalysis = await allWeatherService.analyzeAllWeatherStrategy(
        selectedETFs,
        parameters,
        portfolioData
      );

      console.log('✅ All-Weather strategy analysis completed');
      return allWeatherAnalysis;

    } catch (error) {
      logger.logError(error, 'All-weather strategy analysis failed');
      throw error;
    }
  }

  /**
   * Optimize portfolio using existing linear programming service
   */
  async optimizePortfolio({ strategy, selectedETFs, additionalCapital, currentHoldings, constraints, objectives }) {
    try {
      console.log('=== DEBUG OPTIMIZE PORTFOLIO START ===');
      console.log('Optimization input:', {
        strategyType: strategy?.type,
        selectedETFsCount: selectedETFs?.length,
        selectedETFs: selectedETFs,
        additionalCapital,
        currentHoldingsCount: currentHoldings?.length,
        currentHoldings: currentHoldings,
        constraints,
        objectives
      });

      // Get analysis first to determine target allocations
      const analysis = await this.analyzeStrategy({ strategy, selectedETFs, additionalCapital, currentHoldings });
      
      console.log('Analysis result for optimization:', {
        totalInvestment: analysis.totalInvestment,
        currentPortfolioValue: analysis.currentPortfolioValue,
        targetAllocations: analysis.targetAllocations,
        targetValues: analysis.targetValues,
        currentValues: analysis.currentValues,
        analysisValid: analysis.totalInvestment != null && analysis.totalInvestment > 0
      });

      // Extract prices from analysis (different handling for momentum vs All-Weather)
      const prices = {};
      console.log('=== ENHANCED PRICE EXTRACTION DEBUG ===');

      for (const etf of selectedETFs) {
        let extractedPrice = null;
        let priceSource = '';

        // Check if this is an All-Weather ETF (these don't have momentum data)
        const isAllWeatherETF = isAllWeatherETF(etf);
        const isAllWeatherStrategy = strategy?.type === STRATEGY_TYPES.ALL_WEATHER;

        if (isAllWeatherStrategy || isAllWeatherETF) {
          // For All-Weather strategy or All-Weather ETFs, get prices from trend signals or cached data
          const trendSignal = analysis.trendSignals?.[etf];
          if (trendSignal && trendSignal.currentPrice) {
            extractedPrice = trendSignal.currentPrice;
            priceSource = 'All-Weather trend signals';
            console.log(`Price extracted for ${etf}:`, {
              price: extractedPrice,
              source: priceSource,
              signal: trendSignal.signal,
              SMA: trendSignal.SMA,
              strategyCheck: isAllWeatherStrategy,
              etfCheck: isAllWeatherETF
            });
          } else {
            // For All-Weather, use preFetchService to get cached prices
            try {
              const priceData = await preFetchService.getCachedPrice(etf);
              if (priceData && priceData.price && priceData.price > 0 && priceData.price < 100000) {
                // Extract price from response object if needed
                extractedPrice = typeof priceData === 'object' && priceData.price ? priceData.price : priceData;
                priceSource = 'cached price (preFetchService)';
                console.log(`Price extracted for ${etf}:`, {
                  price: extractedPrice,
                  source: priceSource,
                  originalData: priceData,
                  strategyCheck: isAllWeatherStrategy,
                  etfCheck: isAllWeatherETF
                });
              }
            } catch (cacheError) {
              console.warn(`Failed to get cached price for ${etf}:`, cacheError);
            }
          }
        } else if (strategy?.type === STRATEGY_TYPES.MOMENTUM) {
          // Only extract momentum data for explicit momentum strategy AND non-All-Weather ETFs
          const momentumData = analysis.momentumScores?.[etf];

          // Extract price from momentum data - handle different data structures
          let momentumPrice = null;
          if (momentumData) {
            momentumPrice = momentumData.price || momentumData.currentPrice || momentumData.quote?.price;
          }

          if (momentumPrice && momentumPrice > 0 && momentumPrice < 100000) {
            extractedPrice = momentumPrice;
            priceSource = 'momentum analysis';
            console.log(`Price extracted for ${etf}:`, {
              price: extractedPrice,
              source: priceSource,
              absoluteMomentum: momentumData.absoluteMomentum,
              score: momentumData.score,
              dataKeys: Object.keys(momentumData)
            });
          }
        } else {
          // For unknown strategy or mixed scenarios, use preFetchService as safe default
          console.log(`Unknown strategy (${strategy?.type}) for ${etf}, using cached prices as safe default`);
          try {
            const priceData = await preFetchService.getCachedPrice(etf);
            if (priceData && priceData.price && priceData.price > 0 && priceData.price < 100000) {
              extractedPrice = typeof priceData === 'object' && priceData.price ? priceData.price : priceData;
              priceSource = 'cached price (safe default)';
              console.log(`Safe default price extracted for ${etf}:`, {
                price: extractedPrice,
                source: priceSource,
                strategyType: strategy?.type || 'undefined'
              });
            }
          } catch (cacheError) {
            console.warn(`Failed to get cached price for ${etf} (safe default):`, cacheError);
          }
        }

        // If we still don't have a valid price, try API call as fallback
        if (!extractedPrice || extractedPrice <= 0 || extractedPrice >= 100000) {
          console.warn(`Invalid or missing price for ${etf}, trying API fallback:`, {
            extractedPrice,
            priceSource,
            strategy: strategy?.type
          });

          try {
            const priceData = await this.getCurrentPriceOptimized(etf);
            if (priceData && priceData.price && priceData.price > 0 && priceData.price < 100000) {
              extractedPrice = priceData.price;
              priceSource = 'direct API call (fallback)';
              console.log(`Price fetched for ${etf} (API fallback):`, {
                price: extractedPrice,
                source: priceSource,
                timestamp: priceData.timestamp
              });
            } else {
              throw new Error(`Invalid price data received: ${JSON.stringify(priceData)}`);
            }
          } catch (error) {
            console.error(`Failed to fetch price for ${etf}, using fallback:`, {
              error: error.message,
              isRateLimit: error.message.includes('rate limit') || error.message.includes('429')
            });

            // Use a more reasonable fallback based on ETF type
            prices[etf] = this.getFallbackPriceForETF(etf);
            console.log(`Using intelligent fallback price for ${etf}:`, {
              price: prices[etf],
              source: 'intelligent fallback based on ETF type'
            });
          }
        } else {
          // Successfully extracted price, assign it
          prices[etf] = extractedPrice;
          console.log(`Final price assigned for ${etf}:`, {
            price: extractedPrice,
            source: priceSource
          });
        }
      }

      // Debug analysis results including momentum scores
      console.log('=== ANALYSIS DEBUG ===');
      console.log('Strategy analysis result:', {
        strategy: strategy.type,
        momentumScores: analysis.momentumScores,
        targetAllocations: analysis.targetAllocations,
        selectedETFs: selectedETFs
      });

      // Enhanced debug for momentum allocation issue
      console.log('=== MOMENTUM ALLOCATION DEBUG ===');
      const etfsWithNonZeroAllocation = Object.entries(analysis.targetAllocations)
        .filter(([etf, allocation]) => allocation > 0)
        .map(([etf, allocation]) => ({ etf, allocation }));
      
      console.log('ETFs with non-zero allocation:', etfsWithNonZeroAllocation);
      console.log('All selected ETFs:', selectedETFs);
      console.log('ETFs with 0% allocation that should be excluded:',
        selectedETFs.filter(etf => !analysis.targetAllocations[etf] || analysis.targetAllocations[etf] === 0)
      );

      // Prepare target ETFs in the format expected by the optimization service
      // BUG FIX: Only include ETFs with non-zero allocations to prevent budget splitting
      const targetETFs = selectedETFs
        .filter(etf => analysis.targetAllocations[etf] && analysis.targetAllocations[etf] > 0)
        .map(etf => {
          const targetETF = {
            name: etf,
            targetPercentage: analysis.targetAllocations[etf],
            pricePerShare: prices[etf],
            allowedDeviation: 5 // Default 5% deviation
          };

          console.log(`Target ETF ${etf}:`, {
            name: targetETF.name,
            targetPercentage: targetETF.targetPercentage,
            pricePerShare: targetETF.pricePerShare,
            momentumScore: analysis.momentumScores?.[etf],
            hasValidPrice: targetETF.pricePerShare && targetETF.pricePerShare > 0,
            isIncluded: targetETF.targetPercentage > 0
          });

          return targetETF;
        });

      console.log('Final targetETFs array for optimization:', targetETFs.map(t => ({ name: t.name, percentage: t.targetPercentage })));

      
      // Prepare current holdings with current prices
      console.log('Preparing holdings with prices for optimization...');
      const holdingsWithPrices = await Promise.all(currentHoldings.map(async holding => {
        try {
          const priceData = await this.getCurrentPriceOptimized(holding.etf);
          console.log(`Price data for ${holding.etf}:`, {
            priceData,
            dataType: typeof priceData,
            hasPriceProperty: priceData && typeof priceData === 'object' && 'price' in priceData,
            priceValue: priceData && typeof priceData === 'object' ? priceData.price : priceData
          });
          
          // Handle both object and number return types
          const price = typeof priceData === 'object' ? priceData.price : priceData;
          
          const result = {
            name: holding.etf,
            shares: holding.shares,
            price: price
          };
          
          console.log(`Final holding data for ${holding.etf}:`, result);
          return result;
        } catch (error) {
          console.error(`Error getting price for ${holding.etf}:`, error);
          // Use fallback price to prevent optimization failure
          const fallbackPrice = this.getFallbackPriceForETF(holding.etf);
          console.log(`Using fallback price for ${holding.etf}:`, fallbackPrice);
          return {
            name: holding.etf,
            shares: holding.shares,
            price: fallbackPrice
          };
        }
      }));
      
      console.log('Final holdings with prices:', holdingsWithPrices);

      console.log('=== PORTFOLIO SERVICE OPTIMIZATION DEBUG ===');
      console.log('Calling optimization with:', {
        holdingsCount: holdingsWithPrices.length,
        targetETFsCount: targetETFs.length,
        additionalCapital,
        optimizationStrategy: constraints?.optimizationStrategy || 'minimize-leftover'
      });

      // Use existing portfolio optimization service
      const optimizationResult = await portfolioOptimizationService.optimizePortfolio({
        currentHoldings: holdingsWithPrices,
        targetETFs,
        extraCash: additionalCapital,
        optimizationStrategy: constraints?.optimizationStrategy || 'minimize-leftover',
        objectives: objectives || {}
      });

      console.log('=== OPTIMIZATION RESULT ANALYSIS ===');
      console.log('Solver status:', optimizationResult.solverStatus);
      console.log('Fallback used:', optimizationResult.fallbackUsed);
      console.log('Optimization metrics:', optimizationResult.optimizationMetrics);

      // Convert the result to match our expected format
      const optimizedAllocations = {};
      const targetValues = {};

      // Check if allocations array exists before forEach
      if (optimizationResult.allocations && Array.isArray(optimizationResult.allocations)) {
        optimizationResult.allocations.forEach(allocation => {
          optimizedAllocations[allocation.etfName] = allocation.finalShares;
          targetValues[allocation.etfName] = allocation.finalValue;
        });
      } else {
        // Fallback: create allocations from optimizationResult.optimizedAllocations if available
        if (optimizationResult.optimizedAllocations) {
          Object.entries(optimizationResult.optimizedAllocations).forEach(([etf, shares]) => {
            optimizedAllocations[etf] = shares;
            targetValues[etf] = shares * (prices[etf] || 100); // Use price or fallback
          });
        }
      }

      // Safely extract optimization metrics with fallbacks
      const optimizationMetrics = optimizationResult.optimizationMetrics || {};
      const totalBudgetUsed = optimizationMetrics.totalBudgetUsed || 0;
      const unusedBudget = optimizationMetrics.unusedBudget || additionalCapital;
      const unusedPercentage = optimizationMetrics.unusedPercentage || 0;

      console.log('=== FINAL PORTFOLIO SERVICE RESULT ===');
      console.log('Total budget used:', totalBudgetUsed);
      console.log('Unused budget:', unusedBudget);
      console.log('Unused percentage:', unusedPercentage.toFixed(2) + '%');
      console.log('Utilization rate:', (100 - unusedPercentage).toFixed(2) + '%');
      console.log('Solver status:', optimizationResult.solverStatus);
      console.log('Fallback used:', optimizationResult.fallbackUsed);
      
      if (unusedPercentage > 10) {
        console.warn('=== FINAL CASH UTILIZATION PROBLEM CONFIRMED ===');
        console.warn('High unused cash percentage in final result:', unusedPercentage.toFixed(2) + '%');
        console.warn('This confirms the optimization issue needs to be fixed');
      }

      return {
        optimizedAllocations,
        targetValues,
        utilizedCapital: totalBudgetUsed,
        uninvestedCash: unusedBudget,
        utilizationRate: 100 - unusedPercentage,
        objectiveValue: totalBudgetUsed,
        isOptimal: optimizationResult.solverStatus === 'optimal',
        solverStatus: optimizationResult.solverStatus || 'unknown',
        fallbackUsed: optimizationResult.fallbackUsed || false,
        allocations: optimizationResult.allocations || [],
        holdingsToSell: optimizationResult.holdingsToSell || []
      };

    } catch (error) {
      logger.logError(error, 'Portfolio optimization failed');
      throw error;
    }
  }

  
  /**
   * Helper method to get price for an ETF
   */
  async getETFPrice(ticker) {
    try {
      const priceResult = await preFetchService.fetchTickerPrice(ticker);
      if (priceResult.success) {
        return typeof priceResult.price === 'object' && priceResult.price.price
          ? priceResult.price.price
          : priceResult.price;
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${ticker}:`, error);
    }
    return null; // Return null if price fetch fails
  }

  /**
   * Generate execution plan with specific trades
   */
  async generateExecutionPlan({ strategy, selectedETFs, additionalCapital, currentHoldings, constraints }) {
    try {
      console.log('=== GENERATE EXECUTION PLAN DEBUG ===');
      console.log('Inputs:', {
        strategyType: strategy?.type,
        selectedETFsCount: selectedETFs?.length,
        selectedETFs: selectedETFs,
        additionalCapital,
        currentHoldingsCount: currentHoldings?.length,
        currentHoldings: currentHoldings
      });

      // Debug current holdings structure
      console.log('=== CURRENT HOLDINGS STRUCTURE DEBUG ===');
      if (currentHoldings && currentHoldings.length > 0) {
        currentHoldings.forEach(holding => {
          console.log(`Holding ${holding.etf}:`, {
            shares: holding.shares,
            price: holding.price,
            pricePerShare: holding.pricePerShare,
            totalValue: holding.totalValue,
            calculatedValue: holding.price ? holding.price * holding.shares : 'NO_PRICE'
          });
        });
      }

      // ENRICH CURRENT HOLDINGS WITH PRICES (same as optimization service)
      const needsPriceFetch = currentHoldings.some(h => !h.price || !h.totalValue);
      let enrichedHoldings = currentHoldings;

      if (needsPriceFetch) {
        console.log('=== ENRICHING EXECUTION PLAN HOLDINGS WITH PRICES ===');
        const tickers = currentHoldings.map(h => h.etf);

        let prices = {};
        if (tickers.length > 0) {
          try {
            const priceResult = await preFetchService.preFetchPrices(tickers);
            const rawPrices = priceResult.prices || {};
            prices = {};

            Object.entries(rawPrices).forEach(([ticker, priceData]) => {
              if (priceData && typeof priceData === 'object' && 'price' in priceData) {
                prices[ticker] = priceData.price;
              } else if (typeof priceData === 'number') {
                prices[ticker] = priceData;
              } else {
                console.warn(`Invalid price format for ${ticker}:`, priceData);
                prices[ticker] = 100;
              }
            });

            console.log('Enriched execution plan prices:', prices);
          } catch (error) {
            console.warn('Failed to fetch prices for execution plan, using fallbacks:', error);
          }
        }

        enrichedHoldings = currentHoldings.map(holding => ({
          ...holding,
          price: holding.price || prices[holding.etf] || 100,
          totalValue: holding.totalValue || (holding.price || prices[holding.etf] || 100) * holding.shares
        }));

        console.log('Enriched holdings for execution plan:', enrichedHoldings);
      }

      // Use enriched holdings for optimization
      const optimization = await this.optimizePortfolio({
        strategy,
        selectedETFs,
        additionalCapital,
        currentHoldings: enrichedHoldings,
        constraints
      });

      console.log('Optimization result:', {
        allocationsCount: optimization.allocations?.length || 0,
        holdingsToSellCount: optimization.holdingsToSell?.length || 0,
        utilizedCapital: optimization.utilizedCapital,
        uninvestedCash: optimization.uninvestedCash
      });

      // Generate trade list from optimization result
      const trades = [];
      let totalTradeValue = 0;

      console.log('=== REBALANCING TRADES GENERATION ===');
      console.log('Enriched current holdings:', enrichedHoldings);
      console.log('Optimization target allocations:', optimization.allocations);

      // Process rebalancing trades: compare current holdings vs target allocations
      if (enrichedHoldings && optimization.allocations) {
        // Create a map of current holdings for easy lookup
        const currentHoldingsMap = new Map();
        enrichedHoldings.forEach(holding => {
          if (holding.shares > 0) {
            // Calculate totalValue from price * shares if not provided
            const calculatedTotalValue = holding.price
              ? holding.price * holding.shares
              : holding.totalValue || 0;

            console.log(`Creating map entry for ${holding.etf}:`, {
              shares: holding.shares,
              price: holding.price,
              providedTotalValue: holding.totalValue,
              calculatedTotalValue,
              pricePerShare: holding.pricePerShare
            });

            currentHoldingsMap.set(holding.etf, {
              shares: holding.shares,
              totalValue: calculatedTotalValue,
              pricePerShare: holding.pricePerShare || holding.price || (calculatedTotalValue / holding.shares) || 0
            });
          }
        });

        // Check each target allocation against current holdings
        for (const allocation of optimization.allocations) {
          const etfName = allocation.etfName;
          const targetValue = allocation.finalValue || 0;
          const currentHolding = currentHoldingsMap.get(etfName);

          if (currentHolding) {
            // This ETF exists in current holdings
            const currentValue = currentHolding.totalValue;
            const difference = targetValue - currentValue;

            console.log(`Rebalancing ${etfName}:`, {
              currentValue,
              targetValue,
              difference,
              shouldBuy: difference > 0,
              shouldSell: difference < 0
            });

            if (Math.abs(difference) > 10) { // Only trade if difference > $10
              if (difference > 0) {
                // Need to buy more - get current price
                const etfPrice = await this.getETFPrice(etfName);
                const price = currentHolding.pricePerShare || etfPrice || 100;
                const sharesToBuy = difference / price;
                trades.push({
                  etf: etfName,
                  action: 'buy',
                  shares: sharesToBuy,
                  value: difference,
                  price: price,
                  reason: 'Portfolio Rebalance - Underweight Target'
                });
                totalTradeValue += difference;
              } else if (difference < 0) {
                // Need to sell excess - get current price
                const etfPrice = await this.getETFPrice(etfName);
                const price = currentHolding.pricePerShare || etfPrice || 100;
                const excessValue = Math.abs(difference);
                const sharesToSell = excessValue / price;
                trades.push({
                  etf: etfName,
                  action: 'sell',
                  shares: sharesToSell,
                  value: excessValue,
                  price: price,
                  reason: 'Portfolio Rebalance - Overweight Target'
                });
                totalTradeValue += excessValue;
              }
            }

            // Remove from map so we don't process it again as non-target
            currentHoldingsMap.delete(etfName);
          }
        }
      }

      // Process buy trades from optimization (for new holdings or underweight)
      if (optimization.allocations) {
        for (const allocation of optimization.allocations) {
          // Skip if we already processed this ETF in rebalancing
          const alreadyProcessed = trades.some(trade => trade.etf === allocation.etfName);
          if (!alreadyProcessed && allocation.sharesToBuy > 0) {
            // Get real price for this ETF
            const etfPrice = await this.getETFPrice(allocation.etfName);
            const finalPrice = etfPrice || 100; // fallback price

            trades.push({
              etf: allocation.etfName,
              action: 'buy',
              shares: allocation.sharesToBuy,
              value: allocation.costOfPurchase || (allocation.sharesToBuy * finalPrice),
              price: finalPrice,
              reason: 'Portfolio Rebalance - New Position'
            });
            totalTradeValue += allocation.costOfPurchase || (allocation.sharesToBuy * finalPrice);
          }
        }
      }

      // Process sell trades for holdings not in target at all
      if (optimization.holdingsToSell) {
        optimization.holdingsToSell.forEach(holding => {
          trades.push({
            etf: holding.name,
            action: 'sell',
            shares: holding.shares,
            value: holding.totalValue,
            price: holding.pricePerShare,
            reason: 'Portfolio Rebalance - Not in Target Allocation'
          });
          totalTradeValue += holding.totalValue;
        });
      }

      // Additional logic: Identify holdings that are not in selectedETFs but have current value
      // This ensures we sell all non-target holdings
      const selectedETFSet = new Set(selectedETFs);
      const nonTargetHoldings = enrichedHoldings.filter(holding =>
        !selectedETFSet.has(holding.etf) && holding.shares > 0
      );

      console.log('Non-target holdings identified:', nonTargetHoldings);

      // Add sell trades for non-target holdings if not already included
      for (const holding of nonTargetHoldings) {
        const alreadyIncluded = trades.some(trade =>
          trade.action === 'sell' && trade.etf === holding.etf
        );

        if (!alreadyIncluded) {
          // Use enriched price and totalValue directly
          const price = holding.price;
          const totalValue = holding.totalValue;

          trades.push({
            etf: holding.etf,
            action: 'sell',
            shares: holding.shares,
            value: totalValue,
            price: price,
            reason: 'Not in target allocation'
          });
          totalTradeValue += totalValue;

          console.log(`Added sell trade for non-target holding ${holding.etf}:`, {
            shares: holding.shares,
            price,
            totalValue
          });
        }
      }

      // Sort trades by action (sells first, then buys)
      trades.sort((a, b) => {
        if (a.action !== b.action) {
          return a.action === 'sell' ? -1 : 1;
        }
        return b.value - a.value; // Larger trades first
      });

      console.log('Final execution plan trades:', trades);

      return {
        trades,
        totalTradeValue,
        tradeCount: trades.length,
        utilizationRate: optimization.utilizationRate,
        expectedReturn: this.calculateExpectedReturn(trades, strategy.type),
        estimatedTime: this.estimateExecutionTime(trades),
        optimization,
        solverStatus: optimization.solverStatus,
        fallbackUsed: optimization.fallbackUsed || false
      };

    } catch (error) {
      logger.logError(error, 'Execution plan generation failed');
      throw error;
    }
  }

  /**
   * Calculate momentum scores for ETFs using momentumService for consistency
   */
  async calculateMomentumScores(etfs) {
    const momentumService = require('./momentumService');
    const scores = [];

    for (const etf of etfs) {
      try {
        console.log(`Calculating momentum for ${etf} using momentumService...`);

        // Use momentumService.calculateMomentum for consistent price extraction
        const momentumResult = await momentumService.calculateMomentum(etf, false);

        // Use getDetailedPrices to get current price with better fallback logic
        let currentPrice = 100; // Ultimate fallback
        try {
          const priceDetails = await momentumService.getDetailedPrices(etf, false);
          // Extract the real price from the detailed prices response
          currentPrice = priceDetails.currentPrice || priceDetails.quote?.price;
          console.log(`Price extracted for ${etf}:`, {
            price: currentPrice,
            source: 'momentum service detailed prices',
            hasCurrentPrice: !!priceDetails.currentPrice,
            quotePrice: priceDetails.quote?.price
          });
        } catch (priceError) {
          console.warn(`Failed to get detailed prices for ${etf}, trying direct quote:`, priceError.message);
          try {
            // Additional fallback to financeService if momentumService fails
            const priceResult = await financeService.getCurrentPrice(etf);
            // Handle both object and number return types
            currentPrice = typeof priceResult === 'object' ? priceResult.price : priceResult;
            console.log(`Price extracted for ${etf} (fallback):`, {
              price: currentPrice,
              source: 'direct finance service call',
              originalResult: priceResult
            });
          } catch (fallbackError) {
            console.warn(`All price extraction methods failed for ${etf}, using fallback:`, fallbackError.message);
            currentPrice = 100;
          }
        }

        // Validate price but be less aggressive about fallbacks
        if (!currentPrice || currentPrice <= 0 || currentPrice > 100000) {
          console.warn(`Price validation failed for ${etf} (${currentPrice}), using fallback price of 100`);
          currentPrice = 100;
        }

        // Calculate period returns if we have momentum data
        let momentum3m = 0, momentum6m = 0, momentum9m = 0, momentum12m = 0, weightedScore = 0;

        if (momentumResult && momentumResult.periods) {
          momentum3m = momentumResult.periods['3month'] || 0;
          momentum6m = momentumResult.periods['6month'] || 0;
          momentum9m = momentumResult.periods['9month'] || 0;
          momentum12m = momentumResult.periods['12month'] || 0;

          // Use same weighted calculation as momentumService
          weightedScore = (momentum3m * 0.3 + momentum6m * 0.3 + momentum9m * 0.2 + momentum12m * 0.2);
        }

        console.log(`Momentum calculated for ${etf}:`, {
          momentum3m,
          momentum6m,
          momentum9m,
          momentum12m,
          weightedScore,
          price: currentPrice,
          absoluteMomentum: momentumResult?.absoluteMomentum
        });

        scores.push({
          ticker: etf,
          score: weightedScore,
          momentum3m,
          momentum6m,
          momentum9m,
          momentum12m,
          price: currentPrice,
          absoluteMomentum: momentumResult?.absoluteMomentum || false
        });

      } catch (error) {
        console.error(`Error calculating momentum for ${etf}:`, error);
        logger.logError(error, `Failed to calculate momentum for ${etf}`);

        // Enhanced fallback price extraction with better error handling
        let currentPrice = 100; // Default fallback
        try {
          // Try direct finance service call as fallback
          const priceResult = await financeService.getCurrentPrice(etf);
          if (priceResult && priceResult.price && priceResult.price > 0 && priceResult.price < 100000) {
            currentPrice = priceResult.price;
            console.log(`Price extracted for ${etf} (error fallback):`, {
              price: currentPrice,
              source: 'error fallback to finance service'
            });
          } else {
            console.warn(`Invalid fallback price for ${etf}: ${priceResult?.price}, using 100`);
          }
        } catch (priceError) {
          console.warn(`Failed to get current price for ${etf} in error case:`, priceError.message);
          // Check if this is a rate limiting error
          if (priceError.message && (
            priceError.message.includes('rate limit') ||
            priceError.message.includes('429') ||
            priceError.message.includes('too many requests')
          )) {
            console.warn(`Rate limit detected for ${etf}, using fallback price and skipping additional API calls`);
          }
        }

        scores.push({
          ticker: etf,
          score: 0,
          momentum3m: 0,
          momentum6m: 0,
          momentum9m: 0,
          momentum12m: 0,
          price: currentPrice,
          absoluteMomentum: false
        });
      }
    }

    return scores;
  }

  /**
   * Calculate period return from historical data
   */
  calculatePeriodReturn(data, periodDays) {
    if (data.length < periodDays + 1) return 0;

    const currentPrice = data[data.length - 1].close;
    const pastPrice = data[data.length - 1 - periodDays].close;

    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  /**
   * Check if ETFs are above SMA
   */
  async checkSMATrend(etfs, period) {
    const results = {};

    for (const etf of etfs) {
      try {
        const historicalData = await financeService.getHistoricalDailyData(etf, period + 30);

        if (historicalData && historicalData.length >= period) {
          const currentPrice = historicalData[historicalData.length - 1].close;
          const sma = this.calculateSMA(historicalData, period);

          results[etf] = {
            aboveSMA: currentPrice > sma,
            currentPrice,
            sma,
            distance: ((currentPrice - sma) / sma) * 100
          };
        } else {
          results[etf] = { aboveSMA: true, currentPrice: 0, sma: 0, distance: 0 };
        }
      } catch (error) {
        logger.logError(error, `Failed to check SMA for ${etf}`);
        results[etf] = { aboveSMA: true, currentPrice: 0, sma: 0, distance: 0 };
      }
    }

    return results;
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data, period) {
    if (data.length < period) return 0;

    const recentData = data.slice(-period);
    const sum = recentData.reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }

  /**
   * Check if ETF is a stock ETF
   */
  isStockETF(etf) {
    const stockETFs = ['VTI', 'VEA', 'VWO', 'SPY', 'QQQ', 'IWM', 'IWV'];
    return stockETFs.includes(etf);
  }

  /**
   * Check if ETF is a bond ETF
   */
  isBondETF(etf) {
    const bondETFs = ['TLT', 'BWX', 'BND', 'AGG', 'SGOV', 'VUBS', 'BIL', 'SHY'];
    return bondETFs.includes(etf);
  }

  /**
   * Calculate portfolio value
   */
  async calculatePortfolioValue(holdings) {
    console.log('=== DEBUG CALCULATE PORTFOLIO VALUE START ===');
    console.log('Holdings to value:', holdings);
    
    let totalValue = 0;

    for (const holding of holdings) {
      try {
        console.log(`Getting price for ${holding.etf}...`);
        const priceData = await this.getCurrentPriceOptimized(holding.etf);
        console.log(`Price data received for ${holding.etf}:`, {
          priceData,
          dataType: typeof priceData,
          hasPriceProperty: priceData && typeof priceData === 'object' && 'price' in priceData,
          priceValue: priceData && typeof priceData === 'object' ? priceData.price : priceData,
          holdingShares: holding.shares
        });
        
        // Handle both object and number return types
        const price = typeof priceData === 'object' ? priceData.price : priceData;
        const holdingValue = holding.shares * price;
        totalValue += holdingValue;
        
        console.log(`Holding value calculated for ${holding.etf}:`, {
          price,
          shares: holding.shares,
          holdingValue,
          runningTotal: totalValue
        });
      } catch (error) {
        console.error(`Error calculating value for ${holding.etf}:`, error);
        logger.logError(error, `Failed to get price for ${holding.etf}`);
        // Continue with other holdings instead of failing completely
      }
    }

    console.log('Final portfolio value calculation:', {
      totalValue,
      holdingsCount: holdings.length,
      isValid: totalValue != null && totalValue >= 0
    });
    console.log('=== DEBUG CALCULATE PORTFOLIO VALUE END ===');
    
    return totalValue;
  }

  /**
   * Get current holdings (mock implementation)
   */
  async getCurrentHoldings() {
    // This would typically come from a database or brokerage API
    return [
      { etf: 'VTI', shares: 10 },
      { etf: 'VEA', shares: 15 },
      { etf: 'BND', shares: 25 }
    ];
  }

  /**
   * Execute trades (simulation)
   */
  async executeTrades(trades, dryRun = true) {
    logger.logInfo('Executing trades', { tradeCount: trades.length, dryRun });

    const executedTrades = [];
    let totalValue = 0;

    for (const trade of trades) {
      try {
        if (!dryRun) {
          // Execute actual trade (placeholder for real brokerage integration)
          logger.logInfo(`Executing ${trade.action} ${trade.shares} shares of ${trade.etf}`);
        }

        executedTrades.push({
          ...trade,
          executedPrice: trade.price || (await this.getCurrentPriceOptimized(trade.etf)).price,
          executedValue: trade.shares * (trade.price || (await this.getCurrentPriceOptimized(trade.etf)).price),
          status: 'executed',
          timestamp: new Date().toISOString()
        });

        totalValue += executedTrades[executedTrades.length - 1].executedValue;

      } catch (error) {
        logger.logError(error, `Failed to execute trade for ${trade.etf}`);
        executedTrades.push({
          ...trade,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      trades: executedTrades,
      totalValue,
      successCount: executedTrades.filter(t => t.status === 'executed').length,
      failureCount: executedTrades.filter(t => t.status === 'failed').length,
      dryRun
    };
  }

  /**
   * Get strategy performance history
   */
  async getStrategyPerformance(strategyType, period = '1M') {
    // Mock implementation - would typically come from performance database
    return {
      strategyType,
      period,
      totalReturn: 12.5,
      annualizedReturn: 15.2,
      volatility: 8.7,
      sharpeRatio: 1.75,
      maxDrawdown: -5.3,
      winRate: 0.68,
      dataPoints: 30
    };
  }

  /**
   * Get trade reason
   */
  getTradeReason(difference, targetValue, currentValue) {
    const percentDiff = Math.abs(difference / targetValue) * 100;

    if (difference > 0) {
      return percentDiff > 20 ? 'Significant Underweight' : 'Underweight';
    } else {
      return percentDiff > 20 ? 'Significant Overweight' : 'Overweight';
    }
  }

  /**
   * Calculate expected return
   */
  calculateExpectedReturn(trades, strategyType) {
    // Mock calculation based on strategy type and trades
    const baseReturn = strategyType === 'momentum' ? 0.12 : 0.08;
    const adjustment = trades.length * 0.005; // Small adjustment for trade count
    return (baseReturn + adjustment) * 100;
  }

  /**
   * Estimate execution time
   */
  estimateExecutionTime(trades) {
    // Mock estimation: 30 seconds per trade
    const baseTime = 60; // 1 minute setup
    const perTradeTime = 30; // 30 seconds per trade
    return baseTime + (trades.length * perTradeTime);
  }

  /**
   * Get intelligent fallback price for an ETF based on its type
   */
  getFallbackPriceForETF(etf) {
    // Intelligent fallback prices based on ETF categories
    const fallbackPrices = {
      // Stock ETFs - generally higher prices
      'VTI': 320, 'SPY': 450, 'QQQ': 350, 'IWM': 200, 'IWV': 300,
      'VEA': 60, 'VWO': 55, 'VXUS': 65, 'VT': 110, 'EWU': 35,

      // Bond ETFs - generally moderate prices
      'BND': 75, 'AGG': 100, 'TLT': 95, 'BWX': 50, 'SHY': 85,
      'IEF': 90, 'GOVT': 70, 'SPLB': 55, 'VUBS': 50, 'BIL': 92,
      'SGOV': 100,

      // Commodity and alternative ETFs
      'GLDM': 85, 'GLD': 180, 'IAU': 40, 'SLV': 20, 'PDBC': 20,

      // Crypto ETFs
      'IBIT': 50, 'FBTC': 65, 'BITO': 35,

      // Sector ETFs
      'VGT': 450, 'VHT': 250, 'VFH': 85, 'VDC': 180, 'VDE': 160,
      'VPU': 150, 'VCR': 210, 'VIS': 120, 'VOX': 95, 'VNQ': 100,

      // International
      'EWJ': 65, 'EWG': 35, 'EWQ': 30, 'EWC': 28, 'EWA': 25,
      'EWH': 28, 'EWS': 32, 'EWY': 70, 'EWT': 35, 'EWZ': 25,

      // Default fallback for unknown ETFs
      'default': 100
    };

    const upperETF = etf.toUpperCase();

    // Look for exact match first
    if (fallbackPrices[upperETF]) {
      return fallbackPrices[upperETF];
    }

    // Try to match by pattern (starts with)
    for (const [key, price] of Object.entries(fallbackPrices)) {
      if (key !== 'default' && upperETF.startsWith(key.substring(0, 3))) {
        return price;
      }
    }

    // Use default fallback
    return fallbackPrices.default;
  }
}

module.exports = new PortfolioService();