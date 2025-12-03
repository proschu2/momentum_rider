/**
 * Strategy Configuration - Centralized ETF Universes and Settings
 * This file contains all strategy-specific ETF lists and configurations
 * to ensure consistency across the entire application.
 */

/**
 * All-Weather Strategy ETF Universe
 * Dalio-inspired portfolio with specific ETF selections
 */
export const ALL_WEATHER_ETFS = [
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
export const MOMENTUM_ETFS = [
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
export enum StrategyType {
  ALL_WEATHER = 'allweather',
  MOMENTUM = 'momentum',
  HYBRID = 'hybrid'
}

/**
 * Strategy Interface
 */
export interface Strategy {
  id: string;
  type: StrategyType;
  name: string;
  description: string;
  icon?: string;
}

/**
 * Strategy Type Definitions for Frontend
 */
export const STRATEGY_DEFINITIONS: Strategy[] = [
  {
    id: 'momentum',
    type: StrategyType.MOMENTUM,
    name: 'Momentum Portfolio',
    description: 'Momentum-based strategy selecting top-performing ETFs',
    icon: '📈'
  },
  {
    id: 'allweather',
    type: StrategyType.ALL_WEATHER,
    name: 'All-Weather Portfolio',
    description: 'Dalio-inspired All-Weather strategy with 10-month SMA trend filtering',
    icon: '🌤️'
  },
  {
    id: 'hybrid',
    type: StrategyType.HYBRID,
    name: 'Hybrid Strategy',
    description: 'Combine multiple strategies with weighted allocations',
    icon: '⚖️'
  }
];

/**
 * Helper function to get ETFs by strategy type
 */
export function getETFsByStrategy(strategyType: StrategyType): string[] {
  switch (strategyType) {
    case StrategyType.ALL_WEATHER:
      return ALL_WEATHER_ETFS;
    case StrategyType.MOMENTUM:
      return MOMENTUM_ETFS;
    case StrategyType.HYBRID:
      return [...new Set([...ALL_WEATHER_ETFS, ...MOMENTUM_ETFS])];
    default:
      return [];
  }
}

/**
 * Helper function to check if an ETF belongs to All-Weather strategy
 */
export function isAllWeatherETF(etf: string): boolean {
  return ALL_WEATHER_ETFS.includes(etf);
}

/**
 * Helper function to check if an ETF belongs to Momentum strategy
 */
export function isMomentumETF(etf: string): boolean {
  return MOMENTUM_ETFS.includes(etf);
}

/**
 * Helper function to get strategy type for an ETF
 * Returns the primary strategy type for the given ETF
 */
export function getStrategyTypeForETF(etf: string): StrategyType | null {
  if (isAllWeatherETF(etf)) {
    return StrategyType.ALL_WEATHER;
  }
  if (isMomentumETF(etf)) {
    return StrategyType.MOMENTUM;
  }
  return null;
}

/**
 * Helper function to validate ETF list against strategy
 */
export function validateETFsForStrategy(etfs: string[], strategyType: StrategyType): {
  isValid: boolean;
  validETFs: string[];
  invalidETFs: string[];
  strategyType: StrategyType;
} {
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
export function getAllAvailableETFs(): string[] {
  return [...new Set([...ALL_WEATHER_ETFS, ...MOMENTUM_ETFS])];
}

/**
 * Helper function to get strategy by ID
 */
export function getStrategyById(id: string): Strategy | null {
  return STRATEGY_DEFINITIONS.find(strategy => strategy.id === id) || null;
}

/**
 * Helper function to get default strategy
 */
export function getDefaultStrategy(): Strategy {
  return STRATEGY_DEFINITIONS[0]!; // First strategy (Momentum) as default
}