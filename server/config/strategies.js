/**
 * Strategy Configuration - Centralized ETF Universes and Settings
 * This file contains all strategy-specific ETF lists and configurations
 * to ensure consistency across the entire application.
 */

/**
 * All-Weather Strategy ETF Universe
 * Dalio-inspired portfolio with specific ETF selections
 */
const ALL_WEATHER_ETFS = [
  'VTI',   // Vanguard Total Stock Market ETF
  'VEA',   // Vanguard FTSE Developed Markets ETF
  'VWO',   // Vanguard FTSE Emerging Markets ETF
  'IEF',   // iShares 7-10 Year Treasury Bond ETF
  'TIP',   // iShares TIPS Bond ETF
  'IGIL.L', // iShares Global Inflation UCITS ETF (London)
  'PDBC',  // Invesco Optimum Yield Diversified Commodity Strategy ETF
  'GLDM',  // SPDR Gold MiniShares Trust
  'SGOV'   // iShares Short Treasury Bond ETF
];

/**
 * Momentum Strategy ETF Universe
 * ETFs with strong momentum characteristics for momentum-based investing
 */
const MOMENTUM_ETFS = [
  'VTI',   // Vanguard Total Stock Market ETF
  'VEA',   // Vanguard FTSE Developed Markets ETF
  'VWO',   // Vanguard FTSE Emerging Markets ETF
  'TLT',   // iShares 20+ Year Treasury Bond ETF
  'BWX',   // SPDR Bloomberg International Treasury Bond ETF
  'BND',   // Vanguard Total Bond Market ETF
  'PDBC',  // Invesco Optimum Yield Diversified Commodity Strategy ETF
  'GLDM',  // SPDR Gold MiniShares Trust
  'IBIT'   // iShares Bitcoin Trust ETF
];

/**
 * Strategy Type Definitions
 */
const STRATEGY_TYPES = {
  ALL_WEATHER: 'allweather',
  MOMENTUM: 'momentum',
  HYBRID: 'hybrid'
};

/**
 * Strategy-specific configurations
 */
const STRATEGY_CONFIG = {
  [STRATEGY_TYPES.ALL_WEATHER]: {
    name: 'All-Weather Portfolio',
    description: 'Dalio-inspired All-Weather strategy with 10-month SMA trend filtering and SGOV cash fallback',
    etfs: ALL_WEATHER_ETFS,
    targetAllocations: {
      'VTI': 10,      // US Stocks - 10%
      'VEA': 10,      // Developed market (ex US) stocks - 10%
      'VWO': 5,       // Emerging market stocks - 5%
      'IEF': 40,      // 7-10 year Treasuries - 40%
      'TIP': 7.5,     // US TIPS - 7.5%
      'IGIL.L': 7.5,  // Int'l inflation-linked gov't bonds - 7.5%
      'PDBC': 10,     // Commodities basket - 10%
      'GLDM': 10      // Gold - 10%
    },
    cashETF: 'SGOV',
    smaPeriod: 10, // months
    minDeviation: -1,
    maxDeviation: 1
  },

  [STRATEGY_TYPES.MOMENTUM]: {
    name: 'Momentum Portfolio',
    description: 'Momentum-based strategy selecting top-performing ETFs',
    etfs: MOMENTUM_ETFS,
    topN: 3,
    includeIBIT: true,
    fallbackETF: 'SGOV'
  },

  [STRATEGY_TYPES.HYBRID]: {
    name: 'Hybrid Strategy',
    description: 'Combine multiple strategies with weighted allocations',
    etfs: [...ALL_WEATHER_ETFS, ...MOMENTUM_ETFS].filter((etf, index, arr) => arr.indexOf(etf) === index),
    strategyWeights: {}
  }
};

/**
 * Helper function to get ETFs by strategy type
 */
function getETFsByStrategy(strategyType) {
  const config = STRATEGY_CONFIG[strategyType];
  return config ? config.etfs : [];
}

/**
 * Helper function to check if an ETF belongs to All-Weather strategy
 */
function isAllWeatherETF(etf) {
  return ALL_WEATHER_ETFS.includes(etf);
}

/**
 * Helper function to check if an ETF belongs to Momentum strategy
 */
function isMomentumETF(etf) {
  return MOMENTUM_ETFS.includes(etf);
}

/**
 * Helper function to get strategy type for an ETF
 * Returns the primary strategy type for the given ETF
 */
function getStrategyTypeForETF(etf) {
  if (isAllWeatherETF(etf)) {
    return STRATEGY_TYPES.ALL_WEATHER;
  }
  if (isMomentumETF(etf)) {
    return STRATEGY_TYPES.MOMENTUM;
  }
  return null;
}

/**
 * Helper function to validate ETF list against strategy
 */
function validateETFsForStrategy(etfs, strategyType) {
  const validETFs = getETFsByStrategy(strategyType);
  const invalidETFs = etfs.filter(etf => !validETFs.includes(etf));

  return {
    isValid: invalidETFs.length === 0,
    validETFs,
    invalidETFs,
    strategyType
  };
}

/**
 * Helper function to get all available ETFs across all strategies
 */
function getAllAvailableETFs() {
  return [...new Set([...ALL_WEATHER_ETFS, ...MOMENTUM_ETFS])];
}

module.exports = {
  // Constants
  ALL_WEATHER_ETFS,
  MOMENTUM_ETFS,
  STRATEGY_TYPES,
  STRATEGY_CONFIG,

  // Helper functions
  getETFsByStrategy,
  isAllWeatherETF,
  isMomentumETF,
  getStrategyTypeForETF,
  validateETFsForStrategy,
  getAllAvailableETFs
};