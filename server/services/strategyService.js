/**
 * Portfolio allocation strategy service
 */

const momentumService = require('./momentumService');
const customETFService = require('./customETFService');
const smaService = require('./smaService');
const allWeatherService = require('./allWeatherService');
const cacheService = require('./cacheService');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

// File path for storing strategy configurations
const STRATEGY_FILE = path.join(__dirname, '../local_data/strategies.json');

/**
 * Strategy configuration structure
 * @typedef {Object} AllocationStrategy
 * @property {string} id - Unique strategy ID
 * @property {string} name - Strategy name
 * @property {string} type - Strategy type (percentage, momentum, sma, hybrid, allweather)
 * @property {StrategyParameters} parameters - Strategy parameters
 * @property {string} created - Creation timestamp
 * @property {string} updated - Last update timestamp
 * @property {string} [description] - Strategy description
 */

/**
 * Strategy parameters structure
 * @typedef {Object} StrategyParameters
 * @property {Object} [allocations] - Percentage allocations by ticker
 * @property {number} [topN] - Top N ETFs for momentum strategy
 * @property {number} [momentumThreshold] - Minimum momentum score
 * @property {number} [smaPeriod] - SMA period (default: 200)
 * @property {number} [trendThreshold] - Trend threshold percentage
 * @property {Object} [strategyWeights] - Weights for hybrid strategies
 */

/**
 * Initialize strategy storage
 */
async function initializeStrategyStorage() {
  try {
    const dataDir = path.dirname(STRATEGY_FILE);
    await fs.mkdir(dataDir, { recursive: true });

    // Create empty file if it doesn't exist
    try {
      await fs.access(STRATEGY_FILE);
    } catch {
      const defaultStrategies = [
        {
          id: 'default-momentum',
          name: 'Default Momentum',
          type: 'momentum',
          parameters: {
            topN: 3,
            momentumThreshold: 0
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          description: 'Default momentum-based allocation strategy'
        }
      ];
      await fs.writeFile(STRATEGY_FILE, JSON.stringify(defaultStrategies, null, 2));
      logger.logInfo('Strategy storage initialized with default strategy');
    }
  } catch (error) {
    logger.logError(error, 'Failed to initialize strategy storage');
    throw error;
  }
}

/**
 * Load strategies from storage
 * @returns {Promise<AllocationStrategy[]>}
 */
async function loadStrategies() {
  try {
    const data = await fs.readFile(STRATEGY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.logError(error, 'Failed to load strategies');
    return [];
  }
}

/**
 * Save strategies to storage
 * @param {AllocationStrategy[]} strategies
 */
async function saveStrategies(strategies) {
  try {
    await fs.writeFile(STRATEGY_FILE, JSON.stringify(strategies, null, 2));
  } catch (error) {
    logger.logError(error, 'Failed to save strategies');
    throw error;
  }
}

/**
 * Create a new strategy
 * @param {Object} config - Strategy configuration
 * @returns {Promise<AllocationStrategy>}
 */
async function createStrategy(config) {
  try {
    const { name, type, parameters, description } = config;

    // Validate required fields
    if (!name || !type || !parameters) {
      throw new Error('Missing required fields: name, type, and parameters are required');
    }

    // Validate strategy type
    const validTypes = ['percentage', 'momentum', 'sma', 'hybrid', 'allweather'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid strategy type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Load existing strategies
    const strategies = await loadStrategies();

    // Check for duplicate name
    const existingStrategy = strategies.find(s => s.name === name);
    if (existingStrategy) {
      throw new Error(`Strategy with name "${name}" already exists`);
    }

    // Create new strategy
    const newStrategy = {
      id: `strategy_${Date.now()}`,
      name,
      type,
      parameters,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      description
    };

    // Add to list and save
    strategies.push(newStrategy);
    await saveStrategies(strategies);

    logger.logInfo('Strategy created successfully', { id: newStrategy.id, name, type });
    return newStrategy;
  } catch (error) {
    logger.logError(error, 'Failed to create strategy');
    throw error;
  }
}

/**
 * Update an existing strategy
 * @param {string} strategyId - Strategy ID
 * @param {Object} updates - Strategy updates
 * @returns {Promise<AllocationStrategy>}
 */
async function updateStrategy(strategyId, updates) {
  try {
    const strategies = await loadStrategies();
    const strategyIndex = strategies.findIndex(s => s.id === strategyId);

    if (strategyIndex === -1) {
      throw new Error(`Strategy with ID ${strategyId} not found`);
    }

    // Update strategy
    strategies[strategyIndex] = {
      ...strategies[strategyIndex],
      ...updates,
      updated: new Date().toISOString()
    };

    await saveStrategies(strategies);

    logger.logInfo('Strategy updated successfully', { strategyId });
    return strategies[strategyIndex];
  } catch (error) {
    logger.logError(error, 'Failed to update strategy');
    throw error;
  }
}

/**
 * Get all strategies
 * @returns {Promise<AllocationStrategy[]>}
 */
async function getStrategies() {
  return await loadStrategies();
}

/**
 * Get strategy by ID
 * @param {string} strategyId
 * @returns {Promise<AllocationStrategy>}
 */
async function getStrategy(strategyId) {
  const strategies = await loadStrategies();
  const strategy = strategies.find(s => s.id === strategyId);

  if (!strategy) {
    throw new Error(`Strategy with ID ${strategyId} not found`);
  }

  return strategy;
}

/**
 * Delete a strategy
 * @param {string} strategyId
 * @returns {Promise<boolean>}
 */
async function deleteStrategy(strategyId) {
  try {
    const strategies = await loadStrategies();
    const initialLength = strategies.length;

    const filteredStrategies = strategies.filter(s => s.id !== strategyId);

    if (filteredStrategies.length === initialLength) {
      throw new Error(`Strategy with ID ${strategyId} not found`);
    }

    await saveStrategies(filteredStrategies);

    logger.logInfo('Strategy deleted', { strategyId });
    return true;
  } catch (error) {
    logger.logError(error, 'Failed to delete strategy');
    throw error;
  }
}

/**
 * Calculate allocation based on strategy
 * @param {string[]} etfUniverse - ETF tickers to consider
 * @param {AllocationStrategy} strategy - Allocation strategy
 * @param {Object} [currentHoldings] - Current portfolio holdings
 * @returns {Promise<Object>} - Allocation results
 */
async function calculateAllocation(etfUniverse, strategy, currentHoldings = {}) {
  try {
    const cacheKey = `allocation_${strategy.id}_${etfUniverse.join('_')}`;

    // Check cache first
    const cached = await cacheService.getCachedData(cacheKey);
    if (cached) {
      logger.logDebug('Allocation retrieved from cache', { strategy: strategy.name });
      return cached;
    }

    logger.logInfo('Calculating allocation', { strategy: strategy.name, etfCount: etfUniverse.length });

    let allocation = {};

    switch (strategy.type) {
      case 'percentage':
        allocation = await calculatePercentageAllocation(etfUniverse, strategy.parameters);
        break;

      case 'momentum':
        allocation = await calculateMomentumAllocation(etfUniverse, strategy.parameters);
        break;

      case 'sma':
        allocation = await smaService.calculateSMAAllocation(etfUniverse, strategy.parameters);
        break;

      case 'hybrid':
        allocation = await calculateHybridAllocation(etfUniverse, strategy.parameters);
        break;

      case 'allweather':
        allocation = await allWeatherService.analyzeAllWeatherStrategy(etfUniverse, strategy.parameters, currentHoldings);
        break;

      default:
        throw new Error(`Unsupported strategy type: ${strategy.type}`);
    }

    const result = {
      strategy: strategy.name,
      allocation,
      timestamp: new Date().toISOString()
    };

    // Cache for 1 hour
    await cacheService.setCachedData(cacheKey, result, 3600);

    return result;
  } catch (error) {
    logger.logError(error, 'Failed to calculate allocation');
    throw error;
  }
}

/**
 * Calculate percentage-based allocation
 * @param {string[]} etfUniverse
 * @param {StrategyParameters} parameters
 * @returns {Promise<Object>}
 */
async function calculatePercentageAllocation(etfUniverse, parameters) {
  const { allocations } = parameters;

  if (!allocations) {
    throw new Error('Percentage allocations not defined');
  }

  // Validate that allocations sum to 100%
  const totalAllocation = Object.values(allocations).reduce((sum, percent) => sum + percent, 0);
  if (Math.abs(totalAllocation - 100) > 0.01) {
    throw new Error(`Allocations must sum to 100%, got ${totalAllocation}%`);
  }

  // Filter allocations to only include ETFs in universe
  const filteredAllocations = {};
  etfUniverse.forEach(ticker => {
    if (allocations[ticker] !== undefined) {
      filteredAllocations[ticker] = allocations[ticker];
    }
  });

  return filteredAllocations;
}

/**
 * Calculate momentum-based allocation
 * @param {string[]} etfUniverse
 * @param {StrategyParameters} parameters
 * @returns {Promise<Object>}
 */
async function calculateMomentumAllocation(etfUniverse, parameters) {
  const { topN = 3, momentumThreshold = 0 } = parameters;

  // Calculate momentum for all ETFs
  const momentumResults = await Promise.all(
    etfUniverse.map(async ticker => {
      try {
        const momentum = await momentumService.calculateMomentum(ticker);
        return {
          ticker,
          momentum: momentum.compositeScore,
          name: momentum.name
        };
      } catch (error) {
        logger.logWarn('Failed to calculate momentum for ETF', { ticker, error: error.message });
        return {
          ticker,
          momentum: -Infinity,
          name: ticker
        };
      }
    })
  );

  // Filter by momentum threshold and sort by momentum
  const validETFs = momentumResults
    .filter(etf => etf.momentum >= momentumThreshold)
    .sort((a, b) => b.momentum - a.momentum);

  // Take top N ETFs
  const topETFs = validETFs.slice(0, topN);

  if (topETFs.length === 0) {
    throw new Error('No ETFs meet the momentum threshold');
  }

  // Calculate equal allocation among top ETFs
  const allocation = {};
  const equalPercent = 100 / topETFs.length;
  topETFs.forEach(etf => {
    allocation[etf.ticker] = equalPercent;
  });

  return allocation;
}


/**
 * Calculate hybrid allocation (placeholder)
 * @param {string[]} etfUniverse
 * @param {StrategyParameters} parameters
 * @returns {Promise<Object>}
 */
async function calculateHybridAllocation(etfUniverse, parameters) {
  // This will combine multiple strategies
  throw new Error('Hybrid allocation strategy not yet implemented');
}

// Initialize storage on module load
initializeStrategyStorage().catch(error => {
  logger.logError(error, 'Failed to initialize strategy storage');
});

module.exports = {
  createStrategy,
  updateStrategy,
  getStrategies,
  getStrategy,
  deleteStrategy,
  calculateAllocation
};