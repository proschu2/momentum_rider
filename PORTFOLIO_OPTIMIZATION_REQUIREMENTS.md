# Portfolio Optimization System Requirements

## Overview
Extend the existing Momentum Rider system into a comprehensive portfolio optimization platform supporting custom ETFs, flexible allocation strategies, and additional technical indicators.

## Core Requirements

### 1. Custom ETF Support
- **Dynamic ETF Universe**: Allow users to add/remove ETFs from the investment universe
- **Custom ETF Configuration**: Support for custom tickers with metadata (name, category, expense ratio)
- **ETF Categories**: Extend beyond current hardcoded categories (STOCKS, BONDS, COMMODITIES, ALTERNATIVES)
- **Data Validation**: Validate custom ETF tickers against available data sources

### 2. Flexible Allocation Strategies
- **Percentage Allocations**: Support for fixed percentage allocations per ETF
- **Ranked ETF Allocation**: Allocate based on momentum ranking with configurable top-N selection
- **Hybrid Strategies**: Combine fixed percentages with momentum-based allocations
- **Risk-Adjusted Allocation**: Incorporate volatility and correlation metrics

### 3. Additional Trading Strategies
- **200 SMA Strategy**: Implement 200-day Simple Moving Average trend following
- **Multi-Strategy Framework**: Support for combining multiple strategies
- **Strategy Parameters**: Configurable parameters for each strategy
- **Strategy Backtesting**: Historical performance analysis

### 4. Portfolio Configuration
- **Portfolio Templates**: Pre-defined portfolio configurations
- **Custom Portfolio Creation**: User-defined portfolio structures
- **Portfolio Persistence**: Save and load portfolio configurations
- **Portfolio Comparison**: Compare multiple portfolio strategies

## Technical Requirements

### Backend Extensions
- **API Endpoints**:
  - `POST /api/etfs/custom` - Add custom ETF
  - `GET /api/etfs/custom` - List custom ETFs
  - `POST /api/strategies` - Configure allocation strategies
  - `GET /api/strategies/sma/:ticker` - 200 SMA calculation
  - `POST /api/portfolios` - Create/save portfolio configurations

- **Service Layer**:
  - `CustomETFService` - Manage custom ETF universe
  - `StrategyService` - Handle multiple allocation strategies
  - `SMAService` - Calculate 200-day SMA and trend signals
  - `PortfolioConfigService` - Manage portfolio configurations

### Frontend Extensions
- **New Components**:
  - `CustomETFManager.vue` - Add/remove custom ETFs
  - `StrategyBuilder.vue` - Configure allocation strategies
  - `PortfolioConfigurator.vue` - Create portfolio templates
  - `StrategyComparison.vue` - Compare strategy performance

- **Enhanced Components**:
  - `ETFUniverse.vue` - Support custom ETF categories
  - `PortfolioManager.vue` - Multiple allocation strategies
  - `RebalancingTable.vue` - Strategy-aware rebalancing

## Data Requirements

### Custom ETF Data
- **Metadata Storage**: Name, category, expense ratio, inception date
- **Price Data Integration**: Yahoo Finance API compatibility
- **Validation**: Ensure ticker availability and data quality

### Strategy Configuration
- **Strategy Parameters**:
  - Momentum ranking thresholds
  - SMA crossover rules
  - Allocation percentages
  - Rebalancing frequency

### Portfolio Templates
- **Template Structure**:
  - ETF universe selection
  - Allocation strategy
  - Strategy parameters
  - Risk preferences

## Implementation Constraints

### Backend Constraints
- **Performance**: Maintain current API response times (< 2s)
- **Scalability**: Support 100+ custom ETFs per user
- **Data Consistency**: Ensure custom ETF data availability
- **Error Handling**: Graceful degradation when custom ETFs unavailable

### Frontend Constraints
- **User Experience**: Intuitive strategy configuration
- **Performance**: Smooth interaction with large ETF universes
- **Responsive Design**: Mobile-friendly portfolio management
- **State Management**: Efficient handling of complex portfolio states

## Success Criteria

### Functional Requirements
- [ ] Users can add custom ETFs to investment universe
- [ ] Support for fixed percentage allocations per ETF
- [ ] Momentum-based ranked ETF allocation
- [ ] 200 SMA trend following strategy
- [ ] Portfolio configuration saving/loading
- [ ] Strategy performance comparison

### Non-Functional Requirements
- [ ] API response times < 2s for all operations
- [ ] Support for 100+ custom ETFs
- [ ] Mobile-responsive interface
- [ ] Comprehensive error handling
- [ ] Clear user feedback for strategy configuration

## Integration Points

### Existing System Integration
- **Momentum Calculation**: Leverage existing momentum service
- **Price Data**: Use current Yahoo Finance integration
- **Portfolio Optimization**: Extend current optimization algorithms
- **Caching**: Maintain Redis caching strategy

### External Dependencies
- **Yahoo Finance API**: Primary data source
- **Redis**: Caching layer
- **Vue.js**: Frontend framework
- **Express.js**: Backend framework

## Risk Assessment

### Technical Risks
- **Data Availability**: Custom ETFs may have limited historical data
- **API Rate Limits**: Yahoo Finance API limitations
- **Performance**: Complex strategy calculations may impact performance

### Mitigation Strategies
- **Data Validation**: Pre-validate custom ETF availability
- **Caching Strategy**: Aggressive caching of strategy calculations
- **Fallback Mechanisms**: Graceful degradation when data unavailable

## Next Steps
1. **Phase 1**: Custom ETF support and basic allocation strategies
2. **Phase 2**: 200 SMA strategy implementation
3. **Phase 3**: Portfolio configuration and templates
4. **Phase 4**: Advanced strategy combinations and backtesting