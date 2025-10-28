// Debug test for Multi-Share Strategy
// This test will help identify why purchased amounts are below target values

import { MultiSharePromotion } from './src/stores/rebalancing'
import type { BuyOrderData, MomentumData } from './src/stores/types'

// Test data based on BUDGET_ALLOCATION_TEST.md
const testBuyOrders: BuyOrderData[] = [
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
console.log('Total floor cost:', totalFloorCost)

// Available budget (from test scenario)
const availableBudget = 1000
const leftoverBudget = availableBudget - totalFloorCost
console.log('Leftover budget for promotions:', leftoverBudget)

// Test the Multi-Share strategy
const multiShareStrategy = new MultiSharePromotion()
const momentumData: MomentumData = {} // Empty for this test

console.log('\n=== Testing Multi-Share Strategy ===')
console.log('Initial floor shares:')
testBuyOrders.forEach(order => {
  console.log(`  ${order.ticker}: ${order.floorShares} shares @ $${order.price} = $${order.floorShares * order.price}`)
})

const finalShares = multiShareStrategy.calculatePromotions(testBuyOrders, leftoverBudget)

console.log('\nFinal shares after multi-share promotion:')
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

console.log('\n=== Results ===')
console.log('Total final cost:', totalFinalCost)
console.log('Total promotions:', totalPromotions)
console.log('Remaining budget:', availableBudget - totalFinalCost)
console.log('Budget utilization:', ((totalFinalCost / availableBudget) * 100).toFixed(2) + '%')

// Debug the algorithm step by step
console.log('\n=== Algorithm Debug ===')
console.log('Sorted by price (cheapest first):')
const sortedByPrice = [...testBuyOrders].sort((a, b) => a.price - b.price)
sortedByPrice.forEach(order => {
  console.log(`  ${order.ticker}: $${order.price}`)
})

// Simulate the while loop manually
console.log('\n=== Manual While Loop Simulation ===')
let debugBudget = leftoverBudget
const debugShares = new Map(testBuyOrders.map(order => [order.ticker, order.floorShares]))
let iteration = 0

while (debugBudget > 0 && iteration < 20) {
  iteration++
  let promoted = false
  
  console.log(`\nIteration ${iteration}: Budget = $${debugBudget}`)
  
  for (const order of sortedByPrice) {
    if (order.price <= debugBudget) {
      const currentShares = debugShares.get(order.ticker) || 0
      debugShares.set(order.ticker, currentShares + 1)
      debugBudget -= order.price
      promoted = true
      console.log(`  Promoted ${order.ticker}: ${currentShares} -> ${currentShares + 1} shares, budget -$${order.price} = $${debugBudget}`)
      break
    }
  }
  
  if (!promoted) {
    console.log('  No more promotions possible')
    break
  }
}

console.log('\n=== Final Debug Shares ===')
debugShares.forEach((shares, ticker) => {
  const order = testBuyOrders.find(o => o.ticker === ticker)
  console.log(`  ${ticker}: ${shares} shares`)
})