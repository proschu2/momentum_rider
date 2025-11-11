/**
 * Color contrast utilities for WCAG compliance
 * Provides color contrast calculations and accessible color combinations
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

/**
 * Color contrast utilities for WCAG 2.1 AA compliance
 */
export const ColorContrast = {
  /**
   * Calculate relative luminance for a color (WCAG 2.1 formula)
   */
  calculateLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }) as [number, number, number];

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  /**
   * Calculate contrast ratio between two colors (WCAG 2.1 formula)
   */
  calculateContrastRatio(color1: RGBColor, color2: RGBColor): number {
    const l1 = this.calculateLuminance(color1.r, color1.g, color1.b);
    const l2 = this.calculateLuminance(color2.r, color2.g, color2.b);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if contrast ratio meets WCAG AA requirements
   */
  meetsAAContrast(color1: RGBColor, color2: RGBColor): boolean {
    const ratio = this.calculateContrastRatio(color1, color2);
    return ratio >= 4.5; // WCAG AA requirement for normal text
  },

  /**
   * Check if contrast ratio meets WCAG AAA requirements
   */
  meetsAAAContrast(color1: RGBColor, color2: RGBColor): boolean {
    const ratio = this.calculateContrastRatio(color1, color2);
    return ratio >= 7; // WCAG AAA requirement for normal text
  },

  /**
   * Get appropriate text color for a background (light/dark)
   */
  getTextColor(backgroundColor: string): string {
    const rgb = this.hexToRgb(backgroundColor);
    if (!rgb) return '#000000'; // Fallback to black

    const luminance = this.calculateLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  },

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex: string): RGBColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1] || '0', 16),
        g: parseInt(result[2] || '0', 16),
        b: parseInt(result[3] || '0', 16)
      };
    }
    return null;
  },

  /**
   * Convert RGB to hex color
   */
  rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  /**
   * Adjust color brightness
   */
  adjustBrightness(hex: string, factor: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
    
    return this.rgbToHex(
      adjust(rgb.r),
      adjust(rgb.g),
      adjust(rgb.b)
    );
  },

  /**
   * Get status colors with sufficient contrast
   */
  getStatusColor(value: number, type: 'momentum' | 'action' | 'performance'): string {
    if (type === 'momentum') {
      return value >= 0 ? '#10b981' : '#ef4444'; // success-500, error-500
    }

    if (type === 'action') {
      return value >= 0 ? '#10b981' : '#ef4444'; // success-500, error-500
    }

    if (type === 'performance') {
      if (value > 5) return '#10b981'; // success-500
      if (value > 0) return '#f59e0b'; // warning-500
      return '#ef4444'; // error-500
    }

    return '#6b7280'; // neutral-500
  },

  /**
   * Get accessible color palette for financial data visualization
   */
  getFinancialColorPalette(): string[] {
    return [
      '#3b82f6', // blue-500
      '#ef4444', // red-500
      '#10b981', // green-500
      '#f59e0b', // yellow-500
      '#8b5cf6', // violet-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
      '#84cc16'  // lime-500
    ];
  },

  /**
   * Ensure text has sufficient contrast against background
   */
  ensureTextContrast(textColor: string, backgroundColor: string): string {
    const textRgb = this.hexToRgb(textColor);
    const bgRgb = this.hexToRgb(backgroundColor);

    if (!textRgb || !bgRgb) return textColor;

    const ratio = this.calculateContrastRatio(textRgb, bgRgb);
    
    if (ratio >= 4.5) return textColor; // Meets AA requirements

    // Adjust text color for better contrast
    const bgLuminance = this.calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    return bgLuminance > 0.5 ? '#000000' : '#ffffff';
  },

  /**
   * Generate accessible gradient colors
   */
  getAccessibleGradientColors(baseColor: string, steps: number = 5): string[] {
    const rgb = this.hexToRgb(baseColor);
    if (!rgb) return Array(steps).fill(baseColor);

    const colors: string[] = [];
    const stepSize = 1 / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const factor = 1 - (i * stepSize * 0.5); // Darken progressively
      colors.push(this.adjustBrightness(baseColor, factor));
    }

    return colors;
  }
};