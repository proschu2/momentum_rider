<script setup lang="ts">
import Dialog from './Dialog.vue'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const variantConfig = {
  danger: {
    icon: 'error',
    confirmColor: 'error',
    iconColor: 'text-error-500'
  },
  warning: {
    icon: 'warning',
    confirmColor: 'warning',
    iconColor: 'text-warning-500'
  },
  info: {
    icon: 'info',
    confirmColor: 'primary',
    iconColor: 'text-primary-500'
  }
}

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Dialog
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="cancel"
  >
    <div class="flex items-start space-x-4">
      <!-- Icon -->
      <div :class="variantConfig[variant].iconColor" class="flex-shrink-0 mt-0.5">
        <svg
          v-if="variantConfig[variant].icon === 'error'"
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <svg
          v-else-if="variantConfig[variant].icon === 'warning'"
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <svg
          v-else
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1">
        <p class="text-sm text-neutral-600 leading-relaxed">
          {{ message }}
        </p>
      </div>
    </div>

    <template #footer>
      <button
        @click="cancel"
        :disabled="loading"
        class="px-4 py-2 text-sm font-medium text-neutral-700 bg-surface border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ cancelText }}
      </button>
      <button
        @click="confirm"
        :disabled="loading"
        :class="[
          variant === 'danger' ? 'bg-error-500 hover:bg-error-600' :
          variant === 'warning' ? 'bg-warning-500 hover:bg-warning-600' :
          'bg-primary-500 hover:bg-primary-600'
        ]"
        class="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading" class="flex items-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
        <span v-else>
          {{ confirmText }}
        </span>
      </button>
    </template>
  </Dialog>
</template>