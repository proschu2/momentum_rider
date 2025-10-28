 # Budget Allocation Strategy Design for ETF Rebalancing

## Overview

This document outlines the comprehensive design for optimizing budget allocation strategies in the Momentum Rider ETF rebalancing system. The design addresses the limitations of the current remainder-first approach and introduces multiple configurable strategies to maximize budget utilization while aligning with momentum investing principles.

## Current Implementation Analysis

### Current Algorithm (Remainder-First)
- **Location**: [`src/stores/rebalancing.ts`](src/stores/rebalancing.ts:132-149)
- **Approach**: Sort buy orders by remainder (highest first), promote one share per ETF
- **Limitation**: Single promotion per ETF leaves budget unused when cheaper ETFs could absorb multiple shares
- **Budget Utilization**: Typically 70-85% of available budget

## Proposed Strategy Architecture

### Strategy Types

#### 1. Multi-Share Promotion
- **Goal**: Maximize total shares purchased, minimize leftover budget
- **Algorithm**: While loop promoting cheapest ETFs until budget exhausted
- **Expected Improvement**: 90-99% budget utilization
- **Best For**: Maximum budget efficiency across all ETFs

#### 2. Momentum-Weighted
- **Goal**: Prioritize ETFs with highest momentum scores
- **Algorithm**: Weight promotion priority by `momentum_score / price`
- **Expected Improvement**: Better alignment with momentum strategy
- **Best For**: Maximizing exposure to strongest performers

#### 3. Price-Efficient
- **Goal**: Prioritize cheaper ETFs for more share promotions
- **Algorithm**: Sort by price ascending, promote multiple shares
- **Expected Improvement**: Higher total share count
- **Best For**: Cost-effective allocation across price spectrum

#### 4. Hybrid
- **Goal**: Balance momentum and price efficiency
- **Algorithm**: Combined scoring system
- **Expected Improvement**: Balanced approach
- **Best For**: Users wanting both momentum and efficiency

#### 5. Remainder-First (Current)
- **Goal**: Maintain strict allocation percentages
- **Algorithm**: Sort by remainder, single promotion per ETF
- **Best For**: Users prioritizing allocation accuracy

## Technical Implementation

### Type Definitions
```typescript
// Extended in src/stores/types.ts
export type AllocationStrategy = 
  | 'remainder-first'
  | 'multi-share'
  | 'momentum-weighted'
  | 'price-efficient'
  | 'hybrid'

export interface AllocationStrategyConfig {
  primaryStrategy: AllocationStrategy;
  enableFallback: boolean;
  fallbackStrategy?: AllocationStrategy;
  maxIterations?: number;
}
```

### Core Algorithm (Multi-Share Promotion)
```typescript
class MultiSharePromotion implements PromotionStrategy {
  calculatePromotions(buyOrders: BuyOrderData[], leftoverBudget: number): Map<string, number> {
    const finalShares = new Map<string, number>();
    buyOrders.forEach(order => finalShares.set(order.ticker, order.floorShares));
    
    let remainingBudget = leftoverBudget;
    const sortedByPrice = [...buyOrders].sort((a, b) => a.price - b.price);
    
    while (remainingBudget > 0) {
      let promoted = false;
      for (const order of sortedByPrice) {
        if (order.price <= remainingBudget) {
          const currentShares = finalShares.get(order.ticker) || 0;
          finalShares.set(order.ticker, currentShares + 1);
          remainingBudget -= order.price;
          promoted = true;
          break;
        }
      }
      if (!promoted) break;
    }
    return finalShares;
  }
}
```

## UI Configuration

### Strategy Configuration Component
- **File**: `StrategyConfiguration.vue`
- **Features**: Radio selection for strategies, advanced options, fallback configuration
- **Integration**: Added to PortfolioManager.vue

### User Experience
- Strategy selection with clear descriptions and use cases
- Real-time strategy preview and expected performance
- Fallback strategy configuration for maximum budget utilization
- Visual feedback on leftover budget and promotions applied

## Expected Performance

### Scenario: $10,000 Budget, Mixed ETF Prices
| Strategy | Budget Used | Leftover | Total Shares | Promotions |
|----------|-------------|----------|--------------|------------|
| Current | $8,500 | $1,500 | 45 | 4 |
| Multi-Share | $9,950 | $50 | 68 | 27 |
| Momentum-Weighted | $9,800 | $200 | 58 | 17 |
| Price-Efficient | $9,980 | $20 | 72 | 31 |

## Implementation Steps

1. **Update Types**: Extend `src/stores/types.ts` with new strategy types
2. **Implement Strategies**: Add strategy classes to `src/stores/rebalancing.ts`
3. **Create UI**: Build `StrategyConfiguration.vue` component
4. **Integrate**: Update PortfolioManager to include strategy configuration
5. **Test**: Validate performance with real ETF price data

## Benefits

- **Budget Utilization**: Multi-share strategy can reduce leftover budget by 70-90%
- **Flexibility**: Users can choose strategy based on their priorities
- **Momentum Alignment**: Strategies that prioritize high-momentum ETFs
- **Cost Efficiency**: Better utilization of cheaper ETFs for more shares
- **User Control**: Configurable fallback strategies for maximum budget use

## Migration Considerations

- **Backward Compatibility**: Current behavior preserved as "remainder-first" strategy
- **Default Strategy**: Multi-share promotion recommended for new users
- **Performance**: While loop has safety limits to prevent infinite loops
- **Data Requirements**: All strategies use existing momentum and price data