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

        // Generate rebalancing orders
        const orders: RebalancingOrder[] = []
        const totalValue = portfolioStore.totalPortfolioValue

        for (const ticker of positiveMomentumETFs) {
            const isBitcoin = ticker === 'IBIT'
            const targetPercent = isBitcoin ? bitcoinTargetPercent : nonBitcoinTargetPercent
            const targetValue = (totalValue * targetPercent) / 100

            const currentHolding = portfolioStore.currentHoldings[ticker]
            const currentValue = currentHolding?.value || 0
            const difference = targetValue - currentValue

            let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
            if (difference > 0) action = 'BUY'
            else if (difference < 0) action = 'SELL'

            const currentPrice = currentHolding?.price || portfolioStore.etfPrices[ticker]?.price || 1
            let shares = 0

            if (action !== 'HOLD') {
                if (action === 'BUY') {
                    shares = Math.floor(Math.abs(difference) / currentPrice)
                } else if (action === 'SELL' && currentHolding) {
                    shares = Math.min(Math.floor(Math.abs(difference) / currentPrice), currentHolding.shares)
                }
            }

            orders.push({
                ticker,
                action,
                shares,
                targetValue,
                currentValue,
                difference: action === 'BUY' ? shares * currentPrice :
                    action === 'SELL' ? -shares * currentPrice : 0
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