<script setup lang="ts">
import { $ref } from "vue/macros";
import { onMounted, nextTick } from "vue";
import { useSettingStore } from "@/stores/setting.ts";
import { Icon } from '@iconify/vue';
import BaseButton from "@/components/BaseButton.vue";

interface IProps {
  word: string,
}

const props = withDefaults(defineProps<IProps>(), {
  word: ''
})

const emit = defineEmits<{
  complete: [sentence: string],
  skip: []
}>()

let userSentence = $ref('')
let isSubmitting = $ref(false)
let inputRef = $ref<any>(null)

const settingStore = useSettingStore()

// 组件挂载后聚焦输入框
onMounted(() => {
  nextTick(() => {
    if (inputRef) {
      inputRef.focus()
    }
  })
})

function submitSentence() {
  if (!userSentence.trim()) {
    ElMessage.warning('请输入您的造句')
    return
  }
  
  isSubmitting = true
  emit('complete', userSentence.trim())
}

function skipCreation() {
  emit('skip')
}

function onKeyDown(e: KeyboardEvent) {
  // 阻止事件冒泡到全局键盘监听器
  e.stopPropagation()
  
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    submitSentence()
  }
}

function onKeyUp(e: KeyboardEvent) {
  // 阻止事件冒泡到全局键盘监听器
  e.stopPropagation()
}

function onFocus(e: FocusEvent) {
  console.log('造句输入框获得焦点')
}

function onBlur(e: FocusEvent) {
  console.log('造句输入框失去焦点')
}

</script>

<template>
  <div class="sentence-creation">
    <div class="creation-header">
      <div class="creation-title">
        <Icon icon="mdi:lightbulb-outline" width="20" />
        用 "<span class="target-word">{{ word }}</span>" 造句
      </div>
      <div class="creation-subtitle">
        请用这个单词创造一个英文句子
      </div>
    </div>

    <div class="creation-input">
      <el-input
        v-model="userSentence"
        type="textarea"
        :rows="3"
        placeholder="请输入您的英文句子..."
        :disabled="isSubmitting"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @focus="onFocus"
        @blur="onBlur"
        maxlength="200"
        show-word-limit
        resize="none"
        ref="inputRef"
        autofocus
      />
    </div>

    <div class="creation-actions">
      <BaseButton 
        @click="skipCreation" 
        type="text"
        size="small"
        :disabled="isSubmitting"
      >
        跳过造句
      </BaseButton>
      
      <BaseButton 
        @click="submitSentence" 
        type="primary"
        size="small"
        :loading="isSubmitting"
      >
        <Icon icon="mdi:send" width="16" />
        提交评分 (Ctrl+Enter)
      </BaseButton>
    </div>

    <div class="creation-tips">
      <div class="tip-item">
        <Icon icon="mdi:lightbulb" width="14" />
        <span>尝试使用简单、自然的句子</span>
      </div>
      <div class="tip-item">
        <Icon icon="mdi:target" width="14" />
        <span>确保句子中包含目标单词</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sentence-creation {
  width: 100%;
  max-width: 600rem;
  display: flex;
  flex-direction: column;
  gap: 20rem;
  padding: 20rem;
  background: rgba(var(--color-primary-rgb), 0.03);
  border-radius: 12rem;
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);

  .creation-header {
    text-align: center;
    
    .creation-title {
      font-size: 18rem;
      font-weight: 600;
      color: var(--color-font-1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rem;
      margin-bottom: 8rem;
      
      .target-word {
        color: var(--color-primary);
        font-weight: 700;
        padding: 2rem 8rem;
        background: rgba(var(--color-primary-rgb), 0.1);
        border-radius: 4rem;
      }
    }
    
    .creation-subtitle {
      font-size: 14rem;
      color: var(--color-font-2);
    }
  }

  .creation-input {
    :deep(.el-textarea__inner) {
      border-radius: 8rem;
      border: 2px solid rgba(var(--color-primary-rgb), 0.2);
      font-size: 16rem;
      line-height: 1.5;
      
      &:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
      }
    }
  }

  .creation-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15rem;
  }

  .creation-tips {
    display: flex;
    flex-direction: column;
    gap: 8rem;
    padding: 15rem;
    background: rgba(var(--color-font-2-rgb), 0.05);
    border-radius: 8rem;
    
    .tip-item {
      display: flex;
      align-items: center;
      gap: 8rem;
      font-size: 12rem;
      color: var(--color-font-3);
      
      svg {
        color: var(--color-primary);
        opacity: 0.7;
      }
    }
  }
}
</style> 