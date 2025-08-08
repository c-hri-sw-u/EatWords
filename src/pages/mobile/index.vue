<script setup lang="ts">

import {useBaseStore} from "@/stores/base.ts";
import {useRuntimeStore} from "@/stores/runtime.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {$computed, $ref} from "vue/macros";
import {ShortcutKey, Sort, Word} from "@/types.ts";
import {cloneDeep} from "lodash-es";
import {emitter, EventKey} from "@/utils/eventBus.ts";
import {syncMyDictList, useWordOptions} from "@/hooks/dict.ts";
import {onMounted, onUnmounted, watch} from "vue";
import BaseButton from "@/components/BaseButton.vue";
import Options from "@/pages/practice/Options.vue";
import BaseIcon from "@/components/BaseIcon.vue";
import MobilePanel from "@/pages/mobile/components/MobilePanel.vue";
import MiniDialog from "@/components/dialog/MiniDialog.vue";
import WordList from "@/components/list/WordList.vue";
import Empty from "@/components/Empty.vue";
import SettingDialog from "@/components/dialog/SettingDialog.vue";
import SwipeGesture from "@/components/SwipeGesture.vue";

const store = useBaseStore()
const runtimeStore = useRuntimeStore()
const settingStore = useSettingStore()

let wordData = $ref({
  words: [],
  index: -1,
  wrongWords: [],
})

const word: Word = $computed(() => {
  return wordData.words[wordData.index] ?? {
    trans: [],
    name: '',
    usphone: '',
    ukphone: '',
  }
})

function getCurrentPractice() {
  if (store.chapter.length) {
    wordData.words = store.chapter
    wordData.index = 0

    store.chapter.map((w: Word) => {
      if (!w.trans.length) {
        let res = runtimeStore.translateWordList.find(a => a.name === w.name)
        if (res) w = Object.assign(w, res)
      }
    })

    wordData.words = cloneDeep(store.chapter)
    emitter.emit(EventKey.resetWord)
  }
}

function sort(list: Word[]) {
  store.currentDict.chapterWords[store.currentDict.chapterIndex] = wordData.words = list
  wordData.index = 0
  syncMyDictList(store.currentDict)
}

function next() {
  if (store.currentDict.chapterIndex >= store.currentDict.chapterWords.length - 1) {
    store.currentDict.chapterIndex = 0
  } else store.currentDict.chapterIndex++

  getCurrentPractice()
}

function prev() {
  if (store.currentDict.chapterIndex === 0) {
    store.currentDict.chapterIndex = store.currentDict.chapterWords.length - 1
  } else {
    store.currentDict.chapterIndex--
  }
  getCurrentPractice()
}

function markAsKnown() {
  wordData.index++
  if (wordData.index >= wordData.words.length) {
    // 完成当前章节，进入下一章节
    next()
  }
}

function markAsUnknown() {
  // 将当前单词添加到错词本
  if (!store.wrong.originWords.find(w => w.name === word.name)) {
    store.wrong.originWords.push(word)
  }
  wordData.index++
  if (wordData.index >= wordData.words.length) {
    next()
  }
}

function playSound() {
  if (word.usphone || word.ukphone) {
    const utterance = new SpeechSynthesisUtterance(word.name)
    utterance.lang = settingStore.wordSoundType === 'us' ? 'en-US' : 'en-GB'
    speechSynthesis.speak(utterance)
  }
}

watch(() => store.load, n => {
  getCurrentPractice()
})

onMounted(() => {
  getCurrentPractice()
})

onUnmounted(() => {
})
const {
  isWordCollect,
  toggleWordCollect,
  isWordSimple,
  toggleWordSimple,
  toggleWordSimpleWrapper
} = useWordOptions()

let showSortOption = $ref(false)
let showPanel = $ref(false)
let showWord = $ref(false)
let showSettings = $ref(false)
let showHelp = $ref(false)

function openSettings() {
  showSettings = true
}

function handleSwipeLeft() {
  // 左滑显示面板
  showPanel = true
}

function handleSwipeRight() {
  // 右滑隐藏面板
  showPanel = false
}

function handleSwipeUp() {
  // 上滑标记为认识
  markAsKnown()
}

function handleSwipeDown() {
  // 下滑标记为不认识
  markAsUnknown()
}

function toggleHelp() {
  showHelp = !showHelp
}
</script>

<template>
  <div id="mobile">
    <SwipeGesture
        :on-swipe-left="handleSwipeLeft"
        :on-swipe-right="handleSwipeRight"
        :on-swipe-up="handleSwipeUp"
        :on-swipe-down="handleSwipeDown"
    >
      <div class="slide">
        <div class="slide-list" :class="{showPanel}">
          <div class="practice" @click.stop="showPanel = false">
            <div class="tool-bar">
              <BaseIcon
                  v-if="!isWordCollect(word)"
                  class="collect"
                  @click="toggleWordCollect(word)"
                  icon="ph:star"/>
              <BaseIcon
                  v-else
                  class="fill"
                  @click="toggleWordCollect(word)"
                  icon="ph:star-fill"/>

              <BaseIcon
                  v-if="word.usphone || word.ukphone"
                  @click="playSound"
                  icon="ph:speaker-high"/>

              <BaseIcon
                  @click="toggleHelp"
                  icon="ph:question"/>

              <BaseIcon
                  @click="openSettings"
                  icon="ph:gear"/>

              <BaseIcon
                  @click="showPanel = !showPanel"
                  icon="tdesign:menu-unfold"/>
            </div>
            
            <div class="word-content">
              <div class="translate" v-if="showWord">
                <div class="translate-item" v-for="(v,i) in word.trans">
                  <span>{{ v }}</span>
                </div>
              </div>
              <div class="word" @click="showWord = !showWord">
                {{ word.name }}
              </div>
              <div class="phonetic" v-if="settingStore.wordSoundType === 'us' && word.usphone">[{{ word.usphone }}]</div>
              <div class="phonetic" v-if="settingStore.wordSoundType === 'uk' && word.ukphone">[{{ word.ukphone }}]</div>
              
              <div class="progress-info">
                <div class="progress-text">{{ wordData.index + 1 }} / {{ wordData.words.length }}</div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{width: `${((wordData.index + 1) / wordData.words.length) * 100}%`}"></div>
                </div>
              </div>
              
              <!-- 操作提示 -->
              <div class="help-tips" v-if="showHelp">
                <div class="tip-item">
                  <BaseIcon icon="ph:arrow-left" />
                  <span>左滑显示面板</span>
                </div>
                <div class="tip-item">
                  <BaseIcon icon="ph:arrow-right" />
                  <span>右滑隐藏面板</span>
                </div>
                <div class="tip-item">
                  <BaseIcon icon="ph:arrow-up" />
                  <span>上滑标记认识</span>
                </div>
                <div class="tip-item">
                  <BaseIcon icon="ph:arrow-down" />
                  <span>下滑标记不认识</span>
                </div>
                <div class="tip-item">
                  <BaseIcon icon="ph:hand-pointing" />
                  <span>点击单词显示翻译</span>
                </div>
              </div>
            </div>
            
            <div class="options">
              <div class="wrapper">
                <BaseButton @click="markAsUnknown" class="unknown-btn">不认识</BaseButton>
                <BaseButton @click="markAsKnown" class="known-btn">认识</BaseButton>
              </div>
              <div class="nav-buttons">
                <BaseButton @click="prev" size="small" class="nav-btn">
                  <BaseIcon icon="ph:arrow-left"/>
                </BaseButton>
                <BaseButton @click="next" size="small" class="nav-btn">
                  <BaseIcon icon="ph:arrow-right"/>
                </BaseButton>
              </div>
            </div>
          </div>
          <div class="list">
            <MobilePanel>
              <template v-slot="{active}">
                <div class="panel-page-item"
                     v-loading="!store.load"
                >
                  <div class="list-header">
                    <div class="left">
                      <div class="title">
                        {{ store.chapterName }}
                      </div>
                      <BaseIcon title="切换词典"
                                @click="emitter.emit(EventKey.openDictModal,'list')"
                                icon="carbon:change-catalog"/>
                      <div style="position:relative;"
                           @click.stop="null">
                        <BaseIcon
                            title="改变顺序"
                            icon="icon-park-outline:sort-two"
                            @click="showSortOption = !showSortOption"
                        />
                        <MiniDialog
                            v-model="showSortOption"
                            style="width: 130rem;"
                        >
                          <div class="mini-row-title">
                            列表循环设置
                          </div>
                          <div class="mini-row">
                            <BaseButton size="small" @click="sort(Sort.reverse)">翻转</BaseButton>
                            <BaseButton size="small" @click="sort(Sort.random)">随机</BaseButton>
                          </div>
                        </MiniDialog>
                      </div>
                      <BaseIcon icon="bi:arrow-right"
                                @click="next"
                                v-if="store.currentDict.chapterIndex < store.currentDict.chapterWords.length - 1"/>
                    </div>
                    <div class="right">
                      {{ wordData.words.length }}个单词
                    </div>
                  </div>
                  <WordList
                      v-if="wordData.words.length"
                      :is-active="active"
                      :static="true"
                      :show-word="!settingStore.dictation"
                      :show-translate="settingStore.translate"
                      :list="wordData.words"
                      :activeIndex="wordData.index"
                      @click="(val:any) => wordData.index = val.index"
                  >
                    <template v-slot:suffix="{item,index}">
                      <BaseIcon
                          v-if="!isWordCollect(item)"
                          class="collect"
                          @click="toggleWordCollect(item)"
                          title="收藏" icon="ph:star"/>
                      <BaseIcon
                          v-else
                          class="fill"
                          @click="toggleWordCollect(item)"
                          title="取消收藏" icon="ph:star-fill"/>
                      <BaseIcon
                          v-if="!isWordSimple(item)"
                          class="easy"
                          @click="toggleWordSimple(item)"
                          title="标记为简单词"
                          icon="material-symbols:check-circle-outline-rounded"/>
                      <BaseIcon
                          v-else
                          class="fill"
                          @click="toggleWordSimple(item)"
                          title="取消标记简单词"
                          icon="material-symbols:check-circle-rounded"/>
                    </template>
                  </WordList>
                  <Empty v-else/>
                </div>
              </template>
            </MobilePanel>
          </div>
        </div>
      </div>
    </SwipeGesture>
    
    <!-- 设置对话框 -->
    <SettingDialog v-model="showSettings" />
  </div>
</template>

<style scoped lang="scss">
#mobile {
  position: relative;
  z-index: 1;
  font-size: 14rem;
  color: black;
  width: 100%;
  height: 100%;

  $list-width: 75vw;

  .slide {
    width: 100%;
    height: 100%;
    overflow: hidden;

    .slide-list {
      width: calc(100% + $list-width);
      height: 100%;
      display: flex;
      transition: all .5s;
    }
    .showPanel{
      transform: translateX(-$list-width);
    }
  }

  .practice {
    width: 100vw;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10rem;

    .tool-bar {
      height: 50rem;
      display: flex;
      padding: 0 10rem;
      align-items: center;
      justify-content: flex-end;
      gap: 10rem;
    }

    .word-content {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0 20rem;

      .translate {
        width: 100%;
        font-size: 18rem;
        text-align: center;
        margin-bottom: 20rem;

        .translate-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10rem;
          margin-bottom: 5rem;
        }
      }

      .word {
        font-size: 32rem;
        font-weight: bold;
        margin-bottom: 10rem;
        cursor: pointer;
        user-select: none;
        transition: all 0.3s;
        
        &:active {
          transform: scale(0.95);
        }
      }

      .phonetic {
        font-size: 18rem;
        color: var(--color-gray);
        margin-bottom: 30rem;
      }
      
      .progress-info {
        width: 100%;
        margin-top: 20rem;
        
        .progress-text {
          text-align: center;
          font-size: 14rem;
          color: var(--color-gray);
          margin-bottom: 10rem;
        }
        
        .progress-bar {
          width: 100%;
          height: 4rem;
          background: var(--color-item-border);
          border-radius: 2rem;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background: var(--color-main-active);
            transition: width 0.3s ease;
          }
        }
      }
      
      .help-tips {
        margin-top: 20rem;
        padding: 15rem;
        background: var(--color-item-bg);
        border-radius: var(--radius);
        border: 1px solid var(--color-item-border);
        
        .tip-item {
          display: flex;
          align-items: center;
          gap: 10rem;
          margin-bottom: 8rem;
          font-size: 12rem;
          color: var(--color-font-1);
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .options {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-bottom: 20rem;
      gap: 15rem;

      .wrapper {
        width: 90%;
        display: flex;
        gap: 15rem;
        
        .base-button {
          flex: 1;
          height: 50rem;
          font-size: 16rem;
          border-radius: 25rem;
          
          &.unknown-btn {
            background: #ff6b6b;
            color: white;
            
            &:hover {
              background: #ff5252;
            }
          }
          
          &.known-btn {
            background: #51cf66;
            color: white;
            
            &:hover {
              background: #40c057;
            }
          }
        }
      }
      
      .nav-buttons {
        display: flex;
        gap: 10rem;
        
        .nav-btn {
          width: 40rem;
          height: 40rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }
  }

  .list {
    width: $list-width;
  }
}
</style>