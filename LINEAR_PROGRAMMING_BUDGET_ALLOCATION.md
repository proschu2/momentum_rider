# Linear Programming Budget Allocation Architecture

## Current State Analysis

**Budget allocation currently happens in the frontend** within [`src/stores/rebalancing.ts`](src/stores/rebalancing.ts:240-322) using heuristic strategies:
- Multi-share promotion (current default)
- Momentum-weighted allocation
- Price-efficient allocation
- Hybrid strategies

**Previous Implementation Issues:**
- No backend optimization service exists yet
- Frontend uses heuristic approaches (not optimal LP)
- Performance limitations for complex portfolios
- No caching of optimization results

## Architecture Design

### Backend Linear Programming Service

#### Core Components:

```
server/
├── services/
│   ├── linearProgrammingService.js     # MILP optimization engine
│   ├── portfolioOptimizationService.js # Business logic wrapper
│   └── cacheService.js                 # Optimization result caching
├── routes/
│   └── optimization.js                 # API endpoints
└── utils/
    └── validation.js                   # Input validation
```

#### Mathematical Formulation:

**Objective:** Minimize unused budget
```
Minimize: totalAvailableBudget - Σ(pricePerShare[i] × x[i])
```

**Constraints:**
1. **Budget Constraint:** `Σ(pricePerShare[i] × x[i]) ≤ totalAvailableBudget`
2. **Allocation Bounds:** For each ETF i:
   ```
   (targetPercentage[i] - allowedDeviation[i]) × totalAvailableBudget 
   ≤ (currentShares[i] + x[i]) × pricePerShare[i] 
   ≤ (targetPercentage[i] + allowedDeviation[i]) × totalAvailableBudget
   ```
3. **Integer Shares:** `x[i] ∈ ℤ≥0`
4. **Full Liquidation:** Sell all non-target holdings

#### TypeScript Interfaces:

```typescript
interface LinearProgrammingInput {
  currentHoldings: {
    name: string;
    shares: number;
    price: number;
  }[];
  targetETFs: {
    name: string;
    targetPercentage: number;
    allowedDeviation?: number;
    pricePerShare: number;
  }[];
  extraCash: number;
  optimizationStrategy?: 'minimize-leftover' | 'maximize-shares' | 'momentum-weighted';
}

interface LinearProgrammingOutput {
  allocations: {
    etfName: string;
    currentShares: number;
    sharesToBuy: number;
    finalShares: number;
    costOfPurchase: number;
    finalValue: number;
    targetPercentage: number;
    actualPercentage: number;
    deviation: number;
  }[];
  holdingsToSell: {
    name: string;
    shares: number;
    pricePerShare: number;
    totalValue: number;
  }[];
  optimizationMetrics: {
    totalBudgetUsed: number;
    unusedBudget: number;
    unusedPercentage: number;
    optimizationTime: number;
    solverStatus: 'optimal' | 'infeasible' | 'timeout';
  };
  fallbackUsed?: boolean;
}
```

### Implementation Strategy

#### Phase 1: Backend Foundation
1. **Install Dependencies:**
   ```bash
   npm install yalps js-lp-solver
   ```

2. **Create Linear Programming Service:**
   - Implement MILP solver with YALPS/jsLPSolver
   - Add input validation and error handling
   - Include fallback to heuristic methods if LP fails

3. **Create Optimization API:**
   - `POST /api/optimization/rebalance` - Main optimization endpoint
   - `GET /api/optimization/cache/:key` - Cached results
   - `DELETE /api/optimization/cache` - Clear optimization cache

#### Phase 2: Frontend Integration
1. **Update Frontend Services:**
   - Modify [`src/services/momentum-service.ts`](src/services/momentum-service.ts:1) to call backend optimization
   - Add optimization result caching in frontend stores

2. **Enhanced Error Handling:**
   - Fallback to current heuristic strategies if backend unavailable
   - Progressive enhancement approach

3. **Performance Monitoring:**
   - Compare LP vs heuristic results
   - Track optimization time and budget utilization

### Error Handling & Fallbacks

#### Common Issues to Address:
1. **Infeasible Constraints:** Relax deviation bounds or reduce target ETFs
2. **Solver Timeout:** Implement time limits and fallback to heuristics
3. **Numerical Instability:** Use proper precision and scaling
4. **Backend Unavailable:** Fallback to frontend heuristic strategies

#### Fallback Strategy:
```typescript
async function optimizePortfolio(input: OptimizationInput): Promise<OptimizationResult> {
  try {
    // Attempt linear programming optimization
    const lpResult = await linearProgrammingService.solve(input);
    
    if (lpResult.solverStatus === 'optimal') {
      return lpResult;
    }
    
    // Fallback to heuristic strategies
    console.warn('LP optimization failed, falling back to heuristics');
    return heuristicOptimizationService.solve(input);
    
  } catch (error) {
    console.error('Optimization service unavailable:', error);
    return frontendHeuristicFallback(input);
  }
}
```

### Performance Expectations

#### Comparison Metrics:
| Strategy | Budget Utilization | Optimization Time | Complexity Handling |
|----------|-------------------|------------------|-------------------|
| Current Heuristic | 85-95% | <10ms | Good for simple cases |
| Linear Programming | 98-99.9% | 50-500ms | Excellent for complex portfolios |
| Hybrid Approach | 95-99% | 10-100ms | Balanced performance |

#### Caching Strategy:
- Cache optimization results for 1 hour (price data changes slowly)
- Cache key: `optimization_${hash(inputParameters)}`
- Invalidate cache when portfolio composition changes

### Testing Strategy

#### Unit Tests:
- Test LP formulation with known optimal solutions
- Validate constraint handling
- Test edge cases (zero budget, single ETF, etc.)

#### Integration Tests:
- Compare LP results with heuristic strategies
- Test fallback mechanisms
- Validate API responses match frontend expectations

#### Performance Tests:
- Measure optimization time for different portfolio sizes
- Compare budget utilization across strategies
- Test with real ETF price data

### Migration Plan

#### Step 1: Backend Implementation (Non-breaking)
- Implement backend services without changing frontend
- Test optimization API independently

#### Step 2: Frontend Enhancement (Progressive)
- Add optional backend optimization calls
- Maintain current heuristic as fallback
- A/B test performance

#### Step 3: Full Migration
- Make backend optimization default
- Keep frontend heuristics as emergency fallback
- Monitor performance and user feedback

### Risk Mitigation

#### Technical Risks:
1. **Solver Performance:** Implement timeouts and fallbacks
2. **Numerical Precision:** Use appropriate scaling and precision
3. **Backend Dependency:** Maintain frontend fallback strategies

#### Business Risks:
1. **User Experience:** Gradual rollout with performance monitoring
2. **Calculation Accuracy:** Extensive testing and validation
3. **System Reliability:** Robust error handling and fallbacks

## Conclusion

Moving budget allocation to the backend using linear programming will provide:
- **Optimal budget utilization** (98-99.9% vs 85-95%)
- **Better handling of complex portfolio constraints**
- **Centralized optimization logic** for consistency
- **Improved performance** for large portfolios
- **Enhanced caching** capabilities

The architecture maintains backward compatibility through progressive enhancement and robust fallback mechanisms, addressing previous implementation issues while delivering optimal results.