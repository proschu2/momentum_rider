# Layout System Specification

## Overview

The Momentum Rider Layout System provides a comprehensive framework for desktop-optimized portfolio management interfaces. This system enables flexible, responsive layouts with resizable panels, keyboard navigation, and persistent user preferences.

## Layout Architecture

### Core Layout Components

#### DashboardLayout
**Purpose**: Main desktop layout container with resizable panels

**Props**:
```typescript
interface DashboardLayoutProps {
  initialLayout?: DashboardLayout
  defaultPanelStates?: {
    left: 'expanded' | 'collapsed'
    right: 'expanded' | 'collapsed'
  }
  persistLayout?: boolean
  maxWidth?: number
  minWidth?: number
}
```

**Features**:
- Three-panel layout (left, main, right)
- Resizable panels with constraints
- Keyboard shortcuts (Ctrl+1, Ctrl+2)
- Layout persistence via localStorage
- Responsive breakpoints

**Events**:
- `layoutChange`: Emitted when layout changes
- `panelToggle`: Emitted when panels are toggled
- `layoutReset`: Emitted when layout is reset to defaults

#### ResizablePanel
**Purpose**: Flexible panel component with drag-to-resize functionality

**Props**:
```typescript
interface ResizablePanelProps {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  resizable?: boolean
  direction?: 'horizontal' | 'vertical'
  persistKey?: string
  snapPoints?: number[]
  snapThreshold?: number
}
```

**Features**:
- Mouse and keyboard resizing
- Accessibility support (ARIA attributes)
- Visual feedback during resize
- Persistence via localStorage
- Snap points for common widths

## Layout Patterns

### Desktop Layout (1024px+)

#### Three-Panel Layout
```
┌─────────────────────────────────────────────────────────┐
│                    Header                               │
├─────────────┬─────────────────────────────┬─────────────┤
│             │                             │             │
│   Left      │          Main               │   Right     │
│   Panel     │          Panel              │   Panel     │
│   (300px)   │          (flex)             │   (300px)   │
│             │                             │             │
└─────────────┴─────────────────────────────┴─────────────┘
```

**Panel Distribution**:
- **Left Panel**: 300px (min: 200px, max: 500px)
- **Main Panel**: Flexible (min: 600px)
- **Right Panel**: 300px (min: 200px, max: 500px)

### Tablet Layout (768px - 1023px)

#### Two-Panel Layout
```
┌─────────────────────────────────────────────┐
│                    Header                   │
├─────────────┬───────────────────────────────┤
│             │                               │
│   Left      │            Main               │
│   Panel     │            Panel              │
│   (250px)   │            (flex)             │
│             │                               │
└─────────────┴───────────────────────────────┘
```

### Mobile Layout (<768px)

#### Single-Column Layout
```
┌─────────────────────────┐
│         Header          │
├─────────────────────────┤
│                         │
│        Main Panel       │
│                         │
│                         │
└─────────────────────────┘
```

## Panel Content Organization

### Left Panel - Configuration & Management
```typescript
interface LeftPanelContent {
  // Portfolio Management
  portfolioManager: DraggablePortfolioManager
  strategyConfiguration: StrategyParams

  // Quick Actions
  calculateMomentum: ActionButton
  generateOrders: ActionButton

  // Category Selection
  etfUniverse: CategorySelector
}
```

### Main Panel - Analysis & Results
```typescript
interface MainPanelContent {
  // Data Visualization
  portfolioAllocation: PortfolioAllocationChart
  performanceTrends: PerformanceTrendChart

  // Analysis Results
  momentumResults: MomentumDataTable
  rebalancingOrders: RebalancingTable

  // Portfolio Overview
  portfolioData: PortfolioDataTable
}
```

### Right Panel - Real-time & Market Data
```typescript
interface RightPanelContent {
  // Real-time Data
  realTimeManager: RealTimeDataManager
  marketOverview: MarketDataWidget

  // Notifications & Alerts
  notifications: NotificationPanel

  // Quick Stats
  portfolioMetrics: MetricsDashboard
}
```

## Responsive Behavior

### Breakpoint Transitions

#### Desktop → Tablet (1024px → 768px)
- Right panel collapses into overlay
- Left panel reduces to 250px minimum
- Main panel expands to fill available space
- Panel toggle buttons appear

#### Tablet → Mobile (768px → 320px)
- Left panel moves to navigation drawer
- Single-column layout
- Touch-optimized interactions
- Simplified navigation

### Responsive Constraints

```typescript
interface LayoutConstraints {
  desktop: {
    minWidth: 1024,
    panelWidths: { left: 300, right: 300 },
    resizable: true
  },
  tablet: {
    minWidth: 768,
    panelWidths: { left: 250, right: 0 },
    resizable: false
  },
  mobile: {
    minWidth: 320,
    panelWidths: { left: 0, right: 0 },
    resizable: false
  }
}
```

## Keyboard Navigation

### Global Shortcuts
```typescript
interface KeyboardShortcuts {
  // Panel Management
  'Ctrl+1': 'toggleLeftPanel',
  'Ctrl+2': 'toggleRightPanel',
  'Ctrl+0': 'resetLayout',

  // Navigation
  'Ctrl+M': 'focusMainContent',
  'Ctrl+P': 'focusPortfolio',
  'Ctrl+R': 'focusResults',

  // Actions
  'Ctrl+Enter': 'calculateMomentum',
  'Ctrl+Shift+Enter': 'generateOrders'
}
```

### Panel-Specific Shortcuts
```typescript
interface PanelShortcuts {
  leftPanel: {
    'ArrowUp': 'navigateUp',
    'ArrowDown': 'navigateDown',
    'Enter': 'selectItem'
  },
  mainPanel: {
    'Tab': 'nextField',
    'Shift+Tab': 'previousField',
    'Escape': 'clearSelection'
  }
}
```

## Layout Persistence

### Storage Strategy
```typescript
interface LayoutPersistence {
  // Local Storage Keys
  storageKeys: {
    layout: 'momentum-rider:layout',
    panelStates: 'momentum-rider:panel-states',
    preferences: 'momentum-rider:preferences'
  },

  // Data Structure
  layoutData: {
    leftPanel: number,
    mainPanel: number,
    rightPanel: number,
    panelStates: {
      left: 'expanded' | 'collapsed',
      right: 'expanded' | 'collapsed'
    },
    lastUpdated: number
  }
}
```

### Migration Strategy
- Versioned layout data
- Automatic migration between versions
- Fallback to defaults on corruption
- User confirmation for major changes

## Performance Optimization

### Layout Calculation
```typescript
interface LayoutPerformance {
  // Debounced Updates
  resizeDebounce: 150,

  // Batch Operations
  batchUpdates: true,

  // Memory Optimization
  virtualScrolling: true,
  lazyLoading: true
}
```

### Responsive Image Loading
- Load appropriate image sizes per breakpoint
- Lazy load off-screen content
- Preload critical layout assets

## Accessibility Features

### Screen Reader Support
```typescript
interface AccessibilityFeatures {
  // ARIA Labels
  panelLabels: {
    left: 'Configuration and portfolio management panel',
    main: 'Analysis and results panel',
    right: 'Real-time data and market overview panel'
  },

  // Keyboard Navigation
  focusManagement: {
    trapFocus: true,
    restoreFocus: true,
    focusIndicator: 'focus-ring'
  }
}
```

### High Contrast Support
- Enhanced color contrast ratios
- Focus indicator improvements
- Alternative text for visual elements

## Implementation Guidelines

### Component Structure
```vue
<template>
  <DashboardLayout
    :initial-layout="initialLayout"
    :persist-layout="true"
    @layout-change="handleLayoutChange"
  >
    <template #left-panel>
      <ResizablePanel
        :min-width="200"
        :max-width="500"
        :default-width="300"
        persist-key="left-panel"
      >
        <!-- Left panel content -->
      </ResizablePanel>
    </template>

    <template #main-panel>
      <div class="main-content">
        <!-- Main panel content -->
      </div>
    </template>

    <template #right-panel>
      <ResizablePanel
        :min-width="200"
        :max-width="500"
        :default-width="300"
        persist-key="right-panel"
      >
        <!-- Right panel content -->
      </ResizablePanel>
    </template>
  </DashboardLayout>
</template>
```

### Responsive Utilities
```scss
// Layout utility classes
.layout-desktop { @apply grid-cols-[300px_1fr_300px]; }
.layout-tablet { @apply grid-cols-[250px_1fr]; }
.layout-mobile { @apply grid-cols-1; }

// Panel visibility
.panel-collapsed { @apply hidden lg:block; }
.panel-overlay { @apply fixed inset-0 z-50 lg:relative lg:z-auto; }
```

### State Management Integration
```typescript
// Pinia store for layout state
interface LayoutStore {
  layout: DashboardLayout
  panelStates: PanelStates
  preferences: LayoutPreferences

  // Actions
  updateLayout: (layout: Partial<DashboardLayout>) => void
  togglePanel: (panel: 'left' | 'right') => void
  resetLayout: () => void
}
```

## Testing Strategy

### Layout Testing
```typescript
interface LayoutTests {
  // Unit Tests
  panelResizing: 'should resize panels within constraints',
  responsiveBreakpoints: 'should adapt layout at breakpoints',
  keyboardNavigation: 'should support keyboard shortcuts',

  // Integration Tests
  layoutPersistence: 'should save and restore layout preferences',
  accessibility: 'should meet WCAG 2.1 AA standards'
}
```

### Visual Regression Testing
- Screenshot comparison for layout changes
- Cross-browser layout verification
- Responsive design validation

## Best Practices

### 1. Progressive Enhancement
- Start with mobile layout
- Enhance for tablet and desktop
- Ensure core functionality works everywhere

### 2. Performance First
- Minimize layout shifts
- Optimize for 60fps animations
- Use efficient CSS properties

### 3. Accessibility by Default
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility

### 4. User-Centric Design
- Intuitive panel management
- Clear visual hierarchy
- Consistent interaction patterns

This layout system provides a robust foundation for building desktop-optimized portfolio management interfaces that are flexible, accessible, and performant across all device sizes.