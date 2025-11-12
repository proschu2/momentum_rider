<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import ResizablePanel from './ResizablePanel.vue'

export interface DashboardLayoutProps {
  initialLayout?: DashboardLayout
}

export interface DashboardLayout {
  leftPanel: number
  rightPanel: number
  mainPanel: number
}

const props = withDefaults(defineProps<DashboardLayoutProps>(), {
  initialLayout: () => ({
    leftPanel: 300,
    rightPanel: 300,
    mainPanel: 600
  })
})

const emit = defineEmits<{
  layoutChange: [layout: DashboardLayout]
}>()

const layout = ref<DashboardLayout>({ ...props.initialLayout })
const isDragging = ref(false)

// Provide layout context to child components
provide('dashboardLayout', {
  layout,
  updateLayout: (newLayout: Partial<DashboardLayout>) => {
    layout.value = { ...layout.value, ...newLayout }
    emit('layoutChange', layout.value)
    saveLayoutToStorage()
  }
})

// Load layout from localStorage
function loadLayoutFromStorage() {
  try {
    const savedLayout = localStorage.getItem('momentumRider_dashboardLayout')
    if (savedLayout) {
      const parsed = JSON.parse(savedLayout)
      layout.value = { ...props.initialLayout, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load dashboard layout from localStorage:', error)
  }
}

// Save layout to localStorage
function saveLayoutToStorage() {
  try {
    localStorage.setItem('momentumRider_dashboardLayout', JSON.stringify(layout.value))
  } catch (error) {
    console.warn('Failed to save dashboard layout to localStorage:', error)
  }
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  // Reset layout with Ctrl+Shift+R
  if (event.ctrlKey && event.shiftKey && event.key === 'R') {
    event.preventDefault()
    layout.value = { ...props.initialLayout }
    emit('layoutChange', layout.value)
    saveLayoutToStorage()
  }

  // Toggle left panel with Ctrl+1
  if (event.ctrlKey && event.key === '1') {
    event.preventDefault()
    const leftPanel = layout.value.leftPanel
    layout.value.leftPanel = leftPanel === 0 ? props.initialLayout.leftPanel : 0
    emit('layoutChange', layout.value)
    saveLayoutToStorage()
  }

  // Toggle right panel with Ctrl+2
  if (event.ctrlKey && event.key === '2') {
    event.preventDefault()
    const rightPanel = layout.value.rightPanel
    layout.value.rightPanel = rightPanel === 0 ? props.initialLayout.rightPanel : 0
    emit('layoutChange', layout.value)
    saveLayoutToStorage()
  }
}

// Drag and drop support
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false

  // Handle panel reordering logic here
  // This would be extended based on specific drag and drop requirements
}

onMounted(() => {
  loadLayoutFromStorage()
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    class="dashboard-layout"
    :class="{ 'dragging': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Left Panel -->
    <ResizablePanel
      v-if="layout.leftPanel > 0"
      v-model:width="layout.leftPanel"
      :min-width="200"
      :max-width="500"
      :default-width="layout.leftPanel"
      class="left-panel"
      @resize="(width) => layout.leftPanel = width"
    >
      <slot name="left" />
    </ResizablePanel>

    <!-- Main Content Area -->
    <div
      class="main-content"
      :style="{
        marginLeft: layout.leftPanel > 0 ? '8px' : '0',
        marginRight: layout.rightPanel > 0 ? '8px' : '0'
      }"
    >
      <slot name="main" />
    </div>

    <!-- Right Panel -->
    <ResizablePanel
      v-if="layout.rightPanel > 0"
      v-model:width="layout.rightPanel"
      :min-width="200"
      :max-width="500"
      :default-width="layout.rightPanel"
      class="right-panel"
      @resize="(width) => layout.rightPanel = width"
    >
      <slot name="right" />
    </ResizablePanel>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  background: var(--color-neutral-50);
  overflow: hidden;
  position: relative;
}

.dashboard-layout.dragging {
  background: var(--color-primary-50);
}

.left-panel {
  flex-shrink: 0;
  margin-right: 8px;
}

.right-panel {
  flex-shrink: 0;
  margin-left: 8px;
}

.main-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 16px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .dashboard-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    margin: 0 0 8px 0;
    width: 100% !important;
    max-width: none !important;
  }

  .main-content {
    margin: 0 !important;
  }
}

/* Print styles */
@media print {
  .dashboard-layout {
    display: block;
    height: auto;
  }

  .left-panel,
  .right-panel {
    break-inside: avoid;
    margin: 0 0 16px 0;
    width: 100% !important;
  }

  .main-content {
    margin: 0 !important;
  }
}
</style>