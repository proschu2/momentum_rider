<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false
})

const variantClasses = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white border-transparent shadow-sm hover:shadow-md',
  secondary: 'bg-surface hover:bg-neutral-50 text-neutral-700 border-neutral-300 shadow-sm hover:shadow',
  danger: 'bg-error-500 hover:bg-error-600 text-white border-transparent shadow-sm hover:shadow-md',
  ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 border-transparent'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl'
}
</script>

<template>
  <button
    :disabled="disabled"
    class="inline-flex items-center justify-center border font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
    :class="[variantClasses[variant], sizeClasses[size]]"
  >
    <slot />
  </button>
</template>