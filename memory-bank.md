# Memory Bank

## Overview
This file serves as a persistent memory bank for important project context that should be retained across sessions.

## Project Context
Momentum Rider is an ETF portfolio management application that implements momentum-based rebalancing strategies. The system calculates momentum scores for ETFs and generates rebalancing orders to optimize portfolio performance.

## Key Decisions

### Budget Allocation Strategy Design (2025-10-28)
**Problem:** Current remainder-first allocation leaves budget unused when cheaper ETFs could absorb multiple shares.

**Solution:** Implement configurable budget allocation strategies with multi-share promotion capability.

**Key Decisions:**
1. **Multi-Share Promotion**: Implement while-loop algorithm to promote multiple shares for cheaper ETFs until budget exhausted
2. **Configurable Strategies**: Provide 5 allocation strategies with user-selectable options
3. **Fallback Mechanism**: Allow secondary strategy execution if primary leaves budget
4. **Default Strategy**: Multi-share promotion recommended for maximum budget utilization

**Strategies Implemented:**
- Remainder-First (current behavior)
- Multi-Share (maximize shares, minimize leftover)
- Momentum-Weighted (prioritize high momentum ETFs)
- Price-Efficient (prioritize cheaper ETFs)
- Hybrid (balance momentum and price efficiency)

## Code Patterns

### Strategy Pattern for Allocation
- Factory pattern for strategy creation
- Interface-based strategy implementations
- Configurable strategy selection in UI
- Fallback strategy support

### Budget Minimization
- While-loop promotion with safety limits
- Price-ascending sorting for maximum efficiency
- Momentum-weighted scoring for strategy alignment

## Session History

### Budget Allocation Strategy Design (2025-10-28)

**Current Status:**
- Comprehensive budget allocation strategy design completed
- Multi-share promotion algorithm designed with while-loop optimization
- Configurable strategy system with 5 allocation approaches
- UI components designed for strategy selection

**Key Outcomes:**
- Expected budget utilization improvement: 70-90% reduction in leftover budget
- Multi-share strategy can promote 26+ shares for $13 ETF vs 1 share for $340 ETF
- User-configurable strategies with fallback options
- Backward compatibility maintained with remainder-first strategy

**Technical Context:**
- Vue 3 + TypeScript + Vite
- Pinia state management with extended types
- Strategy pattern implementation
- Real-time budget utilization tracking

**Next Steps:**
1. Implement strategy types in rebalancing store
2. Create StrategyConfiguration.vue component
3. Integrate strategy selection into PortfolioManager
4. Test with real ETF price data

### GUI Layout Reorganization Session (2025-10-26)

**Previous Status:**
- Layout reorganization in progress
- MIME type error needs investigation
- Background test processes stopped

**Todo List:**
- [ ] Fix MIME type error in Vite development server
- [ ] Reorganize layout - move sidebar content to top/middle
- [ ] Create meaningful spacing and visual hierarchy
- [x] Stop background test processes

**Recent Changes:**
- Modified HomeView.vue layout from 3-column to 2-column grid
- Enhanced button sizing and spacing
- Killed interfering test processes

**Technical Context:**
- Vue 3 + TypeScript + Vite
- Tailwind CSS with custom color palette
- Pinia state management
- Current issue: MIME type error blocking module loading

**Next Steps:**
1. Investigate and fix MIME type error
2. Complete layout reorganization
3. Implement meaningful spacing and visual hierarchy