# Momentum Rider Portfolio Strategy

A Vue 3 + TypeScript web application for implementing the Momentum Rider portfolio strategy with ETF universe management and automated rebalancing.

## Features

- **ETF Universe Management**: Configurable categories with toggle functionality
- **Strategy Parameters**: Customizable momentum periods, top assets count, Bitcoin allocation
- **Portfolio Management**: Current holdings tracking with real-time value calculation
- **Momentum Calculation**: Multi-period momentum scoring with absolute momentum filtering
- **Rebalancing Orders**: Automated BUY/SELL recommendations with allocation logic
- **Responsive Design**: Tailwind CSS for modern, mobile-friendly interface

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173/
```

### Docker Development

```bash
# Using Docker Compose
docker-compose up

# Or build and run with Docker
docker build -t momentum-rider .
docker run -p 5173:5173 momentum-rider
```

## Strategy Overview

The Momentum Rider strategy implements a systematic momentum-based approach:

1. **ETF Selection**: Choose from predefined categories (Stocks, Bonds, Commodities, Alternatives)
2. **Momentum Calculation**: Calculate returns over 3, 6, 9, and 12-month periods
3. **Absolute Momentum**: Filter for ETFs with positive average momentum
4. **Portfolio Construction**: Select top N assets with positive momentum
5. **Bitcoin Allocation**: Fixed percentage allocation to Bitcoin ETF (IBIT)
6. **Rebalancing**: Generate BUY/SELL orders to achieve target allocations

## Default ETF Universe

- **STOCKS**: VTI, VEA, VWO
- **BONDS**: TLT, BWX, BND
- **COMMODITIES**: PDBC
- **ALTERNATIVES**: SGOL, IBIT

## Technology Stack

- **Frontend**: Vue 3 + TypeScript + Composition API
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Build Tool**: Vite
- **Development**: Docker + Docker Compose

## Deployment

### Cloudflare Pages

```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
# The dist/ folder contains the static build
```

### Local Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Vue components
│   ├── ETFUniverse.vue
│   ├── StrategyParams.vue
│   ├── PortfolioManager.vue
│   └── RebalancingTable.vue
├── stores/             # Pinia stores
│   └── momentum-rider.ts
├── views/              # Page components
│   ├── HomeView.vue
│   └── AboutView.vue
└── main.ts            # Application entry point
```

## Next Steps

- Add real financial data integration (Yahoo Finance API)
- Implement charts for allocation and momentum visualization
- Add user authentication and portfolio persistence
- Deploy to Cloudflare Pages for static hosting

## License

MIT License
