// 英语发音（TTS）工具
// 优先使用浏览器原生 Web Speech API，降级使用在线高品质词典语音

let currentAudio: HTMLAudioElement | null = null

export function speakWord(word: string): void {
  if (!word || typeof window === 'undefined') return

  const cleanWord = word.trim().toLowerCase()

  // 1. 尝试浏览器原生 Web Speech API
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel() // 停止前一个发音
      const utterance = new SpeechSynthesisUtterance(cleanWord)
      utterance.lang = 'en-US'
      utterance.rate = 0.9 // 稍慢一点更适合学习者听清

      // 寻找纯正的英文语音包
      const voices = window.speechSynthesis.getVoices()
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft')))
      if (enVoice) utterance.voice = enVoice

      let spoken = false
      utterance.onstart = () => { spoken = true }
      utterance.onerror = () => { fallbackAudio(cleanWord) }

      window.speechSynthesis.speak(utterance)

      // 如果浏览器支持但没有发音（某些特殊沙箱环境），备用网络音频
      setTimeout(() => {
        if (!spoken && !window.speechSynthesis.speaking) {
          fallbackAudio(cleanWord)
        }
      }, 300)
      return
    } catch {
      // ignore and fallback
    }
  }

  // 2. 降级方案：有道词典美音语音接口 (type=2 美音, type=1 英音)
  fallbackAudio(cleanWord)
}

function fallbackAudio(word: string) {
  try {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
    currentAudio = new Audio(audioUrl)
    currentAudio.play().catch(() => {
      // 某些浏览器自动播放策略拦截，忽略
    })
  } catch {
    // ignore
  }
}
