<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Minimal Header -->
    <header class="bg-surface border-b border-neutral-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-semibold text-neutral-900">Momentum Rider (Dev)</h1>
              <p class="text-xs text-neutral-500">Portfolio Strategy - Development Mode</p>
            </div>
          </div>
          <nav class="flex space-x-1">
            <router-link
              to="/"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              active-class="text-primary-600 bg-primary-50"
            >
              Dashboard
            </router-link>
            <router-link
              to="/about"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              active-class="text-primary-600 bg-primary-50"
            >
              About
            </router-link>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
