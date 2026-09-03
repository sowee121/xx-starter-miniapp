const { mediaUrl } = require('../config/media')
const { LAYERS, INLINE } = require('../content/feedback')

/** 浮层进出动画时长（ms），需与 feedback-layer.wxss 出场动画保持一致 */
const LAYER_TRANSITION = 480

/** 规范化行内提示结构 */
function resolveInline(input) {
  if (input && typeof input === 'object' && input.text) {
    return input
  }
  if (typeof input === 'string') {
    return { text: input, audio: null }
  }
  return { text: '', audio: null }
}

/** 播放反馈语音 */
function playVoice(src, onEnded) {
  if (!src) return
  const audio = require('./audio')
  const url = mediaUrl(src)
  audio.play(url, {
    onEnded: typeof onEnded === 'function' ? onEnded : null,
  })
}

/** 预加载对错语音 */
function preloadVoiceAudio() {
  try {
    require('./audio').ensureAudioOption()
  } catch (error) {
    // ignore
  }
}

/** 弹出反馈层 */
function showLayer(page, payload) {
  if (!page || typeof page.setData !== 'function' || !payload) return
  clearTimeout(page._feedbackTimer)
  try {
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
  } catch (error) {
    // 页面已销毁
  }
}

/**
 * 任务奖励层延迟弹出时长（ms）：只保留「完成瞬间的一拍」停顿。
 * 弹层入场动画（遮罩 320ms + 卡片 800ms 柔和立起）已自带渐入缓冲，无需再靠前置延时挡"突然弹出"；
 * 过长会让完成→夸奖全链路拖到 1.3s+，宝宝期待感断档。
 */
const SHOW_DELAY = 300

/** L1：单条每日任务首次发星；delay 可覆盖默认延时（如算术题等答对提示音播完再弹） */
function showTaskAward(page, result, delay = SHOW_DELAY) {
  if (!page || !result || !result.firstAward) return
  const layer = result.taskId === 'calendar' ? LAYERS.checkinDone : LAYERS.taskDone
  clearTimeout(page._taskAwardTimer)
  page._taskAwardTimer = setTimeout(() => {
    page._taskAwardTimer = null
    showLayer(page, {
      variant: layer.variant,
      title: layer.title,
      desc: typeof layer.desc === 'function' ? layer.desc(result.taskTitle || '') : layer.desc,
      action: layer.action,
    })
  }, delay)
}

/** 关闭反馈层 */
function hideLayer(page) {
  if (!page || typeof page.setData !== 'function') return
  clearTimeout(page._feedbackTimer)
  try {
    page.setData({ 'feedback.closing': true })
  } catch (error) {
    return
  }
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

/** 展示行内软提示 */
function showInline(page, input) {
  if (!page || typeof page.setData !== 'function') return
  const { text, audio, tone } = resolveInline(input)
  try {
    page.setData({
      softNote: text,
      softNoteTone: tone || 'tone-butter',
    })
  } catch (error) {
    return
  }
  if (audio) {
    playVoice(audio)
  }
}

/** 清空行内软提示 */
function clearInline(page) {
  if (!page || typeof page.setData !== 'function') return
  try {
    page.setData({ softNote: '', softNoteTone: 'tone-butter' })
  } catch (error) {
    // 页面已销毁
  }
}

/**
 * 点读兜底：交给 audioUtil.play 的 onError。
 * 缺字段能提前拦住，但取不到文件（素材缺失 / 分包未预载）只有播放时才暴露，
 * 必须在这里出软提示，否则点了没声音也没反馈。
 */
function audioFallback(page) {
  return () => showInline(page, INLINE.audioUnavailable)
}

/** 反馈层与软提示的公共状态：页面接入后不再自持 feedback / softNote / closeFeedback */
const feedbackBehavior = Behavior({
  data: {
    feedback: { show: false, closing: false },
    softNote: '',
    softNoteTone: 'tone-butter',
  },
  methods: {
    /** 关闭反馈层 */
    closeFeedback() {
      hideLayer(this)
    },
  },
})

module.exports = {
  LAYER_TRANSITION,
  feedbackBehavior,
  showLayer,
  showTaskAward,
  hideLayer,
  showInline,
  clearInline,
  audioFallback,
  preloadVoiceAudio,
}
