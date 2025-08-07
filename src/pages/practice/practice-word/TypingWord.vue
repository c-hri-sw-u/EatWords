<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from "vue"
import { $computed, $ref } from "vue/macros"
import { useBaseStore } from "@/stores/base.ts"
import { DefaultDisplayStatistics, DictType, ShortcutKey, Sort, Word } from "../../../types.ts";
import { emitter, EventKey } from "@/utils/eventBus.ts"
import { cloneDeep, reverse, shuffle } from "lodash-es"
import { usePracticeStore } from "@/stores/practice.ts"
import { useSettingStore } from "@/stores/setting.ts";
import { useOnKeyboardEventListener, useWindowClick } from "@/hooks/event.ts";
import { Icon } from "@iconify/vue";
import Tooltip from "@/components/Tooltip.vue";
import Options from "@/pages/practice/Options.vue";
import Typing from "@/pages/practice/practice-word/Typing.vue";
import TypingSentence from "@/pages/practice/practice-word/TypingSentence.vue";
import SentenceCreation from "@/pages/practice/practice-word/SentenceCreation.vue";
import SentenceEvaluationComponent from "@/pages/practice/practice-word/SentenceEvaluation.vue";
import Panel from "@/pages/practice/Panel.vue";
import IconWrapper from "@/components/IconWrapper.vue";
import { useRuntimeStore } from "@/stores/runtime.ts";
import { syncMyDictList, useWordOptions } from "@/hooks/dict.ts";
import BaseIcon from "@/components/BaseIcon.vue";
import WordList from "@/components/list/WordList.vue";
import Empty from "@/components/Empty.vue";
import MiniDialog from "@/components/dialog/MiniDialog.vue";
import BaseButton from "@/components/BaseButton.vue";
import { generateSentence, getStoredApiKey, evaluateUserSentence, getStoredHfToken } from "@/utils/sentenceGenerator";
import type { SentenceEvaluation } from "@/utils/sentenceGenerator";

interface IProps {
  words: Word[],
  index: number,
}

const props = withDefaults(defineProps<IProps>(), {
  words: () => [],
  index: -1
})

const emit = defineEmits<{
  'update:words': [val: Word[]],
  sort: [val: Word[]]
}>()

const typingRef: any = $ref()
const sentenceTypingRef: any = $ref()
const store = useBaseStore()
const runtimeStore = useRuntimeStore()
const practiceStore = usePracticeStore()
const settingStore = useSettingStore()

const {
  isWordCollect,
  toggleWordCollect,
  isWordSimple,
  toggleWordSimple
} = useWordOptions()

let data = $ref({
  index: props.index,
  words: props.words,
  wrongWords: [],
})

let stat = cloneDeep(DefaultDisplayStatistics)
let showSortOption = $ref(false)

// 例句相关状态
let showSentence = $ref(false)
let currentSentence = $ref('')
let loadingSentence = $ref(false)
let sentenceError = $ref('')
let wordCompleted = $ref(false) // 标记单词是否已完成

// 造句相关状态
let showCreation = $ref(false)
let showEvaluation = $ref(false)
let evaluationLoading = $ref(false)
let currentEvaluation = $ref<SentenceEvaluation>({ score: 0, feedback: '' })
let userCreatedSentence = $ref('')
useWindowClick(() => showSortOption = false)

watch(() => props.words, () => {
  data.words = props.words
  data.index = props.index
  data.wrongWords = []

  practiceStore.wrongWords = []
  practiceStore.repeatNumber = 0
  practiceStore.startDate = Date.now()
  practiceStore.correctRate = -1
  practiceStore.inputWordNumber = 0
  practiceStore.wrongWordNumber = 0
  stat = cloneDeep(DefaultDisplayStatistics)

  // 重置例句相关状态
  showSentence = false
  currentSentence = ''
  loadingSentence = false
  sentenceError = ''
  wordCompleted = false
  
  // 重置造句相关状态
  showCreation = false
  showEvaluation = false
  evaluationLoading = false
  currentEvaluation = { score: 0, feedback: '' }
  userCreatedSentence = ''

}, {immediate: true})

watch(data, () => {
  practiceStore.total = data.words.length
  practiceStore.index = data.index
})

const word = $computed(() => {
  return data.words[data.index] ?? {
    trans: [],
    name: '',
    usphone: '',
    ukphone: '',
    sentence: ''
  }
})

// 监听单词变化，提前加载例句
watch(() => [data.words, data.index] as const, async ([newWords, newIndex]) => {
  if (Array.isArray(newWords) && newWords.length > 0 && typeof newIndex === 'number' && newIndex >= 0 && settingStore.enableSentencePractice) {
    const currentWord = newWords[newIndex]
    if (currentWord && currentWord.name) {
      // 重置状态
      showSentence = false
      currentSentence = ''
      loadingSentence = false
      sentenceError = ''
      wordCompleted = false
      
      // 提前为新单词生成例句
      await preloadSentence(currentWord)
    }
  }
}, {immediate: true})

const prevWord: Word = $computed(() => {
  return data.words?.[data.index - 1] ?? undefined
})

const nextWord: Word = $computed(() => {
  return data.words?.[data.index + 1] ?? undefined
})

function next(isTyping: boolean = true) {
  // 检查数据有效性
  if (!data.words || data.words.length === 0) {
    return
  }
  
  // 如果单词已完成但例句未完成，不允许跳转
  if (wordCompleted && settingStore.enableSentencePractice && !showSentence) {
    return
  }

  if (data.index === data.words.length - 1) {
    //复制当前错词，因为第一遍错词是最多的，后续的练习都是从错词中练习
    if (stat.total === -1) {
      let now = Date.now()
      stat = {
        startDate: practiceStore.startDate,
        endDate: now,
        spend: now - practiceStore.startDate,
        total: props.words.length,
        correctRate: -1,
        inputWordNumber: practiceStore.inputWordNumber,
        wrongWordNumber: data.wrongWords.length,
        wrongWords: data.wrongWords,
      }
      stat.correctRate = 100 - Math.trunc(((stat.wrongWordNumber) / (stat.total)) * 100)
    }

    if (data.wrongWords.length) {
      console.log('当前背完了，但还有错词')
      data.words = cloneDeep(data.wrongWords)

      practiceStore.total = data.words.length
      practiceStore.index = data.index = 0
      practiceStore.inputWordNumber = 0
      practiceStore.wrongWordNumber = 0
      practiceStore.repeatNumber++
      data.wrongWords = []
    } else {
      console.log('这章节完了')
      isTyping && practiceStore.inputWordNumber++

      let now = Date.now()
      stat.endDate = now
      stat.spend = now - stat.startDate

      emitter.emit(EventKey.openStatModal, stat)
    }
  } else {
    data.index++
    isTyping && practiceStore.inputWordNumber++
    console.log('这个词完了')
    
    // 检查当前词是否在跳过列表中
    if (store.skipWordNames.includes(word.name.toLowerCase())) {
      // 如果当前词在跳过列表中，递归调用next跳过它
      next()
    } else {
      // 检查下一个词是否在跳过列表中
      if (data.index < data.words.length && store.skipWordNames.includes(data.words[data.index].name.toLowerCase())) {
        // 如果下一个词在跳过列表中，递归调用next跳过它
        next()
      }
    }
  }
}

// 预加载例句
async function preloadSentence(targetWord: any) {
  if (!targetWord || !targetWord.name || !targetWord.name.trim()) return
  
  try {
    loadingSentence = true
    sentenceError = ''
    
    // 检查是否配置了相应的API Key或Token
    if (settingStore.aiModel === 'qwen') {
      const hfToken = getStoredHfToken() || import.meta.env.VITE_HF_TOKEN
      if (!hfToken) {
        sentenceError = '请先在设置中配置 HuggingFace Token'
        loadingSentence = false
        return
      }
    } else {
      const apiKey = getStoredApiKey() || import.meta.env.VITE_DEEPSEEK_API_KEY
      if (!apiKey) {
        sentenceError = '请先在设置中配置 DeepSeek API Key'
        loadingSentence = false
        return
      }
    }
    
    // 如果已经有例句，直接使用
    if (targetWord.sentence && targetWord.sentence.trim()) {
      currentSentence = targetWord.sentence
      loadingSentence = false
      return
    }
    
    // 生成例句
                const sentence = await generateSentence(targetWord, settingStore.aiModel)
    
    // 保存例句到单词对象中
    targetWord.sentence = sentence
    currentSentence = sentence
    loadingSentence = false
  } catch (error) {
    console.error('Failed to generate sentence:', error)
    sentenceError = '例句生成失败，请检查网络连接或API配置'
    loadingSentence = false
  }
}

// 单词完成处理
function onWordComplete() {
  wordCompleted = true
  if (settingStore.enableSentencePractice && currentSentence) {
    showSentence = true
  } else if (!settingStore.enableSentencePractice) {
    // 如果没有启用例句练习，直接进入下一个单词
    proceedToNextWord()
  } else {
    // 如果启用了例句练习但没有例句，也进入下一个单词
    proceedToNextWord()
  }
}

// 例句练习完成
function onSentenceComplete() {
  showSentence = false
  
  // 如果启用例句练习，进入造句阶段
  if (settingStore.enableSentencePractice) {
    showCreation = true
  } else {
    // 直接进入下一个单词
    proceedToNextWord()
  }
}

// 造句提交
async function onCreationComplete(userSentence: string) {
  userCreatedSentence = userSentence
  showCreation = false
  evaluationLoading = true
  showEvaluation = true
  
  try {
    const evaluation = await evaluateUserSentence(word.name, userSentence, settingStore.aiModel)
    currentEvaluation = evaluation
  } catch (error) {
    console.error('Failed to evaluate sentence:', error)
    currentEvaluation = {
      score: 5,
      feedback: '评分服务暂时不可用，请继续练习。'
    }
  } finally {
    evaluationLoading = false
  }
}

// 跳过造句
function onCreationSkip() {
  showCreation = false
  proceedToNextWord()
}

// 重新造句
function onEvaluationRetry() {
  showEvaluation = false
  showCreation = true
  userCreatedSentence = ''
  currentEvaluation = { score: 0, feedback: '' }
}

// 评价完成，继续练习
function onEvaluationContinue() {
  showEvaluation = false
  proceedToNextWord()
}

// 当评价显示时，自动滚动到可见区域
watch(() => showEvaluation, (newVal) => {
  if (newVal) {
    // 延迟一下确保DOM已更新
    nextTick(() => {
      const evaluationElement = document.querySelector('.evaluation-section')
      if (evaluationElement) {
        evaluationElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    })
  }
})

// 进入下一个单词的统一处理
function proceedToNextWord() {
  currentSentence = ''
  sentenceError = ''
  
  // 检查数据有效性
  if (!data.words || data.words.length === 0) {
    return
  }
  
  console.log('例句完成，进入下一个词')
  
  // 例句完成后，真正进入下一个单词
  if (data.index === data.words.length - 1) {
    // 如果是最后一个单词，处理章节完成逻辑
    if (stat.total === -1) {
      let now = Date.now()
      stat = {
        startDate: practiceStore.startDate,
        endDate: now,
        spend: now - practiceStore.startDate,
        total: props.words.length,
        correctRate: -1,
        inputWordNumber: practiceStore.inputWordNumber,
        wrongWordNumber: data.wrongWords.length,
        wrongWords: data.wrongWords,
      }
      stat.correctRate = 100 - Math.trunc(((stat.wrongWordNumber) / (stat.total)) * 100)
    }

    if (data.wrongWords.length) {
      console.log('当前背完了，但还有错词')
      data.words = cloneDeep(data.wrongWords)

      practiceStore.total = data.words.length
      practiceStore.index = data.index = 0
      practiceStore.inputWordNumber = 0
      practiceStore.wrongWordNumber = 0
      practiceStore.repeatNumber++
      data.wrongWords = []
    } else {
      console.log('这章节完了')
      practiceStore.inputWordNumber++

      let now = Date.now()
      stat.endDate = now
      stat.spend = now - stat.startDate

      emitter.emit(EventKey.openStatModal, stat)
    }
  } else {
    // 正常进入下一个单词
    data.index++
    practiceStore.inputWordNumber++
    console.log('例句完成，进入下一个词')
    if (store.skipWordNames.includes(data.words[data.index].name.toLowerCase())) {
      next(false) // 递归跳过，不计入打字数
    }
  }
}

function wordWrong() {
  if (!store.wrong.originWords.find((v: Word) => v.name.toLowerCase() === word.name.toLowerCase())) {
    store.wrong.originWords.push(word)
  }
  if (!data.wrongWords.find((v: Word) => v.name.toLowerCase() === word.name.toLowerCase())) {
    data.wrongWords.push(word)
    practiceStore.wrongWordNumber++
  }
}

function onKeyUp(e: KeyboardEvent) {
  // 如果正在造句或评价阶段，不处理键盘事件
  if (showCreation || showEvaluation) {
    return
  }
  
  // 如果目标是输入框，不处理键盘事件
  if (isInputElement(e.target as Element)) {
    return
  }
  
  if (showSentence) {
    sentenceTypingRef?.hideSentence()
  } else {
    typingRef?.hideWord()
  }
}

async function onKeyDown(e: KeyboardEvent) {
  // console.log('e', e)
  
  // 如果正在造句或评价阶段，不处理键盘事件
  if (showCreation || showEvaluation) {
    console.log('跳过键盘事件 - 造句/评价阶段')
    return
  }
  
  // 如果目标是输入框，不处理键盘事件
  if (isInputElement(e.target as Element)) {
    console.log('跳过键盘事件 - 输入框元素', e.target)
    return
  }
  
  switch (e.key) {
    case 'Backspace':
      if (showSentence) {
        sentenceTypingRef?.del()
      } else {
        typingRef?.del()
      }
      break
  }
}

// 检查元素是否是输入框
function isInputElement(element: Element | null): boolean {
  if (!element) return false
  
  // 检查元素本身
  const tagName = element.tagName.toLowerCase()
  const isInput = tagName === 'input' || tagName === 'textarea'
  const isContentEditable = element.getAttribute('contenteditable') === 'true'
  
  // 检查是否在 Element Plus 输入框内部
  const isInElInput = element.closest('.el-input') || element.closest('.el-textarea')
  
  // 检查是否有输入相关的类名
  const hasInputClass = element.classList.contains('el-input__inner') || 
                       element.classList.contains('el-textarea__inner')
  
  return isInput || isContentEditable || !!isInElInput || hasInputClass
}

useOnKeyboardEventListener(onKeyDown, onKeyUp)

//TODO 略过忽略的单词上
function prev() {
  if (data.index === 0) {
    ElMessage.warning('已经是第一个了~')
  } else {
    data.index--
  }
}

function skip(e: KeyboardEvent) {
  next(false)
  // e.preventDefault()
}

function show(e: KeyboardEvent) {
  if (showSentence) {
    sentenceTypingRef?.showSentence()
  } else {
    typingRef?.showWord()
  }
}

function collect(e: KeyboardEvent) {
  toggleWordCollect(word)
}

function toggleWordSimpleWrapper() {
  if (!isWordSimple(word)) {
    toggleWordSimple(word)
    //延迟一下，不知道为什么不延迟会导致当前条目不自动定位到列表中间
    setTimeout(() => next(false))
  } else {
    toggleWordSimple(word)
  }
}

function play() {
  typingRef.play()
}

function sort(type: Sort) {
  if (type === Sort.reverse) {
    ElMessage.success('已翻转排序')
    emit('sort', reverse(cloneDeep(data.words)))
  }
  if (type === Sort.random) {
    ElMessage.success('已随机排序')
    emit('sort', shuffle(data.words))
  }
}

onMounted(() => {
  emitter.on(ShortcutKey.ShowWord, show)
  emitter.on(ShortcutKey.Previous, prev)
  emitter.on(ShortcutKey.Next, skip)
  emitter.on(ShortcutKey.ToggleCollect, collect)
  emitter.on(ShortcutKey.ToggleSimple, toggleWordSimpleWrapper)
  emitter.on(ShortcutKey.PlayWordPronunciation, play)
})

onUnmounted(() => {
  emitter.off(ShortcutKey.ShowWord, show)
  emitter.off(ShortcutKey.Previous, prev)
  emitter.off(ShortcutKey.Next, skip)
  emitter.off(ShortcutKey.ToggleCollect, collect)
  emitter.off(ShortcutKey.ToggleSimple, toggleWordSimpleWrapper)
  emitter.off(ShortcutKey.PlayWordPronunciation, play)
})

</script>

<template>
  <div class="practice-word">
    <div class="near-word" v-if="settingStore.showNearWord">
      <div class="prev"
           @click="prev"
           v-if="prevWord">
        <Icon class="arrow" icon="bi:arrow-left" width="22"/>
        <Tooltip
            :title="`上一个(快捷键：${settingStore.shortcutKeyMap[ShortcutKey.Previous]})`"
        >
          <div class="word">{{ prevWord.name }}</div>
        </Tooltip>
      </div>
      <div class="next"
           @click="next(false)"
           v-if="nextWord">
        <Tooltip
            :title="`下一个(快捷键：${settingStore.shortcutKeyMap[ShortcutKey.Next]})`"
        >
          <div class="word" :class="settingStore.dictation && 'text-shadow'">{{ nextWord.name }}</div>
        </Tooltip>
        <Icon class="arrow" icon="bi:arrow-right" width="22"/>
      </div>
    </div>
    <!-- 练习区域 -->
    <div class="practice-area">
      <!-- 单词练习 -->
      <div class="word-section" :class="{ 'completed': wordCompleted }">
        <Typing
            v-loading="!store.load"
            ref="typingRef"
            :word="word"
            :disabled="wordCompleted"
            @wrong="wordWrong"
            @next="onWordComplete"
        />
      </div>
      
      <!-- 例句练习区域 -->
      <div v-if="settingStore.enableSentencePractice" class="sentence-section" :class="{ 'active': showSentence, 'loading': loadingSentence }">
        <div v-if="loadingSentence" class="sentence-loading">
          <el-loading size="small" />
          <div>正在生成例句...</div>
        </div>
        
        <div v-else-if="sentenceError" class="sentence-error">
          <Icon icon="carbon:warning" width="20" />
          <div>{{ sentenceError }}</div>
        </div>
        
        <div v-else-if="currentSentence" class="sentence-practice-wrapper">
          <div class="sentence-label">例句练习</div>
          <TypingSentence
            v-if="showSentence"
            ref="sentenceTypingRef"
            :sentence="currentSentence"
            :word="word.name"
            @complete="onSentenceComplete"
            @wrong="wordWrong"
          />
          <div v-else class="sentence-waiting">
            <div class="sentence-preview">{{ currentSentence }}</div>
            <div class="sentence-hint">完成单词后开始例句练习</div>
          </div>
        </div>
      </div>
      
      <!-- 造句练习区域 -->
      <div v-if="showCreation" class="creation-section">
        <div class="section-label">造句练习</div>
        <SentenceCreation
          :word="word.name"
          @complete="onCreationComplete"
          @skip="onCreationSkip"
        />
      </div>
      
      <!-- 评价结果区域 -->
      <div v-if="showEvaluation" class="evaluation-section">
        <div class="section-label">AI评分结果</div>
        <SentenceEvaluationComponent
          :word="word.name"
          :user-sentence="userCreatedSentence"
          :score="currentEvaluation.score"
          :feedback="currentEvaluation.feedback"
          :loading="evaluationLoading"
          @continue="onEvaluationContinue"
          @retry="onEvaluationRetry"
        />
      </div>
    </div>
    <!-- 操作按钮 - 放在练习区域后面，自然流式布局 -->
    <div class="options-wrapper">
      <Options
          :is-simple="isWordSimple(word)"
          @toggle-simple="toggleWordSimpleWrapper"
          :is-collect="isWordCollect(word)"
          @toggle-collect="toggleWordCollect(word)"
          @skip="next(false)"
      />
    </div>

    <Teleport to="body">
      <div class="word-panel-wrapper">
        <Panel>
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
                            @click="emitter.emit(EventKey.next)"
                            :title="`下一章(快捷键：${settingStore.shortcutKeyMap[ShortcutKey.NextChapter]})`"
                            v-if="store.currentDict.chapterIndex < store.currentDict.chapterWords.length - 1"/>
                </div>
                <div class="right">
                  {{ data.words.length }}个单词
                </div>
              </div>
              <WordList
                  v-if="data.words.length"
                  :is-active="active"
                  :static="false"
                  :show-word="!settingStore.dictation"
                  :show-translate="settingStore.translate"
                  :list="data.words"
                  :activeIndex="data.index"
                  @click="(val:any) => data.index = val.index"
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
        </Panel>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@import "@/assets/css/variable";

.practice-word {
  height: 100%;
  flex: 1;
  display: flex;
  //display: none;
  align-items: center;
  justify-content: flex-start; // 改为顶部对齐，让内容从上往下自然流动
  flex-direction: column;
  font-size: 14rem;
  color: gray;
  gap: 6rem;
  position: relative;
  width: var(--toolbar-width);
  padding-top: 80rem; // 增加顶部padding，确保内容不会太靠上

  .near-word {
    position: absolute;
    top: 0;
    width: 100%;

    & > div {
      width: 45%;
      align-items: center;

      .arrow {
        min-width: 22rem;
        min-height: 22rem;
      }
    }

    .word {
      font-size: 24rem;
      margin-bottom: 4rem;
      font-family: var(--word-font-family);
    }

    .prev {
      cursor: pointer;
      display: flex;
      float: left;
      gap: 10rem;
    }

    .next {
      cursor: pointer;
      display: flex;
      justify-content: flex-end;
      gap: 10rem;
      float: right;
    }
  }

  .options-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 30rem; // 与练习区域的间距，根据内容自动调整
    margin-bottom: 20rem;
    transition: margin-top 0.3s ease; // 平滑过渡
  }
}

.word-panel-wrapper {
  position: fixed;
  left: 0;
  top: 10rem;
  z-index: 1;
  margin-left: var(--panel-margin-left);
  height: calc(100% - 20rem);
}

.practice-word {
  .practice-area {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 30rem;
    min-height: 350rem; // 减少最小高度，让内容更紧凑
  }

  .word-section {
    transition: all 0.3s ease;
    
    &.completed {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }

  .sentence-section {
    min-height: 120rem; // 减少最小高度
    transition: all 0.3s ease;
    opacity: 0.5;
    
    &.loading {
      opacity: 0.8;
    }
    
    &.active {
      opacity: 1;
      transform: scale(1.02);
    }
    
    .sentence-label {
      font-size: 16rem;
      color: var(--color-font-2);
      text-align: center;
      margin-bottom: 15rem;
      font-weight: 500;
    }
    
    .sentence-practice-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15rem;
    }
    
    .sentence-waiting {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10rem;
      
      .sentence-preview {
        font-size: 18rem;
        color: var(--color-font-3);
        text-align: center;
        font-style: italic;
        opacity: 0.6;
      }
      
      .sentence-hint {
        font-size: 12rem;
        color: var(--color-font-3);
        text-align: center;
      }
    }
    
    .sentence-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15rem;
      color: var(--color-font-2);
      
      div {
        font-size: 14rem;
      }
    }
    
    .sentence-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10rem;
      color: var(--color-wrong);
      
      div {
        font-size: 14rem;
        text-align: center;
      }
    }
  }

  .creation-section, .evaluation-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15rem;
    width: 100%;
    max-width: 800rem; // 限制最大宽度
    
    .section-label {
      font-size: 16rem;
      font-weight: 600;
      color: var(--color-font-1);
      text-align: center;
      padding: 8rem 16rem;
      background: rgba(var(--color-primary-rgb), 0.1);
      border-radius: 20rem;
      border: 1px solid rgba(var(--color-primary-rgb), 0.2);
    }
  }
}

</style>