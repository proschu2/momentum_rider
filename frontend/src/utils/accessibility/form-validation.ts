/**
 * Form validation accessibility utilities
 * Provides accessible error announcements and form field descriptions
 */

import { ScreenReader } from './screen-reader';

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  validation?: (value: any) => ValidationResult;
}

/**
 * Form accessibility utilities for validation and announcements
 */
export const FormAccessibility = {
  /**
   * Announce field error to screen readers
   */
  announceFieldError(fieldName: string, errorMessage: string): void {
    ScreenReader.announce(`${fieldName} error: ${errorMessage}`, { priority: 'assertive' });
  },

  /**
   * Announce field success to screen readers
   */
  announceFieldSuccess(fieldName: string): void {
    ScreenReader.announce(`${fieldName} is valid`);
  },

  /**
   * Get accessible field description
   */
  getFieldDescription(fieldName: string, description: string): string {
    return `${fieldName}. ${description}`;
  },

  /**
   * Validate form field with accessibility announcements
   */
  validateField(field: FormFieldConfig, value: any): ValidationResult {
    let result: ValidationResult = { isValid: true, message: '' };

    // Check required field
    if (field.required && (!value || value.toString().trim() === '')) {
      result = {
        isValid: false,
        message: `${field.label} is required`
      };
    }

    // Run custom validation if provided
    if (result.isValid && field.validation) {
      result = field.validation(value);
    }

    // Announce result
    if (!result.isValid) {
      this.announceFieldError(field.label, result.message);
    } else {
      this.announceFieldSuccess(field.label);
    }

    return result;
  },

  /**
   * Validate multiple form fields
   */
  validateForm(fields: FormFieldConfig[], formData: Record<string, any>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const field of fields) {
      const value = formData[field.name];
      const result = this.validateField(field, value);

      if (!result.isValid) {
        errors[field.name] = result.message;
        isValid = false;
      }
    }

    // Announce overall form status
    if (isValid) {
      ScreenReader.announce('Form validation passed');
    } else {
      ScreenReader.announce(`Form validation failed with ${Object.keys(errors).length} errors`, { priority: 'assertive' });
    }

    return { isValid, errors };
  },

  /**
   * Set ARIA attributes for form field based on validation state
   */
  setFieldAriaAttributes(
    field: HTMLElement,
    isValid: boolean,
    errorMessage: string = ''
  ): void {
    const hasError = !isValid;

    // Set ARIA attributes
    field.setAttribute('aria-invalid', hasError.toString());
    field.setAttribute('aria-describedby', hasError ? `${field.id}-error` : `${field.id}-description`);

    // Remove existing error description if field is now valid
    if (isValid) {
      const existingError = document.getElementById(`${field.id}-error`);
      if (existingError) {
        existingError.remove();
      }
    }
  },

  /**
   * Create accessible error message element
   */
  createErrorMessageElement(fieldId: string, message: string): HTMLElement {
    const errorElement = document.createElement('div');
    errorElement.id = `${fieldId}-error`;
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'assertive');
    errorElement.textContent = message;

    return errorElement;
  },

  /**
   * Create accessible description element
   */
  createDescriptionElement(fieldId: string, description: string): HTMLElement {
    const descElement = document.createElement('div');
    descElement.id = `${fieldId}-description`;
    descElement.className = 'field-description sr-only';
    descElement.textContent = description;

    return descElement;
  },

  /**
   * Common validation functions for financial forms
   */
  validators: {
    /**
     * Validate ticker symbol format
     */
    tickerSymbol(value: string): ValidationResult {
      if (!value || value.trim() === '') {
        return { isValid: false, message: 'Ticker symbol is required' };
      }

      const tickerRegex = /^[A-Z]{1,5}$/;
      if (!tickerRegex.test(value.toUpperCase())) {
        return { isValid: false, message: 'Ticker symbol must be 1-5 uppercase letters' };
      }

      return { isValid: true, message: '' };
    },

    /**
     * Validate share quantity
     */
    shareQuantity(value: number): ValidationResult {
      if (value <= 0) {
        return { isValid: false, message: 'Share quantity must be greater than 0' };
      }

      if (!Number.isInteger(value)) {
        return { isValid: false, message: 'Share quantity must be a whole number' };
      }

      return { isValid: true, message: '' };
    },

    /**
     * Validate price amount
     */
    priceAmount(value: number): ValidationResult {
      if (value <= 0) {
        return { isValid: false, message: 'Price must be greater than 0' };
      }

      if (value > 1000000) {
        return { isValid: false, message: 'Price seems unusually high' };
      }

      return { isValid: true, message: '' };
    },

    /**
     * Validate percentage value
     */
    percentage(value: number): ValidationResult {
      if (value < 0 || value > 100) {
        return { isValid: false, message: 'Percentage must be between 0 and 100' };
      }

      return { isValid: true, message: '' };
    },

    /**
     * Validate allocation amount
     */
    allocationAmount(value: number): ValidationResult {
      if (value < 0) {
        return { isValid: false, message: 'Allocation cannot be negative' };
      }

      if (value > 100000000) {
        return { isValid: false, message: 'Allocation amount seems unusually high' };
      }

      return { isValid: true, message: '' };
    }
  },

  /**
   * Initialize form field with accessibility features
   */
  initializeFormField(field: HTMLElement, config: FormFieldConfig): void {
    // Set basic ARIA attributes
    field.setAttribute('aria-label', config.label);
    
    if (config.description) {
      field.setAttribute('aria-describedby', `${field.id}-description`);
      
      // Create description element if it doesn't exist
      if (!document.getElementById(`${field.id}-description`)) {
        const descElement = this.createDescriptionElement(field.id, config.description);
        field.parentNode?.insertBefore(descElement, field.nextSibling);
      }
    }

    // Add validation event listeners
    field.addEventListener('blur', () => {
      const value = (field as HTMLInputElement).value;
      this.validateField(config, value);
    });

    field.addEventListener('input', () => {
      // Clear error state on input
      this.setFieldAriaAttributes(field, true);
    });
  },

  /**
   * Focus first invalid field in form
   */
  focusFirstInvalidField(form: HTMLFormElement): void {
    const firstInvalidField = form.querySelector('[aria-invalid="true"]') as HTMLElement;
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
  },

  /**
   * Reset form accessibility state
   */
  resetForm(form: HTMLFormElement): void {
    const fields = form.querySelectorAll<HTMLElement>('[aria-invalid]');
    fields.forEach(field => {
      field.setAttribute('aria-invalid', 'false');
      
      // Remove error messages
      const errorElement = document.getElementById(`${field.id}-error`);
      if (errorElement) {
        errorElement.remove();
      }
    });

    ScreenReader.announce('Form has been reset');
  }
};