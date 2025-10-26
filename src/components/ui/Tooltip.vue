<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top',
  delay: 200,
  maxWidth: 200
})

const isVisible = ref(false)
let timeoutId: number | null = null

const positionClasses = computed(() => {
  const base = 'absolute z-50 px-3 py-2 text-xs font-medium text-white bg-neutral-800 rounded-lg shadow-lg transition-opacity duration-200'
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }
  return `${base} ${positions[props.position]}`
})

const showTooltip = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = window.setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

const hideTooltip = () => {
  if (timeoutId) clearTimeout(timeoutId)
  isVisible.value = false
}
</script>

<template>
  <div class="relative inline-block">
    <div
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @focus="showTooltip"
      @blur="hideTooltip"
      class="inline-block"
      role="tooltip"
    >
      <slot />
    </div>

    <div
      v-if="isVisible"
      :class="positionClasses"
      :style="{ maxWidth: `${maxWidth}px` }"
      role="tooltip"
    >
      {{ content }}
      <div
        :class="{
          'top-full left-1/2 transform -translate-x-1/2 border-t-neutral-800': position === 'top',
          'bottom-full left-1/2 transform -translate-x-1/2 border-b-neutral-800': position === 'bottom',
          'right-full top-1/2 transform -translate-y-1/2 border-r-neutral-800': position === 'left',
          'left-full top-1/2 transform -translate-y-1/2 border-l-neutral-800': position === 'right'
        }"
        class="absolute w-0 h-0 border-4 border-transparent"
      />
    </div>
  </div>
</template>