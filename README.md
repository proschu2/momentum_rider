# Momentum Rider - Systematic Momentum-Based Portfolio Management

A comprehensive web application for implementing a systematic momentum-based ETF investment strategy. Momentum Rider helps investors build and rebalance portfolios using quantitative momentum signals across multiple timeframes, removing emotion from investment decisions.

## What is Momentum Investing?

**Momentum investing** is a quantitative strategy that capitalizes on the tendency of assets that have performed well recently to continue performing well in the near future. The strategy is based on decades of academic research showing that:

- Assets with strong recent performance tend to outperform over the next 3-12 months
- This effect exists across asset classes (stocks, bonds, commodities, alternatives)
- Systematic momentum strategies have historically delivered superior risk-adjusted returns
- The approach works by riding the "momentum wave" until signs of reversal appear

### Why Momentum Works

1. **Behavioral Finance**: Investors tend to underreact to new information, creating trends that persist
2. **Risk-Based Explanations**: Momentum may compensate for systematic risk factors
3. **Industry Rotation**: Capital flows between sectors and asset classes in predictable patterns
4. **Macroeconomic Trends**: Economic cycles create multi-month trends in different assets

## Core Strategy: Momentum Rider

This application implements a **4-factor momentum strategy** that:

1. **Analyzes 4 timeframes** simultaneously (3, 6, 9, 12-month returns)
2. **Weights recent performance more heavily** (60% weight on 3-6 months, 40% on 9-12 months)
3. **Filters for absolute momentum** (only invests in assets with positive momentum)
4. **Automatically rebalances** to maintain optimal allocations
5. **Optimizes share purchases** using advanced mathematical techniques

### Strategy Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ETF Universe Selection                                   │
│    • Choose from 4 categories: Stocks, Bonds, Commodities   │
│    • Default: 9 ETFs across diverse asset classes          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Momentum Calculation                                     │
│    • Fetch 2 years of weekly price data                     │
│    • Calculate returns for 3, 6, 9, 12-month periods       │
│    • Composite score: 60% recent + 40% long-term           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Absolute Momentum Filter                                 │
│    • Keep only ETFs with positive composite momentum       │
│    • Exclude negative momentum assets from investment      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Portfolio Construction                                   │
│    • Select top 4 ETFs by momentum score                   │
│    • Add 4% fixed allocation to Bitcoin (IBIT)             │
│    • Equal-weight the 4 traditional ETFs                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Rebalancing Optimization                                 │
│    • Calculate target vs. current allocations              │
│    • Generate BUY/SELL orders with share counts            │
│    • Optimize budget usage (minimize leftover cash)        │
└─────────────────────────────────────────────────────────────┘
```

## ETF Universe: Diversified Asset Classes

The application provides a curated universe of 9 ETFs across 4 major asset classes, carefully selected for their broad market exposure and liquidity:

### Asset Class Breakdown

| Category | ETFs | Purpose |
|----------|------|---------|
| **STOCKS** | VTI, VEA, VWO | Equity exposure across US, Developed, and Emerging markets |
| **BONDS** | TLT, BWX, BND | Treasury and aggregate bond exposure |
| **COMMODITIES** | PDBC, SGOL | Broad commodities basket and gold exposure |
| **ALTERNATIVES** | IBIT | Bitcoin ETF (managed separately at 4% allocation) |

### Rationale for ETF Selection

**VTI (Vanguard Total Stock Market)**
- Broad US equity exposure
- Captures domestic market momentum

**VEA (Vanguard FTSE Developed Markets)**
- Developed international markets
- Geographic diversification

**VWO (Vanguard FTSE Emerging Markets)**
- Emerging markets exposure
- Higher growth potential and volatility

**TLT (iShares 20+ Year Treasury Bond)**
- Long-term US Treasury bonds
- Safe-haven and rate cycle exposure

**BWX (SPDR Bloomberg International Treasury Bond)**
- International government bonds
- Currency and geopolitical diversification

**BND (Vanguard Total Bond Market)**
- US aggregate bond market
- Core fixed income allocation

**PDBC (Invesco Optimum Yield Diversified Commodity)**
- Broad commodities exposure
- Inflation hedge and cycle exposure

**SGOL (Aberdeen Physical Gold Shares)**
- Gold exposure
- Crisis hedge and monetary inflation protection

**IBIT (iShares Bitcoin Trust)**
- Bitcoin exposure
- Alternative asset with unique momentum characteristics
- Managed at fixed 4% allocation regardless of momentum signal

## Technical Implementation

### Momentum Calculation Algorithm

The momentum calculation is the core of the strategy, implemented as follows:

```
1. Fetch 2 years of weekly price data for each ETF
2. Calculate period returns:
   • 3-month return: (Current Price / Price 3mo ago) - 1
   • 6-month return: (Current Price / Price 6mo ago) - 1
   • 9-month return: (Current Price / Price 9mo ago) - 1
   • 12-month return: (Current Price / Price 12mo ago) - 1

3. Calculate composite momentum score:
   recentPerformance = (3mo + 6mo) / 2
   longTermPerformance = (9mo + 12mo) / 2
   compositeScore = (recentPerformance × 0.6) + (longTermPerformance × 0.4)

4. Determine absolute momentum:
   if compositeScore > 0 → Positive momentum (eligible for investment)
   if compositeScore ≤ 0 → Negative momentum (avoid)
```

**Example Calculation:**
```
ETF: VTI
3-month return: +8.5%
6-month return: +12.3%
9-month return: +15.2%
12-month return: +18.7%

recentPerformance = (8.5 + 12.3) / 2 = 10.4%
longTermPerformance = (15.2 + 18.7) / 2 = 16.95%

compositeScore = (10.4 × 0.6) + (16.95 × 0.4) = 13.02%

Result: POSITIVE MOMENTUM (invest)
```

### Rebalancing Optimization

The rebalancing engine uses **Mixed Integer Linear Programming (MILP)** to optimize share purchases:

#### Primary Optimization: Linear Programming

The LP solver optimizes the following:

**Objective Function:**
```
Maximize: Total Budget Used
```

**Variables:**
```
x_i = Number of shares to buy for ETF i
```

**Constraints:**
```
1. Budget Constraint:
   Σ(x_i × price_i) ≤ Available Budget

2. Allocation Constraints (for each ETF i):
   targetValue_i × (1 - deviation) ≤ (currentValue_i + x_i × price_i) ≤ targetValue_i × (1 + deviation)

3. Integer Constraint:
   x_i must be an integer (no fractional shares)

4. Non-negativity:
   x_i ≥ 0
```

**Example LP Setup:**
```
Available Budget: $10,000
Target ETFs: VTI (25%), VEA (25%), TLT (25%), IBIT (4%), BND (21%)

Variables:
x_vti = shares of VTI to buy
x_vea = shares of VEA to buy
x_tlt = shares of TLT to buy
x_ibit = shares of IBIT to buy
x_bnd = shares of BND to buy

Objective:
Maximize: 250×x_vti + 50×x_vea + 95×x_tlt + 45×x_ibit + 75×x_bnd

Subject to:
250×x_vti + 50×x_vea + 95×x_tlt + 45×x_ibit + 75×x_bnd ≤ 10,000
0.21×10,000 ≤ 2,500 + 250×x_vti ≤ 0.29×10,000
... (similar constraints for each ETF)
x_vti, x_vea, x_tlt, x_ibit, x_bnd are integers ≥ 0
```

#### Fallback Strategies

When LP optimization fails or is unavailable, the application uses heuristic strategies:

1. **Multi-Share Strategy**: Maximize total shares purchased
   - Buys as many shares as possible across all ETFs
   - Prioritizes cheaper ETFs to maximize quantity

2. **Momentum-Weighted Strategy**: Prioritize high-momentum ETFs
   - Calculates efficiency score: momentum / price
   - Buys additional shares in high-momentum ETFs first

3. **Remainder-First Strategy**: Minimize allocation deviation
   - Buys additional shares in ETFs closest to target percentage
   - Reduces tracking error

4. **Price-Efficient Strategy**: Minimize leftover budget
   - Always buys the cheapest available share first
   - Iterative promotion until budget exhausted

5. **Hybrid Strategy**: Balance momentum and efficiency
   - 70% momentum weight, 30% price efficiency weight
   - Optimizes both performance and budget usage

### Backend Architecture

The backend is built with Node.js and Express, organized into services:

```
server/
├── services/
│   ├── momentumService.js       # Momentum calculation logic
│   ├── financeService.js        # Yahoo Finance API integration
│   ├── portfolioOptimizationService.js  # Optimization orchestration
│   ├── linearProgrammingService.js      # LP solver integration
│   └── cacheService.js          # In-memory caching
├── routes/
│   ├── momentum.js             # Momentum calculation endpoints
│   ├── optimization.js         # Rebalancing endpoints
│   ├── quote.js                # Current price endpoints
│   └── batch.js                # Batch processing
└── utils/
    └── calculations.js         # Mathematical utilities
```

**Key Services:**

- **momentumService.js**: Calculates momentum scores using 2 years of weekly data
- **financeService.js**: Integrates with Yahoo Finance API for real-time and historical prices
- **portfolioOptimizationService.js**: Orchestrates LP solver with fallback strategies
- **linearProgrammingService.js**: Builds and solves MILP models using javascript-lp-solver
- **cacheService.js**: Implements TTL-based caching to reduce API calls

### Frontend Architecture

The frontend uses Vue 3 with Composition API and Pinia for state management:

```
src/
├── stores/                     # Pinia state stores
│   ├── etf-config.ts          # ETF universe configuration
│   ├── momentum.ts            # Momentum data and calculations
│   ├── portfolio.ts           # Current holdings management
│   └── rebalancing.ts         # Rebalancing logic
├── services/                   # API communication
│   ├── momentum-service.ts    # Momentum API client
│   ├── finance-api.ts         # Finance API client
│   └── quote-service.ts       # Quote retrieval
├── components/                 # Vue components
│   ├── ETFUniverse.vue        # ETF selection interface
│   ├── DraggablePortfolioManager.vue  # Holdings management
│   ├── RebalancingTable.vue   # Order display
│   └── StrategyParams.vue     # Strategy configuration
└── views/
    └── HomeView.vue           # Main dashboard
```

**Key State Stores:**

- **ETF Config Store**: Manages ETF universe, categories, and selections
- **Momentum Store**: Caches momentum data and rankings
- **Portfolio Store**: Tracks current holdings and values
- **Rebalancing Store**: Orchestrates rebalancing logic and optimization

### API Endpoints

The backend provides RESTful endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/momentum/:ticker` | GET | Calculate momentum for single ETF |
| `/api/momentum/batch` | POST | Batch momentum calculation |
| `/api/optimization/rebalance` | POST | Portfolio rebalancing optimization |
| `/api/quote/:ticker` | GET | Get current ETF quote |
| `/api/prices/:ticker` | GET | Get historical prices |
| `/health` | GET | Health check |

### Caching Strategy

Performance is optimized through multi-layer caching:

1. **Backend Cache Service**: In-memory caching with TTL
   - Momentum results: 1 hour TTL
   - Quote data: 5 minutes TTL
   - Historical prices: 24 hours TTL
   - Optimization results: 30 minutes TTL

2. **Frontend Pinia Stores**: Client-side state persistence
   - Portfolio holdings: LocalStorage
   - ETF prices: In-memory with manual refresh

3. **Browser Cache**: HTTP caching for static assets

## How to Use the Application

### Step 1: Configure ETF Universe
1. Select asset categories (Stocks, Bonds, Commodities, Alternatives)
2. Choose specific ETFs within each category
3. Default selection includes all 9 ETFs

### Step 2: Enter Current Holdings
1. Add current ETF holdings with share counts
2. Specify additional cash to invest
3. Refresh prices to get current values

### Step 3: Calculate Momentum
1. Click "Calculate Momentum" button
2. System fetches 2 years of price data
3. View ranked momentum scores for each ETF

### Step 4: Generate Rebalancing Orders
1. Click "Generate Orders" button
2. System selects top 4 ETFs with positive momentum
3. View recommended BUY/SELL orders with share counts

### Step 5: Execute Trades
1. Review rebalancing table
2. Check deviation percentages
3. Execute trades through your broker

## Example Scenario

```
Current Portfolio:
• VTI: 10 shares @ $250 = $2,500
• VEA: 20 shares @ $50 = $1,000
• Additional Cash: $5,000
Total: $8,500

Momentum Results:
1. VTI: +13.02% momentum (POSITIVE)
2. VEA: +8.45% momentum (POSITIVE)
3. TLT: -2.15% momentum (NEGATIVE - excluded)
4. PDBC: +15.78% momentum (POSITIVE)
5. BWX: +4.32% momentum (POSITIVE)

Selected Top 4: VTI, PDBC, BWX, VEA

Target Allocation:
• VTI: 24% = $2,040
• PDBC: 24% = $2,040
• BWX: 24% = $2,040
• VEA: 24% = $2,040
• IBIT: 4% = $340

Rebalancing Orders:
• BUY VTI: 0 shares (already at target)
• BUY PDBC: 15 shares @ $136 = $2,040
• BUY BWX: 18 shares @ $113 = $2,034
• BUY VEA: 21 shares @ $50 = $1,050
• SELL VEA: 1 share @ $50 = -$50 (reduce from 20 to 19)

Final Portfolio:
• VTI: 10 shares @ $250 = $2,500
• PDBC: 15 shares @ $136 = $2,040
• BWX: 18 shares @ $113 = $2,034
• VEA: 19 shares @ $50 = $950
• IBIT: 7 shares @ $45 = $315
• Cash: $661 (leftover)
Total: $8,500
```

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start backend server (in one terminal)
cd server
npm install
npm start
# Backend runs on http://localhost:3001

# Start frontend (in another terminal)
npm run dev
# Frontend runs on http://localhost:5173
```

### Docker Development

```bash
# Using Docker Compose
docker-compose up

# Or build and run with Docker
docker build -t momentum-rider .
docker run -p 5173:5173 momentum-rider
```

## Technology Stack

- **Frontend**: Vue 3 + TypeScript + Composition API
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Build Tool**: Vite
- **Backend**: Node.js + Express
- **Financial Data**: Yahoo Finance API (via yahoo-finance2)
- **Optimization**: javascript-lp-solver (MILP)
- **Development**: Docker + Docker Compose
- **Testing**: Vitest

## Deployment

### Cloudflare Pages (Frontend Only)

```bash
# Build the frontend
npm run build

# Deploy dist/ folder to Cloudflare Pages
# Backend needs separate deployment (Railway, Render, etc.)
```

### Full-Stack Deployment

```bash
# Build frontend
npm run build

# Copy build to server/public
cp -r dist/* server/public/

# Start production server
cd server
NODE_ENV=production npm start
```

## Accessibility Features

The application includes comprehensive accessibility support:

- **Screen Reader Support**: ARIA labels and announcements
- **Keyboard Navigation**: Full keyboard support for all features
- **Focus Management**: Logical tab order and focus indicators
- **Color Contrast**: WCAG compliant color schemes
- **Responsive Design**: Works on desktop, tablet, and mobile

## Performance Optimizations

1. **Batch API Calls**: Fetch multiple ETF quotes simultaneously
2. **Client-Side Caching**: Cache momentum data and prices
3. **Lazy Loading**: Components loaded on demand
4. **Debounced Inputs**: Reduce API calls during typing
5. **Background Updates**: Refresh prices in background

## Configuration Options

Customize strategy parameters:

- **topAssets**: Number of ETFs to select (default: 4)
- **bitcoinAllocation**: IBIT allocation percentage (default: 4%)
- **momentumPeriods**: Timeframes for calculation (default: [3, 6, 9, 12])
- **allocationStrategy**: Optimization method (default: multi-share)
- **rebalancingFrequency**: How often to rebalance (default: monthly)

## Limitations & Disclaimers

- This is educational software, not financial advice
- Past performance does not guarantee future results
- Momentum strategies can underperform during market reversals
- Real trading involves slippage, fees, and taxes
- Always verify data and consult a financial advisor

## Future Enhancements

- Backtesting engine with historical performance
- Advanced risk metrics (Sharpe ratio, drawdown, volatility)
- Multiple momentum variants (time-weighted, risk-adjusted)
- Sector-specific momentum tracking
- Real-time price alerts and notifications
- Paper trading mode for strategy testing
- Portfolio performance tracking
- Tax optimization (tax-loss harvesting)

## Academic References

- Jegadeesh, N., & Titman, S. (1993). Returns to Buying Winners and Selling Losers
- Asness, C., Moskowitz, T., & Pedersen, L. (2013). Value and Momentum Everywhere
- Carhart, M. (1997). On Persistence in Mutual Fund Performance

## License

MIT License

## Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Disclaimer**: This application is for educational purposes only and does not constitute financial advice. Always consult with a qualified financial advisor before making investment decisions.
