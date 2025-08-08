<script setup lang="ts">
import { computed } from 'vue'
import { useBaseStore } from '@/stores/base'
import { usePracticeStore } from '@/stores/practice'
import BaseButton from '@/components/BaseButton.vue'
import BaseIcon from '@/components/BaseIcon.vue'

const store = useBaseStore()
const practiceStore = usePracticeStore()

const stats = computed(() => {
  const totalWords = store.collect.words.length + store.simple.words.length + store.wrong.words.length
  const todayWords = store.chapter.length
  const correctRate = practiceStore.correctRate >= 0 ? practiceStore.correctRate : 0
  
  return {
    totalWords,
    todayWords,
    correctRate,
    collectWords: store.collect.words.length,
    simpleWords: store.simple.words.length,
    wrongWords: store.wrong.words.length
  }
})

function resetStats() {
  practiceStore.inputWordNumber = 0
  practiceStore.wrongWordNumber = 0
  practiceStore.correctRate = -1
}
</script>

<template>
  <div class="mobile-stats">
    <div class="stats-header">
      <h3>学习统计</h3>
      <BaseButton size="small" @click="resetStats">重置</BaseButton>
    </div>
    
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-icon">
          <BaseIcon icon="ph:books" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalWords }}</div>
          <div class="stat-label">总词数</div>
        </div>
      </div>
      
      <div class="stat-item">
        <div class="stat-icon">
          <BaseIcon icon="ph:star" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.collectWords }}</div>
          <div class="stat-label">收藏词</div>
        </div>
      </div>
      
      <div class="stat-item">
        <div class="stat-icon">
          <BaseIcon icon="ph:check-circle" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.simpleWords }}</div>
          <div class="stat-label">简单词</div>
        </div>
      </div>
      
      <div class="stat-item">
        <div class="stat-icon">
          <BaseIcon icon="ph:x-circle" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.wrongWords }}</div>
          <div class="stat-label">错词</div>
        </div>
      </div>
    </div>
    
    <div class="today-stats">
      <div class="today-header">
        <h4>今日学习</h4>
      </div>
      
      <div class="today-content">
        <div class="today-item">
          <span class="label">学习词数：</span>
          <span class="value">{{ stats.todayWords }}</span>
        </div>
        
        <div class="today-item">
          <span class="label">正确率：</span>
          <span class="value" :class="{ 'high': stats.correctRate >= 80, 'medium': stats.correctRate >= 60, 'low': stats.correctRate < 60 }">
            {{ stats.correctRate }}%
          </span>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${stats.correctRate}%` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mobile-stats {
  padding: 20rem;
  
  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rem;
    
    h3 {
      margin: 0;
      font-size: 18rem;
      color: var(--color-font-2);
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15rem;
    margin-bottom: 30rem;
    
    .stat-item {
      background: var(--color-item-bg);
      border-radius: var(--radius);
      padding: 15rem;
      display: flex;
      align-items: center;
      gap: 10rem;
      border: 1px solid var(--color-item-border);
      
      .stat-icon {
        width: 40rem;
        height: 40rem;
        background: var(--color-main-active);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18rem;
      }
      
      .stat-content {
        flex: 1;
        
        .stat-value {
          font-size: 20rem;
          font-weight: bold;
          color: var(--color-font-2);
          line-height: 1;
        }
        
        .stat-label {
          font-size: 12rem;
          color: var(--color-gray);
          margin-top: 5rem;
        }
      }
    }
  }
  
  .today-stats {
    background: var(--color-item-bg);
    border-radius: var(--radius);
    padding: 20rem;
    border: 1px solid var(--color-item-border);
    
    .today-header {
      margin-bottom: 15rem;
      
      h4 {
        margin: 0;
        font-size: 16rem;
        color: var(--color-font-2);
      }
    }
    
    .today-content {
      margin-bottom: 15rem;
      
      .today-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10rem;
        
        .label {
          color: var(--color-font-1);
          font-size: 14rem;
        }
        
        .value {
          font-weight: bold;
          font-size: 16rem;
          
          &.high {
            color: #51cf66;
          }
          
          &.medium {
            color: #ffd43b;
          }
          
          &.low {
            color: #ff6b6b;
          }
        }
      }
    }
    
    .progress-bar {
      width: 100%;
      height: 6rem;
      background: var(--color-item-border);
      border-radius: 3rem;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: var(--color-main-active);
        transition: width 0.3s ease;
      }
    }
  }
}
</style> 