<script setup lang="ts">
import { computed } from 'vue'
interface Props {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  labelPosition?: 'inside' | 'outside'
  color?: 'primary' | 'success' | 'warning' | 'error'
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  size: 'md',
  showLabel: false,
  labelPosition: 'outside',
  color: 'primary',
  indeterminate: false
})

const percentage = computed(() => {
  if (props.indeterminate) return 100
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100)
})

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const colorClasses = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500'
}

const labelClasses = {
  inside: 'text-white text-xs font-medium',
  outside: 'text-neutral-600 text-sm'
}
</script>

<template>
  <div class="w-full">
    <div v-if="showLabel && labelPosition === 'outside'" class="flex justify-between items-center mb-1">
      <span :class="labelClasses.outside">
        <slot name="label">
          {{ indeterminate ? 'Processing...' : `${Math.round(percentage)}%` }}
        </slot>
      </span>
      <span v-if="!indeterminate" :class="labelClasses.outside">
        {{ value }} / {{ max }}
      </span>
    </div>

    <div
      class="relative w-full bg-neutral-200 rounded-full overflow-hidden"
      :class="sizeClasses[size]"
      role="progressbar"
      :aria-valuenow="indeterminate ? undefined : value"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-label="$slots.label ? undefined : 'Progress indicator'"
    >
      <div
        :class="[
          colorClasses[color],
          indeterminate ? 'animate-pulse' : 'transition-all duration-500 ease-out'
        ]"
        class="h-full rounded-full"
        :style="{ width: indeterminate ? '100%' : `${percentage}%` }"
      >
        <div
          v-if="showLabel && labelPosition === 'inside' && percentage > 20"
          :class="labelClasses.inside"
          class="absolute inset-0 flex items-center justify-center px-2"
        >
          <slot name="label">
            {{ indeterminate ? 'Processing...' : `${Math.round(percentage)}%` }}
          </slot>
        </div>
      </div>

      <!-- Indeterminate animation -->
      <div
        v-if="indeterminate"
        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
      />
    </div>

    <div v-if="showLabel && labelPosition === 'outside' && $slots.description" class="mt-1">
      <slot name="description" />
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
</style>