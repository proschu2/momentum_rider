<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnBackdrop: true,
  closeOnEscape: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

const dialogRef = ref<HTMLElement>()

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (props.closeOnBackdrop && event.target === event.currentTarget) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (props.closeOnEscape && event.key === 'Escape') {
    close()
  }
}

// Focus management
function focusFirstInteractiveElement() {
  const dialog = dialogRef.value
  if (!dialog) return

  const focusableElements = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  if (focusableElements.length > 0) {
    ;(focusableElements[0] as HTMLElement).focus()
  }
}

// Trap focus inside dialog
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const dialog = dialogRef.value
  if (!dialog) return

  const focusableElements = dialog.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  if (focusableElements.length === 0) return

  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

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

onMounted(() => {
  if (props.modelValue) {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keydown', trapFocus)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    // Focus management
    nextTick(() => {
      focusFirstInteractiveElement()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('keydown', trapFocus)
  document.body.style.overflow = ''
})

watch(() => props.modelValue, (newValue: boolean) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keydown', trapFocus)
    document.body.style.overflow = 'hidden'

    nextTick(() => {
      focusFirstInteractiveElement()
    })
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('keydown', trapFocus)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click="handleBackdropClick"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'dialog-title' : undefined"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            ref="dialogRef"
            class="bg-surface rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden"
            :class="sizeClasses[size]"
            @click.stop
          >
            <!-- Header -->
            <div v-if="title || $slots.header" class="flex items-center justify-between p-6 border-b border-neutral-200">
              <div class="flex items-center space-x-3">
                <slot name="header">
                  <h2 id="dialog-title" class="text-lg font-semibold text-neutral-900">
                    {{ title }}
                  </h2>
                </slot>
              </div>

              <button
                @click="close"
                class="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Close dialog"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content -->
            <div class="p-6 overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="flex justify-end space-x-3 p-6 border-t border-neutral-200 bg-neutral-50">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>