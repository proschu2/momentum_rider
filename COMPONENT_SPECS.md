# Component Specifications

## Layout Components

### DashboardLayout
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
}
```

**Features**:
- Three-panel layout (left, main, right)
- Resizable panels with constraints
- Keyboard shortcuts (Ctrl+1, Ctrl+2)
- Layout persistence
- Responsive breakpoints

**Events**:
- `layoutChange`: Emitted when layout changes
- `panelToggle`: Emitted when panels are toggled

### ResizablePanel
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
}
```

**Features**:
- Mouse and keyboard resizing
- Accessibility support (ARIA attributes)
- Visual feedback during resize
- Persistence via localStorage

## Data Display Components

### PortfolioAllocationChart
**Purpose**: Interactive portfolio allocation visualization

**Props**:
```typescript
interface PortfolioAllocationChartProps {
  data: ChartData[]
  chartType?: 'pie' | 'donut'
  interactive?: boolean
  showLegend?: boolean
  showCategories?: boolean
}
```

**Features**:
- Pie and donut chart variants
- Hover tooltips with detailed information
- Click interactions for drill-down
- Responsive SVG rendering
- Color-coded by asset category

### MomentumDataTable
**Purpose**: Sortable and filterable momentum analysis table

**Props**:
```typescript
interface MomentumDataTableProps {
  data: MomentumData[]
  sortable?: boolean
  filterable?: boolean
  pagination?: boolean
  pageSize?: number
}
```

**Features**:
- Column sorting (ascending/descending)
- Text filtering across all columns
- Pagination for large datasets
- Row highlighting based on momentum status
- Export functionality

### RebalancingTable
**Purpose**: Actionable rebalancing recommendations with summary statistics

**Props**:
```typescript
interface RebalancingTableProps {
  orders: RebalancingOrder[]
  showSummary?: boolean
  interactive?: boolean
  onAction?: (order: RebalancingOrder, action: string) => void
}
```

**Features**:
- Color-coded action badges (BUY/SELL/HOLD)
- Summary statistics (total buys, sells, net change)
- Action confirmation dialogs
- Export to CSV functionality
- Real-time value updates

## Interactive Components

### DraggablePortfolioManager
**Purpose**: Drag-and-drop portfolio management interface

**Props**:
```typescript
interface DraggablePortfolioManagerProps {
  holdings: Holding[]
  onReorder?: (oldIndex: number, newIndex: number) => void
  onAdd?: (holding: NewHolding) => void
  onRemove?: (ticker: string) => void
  onUpdate?: (ticker: string, updates: Partial<Holding>) => void
}
```

**Features**:
- Drag-and-drop reordering
- Touch support for mobile devices
- Add/remove holdings with validation
- Price refresh functionality
- Confirmation dialogs for destructive actions
- Screen reader announcements

### StrategyParams
**Purpose**: Strategy configuration with validation and real-time feedback

**Props**:
```typescript
interface StrategyParamsProps {
  params: StrategyParams
  onChange?: (params: StrategyParams) => void
  disabled?: boolean
  showValidation?: boolean
}
```

**Features**:
- Real-time validation feedback
- Dependent parameter logic
- Preset strategy templates
- Reset to defaults functionality
- Tooltip explanations for each parameter

### RealTimeDataManager
**Purpose**: Live data monitoring and update configuration

**Props**:
```typescript
interface RealTimeDataManagerProps {
  enabled?: boolean
  refreshInterval?: number
  onStatusChange?: (enabled: boolean) => void
  onIntervalChange?: (interval: number) => void
}
```

**Features**:
- Toggle real-time updates
- Configurable refresh intervals
- Connection status indicator
- Data freshness indicators
- Manual refresh triggers

## UI Components

### CollapsibleSection
**Purpose**: Expandable/collapsible content areas with smooth animations

**Props**:
```typescript
interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  badge?: string | number
  showToggle?: boolean
  variant?: 'default' | 'bordered' | 'elevated'
}
```

**Features**:
- Smooth expand/collapse animations
- Keyboard accessibility (Enter/Space)
- Badge support for counts
- Custom header content via slots
- Persistence of open/closed state

### Tooltip
**Purpose**: Contextual information display on hover/focus

**Props**:
```typescript
interface TooltipProps {
  content: string
  position?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
  disabled?: boolean
  maxWidth?: number
}
```

**Features**:
- Multiple positioning options
- Configurable show/hide delay
- Accessibility support (role="tooltip")
- Responsive positioning
- Rich content support (HTML)

### ConfirmationDialog
**Purpose**: User action confirmation with different variants

**Props**:
```typescript
interface ConfirmationDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  loading?: boolean
}
```

**Features**:
- Multiple variants for different contexts
- Loading state for async operations
- Keyboard navigation (Escape to cancel)
- Focus management
- Screen reader announcements

### KeyboardShortcuts
**Purpose**: Global keyboard navigation and action shortcuts

**Props**:
```typescript
interface KeyboardShortcutsProps {
  shortcuts?: Shortcut[]
  enabled?: boolean
  showHelp?: boolean
}
```

**Features**:
- Configurable shortcut mappings
- Help overlay display
- Context-aware shortcuts
- Screen reader announcements
- Conflict detection

## Form Components

### Input
**Purpose**: Enhanced input field with validation and styling

**Props**:
```typescript
interface InputProps {
  modelValue: string | number
  type?: 'text' | 'number' | 'email' | 'password'
  placeholder?: string
  disabled?: boolean
  error?: string
  success?: boolean
}
```

**Features**:
- Validation states (error, success)
- Clear button for text inputs
- Number input with step controls
- Password visibility toggle
- Auto-focus and auto-complete

### Button
**Purpose**: Styled button with multiple variants and states

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}
```

**Features**:
- Multiple visual variants
- Loading state with spinner
- Icon support
- Focus and hover states
- Accessibility attributes

### Select
**Purpose**: Enhanced select dropdown with search and multi-select

**Props**:
```typescript
interface SelectProps {
  modelValue: any
  options: SelectOption[]
  multiple?: boolean
  searchable?: boolean
  placeholder?: string
  disabled?: boolean
}
```

**Features**:
- Single and multi-select modes
- Search/filter functionality
- Custom option rendering
- Keyboard navigation
- Virtual scrolling for large lists

## Data Visualization Components

### PerformanceTrendChart
**Purpose**: Time-series performance visualization

**Props**:
```typescript
interface PerformanceTrendChartProps {
  data: TimeSeriesData[]
  period?: '1m' | '3m' | '6m' | '1y' | 'all'
  type?: 'line' | 'area' | 'bar'
  showGrid?: boolean
  interactive?: boolean
}
```

**Features**:
- Multiple chart types (line, area, bar)
- Interactive tooltips
- Period selection
- Comparison mode (multiple series)
- Export as image

### AdvancedDataTable
**Purpose**: Feature-rich data table with advanced functionality

**Props**:
```typescript
interface AdvancedDataTableProps {
  columns: TableColumn[]
  data: any[]
  pagination?: PaginationConfig
  sorting?: SortingConfig
  filtering?: FilteringConfig
  selection?: SelectionConfig
}
```

**Features**:
- Column customization
- Row selection
- Custom cell rendering
- Column resizing
- Frozen columns
- Export to multiple formats

## Utility Components

### ProgressBar
**Purpose**: Visual progress indicator

**Props**:
```typescript
interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  indeterminate?: boolean
}
```

**Features**:
- Multiple sizes and colors
- Label display options
- Indeterminate state
- Smooth animations
- Accessibility support

### Badge
**Purpose**: Small status indicators

**Props**:
```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  dot?: boolean
}
```

**Features**:
- Multiple visual variants
- Dot-only mode for minimal display
- Custom content
- Animation support

## Component Composition Patterns

### Container Components
- **DataProvider**: Manages data fetching and state
- **LayoutContainer**: Handles responsive layout logic
- **ErrorBoundary**: Catches and displays errors gracefully

### Presentational Components
- **Pure functional components**
- **No internal state**
- **Props-driven rendering**
- **Reusable across contexts**

### Higher-Order Components
- **withLoading**: Adds loading state management
- **withError**: Adds error handling
- **withValidation**: Adds form validation

## Component Testing Strategy

### Unit Testing
- **Props validation**
- **Event emission**
- **DOM interactions**
- **Accessibility attributes**

### Integration Testing
- **Component composition**
- **State management integration**
- **User interaction workflows**

### Visual Testing
- **Screenshot comparison**
- **Responsive behavior**
- **Animation states**

## Component Documentation Standards

### Documentation Structure
1. **Purpose**: Brief description of component's role
2. **Props**: Complete prop interface with types
3. **Slots**: Available slots and their usage
4. **Events**: Emitted events and their payloads
5. **Usage Examples**: Code examples for common scenarios
6. **Accessibility Notes**: Specific a11y considerations
7. **Performance Considerations**: Optimization tips

### Code Examples
```vue
<template>
  <CollapsibleSection
    title="Portfolio Overview"
    :default-open="true"
    badge="5"
  >
    <template #description>
      Summary of your current portfolio holdings
    </template>
    <!-- Content -->
  </CollapsibleSection>
</template>
```

This comprehensive component specification ensures consistent implementation, clear documentation, and maintainable code structure across the Momentum Rider application.