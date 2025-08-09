<script setup lang="ts">

import {ShortcutKey} from "@/types.ts";
import {$ref} from "vue/macros";
import FeedbackModal from "@/components/toolbar/FeedbackModal.vue";
import BaseIcon from "@/components/BaseIcon.vue";
import Tooltip from "@/components/Tooltip.vue";
import IconWrapper from "@/components/IconWrapper.vue";
import {Icon} from "@iconify/vue";
import useTheme from "@/hooks/theme.ts";
import {useSettingStore} from "@/stores/setting.ts";

let showFeedbackModal = $ref(false)
const {toggleTheme} = useTheme()
const settingStore = useSettingStore()

</script>

<template>
  <div class="right-bar">
    <Tooltip
        :title="`切换主题(快捷键：${settingStore.shortcutKeyMap[ShortcutKey.ToggleTheme]})`"
    >
      <IconWrapper>
        <Icon icon="ep:moon" v-if="settingStore.theme === 'dark'"
              @click="toggleTheme"/>
        <Icon icon="tabler:sun" v-else @click="toggleTheme"/>
      </IconWrapper>
    </Tooltip>

    <a href="https://github.com/c-hri-sw-u/EatWords" target="_blank">
      <BaseIcon
          title="Github地址"
          icon="mdi:github"/>
    </a>

    <a href="https://github.com/zyronon/TypeWords" target="_blank">
      <BaseIcon
          title="原项目地址"
          icon="mdi:github"
          class="original-github"/>
    </a>
  </div>
</template>

<style scoped lang="scss">

.right-bar {
  position: fixed;
  right: var(--space);
  top: var(--space);
  z-index: 1;
  display: flex;
  gap: 10rem;
}

.original-github {
  opacity: 0.6;
  filter: grayscale(1);
  
  &:hover {
    opacity: 0.8;
    filter: grayscale(0.5);
  }
  
  :deep(.icon-wrapper) {
    color: #666 !important;
    
    &:hover {
      color: #888 !important;
    }
  }
  
  :deep(svg) {
    color: #666 !important;
  }
}

</style>