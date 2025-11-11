<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  columns?: number
  gap?: string
  minWidth?: string
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
  gap: '1rem',
  minWidth: '200px',
  maxWidth: '1fr'
})

const isTouchDevice = ref(false)
const gridRef = ref<HTMLElement>()

// Detect touch device
onMounted(() => {
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Add touch-specific CSS classes
  if (isTouchDevice.value && gridRef.value) {
    gridRef.value.classList.add('touch-device')
  }
})

// Enhanced touch interactions
function handleTouchStart(event: TouchEvent) {
  const target = event.target as HTMLElement
  if (target.classList.contains('touch-target')) {
    target.classList.add('touch-active')

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  const target = event.target as HTMLElement
  if (target.classList.contains('touch-target')) {
    target.classList.remove('touch-active')
  }
}

// Prevent zoom on double-tap
function preventDoubleTapZoom(event: TouchEvent) {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

onMounted(() => {
  if (isTouchDevice.value) {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchmove', preventDoubleTapZoom, { passive: false })
  }
})

onUnmounted(() => {
  if (isTouchDevice.value) {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchmove', preventDoubleTapZoom)
  }
})
</script>

<template>
  <div
    ref="gridRef"
    class="touch-friendly-grid"
    :style="{
      '--grid-columns': columns,
      '--grid-gap': gap,
      '--grid-min-width': minWidth,
      '--grid-max-width': maxWidth
    }"
  >
    <slot />
  </div>
</template>

<style scoped>
.touch-friendly-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), minmax(var(--grid-min-width), var(--grid-max-width)));
  gap: var(--grid-gap);
  width: 100%;
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .touch-friendly-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .touch-friendly-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* Touch-specific enhancements */
.touch-device .touch-target {
  min-height: 44px; /* Minimum touch target size */
  min-width: 44px;
  padding: 0.75rem;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s ease;
}

.touch-device .touch-target:hover {
  transform: none; /* Disable hover effects on touch devices */
}

.touch-device .touch-target.touch-active {
  background-color: rgba(59, 130, 246, 0.1);
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Improved scrolling for touch */
.touch-device {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* Prevent text selection on interactive elements */
.touch-device .touch-target,
.touch-device button,
.touch-device [role="button"] {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Enhanced focus states for touch */
.touch-device .touch-target:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Larger hit areas for mobile */
@media (max-width: 768px) {
  .touch-device .touch-target {
    min-height: 48px;
    padding: 1rem;
  }

  .touch-device button {
    min-height: 44px;
    padding: 0.75rem 1rem;
  }
}

/* Swipe-friendly containers */
.touch-device .swipe-container {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.touch-device .swipe-item {
  scroll-snap-align: start;
  flex-shrink: 0;
}
</style>