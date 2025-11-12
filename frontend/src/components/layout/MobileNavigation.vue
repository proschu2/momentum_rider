<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)
const isMenuOpen = ref(false)
const touchStartX = ref(0)
const touchEndX = ref(0)

// Detect mobile device
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Add touch event listeners for swipe gestures
  if (isMobile.value) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (isMobile.value) {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchend', handleTouchEnd)
  }
})

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value

  // Prevent body scroll when menu is open
  if (isMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

function closeMenu() {
  isMenuOpen.value = false
  document.body.style.overflow = ''
}

// Swipe gesture handling
function handleTouchStart(event: TouchEvent) {
  if (event.changedTouches.length > 0 && event.changedTouches[0]) {
    touchStartX.value = event.changedTouches[0].screenX
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (event.changedTouches.length > 0 && event.changedTouches[0]) {
    touchEndX.value = event.changedTouches[0].screenX
    handleSwipe()
  }
}

function handleSwipe() {
  const swipeThreshold = 50
  const swipeDistance = touchEndX.value - touchStartX.value

  // Swipe right to open menu
  if (swipeDistance > swipeThreshold && !isMenuOpen.value) {
    toggleMenu()
  }
  // Swipe left to close menu
  else if (swipeDistance < -swipeThreshold && isMenuOpen.value) {
    closeMenu()
  }
}

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isMenuOpen.value) {
    closeMenu()
  }
}

// Focus management
function trapFocus(event: KeyboardEvent) {
  if (!isMenuOpen.value) return

  const focusableElements = [
    ...document.querySelectorAll('#mobile-menu button, #mobile-menu a, #mobile-menu input')
  ]

  if (focusableElements.length === 0) return

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('keydown', trapFocus)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('keydown', trapFocus)
})
</script>

<template>
  <div v-if="isMobile" class="mobile-navigation">
    <!-- Mobile Header -->
    <header class="bg-surface border-b border-neutral-200 fixed top-0 left-0 right-0 z-40">
      <div class="flex items-center justify-between p-4">
        <!-- Logo/Brand -->
        <div class="flex items-center space-x-3">
          <button
            @click="toggleMenu"
            class="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle navigation menu"
            :aria-expanded="isMenuOpen"
            aria-controls="mobile-menu"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 class="text-lg font-semibold text-neutral-900">Portfolio Dashboard</h1>
        </div>

        <!-- Quick Actions -->
        <div class="flex items-center space-x-2">
          <slot name="quick-actions" />
        </div>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMenuOpen"
        class="fixed inset-0 bg-black/50 z-50"
        @click="closeMenu"
        aria-hidden="true"
      />
    </Transition>

    <!-- Mobile Menu Sidebar -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-if="isMenuOpen"
        id="mobile-menu"
        class="fixed top-0 left-0 bottom-0 w-80 bg-surface border-r border-neutral-200 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <!-- Menu Header -->
        <div class="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 class="text-lg font-semibold text-neutral-900">Navigation</h2>
          <button
            @click="closeMenu"
            class="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close menu"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Menu Content -->
        <nav class="p-4" role="navigation" aria-label="Main navigation">
          <slot name="navigation" />
        </nav>

        <!-- Menu Footer -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 bg-neutral-50">
          <slot name="footer" />
        </div>
      </div>
    </Transition>

    <!-- Main Content Padding -->
    <div class="pt-16">
      <slot />
    </div>
  </div>

  <!-- Desktop Layout -->
  <div v-else>
    <slot />
  </div>
</template>

<style scoped>
.mobile-navigation {
  position: relative;
  min-height: 100vh;
}

/* Enhanced touch interactions */
.mobile-navigation button {
  min-height: 44px;
  min-width: 44px;
  -webkit-tap-highlight-color: transparent;
}

/* Improved scrolling */
#mobile-menu {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Prevent body scroll when menu is open */
body.menu-open {
  overflow: hidden;
}
</style>