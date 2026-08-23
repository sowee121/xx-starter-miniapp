const { mediaUrl } = require('../config/media')
const { LAYERS, INLINE } = require('../content/feedback')

const LAYER_TRANSITION = 250

function resolveInline(input) {
  if (input && typeof input === 'object' && input.text) {
    return input
  }
  if (typeof input === 'string') {
    return { text: input, audio: null }
  }
  return { text: '', audio: null }
}

function playVoice(src, onEnded) {
  if (!src) return
  const audio = require('./audio')
  const url = mediaUrl(src)
  audio.play(url, {
    onEnded: typeof onEnded === 'function' ? onEnded : null,
  })
}

function preloadVoiceAudio() {
  try {
    require('./audio').ensureAudioOption()
  } catch (error) {
    // ignore
  }
}

function showLayer(page, payload) {
  if (!page) return
  clearTimeout(page._feedbackTimer)
  page.setData({
    feedback: {
      show: true,
      closing: false,
      variant: payload.variant,
      title: payload.title,
      desc: payload.desc,
      image: payload.image || '',
      action: payload.action || '',
    },
  })
}

/** L1：单条每日任务首次发星 */
function showTaskAward(page, result) {
  if (!page || !result || !result.firstAward) return
  const layer = result.taskId === 'calendar' ? LAYERS.checkinDone : LAYERS.taskDone
  showLayer(page, {
    variant: layer.variant,
    title: layer.title,
    desc: typeof layer.desc === 'function' ? layer.desc(result.taskTitle || '') : layer.desc,
    action: layer.action,
  })
}

function hideLayer(page) {
  if (!page) return
  clearTimeout(page._feedbackTimer)
  page.setData({ 'feedback.closing': true })
  // 留句柄给下一次 show/hide 取消；页面已卸载时 setData 会抛，吞掉即可
  page._feedbackTimer = setTimeout(() => {
    page._feedbackTimer = null
    try {
      page.setData({ 'feedback.show': false, 'feedback.closing': false })
    } catch (error) {
      // 页面已销毁
    }
  }, LAYER_TRANSITION)
}

function showInline(page, input) {
  if (!page) return
  const { text, audio, tone } = resolveInline(input)
  page.setData({
    softNote: text,
    softNoteTone: tone || 'tone-butter',
  })
  if (audio) {
    playVoice(audio)
  }
}

function clearInline(page) {
  if (page) page.setData({ softNote: '', softNoteTone: 'tone-butter' })
}

/**
 * 点读兜底：交给 audioUtil.play 的 onError。
 * 缺字段能提前拦住，但取不到文件（素材缺失 / 分包未预载）只有播放时才暴露，
 * 必须在这里出软提示，否则点了没声音也没反馈。
 */
function audioFallback(page) {
  return () => showInline(page, INLINE.audioUnavailable)
}

module.exports = {
  LAYER_TRANSITION,
  showLayer,
  showTaskAward,
  hideLayer,
  showInline,
  clearInline,
  audioFallback,
  preloadVoiceAudio,
}
