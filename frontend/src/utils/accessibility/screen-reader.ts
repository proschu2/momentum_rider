/**
 * Screen reader utilities for accessible announcements
 * Provides live region management and announcement helpers
 */

export interface AnnouncementOptions {
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

/**
 * Screen reader announcement management
 */
export class ScreenReader {
  private static announcementElement: HTMLElement | null = null;
  private static announcementQueue: Array<{ message: string; options: AnnouncementOptions }> = [];
  private static isProcessingQueue = false;

  /**
   * Initialize the screen reader announcement element
   */
  static init(): void {
    if (!this.announcementElement && typeof window !== 'undefined') {
      this.announcementElement = document.createElement('div');
      this.announcementElement.setAttribute('aria-live', 'polite');
      this.announcementElement.setAttribute('aria-atomic', 'true');
      this.announcementElement.className = 'sr-only';
      this.announcementElement.style.cssText = `
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.announcementElement);
    }
  }

  /**
   * Announce a message to screen readers
   */
  static announce(message: string, options: AnnouncementOptions = {}): void {
    const { priority = 'polite', clearAfter = 1000 } = options;

    this.init();

    if (!this.announcementElement) {
      console.warn('Screen reader announcement element not available');
      return;
    }

    // Add to queue and process
    this.announcementQueue.push({ message, options: { priority, clearAfter } });
    this.processQueue();
  }

  /**
   * Process the announcement queue
   */
  private static processQueue(): void {
    if (this.isProcessingQueue || !this.announcementElement || this.announcementQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    const { message, options } = this.announcementQueue.shift()!;
    const { priority, clearAfter } = options;

    this.announcementElement.setAttribute('aria-live', priority || 'polite');
    this.announcementElement.textContent = message || '';

    // Clear after announcement
    setTimeout(() => {
      if (this.announcementElement) {
        this.announcementElement.textContent = '';
      }
      this.isProcessingQueue = false;
      this.processQueue();
    }, clearAfter);
  }

  /**
   * Announce table updates
   */
  static announceTableUpdate(tableTitle: string, rowCount: number): void {
    this.announce(`${tableTitle} updated with ${rowCount} rows`);
  }

  /**
   * Announce portfolio updates
   */
  static announcePortfolioUpdate(changeType: 'add' | 'remove' | 'update', ticker: string): void {
    const actions = {
      add: 'added to',
      remove: 'removed from',
      update: 'updated in'
    };
    this.announce(`${ticker} ${actions[changeType]} portfolio`);
  }

  /**
   * Announce momentum calculation results
   */
  static announceMomentumResults(count: number): void {
    this.announce(`Momentum calculation completed for ${count} ETFs`);
  }

  /**
   * Announce rebalancing orders
   */
  static announceRebalancingOrders(count: number): void {
    this.announce(`Generated ${count} rebalancing orders`);
  }

  /**
   * Announce loading state
   */
  static announceLoading(operation: string): void {
    this.announce(`${operation} in progress...`);
  }

  /**
   * Announce error state
   */
  static announceError(errorMessage: string): void {
    this.announce(`Error: ${errorMessage}`, { priority: 'assertive' });
  }

  /**
   * Announce success state
   */
  static announceSuccess(message: string): void {
    this.announce(`Success: ${message}`);
  }

  /**
   * Clear all pending announcements
   */
  static clearQueue(): void {
    this.announcementQueue = [];
    if (this.announcementElement) {
      this.announcementElement.textContent = '';
    }
  }

  /**
   * Get the current announcement queue length
   */
  static getQueueLength(): number {
    return this.announcementQueue.length;
  }
}