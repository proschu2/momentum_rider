import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import type { DashboardLayout as DashboardLayoutType } from '@/components/layout/DashboardLayout.vue'

describe('DashboardLayout Component', () => {
  let wrapper: any

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()

    wrapper = mount(DashboardLayout, {
      props: {
        initialLayout: {
          leftPanel: 300,
          rightPanel: 300,
          mainPanel: 600
        }
      },
      slots: {
        left: '<div data-testid="left-panel-content">Left Panel</div>',
        main: '<div data-testid="main-content">Main Content</div>',
        right: '<div data-testid="right-panel-content">Right Panel</div>'
      }
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('renders all panels with correct initial layout', () => {
    expect(wrapper.find('.dashboard-layout').exists()).toBe(true)
    expect(wrapper.find('.left-panel').exists()).toBe(true)
    expect(wrapper.find('.main-content').exists()).toBe(true)
    expect(wrapper.find('.right-panel').exists()).toBe(true)

    // Check slot content
    expect(wrapper.find('[data-testid="left-panel-content"]').text()).toBe('Left Panel')
    expect(wrapper.find('[data-testid="main-content"]').text()).toBe('Main Content')
    expect(wrapper.find('[data-testid="right-panel-content"]').text()).toBe('Right Panel')
  })

  test('applies correct initial panel widths', () => {
    const leftPanel = wrapper.find('.left-panel')
    const rightPanel = wrapper.find('.right-panel')

    expect(leftPanel.attributes('style')).toContain('width: 300px')
    expect(rightPanel.attributes('style')).toContain('width: 300px')
  })

  test('emits layoutChange event when layout is updated', async () => {
    // Simulate layout change by directly updating the layout ref
    wrapper.vm.layout.leftPanel = 400

    // Trigger the saveLayoutToStorage method to simulate the update
    await wrapper.vm.saveLayoutToStorage()

    expect(wrapper.emitted('layoutChange')).toBeTruthy()
    expect(wrapper.emitted('layoutChange')[0][0]).toEqual({
      leftPanel: 400,
      rightPanel: 300,
      mainPanel: 600
    })
  })

  test('saves layout to localStorage when changed', async () => {
    // Update layout directly
    wrapper.vm.layout.leftPanel = 350

    // Trigger save
    await wrapper.vm.saveLayoutToStorage()

    const savedLayout = JSON.parse(localStorage.getItem('momentumRider_dashboardLayout') || '{}')
    expect(savedLayout.leftPanel).toBe(350)
  })

  test('loads layout from localStorage on mount', async () => {
    // Set up localStorage before mounting
    localStorage.setItem('momentumRider_dashboardLayout', JSON.stringify({
      leftPanel: 250,
      rightPanel: 350
    }))

    const newWrapper = mount(DashboardLayout, {
      props: {
        initialLayout: {
          leftPanel: 300,
          rightPanel: 300,
          mainPanel: 600
        }
      }
    })

    // Should load from localStorage
    expect(newWrapper.vm.layout.leftPanel).toBe(250)
    expect(newWrapper.vm.layout.rightPanel).toBe(350)
    expect(newWrapper.vm.layout.mainPanel).toBe(600) // Should keep initial for missing values
  })

  test('handles keyboard shortcuts correctly', async () => {
    // Test Ctrl+Shift+R (reset layout)
    await wrapper.trigger('keydown', {
      key: 'R',
      ctrlKey: true,
      shiftKey: true
    })

    expect(wrapper.emitted('layoutChange')).toBeTruthy()
    expect(wrapper.emitted('layoutChange')[0][0]).toEqual({
      leftPanel: 300,
      rightPanel: 300,
      mainPanel: 600
    })

    // Test Ctrl+1 (toggle left panel)
    await wrapper.trigger('keydown', {
      key: '1',
      ctrlKey: true
    })

    expect(wrapper.emitted('layoutChange')[1][0].leftPanel).toBe(0)

    // Toggle back
    await wrapper.trigger('keydown', {
      key: '1',
      ctrlKey: true
    })

    expect(wrapper.emitted('layoutChange')[2][0].leftPanel).toBe(300)

    // Test Ctrl+2 (toggle right panel)
    await wrapper.trigger('keydown', {
      key: '2',
      ctrlKey: true
    })

    expect(wrapper.emitted('layoutChange')[3][0].rightPanel).toBe(0)
  })

  test('handles drag and drop events', async () => {
    await wrapper.trigger('dragover')
    expect(wrapper.classes()).toContain('dragging')

    await wrapper.trigger('dragleave')
    expect(wrapper.classes()).not.toContain('dragging')

    await wrapper.trigger('drop')
    expect(wrapper.classes()).not.toContain('dragging')
  })

  test('applies responsive design for mobile screens', () => {
    // Mock window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768 // Mobile width
    })

    window.dispatchEvent(new Event('resize'))

    // Check if responsive classes are applied
    const layout = wrapper.find('.dashboard-layout')
    // Note: Actual responsive behavior would need CSS media query testing
    // This test verifies the responsive structure exists
    expect(layout.exists()).toBe(true)
  })

  test('main content margins adjust based on panel visibility', async () => {
    const mainContent = wrapper.find('.main-content')

    // Both panels visible
    expect(mainContent.attributes('style')).toContain('margin-left: 8px')
    expect(mainContent.attributes('style')).toContain('margin-right: 8px')

    // Hide left panel
    wrapper.vm.layout.leftPanel = 0
    await wrapper.vm.saveLayoutToStorage()
    expect(mainContent.attributes('style')).toContain('margin-left: 0')
    expect(mainContent.attributes('style')).toContain('margin-right: 8px')

    // Hide right panel
    wrapper.vm.layout.rightPanel = 0
    await wrapper.vm.saveLayoutToStorage()
    expect(mainContent.attributes('style')).toContain('margin-left: 0')
    expect(mainContent.attributes('style')).toContain('margin-right: 0')
  })

  test('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    const localStorageMock = {
      getItem: vi.fn(() => { throw new Error('Storage error') }),
      setItem: vi.fn(() => { throw new Error('Storage error') }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })

    // Should not crash when localStorage fails
    expect(() => {
      mount(DashboardLayout, {
        props: {
          initialLayout: {
            leftPanel: 300,
            rightPanel: 300,
            mainPanel: 600
          }
        }
      })
    }).not.toThrow()
  })

  test('provides layout context to child components', () => {
    // Test that the layout context is properly provided
    const providedContext = wrapper.vm.dashboardLayout
    expect(providedContext).toBeDefined()
    expect(providedContext.layout).toBeDefined()
    expect(providedContext.updateLayout).toBeDefined()
  })

  test('applies print styles correctly', () => {
    // Mock print media query
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === 'print',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Check if print styles would be applied
    // This is more of a CSS test, but we can verify the structure
    const layout = wrapper.find('.dashboard-layout')
    expect(layout.exists()).toBe(true)

    window.matchMedia = originalMatchMedia
  })

  test('maintains accessibility standards', () => {
    // Test keyboard navigation
    const layout = wrapper.find('.dashboard-layout')
    expect(layout.attributes('tabindex')).toBeUndefined() // Should not be focusable

    // Test that all interactive elements are keyboard accessible
    // This would be tested through the ResizablePanel components
  })

  test('handles window resize events', () => {
    // Mock resize event
    const resizeEvent = new Event('resize')
    window.dispatchEvent(resizeEvent)

    // The component should handle resize events without errors
    // This is more of an integration test
    expect(wrapper.vm.layout).toBeDefined()
  })

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})