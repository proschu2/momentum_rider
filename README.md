# Momentum Rider - Portfolio Strategy Management System

🚀 **UNIFIED STRATEGY WORKFLOW COMPLETE** - A comprehensive portfolio management system with momentum-based ETF strategies, linear programming optimization, and real-time market data integration.

## ✨ **Current Features**

### **🎯 Strategy Implementation**
- **📈 Momentum Strategy**: Weighted scoring (3,6,9,12 month periods) with top-N selection
- **🛡️ All-Weather Strategy**: Dalio-inspired allocation with SMA trend filters
- **🎨 Custom Strategy**: User-defined allocation percentages
- **💰 Portfolio Optimization**: Linear programming for optimal allocation
- **📊 Trade Generation**: Automated execution planning

### **💻 Technical Stack**
- **Backend**: Node.js + Express + Redis caching
- **Frontend**: Vue 3 + TypeScript + Tailwind CSS
- **Data**: Yahoo Finance API with real-time market data
- **Optimization**: JavaScript LP Solver with fallback strategies

## 🚀 **Quick Start**

### **Development Setup (Recommended)**
```bash
# Clone and install dependencies
git clone <repository>
cd momentum-rider
npm run install:all

# Start backend server (Terminal 1)
cd server && npm run dev
# → http://localhost:3001

# Start frontend server (Terminal 2)
cd frontend && npm run dev
# → http://localhost:5173

# Access the unified StrategyHub interface
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001/api
```

### **Docker Setup (Alternative)**
```bash
# Development with live reload
docker-compose -f docker-compose.dev.yml up -d
# → http://localhost:3000

# Production standalone
docker build -t momentum-rider .
docker run -d -p 3000:3000 momentum-rider
# → http://localhost:3000
```

## 🎯 **Strategy Examples**

### **Momentum Strategy**
```javascript
{
  "strategy": {
    "type": "momentum",
    "parameters": {
      "topN": 3,
      "includeIBIT": true,
      "fallbackETF": "SGOV"
    }
  },
  "selectedETFs": ["VTI", "QQQ", "VEA", "VWO"],
  "additionalCapital": 10000
}
```

### **All-Weather Strategy**
```javascript
{
  "strategy": {
    "type": "allweather",
    "parameters": {
      "smaPeriod": 200,
      "bondFallbackPercent": 80
    }
  },
  "selectedETFs": ["VTI", "TLT", "BND", "GLDM"],
  "additionalCapital": 5000
}
```

### **Custom Strategy**
```javascript
{
  "strategy": {
    "type": "custom",
    "parameters": {
      "allocations": {
        "VTI": 40,
        "QQQ": 30,
        "IBIT": 10,
        "BND": 20
      }
    }
  }
}
```

## 📊 **API Endpoints**

### **Portfolio Management**
- **POST** `/api/portfolio/analyze` - Strategy analysis and target allocation
- **POST** `/api/portfolio/optimize` - Linear programming optimization
- **POST** `/api/portfolio/execution-plan` - Trade generation
- **GET** `/api/portfolio/status` - Current portfolio status

### **Market Data**
- **GET** `/api/quote/{ticker}` - Current price and quote data
- **GET** `/api/momentum/{ticker}` - Momentum scores and analysis
- **GET** `/api/prices/batch` - Batch price data

### **System**
- **GET** `/health` - System health check
- **GET** `/api/health` - API health check

## 🏗️ **Architecture**

### **Backend Structure**
```
server/
├── routes/
│   ├── portfolio.js          # Portfolio API endpoints
│   ├── quote.js              # Market data endpoints
│   └── optimization.js       # Optimization endpoints
├── services/
│   ├── portfolioService.js   # Business logic
│   ├── financeService.js     # Yahoo Finance integration
│   ├── portfolioOptimizationService.js  # LP solver
│   └── cacheService.js       # Caching layer
├── middleware/               # Auth, logging, rate limiting
└── config/                   # Redis, logging configuration
```

### **Frontend Structure**
```
frontend/src/
├── components/
│   ├── StrategyHub.vue       # Main unified interface
│   ├── ETFUniverseStatus.vue # ETF status display
│   └── StrategyTemplateSelector.vue  # Strategy templates
├── services/
│   ├── portfolio-service.ts  # API client
│   └── etf-service.ts        # ETF management
├── stores/                    # Pinia state management
│   ├── etf-config.ts         # ETF configuration
│   └── portfolio.ts          # Portfolio state
└── utils/                     # Helper functions
```

### **Data Flow**
```
User Interface → StrategyHub → Pinia Store → API Client → Backend
→ Finance Service → Yahoo Finance → Portfolio Analysis →
Optimization Service → Trade Generation → Frontend Display
```

## 📈 **Strategy Algorithms**

### **Momentum Scoring**
```javascript
// Weighted momentum calculation
const weightedScore = (
  momentum3m * 0.3 +      // 3-month momentum (30%)
  momentum6m * 0.3 +      // 6-month momentum (30%)
  momentum9m * 0.2 +      // 9-month momentum (20%)
  momentum12m * 0.2      // 12-month momentum (20%)
);

// Select top N positive momentum ETFs
// Add IBIT (4% fixed allocation) if enabled
// Fallback to SGOV/VUBS if no positive momentum
```

### **All-Weather Allocation**
```javascript
// Dalio-inspired base allocation
const baseAllocations = {
  'VTI': 30,    // US Stocks (30%)
  'VEA': 15,    // Developed International (15%)
  'VWO': 5,     // Emerging Markets (5%)
  'TLT': 40,    // Long-term Treasury (40%)
  'BND': 7.5,   // Total Bond Market (7.5%)
  'PDBC': 2.5,  // Commodities (2.5%)
  'GLDM': 2.5,  // Gold (2.5%)
  'IBIT': 4     // Bitcoin (4%)
};

// Adjust based on SMA trend analysis
// Move stock allocations to bonds when below 200-day SMA
```

### **Linear Programming Optimization**
```javascript
// Objective: Minimize leftover budget
// Constraints:
// - Target allocation percentages
// - Minimum trade sizes
// - Maximum position limits
// - Available capital

// Fallback strategies:
// 1. Relax allocation constraints
// 2. Use equal weighting
// 3. Prioritize high-conviction positions
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# API Configuration
API_BASE_URL=http://localhost:3001/api
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### **Frontend Configuration**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

## 📊 **Current Status**

### **✅ Completed Features**
- [x] **Real-time Market Data**: Yahoo Finance API integration
- [x] **Strategy Analysis**: Momentum, All-Weather, Custom strategies
- [x] **Portfolio Optimization**: Linear programming with constraints
- [x] **Trade Generation**: Automated buy/sell recommendations
- [x] **Responsive Interface**: Mobile-friendly web application
- [x] **Caching Layer**: Redis with in-memory fallback
- [x] **API Rate Limiting**: Prevent abuse and manage costs
- [x] **Error Handling**: Comprehensive error management
- [x] **Development Setup**: Separate frontend/backend servers

### **🔄 Key Capabilities**
- **Portfolio Analysis**: Real-time valuation and strategy recommendations
- **Risk Management**: Diversification scoring and position limits
- **Performance Metrics**: Expected returns, utilization rates
- **Market Integration**: Live price data and historical analysis
- **User Interface**: Unified strategy configuration and execution

### **📋 Example Workflow**
1. **Select Strategy**: Choose momentum, all-weather, or custom allocation
2. **Configure Parameters**: Set strategy-specific parameters (topN, SMA periods, etc.)
3. **Select ETFs**: Choose from available ETF universe
4. **Set Capital**: Add additional capital for investment
5. **Analyze**: Get portfolio analysis and target allocations
6. **Optimize**: Generate optimal trade recommendations
7. **Execute**: Review and execute trade plan

## 🚀 **Development**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Redis (optional, uses in-memory fallback)

### **Local Development**
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev  # Runs both frontend and backend

# Or run separately
cd server && npm run dev     # Backend: :3001
cd frontend && npm run dev    # Frontend: :5173
```

### **Testing**
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd frontend && npm test

# Integration tests
npm run test
```

### **Building for Production**
```bash
# Frontend build
cd frontend && npm run build

# Production server
cd server && npm start
```

## 📝 **Documentation**

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Detailed current status and architecture
- **[API Documentation](./server/docs/)** - API endpoint documentation
- **[Frontend README](./frontend/README.md)** - Frontend development guide

## 🔮 **Future Enhancements**

### **Planned Features**
- [ ] **Mixed Strategies**: Combine multiple strategies (30% momentum + 70% all-weather)
- [ ] **Backtesting**: Historical performance analysis
- [ ] **Risk Analytics**: VaR, drawdown, Sharpe ratio calculations
- [ ] **Database Storage**: PostgreSQL for persistent portfolio data
- [ ] **User Authentication**: Multi-user support with portfolios
- [ ] **Brokerage Integration**: Real trade execution APIs
- [ ] **Mobile Application**: React Native implementation
- [ ] **WebSocket Updates**: Real-time price updates

### **Technical Improvements**
- [ ] **Comprehensive Testing**: Unit, integration, E2E tests
- [ ] **CI/CD Pipeline**: Automated testing and deployment
- [ ] **Performance Monitoring**: Metrics and error tracking
- [ ] **Security Hardening**: Authentication, authorization, audit logging
- [ ] **Scalability**: Load balancing, database optimization

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 **Support**

For support and questions:
- Check the [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current capabilities
- Review the [API Documentation](./server/docs/) for integration details
- Open an issue for bug reports or feature requests

---

**🎉 Momentum Rider v1.0 - Complete Portfolio Strategy Management System**
**📅 Last Updated: 2025-11-18**