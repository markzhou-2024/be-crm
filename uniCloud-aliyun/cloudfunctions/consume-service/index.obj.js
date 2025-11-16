'use strict'

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const CONSUME = db.collection('consume')
const BUY = db.collection('buy')
const CUSTOMERS = db.collection('customers')

function assertAuthed (ctx) {
  if (!ctx.uid) {
    const err = new Error('请登录后再试')
    err.errCode = 'AUTH_REQUIRED'
    throw err
  }
}

function formatDate (time = Date.now()) {
  const d = new Date(time)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateString (value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = Date.parse(`${value}T00:00:00`)
    return Number.isNaN(parsed) ? null : parsed
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeText (value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function buildVisitLabel (diffDays) {
  if (diffDays <= 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  return `${diffDays}天前`
}

async function updateCustomerAfterConsume (ctx, { customerId, consumedAt, count }) {
  if (!customerId) return
  const now = Date.now()
  const diffDays = Math.max(0, Math.floor((now - consumedAt) / (24 * 60 * 60 * 1000)))
  const updates = {
    last_consume_at: consumedAt,
    last_visit_at: consumedAt,
    last_visit_days: diffDays,
    last_visit_label: buildVisitLabel(diffDays),
    update_time: now,
    visit_count: dbCmd.inc(Math.max(1, Number(count) || 1))
  }
  try {
    await CUSTOMERS.where({
      _id: customerId,
      user_id: ctx.uid
    }).update(updates)
  } catch (e) {
    console.error('update customer consume stats failed', e)
  }
}

module.exports = {
  async _before () {
    const clientInfo = this.getClientInfo()
    this.uniID = uniID.createInstance({ clientInfo })

    const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
    let token = ''
    if (clientInfo && clientInfo.uniIdToken) {
      token = clientInfo.uniIdToken
    }
    if (!token && httpInfo && httpInfo.headers) {
      token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
    }
    if (!token && httpInfo && typeof httpInfo.body === 'string') {
      try {
        const parsed = JSON.parse(httpInfo.body)
        token = parsed.uniIdToken || parsed.uni_id_token || ''
      } catch (err) {
        // ignore body parse error
      }
    }

    this.uid = null
    if (token) {
      const payload = await this.uniID.checkToken(token)
      if (payload && !payload.errCode && !payload.code) {
        this.uid = payload.uid
        if (payload.token) {
          this.response = this.response || {}
          this.response.newToken = {
            token: payload.token,
            tokenExpired: payload.tokenExpired
          }
        }
      }
    }
  },

  async createConsumeRecord (payload = {}) {
    assertAuthed(this)
    const customerId = normalizeText(payload.customer_id || payload.customerId)
    const buyId = normalizeText(payload.buy_id || payload.buyId)
    const requestProductName = normalizeText(payload.product_name || payload.productName)
    const note = normalizeText(payload.note)
    const storeService = !!payload.store_service
    const count = Number(payload.count || payload.service_times || 0)

    if (!customerId || !buyId) {
      return { errCode: 'INVALID_PARAM', errMsg: '缺少客户或购买信息' }
    }
    if (!Number.isInteger(count) || count <= 0) {
      return { errCode: 'INVALID_PARAM', errMsg: '消耗次数需为正整数' }
    }

    const consumeDateInput = normalizeText(payload.consume_date || payload.consumeDate)
    const consumedAtInput = payload.consumed_at || payload.consumedAt

    let consumeDate = consumeDateInput || ''
    let consumedAt = typeof consumedAtInput === 'number' ? consumedAtInput : parseDateString(consumedAtInput)
    if (!consumeDate && consumedAt) {
      consumeDate = formatDate(consumedAt)
    }
    if (!consumeDate) {
      consumeDate = formatDate()
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(consumeDate)) {
      return { errCode: 'INVALID_PARAM', errMsg: '消耗日期格式不正确' }
    }
    if (!consumedAt) {
      consumedAt = parseDateString(consumeDate) || Date.now()
    }

    const buyRes = await BUY.where({
      _id: buyId,
      user_id: this.uid,
      customer_id: customerId
    }).limit(1).get()
    if (!buyRes.data || !buyRes.data.length) {
      return { errCode: 'NOT_FOUND', errMsg: '关联的购买记录不存在' }
    }
    const buyDoc = buyRes.data[0]
    const productName = requestProductName || buyDoc.package_name || buyDoc.product_name || '服务项目'

    const now = Date.now()
    const doc = {
      user_id: this.uid,
      customer_id: customerId,
      buy_id: buyId,
      product_name: productName,
      count,
      note,
      store_id: buyDoc.store_id || '',
      store_name: buyDoc.store_name || '',
      store_service: storeService,
      consume_date: consumeDate,
      consumed_at: consumedAt,
      create_time: now,
      update_time: now
    }

    const insertRes = await CONSUME.add(doc)
    const insertedId = insertRes.id || insertRes.insertId || (Array.isArray(insertRes.insertedIds) ? insertRes.insertedIds[0] : null)

    await updateCustomerAfterConsume(this, { customerId, consumedAt, count })

    return {
      errCode: 0,
      data: Object.assign({ _id: insertedId || doc._id }, doc)
    }
  }
}
