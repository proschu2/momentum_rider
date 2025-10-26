<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
const showShortcutsHelp = ref(false)

function handleKeydown(event: KeyboardEvent) {
  // Handle question mark shortcut to toggle help modal
  if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
    showShortcutsHelp.value = !showShortcutsHelp.value
    ScreenReader.announce(showShortcutsHelp.value ? 'Keyboard shortcuts help opened' : 'Keyboard shortcuts help closed')
    return
  }

  // Handle Escape to close help modal
  if (event.key === 'Escape' && showShortcutsHelp.value) {
    event.preventDefault()
    event.stopPropagation()
    showShortcutsHelp.value = false
    ScreenReader.announce('Keyboard shortcuts help closed')
    return
  }
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
  <div>
    <!-- Screen reader announcement -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      Keyboard shortcuts available for navigation and actions
    </div>

    <!-- Desktop shortcuts help modal trigger -->
    <button
      @click="showShortcutsHelp = true"
      class="fixed bottom-4 right-4 z-40 hidden lg:flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg shadow-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 group"
      aria-label="Show keyboard shortcuts help"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span class="text-sm font-medium">Shortcuts</span>
      <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Press ? for help
        <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-neutral-800 rotate-45"></div>
      </div>
    </button>

    <!-- Shortcuts Help Modal -->
    <div
      v-if="showShortcutsHelp"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click="showShortcutsHelp = false"
    >
      <div
        class="bg-surface rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
        @click.stop
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-neutral-900">Keyboard Shortcuts</h2>
          <button
            @click="showShortcutsHelp = false"
            class="p-1 text-neutral-400 hover:text-neutral-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            aria-label="Close shortcuts help"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="shortcut in activeShortcuts"
            :key="shortcut.key"
            class="flex justify-between items-center py-2 border-b border-neutral-200 last:border-b-0"
          >
            <span class="text-sm text-neutral-700">{{ shortcut.description }}</span>
            <div class="flex items-center space-x-1">
              <kbd
                v-for="key in shortcut.key.split('+')"
                :key="key"
                class="px-2 py-1 text-xs bg-neutral-100 border border-neutral-300 rounded font-medium text-neutral-700"
              >
                {{ key }}
              </kbd>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-neutral-200">
          <p class="text-xs text-neutral-500 text-center">
            Press Escape to close this dialog
          </p>
        </div>
      </div>
    </div>
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