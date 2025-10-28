// Shared TypeScript interfaces and types for the momentum rider application

export interface Holding {
    shares: number
    price: number
    value: number
    name?: string
    currentPrice?: number
}

export interface MomentumData {
    [ticker: string]: {
        periods: {
            '3month': number
            '6month': number
            '9month': number
            '12month': number
        }
        average: number
        absoluteMomentum: boolean
        error?: string
    }
}

export interface IBITMomentumData {
    periods: {
        '3month': number
        '6month': number
        '9month': number
        '12month': number
    }
    average: number
    absoluteMomentum: boolean
    error?: string
    isBitcoinETF: boolean
    shouldShow: boolean
}

export interface RebalancingOrder {
    ticker: string
    action: 'BUY' | 'SELL' | 'HOLD'
    shares: number
    targetValue: number
    currentValue: number
    difference: number
}

export interface ETFPrice {
    price: number
    name: string
}

export interface ETFUniverse {
    STOCKS: string[]
    BONDS: string[]
    COMMODITIES: string[]
    ALTERNATIVES: string[]
}

export interface EnabledCategories {
    STOCKS: boolean
    BONDS: boolean
    COMMODITIES: boolean
    ALTERNATIVES: boolean
}

export type RebalancingFrequency = 'monthly' | 'quarterly'

export type AllocationMethod = 'Proportional' | 'Underweight Only'

// Budget Allocation Strategy Types
export type AllocationStrategy =
  | 'remainder-first'      // Current approach - sort by remainder
  | 'multi-share'          // New: maximize shares, minimize leftover budget
  | 'momentum-weighted'    // New: prioritize high momentum ETFs
  | 'price-efficient'      // New: prioritize cheaper ETFs for more shares
  | 'hybrid'               // New: combine momentum and price efficiency

export interface AllocationStrategyConfig {
  primaryStrategy: AllocationStrategy;
  enableFallback: boolean;
  fallbackStrategy?: AllocationStrategy;
  maxIterations?: number;  // For while loop safety
}

export interface BudgetAllocationResult {
  finalShares: Map<string, number>;
  leftoverBudget: number;
  promotions: number;
  strategyUsed: AllocationStrategy;
}

export interface BuyOrderData {
  ticker: string;
  exactShares: number;
  floorShares: number;
  remainder: number;
  price: number;
  targetValue: number;
  currentValue: number;
  difference: number;
  currentHolding?: Holding;
}

export interface PromotionStrategy {
  name: string;
  description: string;
  calculatePromotions(
    buyOrders: BuyOrderData[],
    leftoverBudget: number,
    momentumData?: MomentumData
  ): Map<string, number>;
}