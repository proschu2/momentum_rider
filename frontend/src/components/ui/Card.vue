<script setup lang="ts">
interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  shadow?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  hover: false,
  shadow: true
})

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}
</script>

<template>
  <div
    class="bg-surface rounded-xl border border-neutral-200 transition-all duration-200"
    :class="[
      paddingClasses[padding],
      shadow ? 'shadow-sm hover:shadow-md' : '',
      hover ? 'hover:bg-neutral-50 hover:border-neutral-300' : ''
    ]"
  >
    <slot />
  </div>
</template>