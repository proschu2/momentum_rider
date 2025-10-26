import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResizablePanel from '@/components/layout/ResizablePanel.vue'

describe('ResizablePanel Component', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(ResizablePanel, {
      props: {
        minWidth: 200,
        maxWidth: 800,
        defaultWidth: 300,
        resizable: true,
        direction: 'horizontal'
      },
      slots: {
        default: '<div data-testid="panel-content">Panel Content</div>'
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders with correct initial width and content', () => {
    expect(wrapper.find('.resizable-panel').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-content"]').text()).toBe('Panel Content')
    expect(wrapper.attributes('style')).toContain('width: 300px')
    expect(wrapper.attributes('style')).toContain('min-width: 200px')
    expect(wrapper.attributes('style')).toContain('max-width: 800px')
  })

  test('shows resize handle when resizable is true', () => {
    expect(wrapper.find('.resize-handle').exists()).toBe(true)
    expect(wrapper.find('.handle-indicator').exists()).toBe(true)
  })

  test('hides resize handle when resizable is false', () => {
    const nonResizableWrapper = mount(ResizablePanel, {
      props: {
        resizable: false
      }
    })

    expect(nonResizableWrapper.find('.resize-handle').exists()).toBe(false)
  })

  test('starts resizing when handle is clicked', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Mock mouse events
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })

    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    expect(wrapper.vm.isResizing).toBe(true)
  })

  test('resizes panel during mouse movement', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    // Move mouse
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150 // 50px right
    })
    document.dispatchEvent(mouseMoveEvent)

    // Should increase width by 50px
    expect(wrapper.vm.width).toBe(350)
    expect(wrapper.emitted('resize')).toBeTruthy()
    expect(wrapper.emitted('resize')[0][0]).toBe(350)
  })

  test('respects min and max width constraints', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    // Try to resize below min width
    const mouseMoveMinEvent = new MouseEvent('mousemove', {
      clientX: 50 // 50px left (would be 250px, but min is 200)
    })
    document.dispatchEvent(mouseMoveMinEvent)

    expect(wrapper.vm.width).toBe(200) // Should not go below min

    // Try to resize above max width
    const mouseMoveMaxEvent = new MouseEvent('mousemove', {
      clientX: 900 // 800px right (would be 1100px, but max is 800)
    })
    document.dispatchEvent(mouseMoveMaxEvent)

    expect(wrapper.vm.width).toBe(800) // Should not go above max
  })

  test('stops resizing when mouse is released', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    expect(wrapper.vm.isResizing).toBe(true)

    // Stop resize
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)

    expect(wrapper.vm.isResizing).toBe(false)
  })

  test('handles keyboard navigation for resizing', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Test ArrowRight
    await resizeHandle.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.vm.width).toBe(310) // +10px
    expect(wrapper.emitted('resize')[0][0]).toBe(310)

    // Test ArrowLeft
    await resizeHandle.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.vm.width).toBe(300) // -10px
    expect(wrapper.emitted('resize')[1][0]).toBe(300)

    // Test Home key (min width)
    await resizeHandle.trigger('keydown', { key: 'Home' })
    expect(wrapper.vm.width).toBe(200)
    expect(wrapper.emitted('resize')[2][0]).toBe(200)

    // Test End key (max width)
    await resizeHandle.trigger('keydown', { key: 'End' })
    expect(wrapper.vm.width).toBe(800)
    expect(wrapper.emitted('resize')[3][0]).toBe(800)
  })

  test('ignores non-resize keyboard events', async () => {
    const resizeHandle = wrapper.find('.resize-handle')
    const initialWidth = wrapper.vm.width

    // Test non-resize key
    await resizeHandle.trigger('keydown', { key: 'A' })
    expect(wrapper.vm.width).toBe(initialWidth)
    expect(wrapper.emitted('resize')).toBeUndefined()
  })

  test('applies correct styles for horizontal direction', () => {
    expect(wrapper.classes()).toContain('horizontal')
    expect(wrapper.find('.resize-handle').classes()).toContain('horizontal')
  })

  test('applies correct styles for vertical direction', () => {
    const verticalWrapper = mount(ResizablePanel, {
      props: {
        direction: 'vertical'
      }
    })

    expect(verticalWrapper.classes()).toContain('vertical')
    expect(verticalWrapper.find('.resize-handle').classes()).toContain('vertical')
  })

  test('applies hover and focus styles', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Test hover
    await resizeHandle.trigger('mouseenter')
    expect(resizeHandle.classes()).toContain('hover:bg-primary-200')

    // Test focus
    await resizeHandle.trigger('focus')
    expect(resizeHandle.attributes('style')).toContain('outline: 2px solid')
  })

  test('applies resizing state styles', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    expect(wrapper.classes()).toContain('resizing')
    expect(wrapper.attributes('style')).toContain('box-shadow')
    expect(wrapper.attributes('style')).toContain('user-select: none')
  })

  test('maintains accessibility standards', () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Test ARIA attributes
    expect(resizeHandle.attributes('role')).toBe('separator')
    expect(resizeHandle.attributes('aria-label')).toBe('Resize horizontal panel')
    expect(resizeHandle.attributes('aria-valuenow')).toBe('300')
    expect(resizeHandle.attributes('aria-valuemin')).toBe('200')
    expect(resizeHandle.attributes('aria-valuemax')).toBe('800')
    expect(resizeHandle.attributes('tabindex')).toBe('0')
  })

  test('handles edge cases gracefully', async () => {
    // Test with very small min and max
    const edgeCaseWrapper = mount(ResizablePanel, {
      props: {
        minWidth: 10,
        maxWidth: 20,
        defaultWidth: 15
      }
    })

    const resizeHandle = edgeCaseWrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    // Try to resize beyond max
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 200 // Would be 115px, but max is 20
    })
    document.dispatchEvent(mouseMoveEvent)

    expect(edgeCaseWrapper.vm.width).toBe(20)
  })

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    wrapper.unmount()

    // Should clean up any active resize event listeners
    expect(removeEventListenerSpy).toHaveBeenCalled()
  })

  test('handles rapid resize operations', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start multiple rapid resize operations
    for (let i = 0; i < 5; i++) {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100 + i * 10
      })
      await resizeHandle.element.dispatchEvent(mouseDownEvent)

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150 + i * 10
      })
      document.dispatchEvent(mouseMoveEvent)

      const mouseUpEvent = new MouseEvent('mouseup')
      document.dispatchEvent(mouseUpEvent)
    }

    // Should handle rapid operations without errors
    expect(wrapper.vm.isResizing).toBe(false)
    expect(wrapper.emitted('resize')).toHaveLength(5)
  })

  test('applies visual feedback during resize', async () => {
    const resizeHandle = wrapper.find('.resize-handle')

    // Start resize
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100
    })
    await resizeHandle.element.dispatchEvent(mouseDownEvent)

    // Check visual feedback
    expect(wrapper.classes()).toContain('resizing')
    expect(wrapper.find('.handle-indicator').attributes('style')).toContain('background-color')
  })
})