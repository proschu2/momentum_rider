<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface ResizablePanelProps {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  resizable?: boolean
  direction?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<ResizablePanelProps>(), {
  minWidth: 200,
  maxWidth: 800,
  defaultWidth: 300,
  resizable: true,
  direction: 'horizontal'
})

const emit = defineEmits<{
  resize: [width: number]
}>()

const panelRef = ref<HTMLElement>()
const width = ref(props.defaultWidth)
const isResizing = ref(false)

const style = computed(() => ({
  width: `${width.value}px`,
  minWidth: `${props.minWidth}px`,
  maxWidth: `${props.maxWidth}px`
}))

function startResize(event: MouseEvent) {
  if (!props.resizable) return

  isResizing.value = true
  const startX = event.clientX
  const startWidth = width.value

  function onMouseMove(moveEvent: MouseEvent) {
    if (!isResizing.value) return

    const deltaX = moveEvent.clientX - startX
    const newWidth = startWidth + deltaX

    if (newWidth >= props.minWidth && newWidth <= props.maxWidth) {
      width.value = newWidth
      emit('resize', newWidth)
    }
  }

  function onMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Keyboard accessibility
function handleKeyDown(event: KeyboardEvent) {
  if (!props.resizable) return

  const step = 10
  let newWidth = width.value

  switch (event.key) {
    case 'ArrowLeft':
      newWidth = Math.max(props.minWidth, width.value - step)
      break
    case 'ArrowRight':
      newWidth = Math.min(props.maxWidth, width.value + step)
      break
    case 'Home':
      newWidth = props.minWidth
      break
    case 'End':
      newWidth = props.maxWidth
      break
    default:
      return
  }

  if (newWidth !== width.value) {
    event.preventDefault()
    width.value = newWidth
    emit('resize', newWidth)
  }
}
</script>

<template>
  <div
    ref="panelRef"
    class="resizable-panel"
    :class="[
      direction,
      { 'resizable': resizable, 'resizing': isResizing }
    ]"
    :style="style"
    @keydown="handleKeyDown"
  >
    <slot />

    <div
      v-if="resizable"
      class="resize-handle"
      :class="direction"
      @mousedown="startResize"
      @keydown="handleKeyDown"
      :tabindex="0"
      role="separator"
      :aria-label="`Resize ${direction} panel`"
      :aria-valuenow="width"
      :aria-valuemin="props.minWidth"
      :aria-valuemax="props.maxWidth"
    >
      <div class="handle-indicator" />
    </div>
  </div>
</template>

<style scoped>
.resizable-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.resizable-panel.resizable:hover {
  box-shadow: var(--shadow-md);
}

.resizable-panel.resizing {
  box-shadow: var(--shadow-lg);
  user-select: none;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -4px;
  width: 8px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.resize-handle:hover,
.resize-handle:focus {
  background-color: var(--color-primary-200);
}

.resize-handle:focus {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

.handle-indicator {
  width: 2px;
  height: 24px;
  background-color: var(--color-neutral-400);
  border-radius: 1px;
  transition: background-color 0.2s ease;
}

.resize-handle:hover .handle-indicator,
.resize-handle:focus .handle-indicator {
  background-color: var(--color-primary-500);
}

/* Vertical direction */
.resizable-panel.vertical {
  flex-direction: row;
}

.resize-handle.vertical {
  top: auto;
  right: 0;
  bottom: -4px;
  left: 0;
  width: auto;
  height: 8px;
  cursor: row-resize;
}

.resize-handle.vertical .handle-indicator {
  width: 24px;
  height: 2px;
}
</style>