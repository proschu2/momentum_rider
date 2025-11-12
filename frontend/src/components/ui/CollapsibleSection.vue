<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
  defaultOpen?: boolean
  showToggle?: boolean
  icon?: string
  badge?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: true,
  showToggle: true
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  if (props.showToggle) {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-neutral-200 overflow-hidden">
    <!-- Header -->
    <button
      v-if="showToggle"
      @click="toggle"
      class="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
      :aria-expanded="isOpen"
      :aria-controls="`collapsible-content-${title}`"
    >
      <div class="flex items-center space-x-3">
        <!-- Icon slot -->
        <slot name="icon">
          <svg
            v-if="icon"
            class="w-5 h-5 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
          </svg>
        </slot>

        <div>
          <h3 class="text-base font-semibold text-neutral-900">
            {{ title }}
          </h3>
          <p v-if="$slots.description" class="text-sm text-neutral-600 mt-0.5">
            <slot name="description" />
          </p>
        </div>

        <!-- Badge -->
        <span
          v-if="badge"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
        >
          {{ badge }}
        </span>
      </div>

      <!-- Toggle Icon -->
      <svg
        class="w-5 h-5 text-neutral-400 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Non-toggle header -->
    <div v-else class="p-4 border-b border-neutral-200">
      <div class="flex items-center space-x-3">
        <slot name="icon">
          <svg
            v-if="icon"
            class="w-5 h-5 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
          </svg>
        </slot>

        <div>
          <h3 class="text-base font-semibold text-neutral-900">
            {{ title }}
          </h3>
          <p v-if="$slots.description" class="text-sm text-neutral-600 mt-0.5">
            <slot name="description" />
          </p>
        </div>

        <!-- Badge -->
        <span
          v-if="badge"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
        >
          {{ badge }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-show="isOpen || !showToggle"
        :id="`collapsible-content-${title}`"
        class="overflow-hidden"
      >
        <div class="p-4">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>