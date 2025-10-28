/**
 * Keyboard navigation utilities for accessible interaction
 * Provides arrow key navigation, quick search, and keyboard shortcuts
 */

export interface KeyboardShortcuts {
  [key: string]: string;
}

export interface QuickSearchItem {
  label: string;
  element: HTMLElement;
}

/**
 * Keyboard navigation helpers for lists and interactive components
 */
export const KeyboardNavigation = {
  /**
   * Arrow key navigation for lists
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number
  ): number {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      return Math.min(currentIndex + 1, items.length - 1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      return Math.max(currentIndex - 1, 0);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      return 0;
    }

    if (event.key === 'End') {
      event.preventDefault();
      return items.length - 1;
    }

    return currentIndex;
  },

  /**
   * Quick search for lists (type-ahead)
   */
  handleQuickSearch(event: KeyboardEvent, items: QuickSearchItem[]): void {
    if (event.key.length === 1 && event.key.match(/[a-z0-9]/i)) {
      const searchChar = event.key.toLowerCase();
      const matchingItem = items.find(item =>
        item.label.toLowerCase().startsWith(searchChar)
      );

      if (matchingItem) {
        event.preventDefault();
        matchingItem.element.focus();
      }
    }
  },

  /**
   * Grid navigation with arrow keys
   */
  handleGridNavigation(
    event: KeyboardEvent,
    gridItems: HTMLElement[][],
    currentRow: number,
    currentCol: number
  ): { row: number; col: number } {
    const rows = gridItems.length;
    const cols = gridItems[0]?.length || 0;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        return { row: Math.min(currentRow + 1, rows - 1), col: currentCol };

      case 'ArrowUp':
        event.preventDefault();
        return { row: Math.max(currentRow - 1, 0), col: currentCol };

      case 'ArrowRight':
        event.preventDefault();
        return { row: currentRow, col: Math.min(currentCol + 1, cols - 1) };

      case 'ArrowLeft':
        event.preventDefault();
        return { row: currentRow, col: Math.max(currentCol - 1, 0) };

      case 'Home':
        event.preventDefault();
        return { row: 0, col: 0 };

      case 'End':
        event.preventDefault();
        return { row: rows - 1, col: cols - 1 };

      default:
        return { row: currentRow, col: currentCol };
    }
  },

  /**
   * Common keyboard shortcuts for the application
   */
  shortcuts: {
    calculateMomentum: 'Alt+M',
    generateOrders: 'Alt+G',
    refreshPrices: 'Alt+R',
    toggleMenu: 'Alt+N',
    focusSearch: 'Ctrl+F',
    closeDialog: 'Escape',
    submitForm: 'Enter',
    cancelAction: 'Escape'
  } as KeyboardShortcuts,

  /**
   * Parse keyboard shortcut string into event properties
   */
  parseShortcut(shortcut: string): { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean } {
    const parts = shortcut.split('+');
    const key = parts.pop()?.toLowerCase() || '';
    const modifiers = {
      ctrlKey: parts.includes('Ctrl'),
      altKey: parts.includes('Alt'),
      shiftKey: parts.includes('Shift')
    };

    return { key, ...modifiers };
  },

  /**
   * Check if an event matches a keyboard shortcut
   */
  matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    const { key, ctrlKey, altKey, shiftKey } = this.parseShortcut(shortcut);
    
    return event.key.toLowerCase() === key &&
           event.ctrlKey === ctrlKey &&
           event.altKey === altKey &&
           event.shiftKey === shiftKey;
  },

  /**
   * Register global keyboard shortcuts
   */
  registerShortcuts(shortcuts: Record<string, (event: KeyboardEvent) => void>): () => void {
    const handler = (event: KeyboardEvent) => {
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        if (this.matchesShortcut(event, shortcut)) {
          event.preventDefault();
          callback(event);
          break;
        }
      }
    };

    document.addEventListener('keydown', handler);

    // Return cleanup function
    return () => document.removeEventListener('keydown', handler);
  },

  /**
   * Focus management for modal dialogs
   */
  handleModalNavigation(event: KeyboardEvent, closeCallback: () => void): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCallback();
    }

    if (event.key === 'Tab') {
      // Focus trap is handled by FocusManager
      return;
    }
  },

  /**
   * Navigate to next/previous form field
   */
  handleFormNavigation(event: KeyboardEvent, fields: HTMLElement[]): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const currentIndex = fields.findIndex(field => field === document.activeElement);
      const nextIndex = (currentIndex + 1) % fields.length;
      fields[nextIndex]?.focus();
    }

    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      const currentIndex = fields.findIndex(field => field === document.activeElement);
      const prevIndex = currentIndex <= 0 ? fields.length - 1 : currentIndex - 1;
      fields[prevIndex]?.focus();
    }
  }
};