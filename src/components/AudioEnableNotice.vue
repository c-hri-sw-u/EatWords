<script setup lang="ts">
import { $ref, $computed } from "vue/macros";
import { onMounted, onUnmounted } from "vue";
import { Icon } from '@iconify/vue';
import { isAudioEnabled, enableAudio } from '@/utils/audioContext';

let showNotice = $ref(false)
let hasInteracted = $ref(false)

const shouldShow = $computed(() => showNotice && !hasInteracted)

onMounted(() => {
  // 延迟一点显示，避免打扰用户
  setTimeout(() => {
    if (!isAudioEnabled()) {
      showNotice = true
    }
  }, 2000)
  
  // 监听用户交互
  const events = ['click', 'touchstart', 'keydown']
  
  const onInteraction = () => {
    hasInteracted = true
    showNotice = false
    enableAudio()
    
    // 移除监听器
    events.forEach(event => {
      document.removeEventListener(event, onInteraction)
    })
  }
  
  events.forEach(event => {
    document.addEventListener(event, onInteraction, { once: true, passive: true })
  })
})

function dismissNotice() {
  showNotice = false
  hasInteracted = true
}

</script>

<template>
  <Teleport to="body">
    <Transition name="notice-fade">
      <div v-if="shouldShow" class="audio-notice-overlay">
        <div class="audio-notice">
          <div class="notice-icon">
            <Icon icon="mdi:volume-high" width="32" />
          </div>
          <div class="notice-content">
            <div class="notice-title">启用音频功能</div>
            <div class="notice-text">
              点击页面任意位置即可启用音频播放功能，包括单词发音和例句朗读
            </div>
          </div>
          <button class="notice-close" @click="dismissNotice">
            <Icon icon="mdi:close" width="16" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.notice-fade-enter-active,
.notice-fade-leave-active {
  transition: all 0.3s ease;
}

.notice-fade-enter-from,
.notice-fade-leave-to {
  opacity: 0;
  transform: translateY(-20rem);
}

.audio-notice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
  display: flex;
  justify-content: center;
  padding: 20rem;
}

.audio-notice {
  display: flex;
  align-items: center;
  gap: 15rem;
  background: rgba(var(--color-primary-rgb), 0.95);
  color: white;
  padding: 15rem 20rem;
  border-radius: 12rem;
  backdrop-filter: blur(10rem);
  box-shadow: 0 8rem 32rem rgba(0, 0, 0, 0.2);
  max-width: 400rem;
  pointer-events: auto;
  
  .notice-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48rem;
    height: 48rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }
  
  .notice-content {
    flex: 1;
    
    .notice-title {
      font-size: 16rem;
      font-weight: 600;
      margin-bottom: 5rem;
    }
    
    .notice-text {
      font-size: 12rem;
      opacity: 0.9;
      line-height: 1.4;
    }
  }
  
  .notice-close {
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 28rem;
    height: 28rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}
</style> 