// 背单词复习算法 — 艾宾浩斯 + Anki 风格
// 六档间隔：10分钟 → 1天 → 3天 → 7天 → 15天 → 30天

const INTERVALS_MS = [
  10 * 60 * 1000,          // 0 → 10 分钟
  24 * 60 * 60 * 1000,     // 1 → 1 天
  3 * 24 * 60 * 60 * 1000, // 2 → 3 天
  7 * 24 * 60 * 60 * 1000, // 3 → 7 天
  15 * 24 * 60 * 60 * 1000,// 4 → 15 天
  30 * 24 * 60 * 60 * 1000 // 5 → 30 天
]

export const STATUS = { NEW: 0, UNKNOWN: 1, FUZZY: 2, KNOWN: 3 }

/**
 * 计算复习后的状态与下次复习时间
 * @param {object} record - { status, interval_index, next_review_time }
 * @param {number} answer - 1 不认识 | 2 模糊 | 3 认识
 * @returns {{ status:number, interval_index:number, next_review_time:Date, review_count:number }}
 */
export function schedule(record, answer) {
  let { status = STATUS.NEW, interval_index = 0, review_count = 0 } = record
  review_count += 1

  if (answer === STATUS.UNKNOWN) {
    // 不认识：重置间隔
    interval_index = 0
    status = STATUS.UNKNOWN
  } else if (answer === STATUS.FUZZY) {
    // 模糊：不退档，但不前进
    if (interval_index < 1) interval_index = 1
    status = STATUS.FUZZY
  } else {
    // 认识：前进一档（封顶 5）
    if (interval_index < 5) interval_index += 1
    status = STATUS.KNOWN
  }

  const next_review_time = new Date(Date.now() + INTERVALS_MS[interval_index])
  return { status, interval_index, next_review_time, review_count }
}

/** 今日待复习：下次复习时间 ≤ now */
export function isDue(record, now = new Date()) {
  return new Date(record.next_review_time) <= now
}
