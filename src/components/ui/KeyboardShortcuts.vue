<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { ScreenReader } from '@/utils/accessibility'

interface Shortcut {
  key: string
  description: string
  action: () => void
}

const props = defineProps<{
  shortcuts?: Shortcut[]
}>()

const defaultShortcuts: Shortcut[] = [
  {
    key: 'Alt+M',
    description: 'Calculate momentum scores',
    action: () => {
      const button = document.querySelector('[aria-label="Calculate momentum scores"]') as HTMLButtonElement
      if (button && !button.disabled) {
        button.click()
        ScreenReader.announce('Calculating momentum scores')
      }
    }
  },
  {
    key: 'Alt+G',
    description: 'Generate rebalancing orders',
    action: () => {
      const button = document.querySelector('[aria-label="Generate rebalancing orders"]') as HTMLButtonElement
      if (button && !button.disabled) {
        button.click()
        ScreenReader.announce('Generating rebalancing orders')
      }
    }
  },
  {
    key: 'Alt+R',
    description: 'Refresh current prices',
    action: () => {
      const button = document.querySelector('[aria-label="Refresh current prices"]') as HTMLButtonElement
      if (button && !button.disabled) {
        button.click()
        ScreenReader.announce('Refreshing current prices')
      }
    }
  },
  {
    key: 'Alt+N',
    description: 'Toggle navigation menu',
    action: () => {
      const button = document.querySelector('[aria-label="Toggle navigation menu"]') as HTMLButtonElement
      if (button) {
        button.click()
        const isOpen = button.getAttribute('aria-expanded') === 'true'
        ScreenReader.announce(`Navigation menu ${isOpen ? 'closed' : 'opened'}`)
      }
    }
  },
  {
    key: 'Escape',
    description: 'Close dialogs or menus',
    action: () => {
      const dialogs = document.querySelectorAll('[role="dialog"]')
      const menus = document.querySelectorAll('[role="menu"], [role="navigation"]')

      // Close any open dialogs
      dialogs.forEach(dialog => {
        const closeButton = dialog.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLButtonElement
        if (closeButton) {
          closeButton.click()
          ScreenReader.announce('Dialog closed')
        }
      })

      // Close any open menus
      menus.forEach(menu => {
        const closeButton = menu.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLButtonElement
        if (closeButton) {
          closeButton.click()
          ScreenReader.announce('Menu closed')
        }
      })
    }
  },
  {
    key: 'Tab',
    description: 'Navigate between interactive elements',
    action: () => {
      // Built-in browser behavior, just announce
      ScreenReader.announce('Navigating to next element')
    }
  },
  {
    key: 'Shift+Tab',
    description: 'Navigate backwards between interactive elements',
    action: () => {
      // Built-in browser behavior, just announce
      ScreenReader.announce('Navigating to previous element')
    }
  }
]

const activeShortcuts = props.shortcuts || defaultShortcuts

function handleKeydown(event: KeyboardEvent) {
  // Skip if user is typing in an input field
  if (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement) {
    return
  }

  const keyCombo = getKeyCombo(event)
  const shortcut = activeShortcuts.find(s => s.key === keyCombo)

  if (shortcut) {
    event.preventDefault()
    event.stopPropagation()
    shortcut.action()
  }
}

function getKeyCombo(event: KeyboardEvent): string {
  const parts = []

  if (event.altKey) parts.push('Alt')
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')

  // Don't include modifier keys as main key
  if (!['Alt', 'Control', 'Shift', 'Meta'].includes(event.key)) {
    parts.push(event.key.toUpperCase())
  }

  return parts.join('+')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    Keyboard shortcuts available for navigation and actions
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>