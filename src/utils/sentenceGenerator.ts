import { Word } from '@/types'

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const QWEN_API_URL = 'https://router.huggingface.co/v1'

/**
 * 获取DeepSeek API Key
 */
function getDeepSeekApiKey(): string {
  // 优先从环境变量获取
  if (import.meta.env.VITE_DEEPSEEK_API_KEY) {
    return import.meta.env.VITE_DEEPSEEK_API_KEY
  }
  
  // 从localStorage获取用户设置的API Key
  const stored = localStorage.getItem('deepseek_api_key')
  if (stored) {
    return stored
  }
  
  throw new Error('DeepSeek API Key not found. Please set VITE_DEEPSEEK_API_KEY environment variable or configure it in settings.')
}

/**
 * 设置DeepSeek API Key到localStorage
 */
export function setDeepSeekApiKey(apiKey: string): void {
  localStorage.setItem('deepseek_api_key', apiKey)
}

/**
 * 获取已设置的API Key（用于UI显示）
 */
export function getStoredApiKey(): string {
  return localStorage.getItem('deepseek_api_key') || ''
}

/**
 * 清除API Key
 */
export function clearApiKey(): void {
  localStorage.removeItem('deepseek_api_key')
}

/**
 * 获取HuggingFace Token
 */
export function getHuggingFaceToken(): string {
  return import.meta.env.VITE_HF_TOKEN || getStoredHfToken()
}

/**
 * 设置HuggingFace Token
 */
export function setHuggingFaceToken(token: string): void {
  localStorage.setItem('hf_token', token)
}

/**
 * 获取存储的HuggingFace Token
 */
export function getStoredHfToken(): string {
  return localStorage.getItem('hf_token') || ''
}

/**
 * 清除存储的HuggingFace Token
 */
export function clearHfToken(): void {
  localStorage.removeItem('hf_token')
}

/**
 * 通过Qwen API生成英文例句
 */
export async function generateSentenceWithQwen(word: string): Promise<string> {
  const hfToken = getHuggingFaceToken()
  
  const prompt = `Generate a simple, classic, interesting, and commonly used English sentence using the word "${word}". The sentence should be:
1. Easy to understand without Chinese translation
2. Natural and commonly used in daily life
3. Not too complex or academic
4. Around 8-15 words long
5. Show the word in context clearly

Please only return the sentence, nothing else.`

  try {
    const response = await fetch(`${QWEN_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-235B-A22B-Instruct-2507:novita',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`Qwen API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const sentence = data.choices[0].message.content.trim()
      
      // 去除引号和多余的标点
      const cleanedSentence = sentence.replace(/^["']|["']$/g, '').trim()
      
      if (cleanedSentence) {
        return cleanedSentence
      }
    }
    
    throw new Error('Invalid response format from Qwen API')
  } catch (error) {
    console.error('Error generating sentence with Qwen:', error)
    throw error
  }
}

/**
 * 通过DeepSeek API生成英文例句
 */
export async function generateSentenceWithDeepSeek(word: string): Promise<string> {
  const apiKey = getDeepSeekApiKey()
  
  const prompt = `Generate a simple, classic, interesting, and commonly used English sentence using the word "${word}". The sentence should be:
1. Easy to understand without Chinese translation
2. Natural and commonly used in daily life
3. Not too complex or academic
4. Around 8-15 words long
5. Show the word in context clearly

Please only return the sentence, nothing else.`

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const sentence = data.choices[0].message.content.trim()
      // 移除可能的引号
      return sentence.replace(/^["']|["']$/g, '')
    } else {
      throw new Error('Invalid response from DeepSeek API')
    }
  } catch (error) {
    console.error('Error generating sentence with DeepSeek:', error)
    throw error
  }
}

/**
 * 备用方案：使用预定义的例句模板
 */
const fallbackTemplates = [
  "I need to {word} this task today.",
  "The {word} is very important.",
  "Can you {word} this for me?",
  "This {word} looks interesting.",
  "We should {word} more often.",
]

export function generateFallbackSentence(word: string): string {
  const template = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]
  return template.replace('{word}', word)
}

/**
 * 生成例句的主函数（带错误处理和备用方案）
 */
export async function generateSentence(word: Word, modelType: 'deepseek' | 'qwen' = 'deepseek'): Promise<string> {
  try {
    // 如果已有例句，直接返回
    if (word.sentence && word.sentence.trim()) {
      return word.sentence
    }

    // 根据模型类型选择API
    let sentence: string
    if (modelType === 'qwen') {
      sentence = await generateSentenceWithQwen(word.name)
    } else {
      sentence = await generateSentenceWithDeepSeek(word.name)
    }
    return sentence
  } catch (error) {
    console.warn(`Failed to generate sentence for "${word.name}" using ${modelType}:`, error)
    // 使用备用方案
    return generateFallbackSentence(word.name)
  }
}

/**
 * 检查API Key是否有效
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10,
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * 评分接口的返回类型
 */
export interface SentenceEvaluation {
  score: number // 1-10分
  feedback: string // 评语
}

/**
 * 通过Qwen API评价用户造句
 */
export async function evaluateUserSentenceWithQwen(word: string, userSentence: string): Promise<SentenceEvaluation> {
  const hfToken = getHuggingFaceToken()
  
  const prompt = `请评价以下英语学习者的造句。他们需要使用的目标单词是"${word}"。

用户造句："${userSentence}"

请提供：
1. 1-10分的评分（10分为满分）
2. 详细的中文反馈评语

评分标准：
- 语法正确性（30%）：句子的语法结构是否正确，时态、语态、主谓一致等
- 目标单词使用（30%）：是否正确且自然地使用了单词"${word}"，词性和语境是否恰当
- 句子自然度和流畅性（25%）：句子是否符合英语表达习惯，听起来自然流畅
- 词汇和句式结构（15%）：用词是否恰当，句式结构是否多样化

请按以下JSON格式回复：
{
  "score": [1-10的数字],
  "feedback": "[详细的中文评语，包括：1.总体评价 2.具体优点 3.需要改进的地方 4.建议，字数控制在80-120字]"
}

评语要鼓励性且具体，既要指出优点也要提出改进建议，帮助学习者提高英语水平。`

  try {
    const response = await fetch(`${QWEN_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-235B-A22B-Instruct-2507:novita',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`Qwen API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content.trim()
      
      try {
        const evaluation = JSON.parse(content)
        
        if (typeof evaluation.score === 'number' && 
            evaluation.score >= 1 && evaluation.score <= 10 &&
            typeof evaluation.feedback === 'string') {
          return {
            score: Math.round(evaluation.score),
            feedback: evaluation.feedback
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse Qwen evaluation JSON, using fallback')
      }
      
      const scoreMatch = content.match(/score["\s]*:[\s]*(\d+)/i)
      const feedbackMatch = content.match(/feedback["\s]*:[\s]*["']([^"']+)["']/i)
      
      if (scoreMatch && feedbackMatch) {
        return {
          score: Math.min(10, Math.max(1, parseInt(scoreMatch[1]))),
          feedback: feedbackMatch[1]
        }
      }
    }
    
    throw new Error('Invalid response format from Qwen API')
  } catch (error) {
    console.error('Error evaluating sentence with Qwen:', error)
    return generateFallbackEvaluation(word, userSentence)
  }
}

/**
 * 通过DeepSeek API评价用户造句
 */
export async function evaluateUserSentenceWithDeepSeek(word: string, userSentence: string): Promise<SentenceEvaluation> {
  const apiKey = getDeepSeekApiKey()
  
  const prompt = `请评价以下英语学习者的造句。他们需要使用的目标单词是"${word}"。

用户造句："${userSentence}"

请提供：
1. 1-10分的评分（10分为满分）
2. 详细的中文反馈评语

评分标准：
- 语法正确性（30%）：句子的语法结构是否正确，时态、语态、主谓一致等
- 目标单词使用（30%）：是否正确且自然地使用了单词"${word}"，词性和语境是否恰当
- 句子自然度和流畅性（25%）：句子是否符合英语表达习惯，听起来自然流畅
- 词汇和句式结构（15%）：用词是否恰当，句式结构是否多样化

请按以下JSON格式回复：
{
  "score": [1-10的数字],
  "feedback": "[详细的中文评语，包括：1.总体评价 2.具体优点 3.需要改进的地方 4.建议，字数控制在80-120字]"
}

评语要鼓励性且具体，既要指出优点也要提出改进建议，帮助学习者提高英语水平。`

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3, // 较低的温度确保评分的一致性
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content.trim()
      
      try {
        // 尝试解析JSON格式的回复
        const evaluation = JSON.parse(content)
        
        // 验证返回数据的格式
        if (typeof evaluation.score === 'number' && 
            evaluation.score >= 1 && evaluation.score <= 10 &&
            typeof evaluation.feedback === 'string') {
          return {
            score: Math.round(evaluation.score), // 确保是整数
            feedback: evaluation.feedback
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse evaluation JSON, using fallback')
      }
      
      // 如果JSON解析失败，尝试从文本中提取信息
      const scoreMatch = content.match(/score["\s]*:[\s]*(\d+)/i)
      const feedbackMatch = content.match(/feedback["\s]*:[\s]*["']([^"']+)["']/i)
      
      if (scoreMatch && feedbackMatch) {
        return {
          score: Math.min(10, Math.max(1, parseInt(scoreMatch[1]))),
          feedback: feedbackMatch[1]
        }
      }
    }
    
    throw new Error('Invalid response format from DeepSeek API')
  } catch (error) {
    console.error('Error evaluating sentence with DeepSeek:', error)
    
    // 提供备用评分机制
    return generateFallbackEvaluation(word, userSentence)
  }
}

/**
 * 备用评分机制
 */
function generateFallbackEvaluation(word: string, userSentence: string): SentenceEvaluation {
  const sentence = userSentence.toLowerCase()
  const targetWord = word.toLowerCase()
  
  let score = 5 // 基础分
  let feedback = ''
  
  // 检查是否包含目标单词
  if (sentence.includes(targetWord)) {
    score += 2
    feedback += '很好，正确使用了目标单词。'
  } else {
    score -= 2
    feedback += '请确保在句子中使用目标单词。'
  }
  
  // 简单的长度检查
  if (sentence.length > 10 && sentence.length < 100) {
    score += 1
    feedback += '句子长度适中。'
  }
  
  // 检查基本语法（简单规则）
  if (sentence.trim().endsWith('.') || sentence.trim().endsWith('!') || sentence.trim().endsWith('?')) {
    score += 1
    feedback += '句子结构完整。'
  }
  
  // 确保分数在有效范围内
  score = Math.min(10, Math.max(1, Math.round(score)))
  
  if (!feedback) {
    feedback = '您的造句不错，继续练习会越来越好！'
  }
  
  return { score, feedback }
}

/**
 * 评价用户造句的主函数，根据设置选择模型
 */
export async function evaluateUserSentence(word: string, userSentence: string, modelType: 'deepseek' | 'qwen' = 'deepseek'): Promise<SentenceEvaluation> {
  try {
    if (modelType === 'qwen') {
      return await evaluateUserSentenceWithQwen(word, userSentence)
    } else {
      return await evaluateUserSentenceWithDeepSeek(word, userSentence)
    }
  } catch (error) {
    console.error(`Error evaluating sentence with ${modelType}:`, error)
    return generateFallbackEvaluation(word, userSentence)
  }
}

/**
 * 验证Qwen API Token是否有效
 */
export async function validateQwenToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${QWEN_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen3-235B-A22B-Instruct-2507:novita',
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10,
      }),
    })

    return response.ok
  } catch {
    return false
  }
} 