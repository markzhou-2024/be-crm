const bookingService = uniCloud.importObject('curd-booking', { customUI: true })

function formatDate(value) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(value) {
  const d = new Date(value)
  const hh = `${d.getHours()}`.padStart(2, '0')
  const mm = `${d.getMinutes()}`.padStart(2, '0')
  return `${hh}:${mm}`
}

function toTimestamp(dateStr, timeStr = '09:00') {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('-').map(num => Number(num))
  const [hh = 0, mm = 0] = String(timeStr || '09:00').split(':').map(num => Number(num))
  const date = new Date(y, (m || 1) - 1, d || 1, hh, mm, 0)
  const ts = date.getTime()
  return Number.isNaN(ts) ? null : ts
}

function unwrap(res) {
  if (!res) return res
  if (typeof res === 'object') {
    if (res.errCode !== undefined && res.errCode !== 0) {
      const err = new Error(res.errMsg || '请求失败')
      err.errCode = res.errCode
      throw err
    }
    if (res.code !== undefined && res.code !== 0) {
      const err = new Error(res.message || res.msg || '请求失败')
      err.code = res.code
      throw err
    }
  }
  if (res && res.data !== undefined) return res.data
  return res
}

function toArray(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.list)) return res.list
  return []
}

function toTask(record = {}) {
  const start = record.start_ts || record.startTs || Date.now()
  return {
    id: record._id || record.id,
    date: formatDate(start),
    time: formatTime(start),
    title: record.service_name || record.title || '日程安排',
    note: record.remark || record.note || '',
    store_id: record.store_id || '',
    store_name: record.store_name || '',
    calendar_only: !!record.calendar_only,
    raw: record
  }
}

export async function listAllTasks(params = {}) {
  const query = {}
  if (params.start) query.date_from = params.start
  if (params.end) query.date_to = params.end
  const res = await bookingService.listCalendar(query)
  return toArray(unwrap(res)).map(toTask)
}

export async function createTask(payload) {
  const startTs = toTimestamp(payload.date, payload.time)
  if (!startTs) {
    throw new Error('时间无效')
  }
  const endTs = startTs + 60 * 60 * 1000
  const res = await bookingService.addCalendar({
    store_id: payload.store_id,
    store_name: payload.store_name,
    title: payload.title,
    note: payload.note,
    remark: payload.note,
    start_ts: startTs,
    end_ts: endTs
  })
  return toTask(unwrap(res))
}

export async function updateTask(id, payload) {
  const startTs = toTimestamp(payload.date, payload.time)
  if (!startTs) {
    throw new Error('时间无效')
  }
  const endTs = startTs + 60 * 60 * 1000
  await bookingService.updateCalendar({
    id,
    store_id: payload.store_id,
    store_name: payload.store_name,
    title: payload.title,
    note: payload.note,
    start_ts: startTs,
    end_ts: endTs
  })
  return true
}

export async function deleteTask(id) {
  await bookingService.removeCalendar({ id })
  return true
}
