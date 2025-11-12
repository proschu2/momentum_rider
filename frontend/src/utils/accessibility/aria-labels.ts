/**
 * ARIA label generation utilities for financial data
 * Provides consistent, descriptive labels for screen readers
 */

export interface AriaLabelData {
  [key: string]: any;
}

/**
 * Generate consistent ARIA labels for financial data
 */
export function generateAriaLabel(
  type: 'etf' | 'holding' | 'action' | 'statistic' | 'table',
  data: AriaLabelData
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
 * Generate ARIA labels for specific financial components
 */
export const FinancialAriaLabels = {
  /**
   * Generate label for ETF momentum data
   */
  etfMomentum(ticker: string, name: string, momentum: number, price: number): string {
    return `${ticker} ${name}, momentum ${momentum.toFixed(2)}%, current price $${price.toLocaleString()}`
  },

  /**
   * Generate label for portfolio holding
   */
  portfolioHolding(ticker: string, shares: number, price: number, value: number): string {
    return `${ticker} holding, ${shares} shares at $${price.toLocaleString()} each, total value $${value.toLocaleString()}`
  },

  /**
   * Generate label for rebalancing action
   */
  rebalancingAction(action: 'BUY' | 'SELL' | 'HOLD', ticker: string, shares: number, amount: number): string {
    const actionText = action === 'BUY' ? 'Buy' : action === 'SELL' ? 'Sell' : 'Hold'
    return `${actionText} ${ticker}, ${shares} shares, ${amount >= 0 ? 'increase' : 'decrease'} of $${Math.abs(amount).toLocaleString()}`
  },

  /**
   * Generate label for performance statistic
   */
  performanceStatistic(label: string, value: number, unit: string = ''): string {
    return `${label}: ${value}${unit}`
  }
}