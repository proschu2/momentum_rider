/**
 * Focus management utilities for accessible navigation
 * Provides focus trapping, restoration, and navigation helpers
 */

/**
 * Focus management utilities for modal dialogs and interactive components
 */
export class FocusManager {
  private static focusableSelectors = [
    'button',
    '[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  /**
   * Trap focus within a container element for modal dialogs
   */
  static trapFocus(element: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusableElements = element.querySelectorAll<HTMLElement>(this.focusableSelectors);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab: move backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: move forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  /**
   * Focus the first interactive element in a container
   */
  static focusFirstInteractive(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll<HTMLElement>(this.focusableSelectors);

    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }

  /**
   * Restore focus to the previously focused element
   */
  static restoreFocus(element: HTMLElement): void {
    const previouslyFocused = document.activeElement;
    if (previouslyFocused && element.contains(previouslyFocused as Node)) {
      (previouslyFocused as HTMLElement).focus();
    }
  }

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(element: HTMLElement): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(this.focusableSelectors));
  }

  /**
   * Focus the next focusable element in sequence
   */
  static focusNext(element: HTMLElement): void {
    const focusableElements = this.getFocusableElements(element);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  /**
   * Focus the previous focusable element in sequence
   */
  static focusPrevious(element: HTMLElement): void {
    const focusableElements = this.getFocusableElements(element);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[previousIndex]?.focus();
  }

  /**
   * Focus a specific element by selector within a container
   */
  static focusBySelector(element: HTMLElement, selector: string): void {
    const target = element.querySelector<HTMLElement>(selector);
    target?.focus();
  }

  /**
   * Check if an element is focusable
   */
  static isFocusable(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') return false;

    const tagName = element.tagName.toLowerCase();
    const focusableTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    if (focusableTags.includes(tagName)) return true;
    if (tabIndex !== null) return true;
    if (element.hasAttribute('contenteditable')) return true;

    return false;
  }
}