// Final verification test for the complete multi-share strategy fix

class MultiSharePromotion {
    name = 'Multi-Share'
    description = 'Maximize total shares purchased, minimize leftover budget'
    
    calculatePromotions(buyOrders, leftoverBudget) {
        const finalShares = new Map()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price)
        
        let iteration = 0
        while (remainingBudget > 0 && iteration < 50) {
            iteration++
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

// Complete budget allocation function (simulating the fixed implementation)
function calculateBudgetAllocation(buyOrders, availableBudget) {
    // Step 1: Calculate budget-aware floor allocations
    let totalFloorCost = buyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
    let leftoverBudget = availableBudget - totalFloorCost
    
    console.log('=== BUDGET-AWARE FLOOR ALLOCATION ===')
    console.log('Initial floor cost:', totalFloorCost)
    console.log('Available budget:', availableBudget)
    console.log('Initial leftover budget:', leftoverBudget)
    
    // If floor allocation exceeds budget, scale down floor shares proportionally
    if (leftoverBudget < 0) {
        const scaleFactor = availableBudget / totalFloorCost
        console.log('Floor allocation exceeds budget! Scaling by factor:', scaleFactor.toFixed(3))
        
        const adjustedBuyOrders = buyOrders.map(order => ({
            ...order,
            floorShares: Math.floor(order.floorShares * scaleFactor)
        }))
        
        // Recalculate with adjusted floor shares
        totalFloorCost = adjustedBuyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
        leftoverBudget = availableBudget - totalFloorCost
        
        console.log('Adjusted floor cost:', totalFloorCost)
        console.log('Adjusted leftover budget:', leftoverBudget)
        
        // Use adjusted buy orders for the rest of the calculation
        buyOrders = adjustedBuyOrders
    }
    
    if (leftoverBudget <= 0) {
        const finalShares = new Map(buyOrders.map(order => [order.ticker, order.floorShares]))
        return {
            finalShares,
            leftoverBudget: Math.max(0, leftoverBudget),
            promotions: 0,
            strategyUsed: 'multi-share'
        }
    }
    
    // Step 2: Apply multi-share strategy
    console.log('\n=== APPLYING MULTI-SHARE STRATEGY ===')
    console.log('Leftover budget for promotions:', leftoverBudget)
    
    const multiShareStrategy = new MultiSharePromotion()
    const finalShares = multiShareStrategy.calculatePromotions(buyOrders, leftoverBudget)
    
    // Step 3: Calculate remaining budget after primary strategy
    const totalFinalCost = Array.from(finalShares.entries()).reduce((sum, [ticker, shares]) => {
        const order = buyOrders.find(o => o.ticker === ticker)
        return sum + (shares * (order?.price || 0))
    }, 0)
    
    leftoverBudget = availableBudget - totalFinalCost
    
    // Calculate promotions
    const promotions = Array.from(finalShares.entries()).reduce((sum, [ticker, shares]) => {
        const order = buyOrders.find(o => o.ticker === ticker)
        return sum + (shares - (order?.floorShares || 0))
    }, 0)
    
    return {
        finalShares,
        leftoverBudget: Math.max(0, leftoverBudget),
        promotions,
        strategyUsed: 'multi-share'
    }
}

// Test data (same scenario where floor allocation exceeds budget)
const testBuyOrders = [
  {
    ticker: 'VTI',
    exactShares: 2.5,
    floorShares: 2,
    remainder: 0.5,
    price: 250.00,
    targetValue: 625,
    currentValue: 500,
    difference: 125
  },
  {
    ticker: 'TLT',
    exactShares: 3.2,
    floorShares: 3,
    remainder: 0.2,
    price: 95.00,
    targetValue: 304,
    currentValue: 285,
    difference: 19
  },
  {
    ticker: 'PDBC',
    exactShares: 8.9,
    floorShares: 8,
    remainder: 0.9,
    price: 13.50,
    targetValue: 120.15,
    currentValue: 108,
    difference: 12.15
  },
  {
    ticker: 'IBIT',
    exactShares: 4.8,
    floorShares: 4,
    remainder: 0.8,
    price: 40.00,
    targetValue: 192,
    currentValue: 160,
    difference: 32
  }
]

// Available budget
const availableBudget = 1000

console.log('=== FINAL VERIFICATION TEST ===')
console.log('Available budget:', availableBudget)
console.log('Initial floor shares:')
testBuyOrders.forEach(order => {
  console.log(`  ${order.ticker}: ${order.floorShares} shares @ $${order.price} = $${order.floorShares * order.price}`)
})

const result = calculateBudgetAllocation(testBuyOrders, availableBudget)

console.log('\n=== FINAL RESULTS ===')
let totalFinalCost = 0
result.finalShares.forEach((shares, ticker) => {
  const order = testBuyOrders.find(o => o.ticker === ticker)
  const cost = shares * (order?.price || 0)
  totalFinalCost += cost
  const promotions = shares - (order?.floorShares || 0)
  console.log(`  ${ticker}: ${shares} shares (${promotions} promotions) @ $${order?.price} = $${cost}`)
})

console.log('\n=== PERFORMANCE SUMMARY ===')
console.log('Total final cost:', totalFinalCost)
console.log('Total promotions:', result.promotions)
console.log('Remaining budget:', result.leftoverBudget)
console.log('Budget utilization:', ((totalFinalCost / availableBudget) * 100).toFixed(2) + '%')

// Compare with original problem
console.log('\n=== IMPROVEMENT ANALYSIS ===')
const originalFloorCost = testBuyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
console.log('Original floor cost (before fix):', originalFloorCost)
console.log('Original leftover budget (before fix):', availableBudget - originalFloorCost)
console.log('Original budget utilization:', ((originalFloorCost / availableBudget) * 100).toFixed(2) + '%')
console.log('Improvement in budget utilization:', (((totalFinalCost - originalFloorCost) / availableBudget) * 100).toFixed(2) + '%')