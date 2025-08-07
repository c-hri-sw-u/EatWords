// 音频上下文管理工具
// 处理浏览器的自动播放策略

let audioEnabled = false
let hasUserInteracted = false

// 检测用户是否已经与页面交互
export function isAudioEnabled(): boolean {
  return audioEnabled && hasUserInteracted
}

// 尝试启用音频播放
export async function enableAudio(): Promise<boolean> {
  if (hasUserInteracted) return audioEnabled

  try {
    // 创建一个无声的音频来测试播放权限
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    // 播放一个极短的无声音频
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    gainNode.gain.value = 0 // 静音
    oscillator.frequency.value = 440
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.01)
    
    audioEnabled = true
    hasUserInteracted = true
    
    audioContext.close()
    return true
  } catch (error) {
    console.log('Audio context not available:', error)
    audioEnabled = false
    return false
  }
}

// 在用户交互时自动启用音频
export function initAudioOnUserInteraction() {
  if (hasUserInteracted) return

  const events = ['click', 'touchstart', 'keydown']
  
  const enableOnInteraction = async () => {
    if (!hasUserInteracted) {
      await enableAudio()
      // 移除事件监听器
      events.forEach(event => {
        document.removeEventListener(event, enableOnInteraction)
      })
    }
  }

  // 添加事件监听器
  events.forEach(event => {
    document.addEventListener(event, enableOnInteraction, { once: true, passive: true })
  })
}

// 安全的音频播放包装器
export async function safeAudioPlay(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play()
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      console.log('Audio play blocked - user interaction required')
      // 如果用户还未交互，提示用户点击页面
      if (!hasUserInteracted) {
        console.log('Please click anywhere on the page to enable audio')
      }
    } else {
      console.warn('Audio play failed:', error)
    }
    return false
  }
}

// 安全的语音合成播放
export function safeSpeechPlay(text: string, options: {
  rate?: number,
  volume?: number,
  lang?: string
} = {}): boolean {
  try {
    if (!window.speechSynthesis) {
      console.log('Speech synthesis not supported')
      return false
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate || 1
    utterance.volume = options.volume || 1
    utterance.lang = options.lang || 'en-US'
    
    utterance.onerror = (event) => {
      console.log('Speech synthesis blocked by browser policy')
    }

    window.speechSynthesis.speak(utterance)
    return true
  } catch (error) {
    console.log('Speech synthesis failed:', error)
    return false
  }
} 