/**
 * Accessibility utilities for the Momentum Rider application
 * Provides consistent ARIA labels, keyboard navigation, and screen reader support
 */

/**
 * Generate consistent ARIA labels for financial data
 */
export function generateAriaLabel(
  type: 'etf' | 'holding' | 'action' | 'statistic' | 'table',
  data: Record<string, any>
): string {
  switch (type) {
    case 'etf':
      return `${data.ticker} ETF, ${data.name}, current price $${data.price?.toLocaleString() || 'unknown'}, momentum ${data.average?.toFixed(2) || 'unknown'}%`

    case 'holding':
      return `${data.ticker} holding, ${data.shares} shares at $${data.price?.toLocaleString() || 'unknown'} per share, total value $${data.value?.toLocaleString() || 'unknown'}`

    case 'action':
      return `${data.action} ${data.ticker}, ${data.shares} shares, ${data.difference >= 0 ? 'increase' : 'decrease'} of $${Math.abs(data.difference).toLocaleString()}`

    case 'statistic':
      return `${data.label}: ${data.value}${data.unit || ''}`

    case 'table':
      return `${data.title} table with ${data.rowCount} rows`

    default:
      return ''
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  static trapFocus(element: HTMLElement, event: KeyboardEvent) {
    if (event.key !== 'Tab') return

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  static focusFirstInteractive(element: HTMLElement) {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  static restoreFocus(element: HTMLElement) {
    const previouslyFocused = document.activeElement
    if (previouslyFocused && element.contains(previouslyFocused as Node)) {
      ;(previouslyFocused as HTMLElement).focus()
    }
  }
}

/**
 * Screen reader announcements
 */
export class ScreenReader {
  private static announcementElement: HTMLElement | null = null

  static init() {
    if (!this.announcementElement) {
      this.announcementElement = document.createElement('div')
      this.announcementElement.setAttribute('aria-live', 'polite')
      this.announcementElement.setAttribute('aria-atomic', 'true')
      this.announcementElement.className = 'sr-only'
      document.body.appendChild(this.announcementElement)
    }
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.init()
    if (this.announcementElement) {
      this.announcementElement.setAttribute('aria-live', priority)
      this.announcementElement.textContent = message

      // Clear after announcement
      setTimeout(() => {
        if (this.announcementElement) {
          this.announcementElement.textContent = ''
        }
      }, 1000)
    }
  }

  static announceTableUpdate(tableTitle: string, rowCount: number) {
    this.announce(`${tableTitle} updated with ${rowCount} rows`)
  }

  static announcePortfolioUpdate(changeType: 'add' | 'remove' | 'update', ticker: string) {
    const actions = {
      add: 'added to',
      remove: 'removed from',
      update: 'updated in'
    }
    this.announce(`${ticker} ${actions[changeType]} portfolio`)
  }
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardNavigation = {
  // Arrow key navigation for lists
  handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number
  ): number {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      return Math.min(currentIndex + 1, items.length - 1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      return Math.max(currentIndex - 1, 0)
    }

    if (event.key === 'Home') {
      event.preventDefault()
      return 0
    }

    if (event.key === 'End') {
      event.preventDefault()
      return items.length - 1
    }

    return currentIndex
  },

  // Quick search for lists
  handleQuickSearch(event: KeyboardEvent, items: Array<{ label: string; element: HTMLElement }>): void {
    if (event.key.length === 1 && event.key.match(/[a-z0-9]/i)) {
      const searchChar = event.key.toLowerCase()
      const matchingItem = items.find(item =>
        item.label.toLowerCase().startsWith(searchChar)
      )

      if (matchingItem) {
        event.preventDefault()
        matchingItem.element.focus()
      }
    }
  },

  // Common keyboard shortcuts
  shortcuts: {
    calculateMomentum: 'Alt+M',
    generateOrders: 'Alt+G',
    refreshPrices: 'Alt+R',
    toggleMenu: 'Alt+N'
  }
}

/**
 * Color contrast utilities
 */
export const ColorContrast = {
  // WCAG 2.1 AA compliant color combinations
  getTextColor(backgroundColor: string): string {
    // Simple luminance calculation for light/dark text
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#000000' : '#ffffff'
  },

  // Ensure sufficient contrast for status indicators
  getStatusColor(value: number, type: 'momentum' | 'action' | 'performance'): string {
    if (type === 'momentum') {
      return value >= 0 ? '#10b981' : '#ef4444' // success-500, error-500
    }

    if (type === 'action') {
      return value >= 0 ? '#10b981' : '#ef4444' // success-500, error-500
    }

    if (type === 'performance') {
      if (value > 5) return '#10b981' // success-500
      if (value > 0) return '#f59e0b' // warning-500
      return '#ef4444' // error-500
    }

    return '#6b7280' // neutral-500
  }
}

/**
 * Form validation accessibility
 */
export const FormAccessibility = {
  announceFieldError(fieldName: string, errorMessage: string) {
    ScreenReader.announce(`${fieldName} error: ${errorMessage}`, 'assertive')
  },

  announceFieldSuccess(fieldName: string) {
    ScreenReader.announce(`${fieldName} is valid`)
  },

  getFieldDescription(fieldName: string, description: string): string {
    return `${fieldName}. ${description}`
  }
}

// Initialize screen reader support on module load
if (typeof window !== 'undefined') {
  ScreenReader.init()
}