<script setup lang="ts">
interface Props {
  modelValue?: boolean
  label?: string
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label class="flex items-center">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
      class="h-4 w-4 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 border-neutral-300 rounded disabled:opacity-50 transition-all duration-200 cursor-pointer hover:border-primary-400"
    />
    <span v-if="label" class="ml-2 text-sm text-neutral-700 font-medium cursor-pointer hover:text-neutral-900 transition-colors duration-200">
      {{ label }}
    </span>
  </label>
</template>