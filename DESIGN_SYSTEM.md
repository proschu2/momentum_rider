# Design System Specification

## Overview

The Momentum Rider Design System provides a consistent visual language and interaction patterns for the portfolio management application. This system ensures accessibility, usability, and brand consistency across all components.

## Color System

### Primary Palette
```scss
// Primary Colors
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;

// Usage:
- Primary-500: Main brand color, primary buttons, active states
- Primary-600: Hover states, important actions
- Primary-50: Backgrounds, subtle highlights
```

### Neutral Palette
```scss
// Neutral Colors
--color-neutral-50: #f9fafb;
--color-neutral-100: #f3f4f6;
--color-neutral-200: #e5e7eb;
--color-neutral-300: #d1d5db;
--color-neutral-400: #9ca3af;
--color-neutral-500: #6b7280;
--color-neutral-600: #4b5563;
--color-neutral-700: #374151;
--color-neutral-800: #1f2937;
--color-neutral-900: #111827;

// Usage:
- Neutral-900: Primary text, headings
- Neutral-700: Secondary text, labels
- Neutral-500: Tertiary text, disabled states
- Neutral-200: Borders, dividers
- Neutral-50: Backgrounds, cards
```

### Semantic Colors
```scss
// Success Colors
--color-success-50: #ecfdf5;
--color-success-100: #d1fae5;
--color-success-500: #10b981;
--color-success-600: #059669;

// Error Colors
--color-error-50: #fef2f2;
--color-error-100: #fee2e2;
--color-error-500: #ef4444;
--color-error-600: #dc2626;

// Warning Colors
--color-warning-50: #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;

// Info Colors
--color-info-50: #eff6ff;
--color-info-100: #dbeafe;
--color-info-500: #3b82f6;
--color-info-600: #2563eb;

// Usage:
- Success: Positive momentum, profitable trades
- Error: Negative momentum, losses, errors
- Warning: Warnings, attention required
- Info: Information, neutral states
```

### Chart Colors
```scss
// Asset Category Colors
--color-stocks: #3b82f6;      // Blue
--color-bonds: #10b981;       // Green
--color-commodities: #f59e0b; // Amber
--color-alternatives: #8b5cf6; // Purple
--color-cash: #6b7280;        // Gray

// Individual Asset Colors
--color-vti: #2563eb;
--color-vea: #1d4ed8;
--color-vwo: #1e40af;
--color-tlt: #059669;
--color-bwx: #047857;
--color-bnd: #065f46;
--color-pdbc: #d97706;
--color-sgol: #92400e;
--color-ibit: #7c3aed;
```

## Typography

### Font Family
```scss
--font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Font Sizes
```scss
// Heading Scale
--text-xs: 0.75rem;    // 12px
--text-sm: 0.875rem;   // 14px
--text-base: 1rem;     // 16px
--text-lg: 1.125rem;   // 18px
--text-xl: 1.25rem;    // 20px
--text-2xl: 1.5rem;    // 24px
--text-3xl: 1.875rem;  // 30px
--text-4xl: 2.25rem;   // 36px

// Usage:
- 2xl: Page titles
- xl: Section headings
- lg: Subsection headings
- base: Body text
- sm: Captions, labels
- xs: Fine print, timestamps
```

### Font Weights
```scss
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

// Usage:
- Normal: Body text
- Medium: Labels, buttons
- Semibold: Headings, important text
- Bold: Emphasized numbers, totals
```

### Line Heights
```scss
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

## Spacing System

### Base Unit
- **Base**: 4px (0.25rem)
- **Scale**: Multiples of 4px

### Spacing Scale
```scss
--space-1: 0.25rem;   // 4px
--space-2: 0.5rem;    // 8px
--space-3: 0.75rem;   // 12px
--space-4: 1rem;      // 16px
--space-5: 1.25rem;   // 20px
--space-6: 1.5rem;    // 24px
--space-8: 2rem;      // 32px
--space-10: 2.5rem;   // 40px
--space-12: 3rem;     // 48px
--space-16: 4rem;     // 64px
--space-20: 5rem;     // 80px
--space-24: 6rem;     // 96px
--space-32: 8rem;     // 128px
```

### Usage Guidelines
- **1-2**: Micro spacing (icons, small elements)
- **3-4**: Component internal spacing
- **5-6**: Component external spacing
- **8+**: Section spacing, large gaps

## Border Radius

```scss
--radius-none: 0;
--radius-sm: 0.125rem;   // 2px
--radius-md: 0.375rem;   // 6px
--radius-lg: 0.5rem;     // 8px
--radius-xl: 0.75rem;    // 12px
--radius-2xl: 1rem;      // 16px
--radius-full: 9999px;

// Usage:
- sm: Small interactive elements
- md: Default for most components
- lg: Cards, containers
- xl: Large containers, modals
- full: Circular elements
```

## Shadows

```scss
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

// Usage:
- sm: Small elevations, subtle depth
- md: Cards, dropdowns
- lg: Modals, popovers
- xl: Large overlays, dialogs
```

## Animation & Transitions

### Duration
```scss
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
```

### Timing Functions
```scss
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Patterns
```scss
// Fade In
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// Slide Up
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

// Scale In
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

## Component Tokens

### Button Tokens
```scss
// Sizes
--button-height-sm: 2rem;
--button-height-md: 2.5rem;
--button-height-lg: 3rem;

// Padding
--button-padding-x-sm: 0.75rem;
--button-padding-x-md: 1rem;
--button-padding-x-lg: 1.5rem;
```

### Input Tokens
```scss
// Sizes
--input-height-sm: 2rem;
--input-height-md: 2.5rem;
--input-height-lg: 3rem;

// Padding
--input-padding-x: 0.75rem;
--input-padding-y: 0.5rem;
```

### Card Tokens
```scss
--card-padding: 1.5rem;
--card-background: var(--color-neutral-50);
--card-border: 1px solid var(--color-neutral-200);
--card-shadow: var(--shadow-md);
```

## Responsive Design

### Breakpoints
```scss
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Container Max Widths
```scss
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

## Accessibility

### Focus Styles
```scss
--focus-ring-width: 2px;
--focus-ring-color: var(--color-primary-500);
--focus-ring-offset: 2px;
```

### Color Contrast
- **Minimum**: 4.5:1 for normal text
- **Enhanced**: 7:1 for important text
- **Large Text**: 3:1 minimum

### Interactive States
```scss
// Hover
--hover-bg-lighten: 5%;
--hover-bg-darken: 5%;

// Active
--active-bg-lighten: 10%;
--active-bg-darken: 10%;

// Disabled
--disabled-opacity: 0.5;
--disabled-cursor: not-allowed;
```

## Implementation

### CSS Custom Properties
All design tokens are implemented as CSS custom properties for:
- **Theme switching** (light/dark mode)
- **Runtime customization**
- **Consistent theming** across components

### Tailwind Integration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          // ... other primary colors
        },
        // ... other color mappings
      },
      // ... other token mappings
    }
  }
}
```

### Component Usage
```vue
<template>
  <button
    class="btn btn--primary btn--md"
    :class="{ 'btn--loading': loading }"
  >
    <span class="btn__content">
      {{ label }}
    </span>
  </button>
</template>

<style scoped>
.btn {
  background: var(--color-primary-500);
  color: white;
  border-radius: var(--radius-md);
  padding: var(--button-padding-y) var(--button-padding-x);
  height: var(--button-height-md);
  /* ... other styles */
}
</style>
```

## Design Principles

### 1. Consistency
- Use established patterns across all components
- Maintain visual hierarchy consistently
- Follow established spacing and sizing scales

### 2. Accessibility First
- Ensure all components meet WCAG 2.1 AA standards
- Provide keyboard navigation for all interactions
- Support screen readers and assistive technologies

### 3. Performance
- Optimize animations for 60fps
- Use efficient CSS properties
- Minimize layout shifts

### 4. Maintainability
- Use semantic naming conventions
- Follow established file organization
- Document design decisions

This design system provides a comprehensive foundation for building consistent, accessible, and performant user interfaces for the Momentum Rider application.