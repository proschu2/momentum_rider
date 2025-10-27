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