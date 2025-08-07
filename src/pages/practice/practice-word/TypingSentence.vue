<script setup lang="ts">
import { $computed, $ref } from "vue/macros";
import { useSettingStore } from "@/stores/setting.ts";
import { usePlayBeep, usePlayCorrect, usePlayKeyboardAudio, usePlayWordAudio } from "@/hooks/sound.ts";
import { emitter, EventKey } from "@/utils/eventBus.ts";
import { onUnmounted, watch, onMounted } from "vue";
import { Icon } from '@iconify/vue';
import { safeSpeechPlay } from '@/utils/audioContext';

interface IProps {
  sentence: string,
  word: string, // 当前单词
}

const props = withDefaults(defineProps<IProps>(), {
  sentence: '',
  word: ''
})

const emit = defineEmits<{
  complete: [],
  wrong: []
}>()

let input = $ref('')
let wrongChar = $ref('')
let wrongIndex = $ref(-1)
let showFullSentence = $ref(false)
let waitNext = $ref(false)
let inputLock = false

// 标准化引号字符，让不同形态的引号能够互相匹配
function normalizeQuote(char: string): string {
  const quoteMap: { [key: string]: string } = {
    // 单引号 - 所有变体都映射到标准英文单引号
    "'": "'",  // 英文单引号 (U+0027)
    "'": "'",  // 中文单引号（左）(U+2018)
    "'": "'",  // 中文单引号（右）(U+2019)
    "'": "'",  // 其他单引号变体 (U+201A)
    "'": "'",  // 其他单引号变体 (U+201B)
    "'": "'",  // 其他单引号变体 (U+2032)
    "'": "'",  // 其他单引号变体 (U+2035)
    "'": "'",  // 其他单引号变体 (U+2039)
    "'": "'",  // 其他单引号变体 (U+203A)
    // 双引号 - 所有变体都映射到标准英文双引号
    '"': '"',  // 英文双引号 (U+0022)
    '"': '"',  // 中文双引号（左）(U+201C)
    '"': '"',  // 中文双引号（右）(U+201D)
    '"': '"',  // 其他双引号变体 (U+201E)
    '"': '"',  // 其他双引号变体 (U+201F)
    '"': '"',  // 其他双引号变体 (U+2033)
    '"': '"',  // 其他双引号变体 (U+2036)
    '"': '"',  // 其他双引号变体 (U+2037)
    '"': '"',  // 其他双引号变体 (U+2038)
  }
  
  return quoteMap[char] || char
}

const settingStore = useSettingStore()

const playBeep = usePlayBeep()
const playCorrect = usePlayCorrect()
const playKeyboardAudio = usePlayKeyboardAudio()
const playWordAudio = usePlayWordAudio()

// 将句子拆分成字符数组以便逐字符渲染
let sentenceChars = $computed(() => {
  return props.sentence.split('')
})

// 将句子按单词分组，防止单词被截断
let sentenceWords = $computed(() => {
  const words = props.sentence.split(' ')
  const result = []
  let charIndex = 0
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const wordChars = []
    
    // 添加单词的每个字符
    for (let j = 0; j < word.length; j++) {
      wordChars.push({
        char: word[j],
        index: charIndex++
      })
    }
    
    result.push({
      text: word,
      chars: wordChars,
      isSpace: false
    })
    
    // 如果不是最后一个单词，添加空格
    if (i < words.length - 1) {
      result.push({
        text: ' ',
        chars: [{
          char: ' ',
          index: charIndex++
        }],
        isSpace: true
      })
    }
  }
  
  return result
})

watch(() => props.sentence, () => {
  wrongChar = input = ''
  wrongIndex = -1
  waitNext = inputLock = false
  
  // 播放句子语音 - 稍微延迟避免冲突
  if (props.sentence && settingStore.wordSound) {
    setTimeout(() => {
      // 使用TTS播放整个句子，因为句子可能包含多个单词
      safeSpeechPlay(props.sentence, {
        rate: settingStore.wordSoundSpeed || 1,
        volume: (settingStore.wordSoundVolume || 100) / 100,
        lang: 'en-US'
      })
    }, 500)
  }
})

onMounted(() => {
  emitter.on(EventKey.resetWord, () => {
    wrongChar = input = ''
    wrongIndex = -1
  })

  emitter.on(EventKey.onTyping, onTyping)
  
  // 初始播放句子语音
  if (props.sentence && settingStore.wordSound) {
    setTimeout(() => {
      safeSpeechPlay(props.sentence, {
        rate: settingStore.wordSoundSpeed || 1,
        volume: (settingStore.wordSoundVolume || 100) / 100,
        lang: 'en-US'
      })
    }, 500)
  }
})

onUnmounted(() => {
  emitter.off(EventKey.resetWord)
  emitter.off(EventKey.onTyping, onTyping)
})

async function onTyping(e: KeyboardEvent) {
  if (waitNext) {
    if (e.code === 'Space') {
      emit('complete')
      waitNext = false
    }
    return
  }
  if (inputLock) return
  inputLock = true
  
  let letter = e.key
  let isTypingRight = false
  let isSentenceRight = false
  
  // 获取当前应该输入的字符
  const expectedChar = props.sentence[input.length]
  
  if (settingStore.ignoreCase) {
    // 忽略大小写，同时标准化引号
    const normalizedLetter = normalizeQuote(letter.toLowerCase())
    const normalizedExpected = normalizeQuote(expectedChar.toLowerCase())
    isTypingRight = normalizedLetter === normalizedExpected
    
    // 对于完整句子比较，也需要标准化引号
    const normalizedInput = (input + letter).toLowerCase().split('').map(normalizeQuote).join('')
    const normalizedSentence = props.sentence.toLowerCase().split('').map(normalizeQuote).join('')
    isSentenceRight = normalizedInput === normalizedSentence
  } else {
    // 不忽略大小写，但标准化引号
    const normalizedLetter = normalizeQuote(letter)
    const normalizedExpected = normalizeQuote(expectedChar)
    isTypingRight = normalizedLetter === normalizedExpected
    
    // 对于完整句子比较，也需要标准化引号
    const normalizedInput = (input + letter).split('').map(normalizeQuote).join('')
    const normalizedSentence = props.sentence.split('').map(normalizeQuote).join('')
    isSentenceRight = normalizedInput === normalizedSentence
  }
  
  if (isTypingRight) {
    input += letter
    wrongChar = ''
    wrongIndex = -1
    playKeyboardAudio()
  } else {
    // 调试信息：显示引号标准化过程
    if (letter !== expectedChar && (letter.includes("'") || letter.includes('"') || expectedChar.includes("'") || expectedChar.includes('"'))) {
      console.log(`引号不匹配: 输入="${letter}" (${letter.charCodeAt(0)}) 期望="${expectedChar}" (${expectedChar.charCodeAt(0)})`)
      console.log(`标准化后: 输入="${normalizeQuote(letter)}" 期望="${normalizeQuote(expectedChar)}"`)
    }
    
    emit('wrong')
    wrongChar = letter
    wrongIndex = input.length
    playKeyboardAudio()
    playBeep()
    setTimeout(() => {
      wrongChar = ''
      wrongIndex = -1
    }, 500)
  }

  if (isSentenceRight) {
    playCorrect()
    
    // 例句练习完成后再次朗读句子
    if (props.sentence && settingStore.wordSound) {
      setTimeout(() => {
        safeSpeechPlay(props.sentence, {
          rate: settingStore.wordSoundSpeed || 1,
          volume: (settingStore.wordSoundVolume || 100) / 100,
          lang: 'en-US'
        })
      }, 300) // 稍微延迟，让正确音效先播放
    }
    
    if (settingStore.autoNext) {
      setTimeout(() => emit('complete'), settingStore.waitTimeForChangeWord)
    } else {
      waitNext = true
      inputLock = false
    }
  } else {
    inputLock = false
  }
}

function del() {
  playKeyboardAudio()

  if (wrongChar) {
    wrongChar = ''
    wrongIndex = -1
  } else {
    input = input.slice(0, -1)
  }
}

function showSentence() {
  if (settingStore.allowWordTip) {
    showFullSentence = true
  }
}

function hideSentence() {
  showFullSentence = false
}

defineExpose({
  del,
  showSentence,
  hideSentence
})

</script>

<template>
  <div class="typing-sentence">
    <div class="sentence-wrapper">
      <div class="sentence"
           :class="wrongChar && 'is-wrong'"
           :style="{fontSize: (settingStore.fontSize.wordForeignFontSize * 0.8) + 'rem'}"
      >
        <!-- 按单词分组渲染，防止单词被截断 -->
        <span 
          v-for="(wordGroup, groupIndex) in sentenceWords" 
          :key="groupIndex"
          class="word-group"
          :class="{ 'space-group': wordGroup.isSpace }"
        >
          <span 
            v-for="charInfo in wordGroup.chars" 
            :key="charInfo.index"
            class="char"
            :class="{
              'typed': charInfo.index < input.length,
              'wrong': charInfo.index === wrongIndex && wrongChar,
              'current': charInfo.index === input.length && !wrongChar,
              'waiting': charInfo.index > input.length || (charInfo.index === input.length && wrongChar)
            }"
          >
            <!-- 显示已输入的正确字符 -->
            <span v-if="charInfo.index < input.length" :class="['correct', input[charInfo.index] === ' ' ? 'space-char' : '']">
              {{ input[charInfo.index] === ' ' ? '␣' : input[charInfo.index] }}
            </span>
            <!-- 显示错误字符 -->
            <span v-else-if="charInfo.index === wrongIndex && wrongChar" class="error">{{ wrongChar }}</span>
            <!-- 显示等待输入的字符（默写模式下可能隐藏） -->
            <span v-else :class="['pending', charInfo.char === ' ' ? 'space-char' : '']">
              <template v-if="settingStore.dictation">
                <span v-if="!showFullSentence" @mouseenter="showSentence">
                  {{ settingStore.dictationShowWordLength ? '_' : '&nbsp;' }}
                </span>
                <span v-else @mouseleave="hideSentence">{{ charInfo.char === ' ' ? '␣' : charInfo.char }}</span>
              </template>
              <template v-else>{{ charInfo.char === ' ' ? '␣' : charInfo.char }}</template>
            </span>
          </span>
        </span>
      </div>
    </div>
    <div class="sentence-tip" v-if="waitNext">
      <Icon icon="mdi:keyboard-space" width="16" />
      按空格键继续
    </div>
  </div>
</template>

<style scoped lang="scss">
@import "@/assets/css/variable";

.typing-sentence {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15rem;
  user-select: none;
  color: var(--color-font-1);

  .sentence-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 800rem;
  }

  .sentence {
    position: relative;
    font-family: var(--font-family);
    font-weight: 300;
    text-align: center;
    transition: all .3s;
    min-height: 60rem;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1.4;
    padding: 10rem 20rem;
    border-radius: 8rem;
    background: rgba(var(--color-primary-rgb), 0.05);
    border: 2px solid transparent;
    flex-wrap: wrap;
    word-break: keep-all; // 防止单词被截断
    overflow-wrap: break-word; // 只在必要时换行
    white-space: normal; // 允许正常换行
    word-wrap: break-word; // 备用换行规则
    hyphens: none; // 禁用连字符截断

    &.is-wrong {
      animation: shake .5s;
    }

    .word-group {
      display: inline-block;
      white-space: nowrap; // 确保单词内容不换行
      
      &.space-group {
        white-space: normal; // 空格可以作为换行点
      }
    }

    .char {
      position: relative;
      display: inline-block;
      transition: all 0.2s ease;

      .correct {
        color: var(--color-correct);
        font-weight: 500;
        
        &.space-char {
          background: rgba(var(--color-correct-rgb), 0.2);
          border-radius: 2rem;
          padding: 1rem 3rem;
          font-weight: 400;
        }
      }

      .error {
        background: var(--color-wrong);
        color: white;
        padding: 2rem 4rem;
        border-radius: 4rem;
        animation: shake 0.5s;
      }

      .pending {
        color: var(--color-font-2);
        
        &.space-char {
          color: var(--color-font-3);
          opacity: 0.7;
          background: rgba(var(--color-font-2-rgb), 0.1);
          border-radius: 2rem;
          padding: 1rem 3rem;
        }
      }

      &.current .pending {
        color: var(--color-font-1);
        background: rgba(var(--color-primary-rgb), 0.2);
        border-radius: 2rem;
        animation: blink-cursor 1.5s infinite;
        
        &.space-char {
          background: rgba(var(--color-primary-rgb), 0.3);
          padding: 1rem 3rem;
        }
      }

      &.waiting .pending {
        opacity: 0.6;
      }
    }
  }

  .sentence-tip {
    font-size: 12rem;
    color: var(--color-font-3);
    display: flex;
    align-items: center;
    gap: 5rem;
    animation: blink 1.5s infinite;
  }
}

@keyframes blink-cursor {
  0%, 50% {
    background: rgba(var(--color-primary-rgb), 0.3);
  }
  51%, 100% {
    background: rgba(var(--color-primary-rgb), 0.1);
  }
}

@keyframes shake {
  0%, 20%, 50%, 80%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 70%, 90% {
    transform: translateX(-2rem);
  }
  40%, 60% {
    transform: translateX(2rem);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.3;
  }
}
</style> 