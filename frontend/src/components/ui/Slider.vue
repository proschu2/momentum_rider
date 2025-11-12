<script setup lang="ts">
interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <input
    type="range"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    @input="handleInput"
    class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 transition-all duration-200 hover:bg-neutral-300"
  />
</template>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0ea5e9;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0ea5e9;
  cursor: pointer;
  border: none;
}
</style>