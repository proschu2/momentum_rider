<script setup lang="ts">
import { RouterView } from 'vue-router'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts.vue'
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Skip to Content Link for Keyboard Users -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-500 text-white px-4 py-2 rounded-lg z-50"
    >
      Skip to main content
    </a>

    <!-- Keyboard Shortcuts Component -->
    <KeyboardShortcuts />

    <!-- Enhanced Header for Desktop -->
    <header class="bg-surface border-b border-neutral-200 sticky top-0 z-30 backdrop-blur-sm bg-opacity-95">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <!-- Brand Section -->
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-neutral-900 tracking-tight">Momentum Rider</h1>
              <p class="text-xs text-neutral-500 flex items-center space-x-1">
                <span class="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
                <span>Portfolio Strategy - Development Mode</span>
              </p>
            </div>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden lg:flex items-center space-x-2">
            <router-link
              to="/"
              class="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 group relative"
              active-class="text-primary-600 bg-primary-50 shadow-sm"
            >
              <span class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </span>
            </router-link>
          </nav>

          <!-- Mobile Menu Button -->
          <button
            class="lg:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Enhanced Main Content for Desktop -->
    <main id="main-content" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="min-h-[calc(100vh-200px)]">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
