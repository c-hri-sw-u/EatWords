<script setup lang="ts">
import { $computed } from "vue/macros";
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted } from 'vue';
import BaseButton from "@/components/BaseButton.vue";

interface IProps {
  word: string,
  userSentence: string,
  score: number,
  feedback: string,
  loading?: boolean,
}

const props = withDefaults(defineProps<IProps>(), {
  word: '',
  userSentence: '',
  score: 0,
  feedback: '',
  loading: false,
})

const emit = defineEmits<{
  continue: [],
  retry: []
}>()

// 根据分数计算等级和颜色
const scoreLevel = $computed(() => {
  if (props.score >= 9) return { level: '优秀', color: '#52c41a', icon: 'mdi:star' }
  if (props.score >= 7) return { level: '良好', color: '#1890ff', icon: 'mdi:thumb-up' }
  if (props.score >= 5) return { level: '及格', color: '#faad14', icon: 'mdi:check' }
  return { level: '需改进', color: '#ff4d4f', icon: 'mdi:alert-circle' }
})

function continuePractice() {
  emit('continue')
}

function retryCreation() {
  emit('retry')
}

// 键盘事件处理
function handleKeyDown(e: KeyboardEvent) {
  // Ctrl/Cmd + Enter 继续练习
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    continuePractice()
  }
  // Ctrl/Cmd + R 重新造句
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault()
    retryCreation()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

</script>

<template>
  <div class="sentence-evaluation">
    <div v-if="loading" class="evaluation-loading">
      <el-loading size="large" />
      <div class="loading-text">AI正在评分中...</div>
    </div>

    <div v-else class="evaluation-content">
      <!-- 分数显示 -->
      <div class="score-section">
        <div class="score-circle" :style="{ borderColor: scoreLevel.color }">
          <div class="score-number" :style="{ color: scoreLevel.color }">
            {{ score }}
          </div>
          <div class="score-total">/10</div>
        </div>
        <div class="score-level" :style="{ color: scoreLevel.color }">
          <Icon :icon="scoreLevel.icon" width="20" />
          {{ scoreLevel.level }}
        </div>
      </div>

      <!-- 用户句子 -->
      <div class="user-sentence-section">
        <div class="section-title">您的造句</div>
        <div class="user-sentence">
          "{{ userSentence }}"
        </div>
      </div>

      <!-- AI反馈 -->
      <div class="feedback-section">
        <div class="section-title">
          <Icon icon="mdi:robot" width="18" />
          AI评语
        </div>
        <div class="feedback-content">
          {{ feedback }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="evaluation-actions">
        <BaseButton 
          @click="retryCreation" 
          type="default"
          size="small"
        >
          <Icon icon="mdi:refresh" width="16" />
          重新造句
          <span class="shortcut-hint">Ctrl+R</span>
        </BaseButton>
        
        <BaseButton 
          @click="continuePractice" 
          type="primary"
          size="small"
        >
          <Icon icon="mdi:arrow-right" width="16" />
          继续练习
          <span class="shortcut-hint">Ctrl+Enter</span>
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sentence-evaluation {
  width: 100%;
  max-width: 600rem;

  .evaluation-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rem;
    padding: 40rem;
    
    .loading-text {
      font-size: 16rem;
      color: var(--color-font-2);
    }
  }

  .evaluation-content {
    display: flex;
    flex-direction: column;
    gap: 25rem;
    padding: 20rem;
    background: rgba(var(--color-success-rgb), 0.03);
    border-radius: 12rem;
    border: 1px solid rgba(var(--color-success-rgb), 0.2);
  }

  .score-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15rem;
    
    .score-circle {
      width: 80rem;
      height: 80rem;
      border: 4px solid;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      
      .score-number {
        font-size: 28rem;
        font-weight: 700;
        line-height: 1;
      }
      
      .score-total {
        font-size: 14rem;
        color: var(--color-font-3);
        line-height: 1;
      }
    }
    
    .score-level {
      display: flex;
      align-items: center;
      gap: 5rem;
      font-size: 16rem;
      font-weight: 600;
    }
  }

  .user-sentence-section, .feedback-section {
    .section-title {
      font-size: 14rem;
      font-weight: 600;
      color: var(--color-font-2);
      margin-bottom: 10rem;
      display: flex;
      align-items: center;
      gap: 5rem;
    }
  }

  .user-sentence {
    background: rgba(var(--color-primary-rgb), 0.05);
    padding: 15rem;
    border-radius: 8rem;
    border-left: 4px solid var(--color-primary);
    font-size: 16rem;
    line-height: 1.5;
    font-style: italic;
    color: var(--color-font-1);
  }

  .feedback-content {
    background: rgba(var(--color-info-rgb), 0.05);
    padding: 15rem;
    border-radius: 8rem;
    border-left: 4px solid var(--color-info);
    font-size: 14rem;
    line-height: 1.6;
    color: var(--color-font-1);
  }

  .evaluation-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20rem;
    padding-top: 10rem;
    border-top: 1px solid rgba(var(--color-font-2-rgb), 0.1);
    
    .shortcut-hint {
      font-size: 11rem;
      opacity: 0.7;
      margin-left: 5rem;
      font-weight: normal;
    }
  }
}
</style> 