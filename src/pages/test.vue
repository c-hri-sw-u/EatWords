<script setup lang="ts">
import { ref } from 'vue'
import { normalizeQuote, normalizeQuotes, compareStringsIgnoreQuotes } from '@/utils/index'

const testInput = ref('')
const expectedOutput = ref('')
const result = ref('')

const testCases = [
  { input: "'", expected: "'", description: "英文单引号" },
  { input: "'", expected: "'", description: "中文单引号（左）" },
  { input: "'", expected: "'", description: "中文单引号（右）" },
  { input: '"', expected: '"', description: "英文双引号" },
  { input: '"', expected: '"', description: "中文双引号（左）" },
  { input: '"', expected: '"', description: "中文双引号（右）" },
]

const testStrings = [
  { str1: "Don't", str2: "Don't", description: "相同引号" },
  { str1: "Don't", str2: "Don't", description: "不同引号变体" },
  { str1: "He said \"Hello\"", str2: "He said \"Hello\"", description: "双引号变体" },
]

function testNormalizeQuote() {
  console.log('=== 测试单个字符标准化 ===')
  testCases.forEach(testCase => {
    const result = normalizeQuote(testCase.input)
    const isCorrect = result === testCase.expected
    console.log(`${testCase.description}: "${testCase.input}" -> "${result}" ${isCorrect ? '✓' : '✗'}`)
  })
}

function testNormalizeQuotes() {
  console.log('=== 测试字符串标准化 ===')
  const testStr = "Don't say \"Hello\""
  const result = normalizeQuotes(testStr)
  console.log(`原字符串: "${testStr}"`)
  console.log(`标准化后: "${result}"`)
}

function testCompareStrings() {
  console.log('=== 测试字符串比较 ===')
  testStrings.forEach(testCase => {
    const result = compareStringsIgnoreQuotes(testCase.str1, testCase.str2)
    console.log(`${testCase.description}: "${testCase.str1}" vs "${testCase.str2}" = ${result ? '✓' : '✗'}`)
  })
}

function runAllTests() {
  testNormalizeQuote()
  testNormalizeQuotes()
  testCompareStrings()
}

function testCustomInput() {
  if (testInput.value && expectedOutput.value) {
    const normalized = normalizeQuote(testInput.value)
    result.value = `输入: "${testInput.value}" (${testInput.value.charCodeAt(0)}) -> 标准化: "${normalized}" (${normalized.charCodeAt(0)}) -> 期望: "${expectedOutput.value}" (${expectedOutput.value.charCodeAt(0)})`
  }
}
</script>

<template>
  <div class="test-page">
    <h1>引号标准化测试</h1>
    
    <div class="test-section">
      <h2>运行所有测试</h2>
      <button @click="runAllTests">运行测试</button>
      <p>查看控制台输出结果</p>
    </div>
    
    <div class="test-section">
      <h2>自定义测试</h2>
      <div class="input-group">
        <label>输入字符:</label>
        <input v-model="testInput" placeholder="输入要测试的字符" />
      </div>
      <div class="input-group">
        <label>期望输出:</label>
        <input v-model="expectedOutput" placeholder="期望的标准化结果" />
      </div>
      <button @click="testCustomInput">测试</button>
      <div v-if="result" class="result">
        {{ result }}
      </div>
    </div>
    
    <div class="test-section">
      <h2>测试用例</h2>
      <div class="test-cases">
        <div v-for="testCase in testCases" :key="testCase.description" class="test-case">
          <div class="test-info">
            <span class="description">{{ testCase.description }}</span>
            <span class="input">输入: "{{ testCase.input }}"</span>
            <span class="expected">期望: "{{ testCase.expected }}"</span>
            <span class="result">结果: "{{ normalizeQuote(testCase.input) }}"</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="test-section">
      <h2>字符串比较测试</h2>
      <div class="test-cases">
        <div v-for="testCase in testStrings" :key="testCase.description" class="test-case">
          <div class="test-info">
            <span class="description">{{ testCase.description }}</span>
            <span class="input">字符串1: "{{ testCase.str1 }}"</span>
            <span class="input">字符串2: "{{ testCase.str2 }}"</span>
            <span class="result">比较结果: {{ compareStringsIgnoreQuotes(testCase.str1, testCase.str2) ? '匹配' : '不匹配' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.test-page {
  padding: 20rem;
  max-width: 800rem;
  margin: 0 auto;
  
  h1 {
    text-align: center;
    margin-bottom: 30rem;
  }
  
  .test-section {
    margin-bottom: 30rem;
    padding: 20rem;
    border: 1px solid var(--color-item-border);
    border-radius: var(--radius);
    
    h2 {
      margin-bottom: 15rem;
      color: var(--color-font-2);
    }
    
    button {
      padding: 10rem 20rem;
      background: var(--color-main-active);
      color: white;
      border: none;
      border-radius: 4rem;
      cursor: pointer;
      margin-right: 10rem;
      
      &:hover {
        opacity: 0.8;
      }
    }
    
    .input-group {
      margin-bottom: 15rem;
      
      label {
        display: block;
        margin-bottom: 5rem;
        color: var(--color-font-1);
      }
      
      input {
        width: 100%;
        padding: 8rem;
        border: 1px solid var(--color-item-border);
        border-radius: 4rem;
        font-family: monospace;
      }
    }
    
    .result {
      margin-top: 15rem;
      padding: 10rem;
      background: var(--color-item-bg);
      border-radius: 4rem;
      font-family: monospace;
      font-size: 14rem;
    }
  }
  
  .test-cases {
    .test-case {
      margin-bottom: 15rem;
      padding: 10rem;
      background: var(--color-item-bg);
      border-radius: 4rem;
      
      .test-info {
        display: flex;
        flex-direction: column;
        gap: 5rem;
        
        .description {
          font-weight: bold;
          color: var(--color-font-2);
        }
        
        .input, .expected, .result {
          font-family: monospace;
          font-size: 14rem;
        }
        
        .result {
          color: var(--color-main-active);
        }
      }
    }
  }
}
</style>