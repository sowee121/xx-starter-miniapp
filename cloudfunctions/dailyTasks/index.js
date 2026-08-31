const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SCHEMA = 10

/**
 * 与 miniprogram/utils/daily-tasks.js 的 TEMPLATES 保持同步。
 * 修改前端模板时此处必须同步更新，避免云端生成与本地规则漂移。
 */
const TEMPLATES = [
  { id: 'poem', min: 1, max: 2, url: '/subpkg/poem/poem/poem', titleOf: (n) => `读 ${n} 首古诗`, rewardOf: (n) => n + 1 },
  { id: 'hanzi', min: 1, max: 5, url: '/subpkg/hanzi/list/list', titleOf: (n) => `认 ${n} 个汉字`, rewardOf: (n) => n },
  { id: 'math', min: 1, max: 5, url: '/subpkg/math/hub/hub', titleOf: (n) => `做 ${n} 道算术题`, rewardOf: (n) => n },
  { id: 'english', min: 1, max: 5, url: '/subpkg/english/hub/hub', titleOf: (n) => `学 ${n} 个英语`, rewardOf: (n) => n },
  { id: 'pinyin', min: 1, max: 6, url: '/subpkg/pinyin/list/list', titleOf: (n) => `读 ${n} 个拼音`, rewardOf: (n) => n },
  { id: 'calendar', min: 1, max: 1, url: '/subpkg/calendar/index', titleOf: () => '日历打卡', rewardOf: () => 1 },
]

/** 闭区间随机整数 */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** 今日日期串（与前端 getToday 保持一致） */
function getToday() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** 生成当日任务列表 */
function generateTasks() {
  return TEMPLATES.map((tpl) => {
    const target = randInt(tpl.min, tpl.max)
    return {
      id: tpl.id,
      target,
      reward: tpl.rewardOf(target),
      url: tpl.url,
      title: tpl.titleOf(target),
    }
  })
}

/**
 * 拉当天文档；同 openid+date 存在多条时保留第一条并删除其余
 * （并发「先查后插」竞态自愈，参考 resetProfile 的 getOrCreateUser）。
 */
async function findDay(openid, date) {
  const col = db.collection('daily_tasks')
  const found = await col.where({ _openid: openid, date }).limit(10).get()
  const day = found.data[0]
  if (day && found.data.length > 1) {
    const staleIds = found.data.slice(1).map((item) => item._id)
    await col.where({ _id: _.in(staleIds) }).remove()
  }
  return day || null
}

/** seed 是否有效：客户端本地已生成的当天任务列表 */
function validSeed(seed) {
  return !!(
    seed
    && Array.isArray(seed.tasks)
    && seed.tasks.length === TEMPLATES.length
    && seed.tasks.every((t) => t && t.id && TEMPLATES.some((tpl) => tpl.id === t.id))
  )
}

/** 生成并入库当天文档（云端 add 必须显式写 _openid） */
async function createDay(openid, date, seedTasks) {
  const doc = {
    schema: SCHEMA,
    date,
    tasks: seedTasks || generateTasks(),
    progress: {},
    done: {},
    awarded: {},
    _openid: openid,
    updatedAt: Date.now(),
  }
  const added = await db.collection('daily_tasks').add({ data: doc })
  return { ...doc, _id: added._id }
}

/**
 * 每日任务云端存取。
 * - action='get'：拉当天文档；无则生成（seed 有效时用客户端生成结果，避免双随机漂移）入库并返回
 * - action='sync'：整体 upsert 当天文档（last-write-wins，儿童单设备场景可接受）
 * - action='reset'：删除当天 daily_tasks 文档 + 当天 task_logs 打卡记录（task_logs 无前端读取方）
 */
exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action

  if (action === 'get') {
    const date = event.date || getToday()
    let day = await findDay(OPENID, date)
    if (!day) {
      const seedTasks = validSeed(event.seed) ? event.seed.tasks : null
      day = await createDay(OPENID, date, seedTasks)
    }
    return { ok: true, action, day }
  }

  if (action === 'sync') {
    const date = event.date || getToday()
    const payload = event.day
    if (!payload || !Array.isArray(payload.tasks) || payload.tasks.length !== TEMPLATES.length) {
      return { ok: false, error: 'invalid_params' }
    }
    const col = db.collection('daily_tasks')
    const existing = await findDay(OPENID, date)
    const data = {
      schema: payload.schema || SCHEMA,
      date,
      tasks: payload.tasks,
      progress: payload.progress || {},
      done: payload.done || {},
      awarded: payload.awarded || {},
      updatedAt: Date.now(),
    }
    if (existing) {
      await col.doc(existing._id).update({ data })
    } else {
      // 云函数 add 不会自动注入 _openid，漏写会导致每次同步都新建一条
      await col.add({ data: { ...data, _openid: OPENID } })
    }
    return { ok: true, action }
  }

  if (action === 'reset') {
    const date = event.date || getToday()
    await db.collection('daily_tasks').where({ _openid: OPENID, date }).remove()
    // task_logs 打卡记录无前端读取方，删除防止旧打卡残留与新任务不一致
    await db.collection('task_logs').where({ _openid: OPENID, date }).remove()
    return { ok: true, action, date }
  }

  return { ok: false, error: 'invalid_action' }
}
