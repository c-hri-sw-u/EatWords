<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Props {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  minSwipeDistance?: number
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 50,
  minSwipeDistance: 50
})

const startX = ref(0)
const startY = ref(0)
const endX = ref(0)
const endY = ref(0)

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  startX.value = touch.clientX
  startY.value = touch.clientY
}

function handleTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0]
  endX.value = touch.clientX
  endY.value = touch.clientY
  
  const deltaX = endX.value - startX.value
  const deltaY = endY.value - startY.value
  
  // 判断是否为有效的滑动手势
  if (Math.abs(deltaX) < props.minSwipeDistance && Math.abs(deltaY) < props.minSwipeDistance) {
    return
  }
  
  // 判断滑动方向
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 水平滑动
    if (deltaX > props.threshold && props.onSwipeRight) {
      props.onSwipeRight()
    } else if (deltaX < -props.threshold && props.onSwipeLeft) {
      props.onSwipeLeft()
    }
  } else {
    // 垂直滑动
    if (deltaY > props.threshold && props.onSwipeDown) {
      props.onSwipeDown()
    } else if (deltaY < -props.threshold && props.onSwipeUp) {
      props.onSwipeUp()
    }
  }
}

onMounted(() => {
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchend', handleTouchEnd)
})
</script>

<template>
  <div class="swipe-gesture">
    <slot />
  </div>
</template>

<style scoped>
.swipe-gesture {
  width: 100%;
  height: 100%;
  touch-action: pan-x pan-y;
}
</style> 