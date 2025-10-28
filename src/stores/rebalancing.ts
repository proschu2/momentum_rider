import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RebalancingOrder, RebalancingFrequency, AllocationMethod } from './types'
import { useETFConfigStore } from './etf-config'
import { usePortfolioStore } from './portfolio'
import { useMomentumStore } from './momentum'

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

    // Rebalancing Orders
    const rebalancingOrders = ref<RebalancingOrder[]>([])

    // Actions
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
            
            // Step 2: Calculate total cost of floor allocations
            const totalFloorCost = buyOrderData.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
            
            // Step 3: Calculate leftover budget after floor allocations
            const leftoverBudget = availableBudget - totalFloorCost
            
            // Step 4: Sort buy orders by remainder (highest first) for promotion
            const sortedBuyOrders = [...buyOrderData].sort((a, b) => b.remainder - a.remainder)
            
            // Step 5: Distribute leftover budget to allocations with highest remainders
            let remainingBudget = leftoverBudget
            const finalShares = new Map<string, number>()
            
            // Initialize all with floor shares
            buyOrderData.forEach(order => {
                finalShares.set(order.ticker, order.floorShares)
            })
            
            // Promote allocations with highest remainders until budget is exhausted
            for (const order of sortedBuyOrders) {
                if (remainingBudget >= order.price) {
                    finalShares.set(order.ticker, order.floorShares + 1)
                    remainingBudget -= order.price
                }
            }
            
            // Step 6: Create buy orders with final share counts
            for (const order of buyOrderData) {
                const shares = finalShares.get(order.ticker) || 0
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
            if (currentHolding && currentHolding.shares > 0) {
                const currentPrice = currentHolding.price || portfolioStore.etfPrices[ticker]?.price || 1
                const shares = currentHolding.shares

                orders.push({
                    ticker,
                    action: 'SELL',
                    shares,
                    targetValue: 0, // Target is to sell completely (not part of strategy)
                    currentValue: currentHolding.value,
                    difference: -shares * currentPrice
                })
            }
        })

        rebalancingOrders.value = orders
    }

    return {
        // State
        topAssets,
        bitcoinAllocation,
        rebalancingFrequency,
        momentumPeriods,
        allocationMethod,
        rebalancingOrders,

        // Actions
        calculateRebalancing
    }
})