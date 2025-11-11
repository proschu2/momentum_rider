<script setup lang="ts">
interface Props {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'sm'
})

const variantClasses = {
  neutral: 'bg-neutral-100 text-neutral-800',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-success-100 text-success-800',
  warning: 'bg-warning-100 text-warning-800',
  error: 'bg-error-100 text-error-800'
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
}
</script>

<template>
  <span
    class="inline-flex items-center font-medium rounded-full"
    :class="[variantClasses[variant], sizeClasses[size]]"
  >
    <slot />
  </span>
</template>