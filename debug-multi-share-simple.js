// Simple debug test for Multi-Share Strategy
// This test isolates the algorithm to identify the issue

// Simplified MultiSharePromotion class
class MultiSharePromotion {
    name = 'Multi-Share'
    description = 'Maximize total shares purchased, minimize leftover budget'
    
    calculatePromotions(buyOrders, leftoverBudget) {
        const finalShares = new Map()
        buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares))
        
        let remainingBudget = leftoverBudget
        const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price)
        
        console.log('Starting multi-share promotion with budget:', remainingBudget)
        console.log('Sorted by price:', sortedByPrice.map(o => `${o.ticker}: $${o.price}`))
        
        let iteration = 0
        while (remainingBudget > 0 && iteration < 50) {
            iteration++
            let promoted = false
            
            console.log(`\nIteration ${iteration}: Budget = $${remainingBudget}`)
            
            for (const order of sortedByPrice) {
                if (order.price <= remainingBudget) {
                    const currentShares = finalShares.get(order.ticker) || 0
                    finalShares.set(order.ticker, currentShares + 1)
                    remainingBudget -= order.price
                    promoted = true
                    console.log(`  Promoted ${order.ticker}: ${currentShares} -> ${currentShares + 1} shares, budget -$${order.price} = $${remainingBudget}`)
                    break
                }
            }
            
            if (!promoted) {
                console.log('  No more promotions possible')
                break
            }
        }
        
        return finalShares
    }
}

// Test data based on BUDGET_ALLOCATION_TEST.md
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

// Calculate total floor cost
const totalFloorCost = testBuyOrders.reduce((sum, order) => sum + (order.floorShares * order.price), 0)
console.log('=== Multi-Share Strategy Debug ===')
console.log('Total floor cost:', totalFloorCost)

// Available budget (from test scenario)
const availableBudget = 1000
const leftoverBudget = availableBudget - totalFloorCost
console.log('Leftover budget for promotions:', leftoverBudget)

// Test the Multi-Share strategy
const multiShareStrategy = new MultiSharePromotion()

console.log('\nInitial floor shares:')
testBuyOrders.forEach(order => {
  console.log(`  ${order.ticker}: ${order.floorShares} shares @ $${order.price} = $${order.floorShares * order.price}`)
})

const finalShares = multiShareStrategy.calculatePromotions(testBuyOrders, leftoverBudget)

console.log('\n=== Final Results ===')
let totalFinalCost = 0
let totalPromotions = 0
finalShares.forEach((shares, ticker) => {
  const order = testBuyOrders.find(o => o.ticker === ticker)
  const cost = shares * (order?.price || 0)
  const promotions = shares - (order?.floorShares || 0)
  totalFinalCost += cost
  totalPromotions += promotions
  console.log(`  ${ticker}: ${shares} shares (${promotions} promotions) @ $${order?.price} = $${cost}`)
})

console.log('\n=== Summary ===')
console.log('Total final cost:', totalFinalCost)
console.log('Total promotions:', totalPromotions)
console.log('Remaining budget:', availableBudget - totalFinalCost)
console.log('Budget utilization:', ((totalFinalCost / availableBudget) * 100).toFixed(2) + '%')

// Check if we're hitting target values
console.log('\n=== Target Value Analysis ===')
testBuyOrders.forEach(order => {
  const finalShareCount = finalShares.get(order.ticker) || 0
  const finalValue = finalShareCount * order.price
  const targetValue = order.targetValue
  const isBelowTarget = finalValue < targetValue
  
  console.log(`  ${order.ticker}: Final $${finalValue} vs Target $${targetValue} - ${isBelowTarget ? 'BELOW TARGET' : 'AT/ABOVE TARGET'}`)
})