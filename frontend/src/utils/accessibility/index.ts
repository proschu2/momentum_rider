// Main exports for accessibility utilities

export { generateAriaLabel } from './aria-labels';
export { FocusManager } from './focus-manager';
export { ScreenReader } from './screen-reader';
export { KeyboardNavigation } from './keyboard-navigation';
export { ColorContrast } from './color-contrast';
export { FormAccessibility } from './form-validation';

// Initialize screen reader support on module load
if (typeof window !== 'undefined') {
  import('./screen-reader').then(({ ScreenReader }) => {
    ScreenReader.init();
  });
}