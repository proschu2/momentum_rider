
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
    RebalancingOrder,
    RebalancingFrequency,
    AllocationMethod,
    AllocationStrategy,
    AllocationStrategyConfig,
    BudgetAllocationResult,
    BuyOrderData,
    PromotionStrategy,
    MomentumData
} from './types'
import { useETFConfigStore } from './etf-config'
import { usePortfolioStore } from './portfolio'
import { useMomentumStore } from './momentum'

// Strategy Implementations
class RemainderFirstPromotion implements PromotionStrategy {
    name = 'Remainder-First'
    description = 'Prioritize ETFs closest to target allocation percentages'
    
    calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
        const finalShares = new Map<string, number>()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        // Current logic: sort by remainder, promote one share per ETF
        const sortedByRemainder = [...buyOrders].sort((a, b) => b.remainder - a.remainder)
        let remainingBudget = leftoverBudget
        
        for (const order of sortedByRemainder) {
            if (remainingBudget >= order.price) {
                finalShares.set(order.ticker, order.floorShares + 1)
                remainingBudget -= order.price
            }
        }
        
        return finalShares
    }
}

class MultiSharePromotion implements PromotionStrategy {
    name = 'Multi-Share'
    description = 'Maximize total shares purchased, minimize leftover budget'
    
    calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
        const finalShares = new Map<string, number>()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price)
        
        while (remainingBudget > 0) {
            let promoted = false
            
            for (const order of sortedByPrice) {
                if (order.price <= remainingBudget) {
                    const currentShares = finalShares.get(order.ticker) || 0
                    finalShares.set(order.ticker, currentShares + 1)
                    remainingBudget -= order.price
                    promoted = true
                    break
                }
            }
            
            if (!promoted) break
        }
        
        return finalShares
    }
}

class MomentumWeightedPromotion implements PromotionStrategy {
    name = 'Momentum-Weighted'
    description = 'Prioritize ETFs with highest momentum scores'
    
    constructor(private momentumData: MomentumData) {}
    
    calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
        const finalShares = new Map<string, number>()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        
        // Calculate momentum efficiency score: momentum / price
        const efficiencyScores = buyOrders.map(order => ({
            ...order,
            efficiency: (this.momentumData[order.ticker]?.average || 0) / order.price
        }))
        
        // Sort by efficiency descending
        const sortedByEfficiency = [...efficiencyScores].sort((a, b) => b.efficiency - a.efficiency)
        
        while (remainingBudget > 0) {
            let promoted = false
            
            for (const order of sortedByEfficiency) {
                if (order.price <= remainingBudget) {
                    const currentShares = finalShares.get(order.ticker) || 0
                    finalShares.set(order.ticker, currentShares + 1)
                    remainingBudget -= order.price
                    promoted = true
                    break
                }
            }
            
            if (!promoted) break
        }
        
        return finalShares
    }
}

class PriceEfficientPromotion implements PromotionStrategy {
    name = 'Price-Efficient'
    description = 'Prioritize cheaper ETFs for more share promotions'
    
    calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
        const finalShares = new Map<string, number>()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price)
        
        while (remainingBudget > 0) {
            let promoted = false
            
            for (const order of sortedByPrice) {
                if (order.price <= remainingBudget) {
                    const currentShares = finalShares.get(order.ticker) || 0
                    finalShares.set(order.ticker, currentShares + 1)
                    remainingBudget -= order.price
                    promoted = true
                    break
                }
            }
            
            if (!promoted) break
        }
        
        return finalShares
    }
}

class HybridPromotion implements PromotionStrategy {
    name = 'Hybrid'
    description = 'Balance momentum and price efficiency'
    
    constructor(private momentumData: MomentumData) {}
    
    calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
        const finalShares = new Map<string, number>()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        
        // Calculate hybrid score: (momentum * 0.7) + (1/price * 0.3)
        const hybridScores = buyOrders.map(order => {
            const momentumScore = this.momentumData[order.ticker]?.average || 0
            const priceEfficiency = 1 / order.price
            const hybridScore = (momentumScore * 0.7) + (priceEfficiency * 0.3)
            
            return {
                ...order,
                hybridScore
            }
        })
        
        // Sort by hybrid score descending
        const sortedByHybrid = [...hybridScores].sort((a, b) => b.hybridScore - a.hybridScore)
        
        while (remainingBudget > 0) {
            let promoted = false
            
            for (const order of sortedByHybrid) {
                if (order.price <= remainingBudget) {
                    const currentShares = finalShares.get(order.ticker) || 0
                    finalShares.set(order.ticker, currentShares + 1)
                    remainingBudget -= order.price
                    promoted = true
                    break
                }
            }
            
            if (!promoted) break
        }
        
        return finalShares
    }
}

// Strategy Factory
class AllocationStrategyFactory {
    static createStrategy(config: AllocationStrategyConfig, momentumData: MomentumData): PromotionStrategy {
        switch (config.primaryStrategy) {
            case 'remainder-first':
                return new RemainderFirstPromotion()
            case 'multi-share':
                return new MultiSharePromotion()
            case 'momentum-weighted':
                return new MomentumWeightedPromotion(momentumData)
            case 'price-efficient':
                return new PriceEfficientPromotion()
            case 'hybrid':
                return new HybridPromotion(momentumData)
            default:
                return new MultiSharePromotion() // Default to most efficient
        }
    }
}

export const useRebalancingStore = defineStore('rebalancing', () => {
    const etfConfigStore = useETFConfigStore()
    const portfolioStore = usePortfolioStore()
    const momentumStore = useMomentumStore()

    // Strategy Parameters
    const topAssets = ref(4)
    const bitcoinAllocation = ref(4)
    const rebalancingFrequency = ref<RebalancingFrequency>('monthly')
    const momentumPeriods = ref([3, 6, 9, 12])
    const allocationMethod = ref<AllocationMethod>('Proportional')

    // Budget Allocation Strategy
    const allocationStrategy = ref<AllocationStrategy>('multi-share')
    const allocationStrategyConfig = ref<AllocationStrategyConfig>({
        primaryStrategy: 'multi-share',
        enableFallback: true,
        fallbackStrategy: 'price-efficient',
        maxIterations: 1000
    })
    const leftoverBudget = ref(0)
    const promotionsApplied = ref(0)

    // Rebalancing Orders
    const rebalancingOrders = ref<RebalancingOrder[]>([])

    // Budget Minimization Engine
    function calculateBudgetAllocation(
        buyOrders: BuyOrderData[],
        availableBudget: number
    ): BudgetAllocationResult {
        // Step 1: Calculate budget-aware floor allocations
        let totalFloorCost = buyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
        let leftoverBudget = availableBudget - totalFloorCost
        
        // If floor allocation exceeds budget, scale down floor shares proportionally
        if (leftoverBudget < 0) {
            const scaleFactor = availableBudget / totalFloorCost
            const adjustedBuyOrders = buyOrders.map(order => ({
                ...order,
                floorShares: Math.floor(order.floorShares * scaleFactor)
            }))
            
            // Recalculate with adjusted floor shares
            totalFloorCost = adjustedBuyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
            leftoverBudget = availableBudget - totalFloorCost
            
            // Use adjusted buy orders for the rest of the calculation
            buyOrders = adjustedBuyOrders
        }
        
        if (leftoverBudget <= 0) {
            const finalShares = new Map(buyOrders.map(order => [order.ticker, order.floorShares]))
            return {
                finalShares,
                leftoverBudget: Math.max(0, leftoverBudget),
                promotions: 0,
                strategyUsed: allocationStrategyConfig.value.primaryStrategy
            }
        }
        
        // Step 2: Apply primary strategy
        const primaryStrategy = AllocationStrategyFactory.createStrategy(allocationStrategyConfig.value, momentumStore.momentumData)
        let finalShares = primaryStrategy.calculatePromotions(buyOrders, leftoverBudget)
        
        // Step 3: Calculate remaining budget after primary strategy
        const totalFinalCost = Array.from(finalShares.entries()).reduce((sum, [ticker, shares]) => {
            const order = buyOrders.find(o => o.ticker === ticker)
            return sum + (shares * (order?.price || 0))
        }, 0)
        
        leftoverBudget = availableBudget - totalFinalCost
        
        // Step 4: Apply fallback strategy if enabled and budget remains
        if (allocationStrategyConfig.value.enableFallback && leftoverBudget > 0 && allocationStrategyConfig.value.fallbackStrategy) {
            const fallbackConfig = {
                ...allocationStrategyConfig.value,
                primaryStrategy: allocationStrategyConfig.value.fallbackStrategy
            }
            const fallbackStrategy = AllocationStrategyFactory.createStrategy(fallbackConfig, momentumStore.momentumData)
            
            const fallbackShares = fallbackStrategy.calculatePromotions(buyOrders, leftoverBudget)
            
            // Merge results
            fallbackShares.forEach((shares, ticker) => {
                const currentShares = finalShares.get(ticker) || 0
                finalShares.set(ticker, currentShares + shares)
            })
            
            // Recalculate leftover budget
            const totalFallbackCost = Array.from(fallbackShares.entries()).reduce((sum, [ticker, shares]) => {
                const order = buyOrders.find(o => o.ticker === ticker)
                return sum + (shares * (order?.price || 0))
            }, 0)
            
            leftoverBudget -= totalFallbackCost
        }
        
        const promotions = Array.from(finalShares.entries()).reduce((sum, [ticker, shares]) => {
            const order = buyOrders.find(o => o.ticker === ticker)
            return sum + (shares - (order?.floorShares || 0))
        }, 0)
        
        return {
            finalShares,
            leftoverBudget: Math.max(0, leftoverBudget),
            promotions,
            strategyUsed: allocationStrategyConfig.value.primaryStrategy
        }
    }

    // Actions
    function setAllocationStrategy(strategy: AllocationStrategy) {
        allocationStrategy.value = strategy
        allocationStrategyConfig.value.primaryStrategy = strategy
    }

    function updateStrategyConfig(config: Partial<AllocationStrategyConfig>) {
        allocationStrategyConfig.value = { ...allocationStrategyConfig.value, ...config }
    }

    function getStrategyDescription(strategy: AllocationStrategy): string {
        switch (strategy) {
            case 'remainder-first':
                return 'Prioritize ETFs closest to target allocation percentages'
            case 'multi-share':
                return 'Maximize total shares purchased, minimize leftover budget'
            case 'momentum-weighted':
                return 'Prioritize ETFs with highest momentum scores'
            case 'price-efficient':
                return 'Prioritize cheaper ETFs for more share promotions'
            case 'hybrid':
                return 'Balance momentum and price efficiency'
            default:
                return 'Unknown strategy'
        }
    }

    function calculateRebalancing() {
        if (Object.keys(momentumStore.momentumData).length === 0) {
            portfolioStore.error = 'Please calculate momentum first'
            return
        }

        // Get top ETFs with positive momentum (excluding Bitcoin)
        const positiveMomentumETFs = Object.entries(momentumStore.momentumData)
            .filter(([ticker, data]) =>
                data.absoluteMomentum &&
                ticker !== 'IBIT' &&
                etfConfigStore.availableETFs.includes(ticker)
            )
            .sort(([_, a], [__, b]) => b.average - a.average)
            .slice(0, topAssets.value)
            .map(([ticker]) => ticker)

        // Add Bitcoin if it has positive momentum and is available
        const bitcoinMomentum = momentumStore.momentumData['IBIT']
        if (bitcoinMomentum?.absoluteMomentum && etfConfigStore.availableETFs.includes('IBIT')) {
            positiveMomentumETFs.push('IBIT')
        }

        if (positiveMomentumETFs.length === 0) {
            portfolioStore.error = 'No ETFs with positive momentum found'
            return
        }

        // Calculate target allocations - Top ETFs + Bitcoin allocation
        const totalAllocation = 100
        const bitcoinTargetPercent = bitcoinAllocation.value
        const remainingPercent = totalAllocation - bitcoinTargetPercent

        // Distribute remaining allocation among non-Bitcoin ETFs
        const nonBitcoinETFs = positiveMomentumETFs.filter(etf => etf !== 'IBIT')
        const nonBitcoinTargetPercent = nonBitcoinETFs.length > 0
            ? remainingPercent / nonBitcoinETFs.length
            : 0

        // Generate rebalancing orders with budget-aware allocation
        const orders: RebalancingOrder[] = []
        const totalValue = portfolioStore.totalPortfolioValue

        // First pass: Calculate target values and differences
        const targetData = positiveMomentumETFs.map(ticker => {
            const isBitcoin = ticker === 'IBIT'
            const targetPercent = isBitcoin ? bitcoinTargetPercent : nonBitcoinTargetPercent
            const targetValue = (totalValue * targetPercent) / 100

            const currentHolding = portfolioStore.currentHoldings[ticker]
            const currentValue = currentHolding?.value || 0
            const difference = targetValue - currentValue

            return {
                ticker,
                isBitcoin,
                targetPercent,
                targetValue,
                currentValue,
                difference,
                currentHolding
            }
        })

        // Calculate total buy amount needed
        const totalBuyAmount = targetData
            .filter(data => data.difference > 0)
            .reduce((sum, data) => sum + data.difference, 0)

        // Calculate total sell amount available
        const totalSellAmount = targetData
            .filter(data => data.difference < 0)
            .reduce((sum, data) => sum + Math.abs(data.difference), 0)

        // Available budget for buys (cash + sales proceeds)
        const availableBudget = portfolioStore.additionalCash + totalSellAmount

        // Budget-aware allocation algorithm for buy orders
        const buyOrders = targetData.filter(data => data.difference > 0)
        
        if (buyOrders.length > 0) {
            // Step 1: Calculate exact fractional shares for all buy orders
            const buyOrderData = buyOrders.map(data => {
                const currentPrice = data.currentHolding?.price || portfolioStore.etfPrices[data.ticker]?.price || 1
                const exactShares = Math.abs(data.difference) / currentPrice
                const floorShares = Math.floor(exactShares)
                const remainder = exactShares - floorShares
                
                return {
                    ticker: data.ticker,
                    exactShares,
                    floorShares,
                    remainder,
                    price: currentPrice,
                    targetValue: data.targetValue,
                    currentValue: data.currentValue,
                    difference: data.difference,
                    currentHolding: data.currentHolding
                }
            })
            
            // Step 2: Use budget minimization engine
            const allocationResult = calculateBudgetAllocation(buyOrderData, availableBudget)
            
            // Update store state with allocation results
            leftoverBudget.value = allocationResult.leftoverBudget
            promotionsApplied.value = allocationResult.promotions
            
            // Step 3: Create buy orders with final share counts
            for (const order of buyOrderData) {
                const shares = allocationResult.finalShares.get(order.ticker) || 0
                const actualDifference = shares * order.price
                
                orders.push({
                    ticker: order.ticker,
                    action: 'BUY',
                    shares,
                    targetValue: order.targetValue,
                    currentValue: order.currentValue,
                    difference: actualDifference
                })
            }
        } else {
            leftoverBudget.value = availableBudget
            promotionsApplied.value = 0
        }
        
        // Process sell orders (unchanged logic)
        for (const data of targetData.filter(data => data.difference < 0)) {
            const { ticker, targetValue, currentValue, difference, currentHolding } = data
            const currentPrice = currentHolding?.price || portfolioStore.etfPrices[ticker]?.price || 1
            
            if (currentHolding) {
                const exactShares = Math.abs(difference) / currentPrice
                const calculatedShares = Math.round(exactShares)
                const shares = Math.min(calculatedShares, currentHolding.shares)
                const actualDifference = -shares * currentPrice
                
                orders.push({
                    ticker,
                    action: 'SELL',
                    shares,
                    targetValue,
                    currentValue,
                    difference: actualDifference
                })
            }
        }
        
        // Process hold orders
        for (const data of targetData.filter(data => data.difference === 0)) {
            const { ticker, targetValue, currentValue } = data
            
            orders.push({
                ticker,
                action: 'HOLD',
                shares: 0,
                targetValue,
                currentValue,
                difference: 0
            })
        }

        // Identify and create sell orders for non-strategy holdings
        const currentPortfolioTickers = Object.keys(portfolioStore.currentHoldings)
        const nonStrategyHoldings = currentPortfolioTickers.filter(ticker =>
            !etfConfigStore.availableETFs.includes(ticker)
        )

        nonStrategyHoldings.forEach(ticker => {
            const currentHolding = portfolioStore.currentHoldings[ticker]
            if (currentHolding) {
                orders.push({
                    ticker,
                    action: 'SELL',
                    shares: currentHolding.shares,
                    targetValue: 0,
                    currentValue: currentHolding.value,
                    difference: -currentHolding.value
                })
            }
        })

        rebalancingOrders.value = orders
    }

    return {
        // Strategy Parameters
        topAssets,
        bitcoinAllocation,
        rebalancingFrequency,
        momentumPeriods,
        allocationMethod,
        
        // Budget Allocation Strategy
        allocationStrategy,
        allocationStrategyConfig,
        leftoverBudget,
        promotionsApplied,
        
        // Rebalancing Orders
        rebalancingOrders,
        
        // Actions
        setAllocationStrategy,
        updateStrategyConfig,
        getStrategyDescription,
        calculateRebalancing,
        calculateBudgetAllocation
    }
})