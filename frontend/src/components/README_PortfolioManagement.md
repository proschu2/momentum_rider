# Multi-Portfolio Management System

This document describes the implementation of the simplified multi-portfolio management system for Momentum Rider.

## Overview

The multi-portfolio system allows users to:
1. Manage multiple portfolios (2-3 max as designed)
2. Each portfolio contains holdings + embedded cash (no separate cash storage)
3. Select portfolio → Select strategy → Analyze with current holdings + cash as budget
4. User-defined portfolio names with numbered defaults

## Architecture

### Data Structure

```typescript
interface Portfolio {
  id: string
  name: string
  description?: string
  holdings: { [ticker: string]: Holding }
  additionalCash: number
  createdAt: string
  updatedAt: string
}

interface PortfoliosData {
  portfolios: { [portfolioId: string]: Portfolio }
  activePortfolioId: string
  defaultNames: string[]
}
```

### Component Hierarchy

```
HomeView.vue (Main orchestrator)
├── PortfolioSummaryCard.vue (Empty state overview)
├── PortfolioSelector.vue (Portfolio selection grid)
├── PortfolioDetail.vue (Individual portfolio editing)
└── StrategyHub.vue (Strategy analysis with selected portfolio)
```

### Store Integration

The `usePortfolioStore` has been enhanced with:
- Multi-portfolio state management
- Migration from legacy single-portfolio format
- Backward compatibility with existing components
- Portfolio-specific CRUD operations

## User Flow

### 1. Empty State (No Portfolios)
- Shows PortfolioSummaryCard with overview statistics
- "Create New Portfolio" button to get started

### 2. Portfolio Selection
- Grid of portfolio cards showing name, total value, holdings count, cash
- Click to select portfolio for strategy analysis
- Edit/Delete buttons for portfolio management
- "Add Portfolio" card for creating new portfolios

### 3. Strategy Analysis
- Selected portfolio information displayed in header
- Portfolio holdings + cash sent to analysis API
- Back button to return to portfolio selection
- Full integration with existing strategy workflow

## Key Features

### Portfolio Management
- **Create**: New portfolios with auto-numbered names
- **Edit**: Portfolio name, holdings, cash amount
- **Delete**: Remove portfolios with confirmation
- **Default Names**: "Portfolio 1", "Portfolio 2", etc.

### Holdings Management
- **Add**: New holdings with ticker, shares, optional price
- **Remove**: Delete holdings with confirmation
- **Refresh**: Update all holding prices from API
- **Percentages**: Automatic calculation of portfolio allocation

### Cash Integration
- **Embedded**: Cash is part of portfolio (not separate)
- **Budget Calculation**: Holdings value + cash = total analysis budget
- **Strategy Integration**: Cash automatically included in strategy analysis

### Migration
- **Automatic**: Detects old single-portfolio format
- **Seamless**: Migrates existing data to new structure
- **Cleanup**: Removes old localStorage keys after migration

## Responsive Design

### Desktop (>768px)
- Portfolio grid: 3-4 columns
- Hover effects and transitions
- Full portfolio detail view

### Tablet (≤768px)
- Portfolio grid: 2 columns
- Stacked layout for portfolio detail
- Reduced spacing and font sizes

### Mobile (≤480px)
- Portfolio grid: 1 column
- Full-width forms and buttons
- Touch-friendly interaction areas

## Integration Points

### With StrategyHub
- Portfolio prop passed to StrategyHub
- Portfolio holdings converted to API format
- Additional cash included in analysis requests
- Back navigation for portfolio management

### With Existing Components
- Backward compatibility maintained
- Legacy components work with new system
- Minimal breaking changes to existing functionality

## Storage Structure

### New Format
```javascript
localStorage.setItem('momentumRider_portfolios', JSON.stringify({
  portfolios: {...},
  activePortfolioId: '...',
  defaultNames: ['Portfolio 1', 'Portfolio 2', ...]
}))
```

### Legacy Format (Migration)
```javascript
// Old format (automatically migrated)
localStorage.getItem('momentumRider_portfolio') // holdings
localStorage.getItem('momentumRider_additionalCash') // separate cash
```

## Implementation Notes

### State Management
- Reactive portfolio state with computed properties
- Automatic localStorage persistence
- Migration logic for backward compatibility

### Performance
- Lazy loading of portfolio data
- Efficient computed properties for totals
- Minimal re-renders with Vue reactivity

### Error Handling
- Graceful fallbacks for API failures
- Validation for portfolio operations
- User confirmation for destructive actions

## Future Enhancements

### Potential Improvements
1. Portfolio templates (Conservative, Aggressive, etc.)
2. Portfolio performance tracking
3. Bulk operations (multiple holdings at once)
4. Portfolio export/import functionality
5. Advanced portfolio analytics

### Scalability
- Current design supports 2-3 portfolios efficiently
- Architecture scales to 5+ portfolios if needed
- Component structure allows easy feature additions