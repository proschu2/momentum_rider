<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore } from '@/stores/portfolio'

const store = usePortfolioStore()

const portfolios = computed(() => Object.values(store.portfolios))
</script>

<template>
  <div class="empty-state">
    <div class="empty-state-content">
      <h2 class="empty-state-title">Welcome to Your Portfolio Manager</h2>
      <p class="empty-state-message">
        Get started by creating your first investment portfolio. Track your holdings, analyze performance, and optimize your investment strategy.
      </p>
      
      <div class="create-portfolio-card" @click="$emit('createPortfolio')">
        <div class="create-icon">+</div>
        <div class="create-text">Create Portfolio</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  max-width: 600px;
  margin: 0 auto;
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.empty-state-content {
  text-align: center;
  width: 100%;
}

.empty-state-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
  line-height: 1.2;
}

.empty-state-message {
  font-size: 1.1rem;
  color: #6b7280;
  margin-bottom: 40px;
  max-width: 500px;
  line-height: 1.6;
  margin-left: auto;
  margin-right: auto;
}

.create-portfolio-card {
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  padding: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  max-width: 300px;
  margin: 0 auto;
}

.create-portfolio-card:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.create-icon {
  font-size: 3rem;
  font-weight: 300;
  color: #3b82f6;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eff6ff;
}

.create-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

/* Responsive Design */
@media (max-width: 768px) {
  .empty-state {
    padding: 40px 16px;
    min-height: 60vh;
  }
  
  .empty-state-title {
    font-size: 1.75rem;
  }
  
  .empty-state-message {
    font-size: 1rem;
    margin-bottom: 30px;
  }
  
  .create-portfolio-card {
    padding: 30px 20px;
    max-width: 280px;
  }
  
  .create-icon {
    font-size: 2.5rem;
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 480px) {
  .empty-state-title {
    font-size: 1.5rem;
  }
  
  .create-portfolio-card {
    padding: 25px 16px;
    max-width: 250px;
  }
}
</style>