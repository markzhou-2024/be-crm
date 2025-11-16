'use strict'

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const CUSTOMERS = db.collection('customers')
const SHOPS = db.collection('shops')

function assertAuthed (ctx) {
  if (!ctx.uid) {
    throw {
      errCode: 'AUTH_REQUIRED',
      errMsg: '请登录后再试'
    }
  }
}

function trim (value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function normalizePhone (value) {
  const str = trim(value)
  return str ? str.replace(/\s+/g, '') : ''
}

function isValidPhone (phone) {
  return !phone || /^1\d{10}$/.test(phone)
}

function normalizeTags (value) {
  if (Array.isArray(value)) {
    return value.map(item => trim(item)).filter(Boolean).join(', ')
  }
  return trim(value)
}

function toNumber (value, defaultValue = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : defaultValue
}

function toInteger (value, defaultValue = 0) {
  const num = Number(value)
  if (!Number.isFinite(num)) return defaultValue
  return Math.round(num)
}

function parseOptionalInteger (value) {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.round(num)
}

function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildKeywordCondition (keyword) {
  const kw = trim(keyword)
  if (!kw) return null
  const matcher = dbCmd.regExp({
    regexp: escapeRegExp(kw),
    options: 'i'
  })
  return dbCmd.or([{ name: matcher }, { phone: matcher }])
}

async function ensureStoreInfo (ctx, storeId, storeName) {
  const id = trim(storeId)
  if (!id) {
    return {
      err: { errCode: 'INVALID_PARAM', errMsg: '请选择归属门店' }
    }
  }
  const { data } = await SHOPS.where({
    _id: id,
    user_id: ctx.uid
  }).field({ store_name: 1 }).limit(1).get()
  if (!Array.isArray(data) || !data.length) {
    return { err: { errCode: 'INVALID_STORE', errMsg: '门店不存在或无权限' } }
  }
  const store = data[0]
  return {
    value: {
      store_id: id,
      store_name: trim(storeName) || store.store_name || ''
    }
  }
}

function formatCustomer (doc) {
  if (!doc) return null
  return {
    _id: doc._id,
    id: doc._id,
    user_id: doc.user_id,
    name: doc.name || '',
    phone: doc.phone || '',
    is_vip: !!doc.is_vip,
    avatar: doc.avatar || '',
    tags: doc.tags || '',
    city: doc.city || '',
    notes: doc.notes || '',
    store_id: doc.store_id || '',
    store_name: doc.store_name || '',
    total_spend: toNumber(doc.total_spend),
    visit_count: toInteger(doc.visit_count),
    last_visit_days: doc.last_visit_days,
    last_visit_label: doc.last_visit_label || '',
    last_visit_at: doc.last_visit_at,
    last_consume_at: doc.last_consume_at,
    first_consume_at: doc.first_consume_at,
    first_purchase_at: doc.first_purchase_at,
    create_time: doc.create_time,
    update_time: doc.update_time
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
      const body = httpInfo.body.trim()
      if (body.startsWith('{') || body.startsWith('[')) {
        try {
          const parsed = JSON.parse(body)
          token = parsed.uniIdToken || parsed.uni_id_token || ''
        } catch (e) {
          // ignore parse error
        }
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

  async listCustomers (params = {}) {
    assertAuthed(this)
    const conditions = [{ user_id: this.uid }]
    const storeId = trim(params.store_id || params.storeId)
    if (storeId) {
      conditions.push({ store_id: storeId })
    }
    if (params.is_vip !== undefined && params.is_vip !== null) {
      conditions.push({ is_vip: !!params.is_vip })
    }
    const keywordCond = buildKeywordCondition(params.keyword || params.search)
    if (keywordCond) {
      conditions.push(keywordCond)
    }
    const where = conditions.length > 1 ? dbCmd.and(conditions) : conditions[0]
    const page = Math.max(1, Number(params.page) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(params.page_size || params.pageSize) || 200))
    const { data } = await CUSTOMERS.where(where)
      .orderBy('update_time', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return {
      errCode: 0,
      data: (data || []).map(formatCustomer)
    }
  },

  async getCustomerById (payload = {}) {
    assertAuthed(this)
    const id = typeof payload === 'string' ? payload : (payload.id || payload._id)
    if (!id) {
      return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
    }
    const { data } = await CUSTOMERS.where({
      _id: id,
      user_id: this.uid
    }).limit(1).get()
    return {
      errCode: 0,
      data: (data && data.length) ? formatCustomer(data[0]) : null
    }
  },

  async createCustomer (payload = {}) {
    assertAuthed(this)
    const name = trim(payload.name)
    if (!name) {
      return { errCode: 'INVALID_PARAM', errMsg: '客户姓名不能为空' }
    }
    const phone = normalizePhone(payload.phone)
    if (!isValidPhone(phone)) {
      return { errCode: 'INVALID_PARAM', errMsg: '手机号格式不正确' }
    }
    if (phone) {
      const { data: dup } = await CUSTOMERS.where({
        user_id: this.uid,
        phone
      }).field({ _id: 1 }).limit(1).get()
      if (dup && dup.length) {
        return { errCode: 'DUPLICATE_PHONE', errMsg: '该手机号已存在' }
      }
    }
    const storeResult = await ensureStoreInfo(this, payload.store_id || payload.storeId, payload.store_name || payload.storeName)
    if (storeResult.err) return storeResult.err
    const now = Date.now()
    const doc = {
      user_id: this.uid,
      name,
      phone,
      is_vip: !!payload.is_vip,
      avatar: trim(payload.avatar),
      tags: normalizeTags(payload.tags),
      city: trim(payload.city),
      notes: trim(payload.notes),
      ...storeResult.value,
      total_spend: toNumber(payload.total_spend, 0),
      visit_count: toInteger(payload.visit_count, 0),
      last_visit_label: trim(payload.last_visit_label),
      last_visit_at: payload.last_visit_at,
      last_consume_at: payload.last_consume_at,
      first_consume_at: payload.first_consume_at,
      first_purchase_at: payload.first_purchase_at,
      create_time: now,
      update_time: now
    }
    const lastVisitDays = parseOptionalInteger(payload.last_visit_days)
    if (lastVisitDays !== null) {
      doc.last_visit_days = lastVisitDays
    }
    const res = await CUSTOMERS.add(doc)
    const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
    return {
      errCode: 0,
      data: formatCustomer({ _id: insertedId || doc._id, ...doc })
    }
  },

  async updateCustomer (payload = {}) {
    assertAuthed(this)
    const id = payload._id || payload.id
    if (!id) {
      return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
    }
    const updates = {}
    if (payload.name !== undefined) {
      const name = trim(payload.name)
      if (!name) return { errCode: 'INVALID_PARAM', errMsg: '客户姓名不能为空' }
      updates.name = name
    }
    if (payload.phone !== undefined) {
      const phone = normalizePhone(payload.phone)
      if (!isValidPhone(phone)) {
        return { errCode: 'INVALID_PARAM', errMsg: '手机号格式不正确' }
      }
      if (phone) {
        const { data: dup } = await CUSTOMERS.where({
          user_id: this.uid,
          phone,
          _id: dbCmd.neq(id)
        }).field({ _id: 1 }).limit(1).get()
        if (dup && dup.length) {
          return { errCode: 'DUPLICATE_PHONE', errMsg: '该手机号已存在' }
        }
      }
      updates.phone = phone
    }
    if (payload.is_vip !== undefined) {
      updates.is_vip = !!payload.is_vip
    }
    if (payload.avatar !== undefined) {
      updates.avatar = trim(payload.avatar)
    }
    if (payload.tags !== undefined) {
      updates.tags = normalizeTags(payload.tags)
    }
    if (payload.city !== undefined) {
      updates.city = trim(payload.city)
    }
    if (payload.notes !== undefined) {
      updates.notes = trim(payload.notes)
    }
    if (payload.store_id !== undefined || payload.storeId !== undefined) {
      const storeResult = await ensureStoreInfo(this, payload.store_id || payload.storeId, payload.store_name || payload.storeName)
      if (storeResult.err) return storeResult.err
      updates.store_id = storeResult.value.store_id
      updates.store_name = storeResult.value.store_name
    } else if (payload.store_name !== undefined || payload.storeName !== undefined) {
      updates.store_name = trim(payload.store_name || payload.storeName)
    }
    if (payload.total_spend !== undefined) {
      updates.total_spend = toNumber(payload.total_spend, 0)
    }
    if (payload.visit_count !== undefined) {
      updates.visit_count = toInteger(payload.visit_count, 0)
    }
    if (payload.last_visit_days !== undefined) {
      const parsed = parseOptionalInteger(payload.last_visit_days)
      updates.last_visit_days = parsed === null ? dbCmd.remove() : parsed
    }
    if (payload.last_visit_label !== undefined) {
      updates.last_visit_label = trim(payload.last_visit_label)
    }
    if (payload.last_visit_at !== undefined) {
      updates.last_visit_at = payload.last_visit_at === null ? dbCmd.remove() : payload.last_visit_at
    }
    if (payload.last_consume_at !== undefined) {
      updates.last_consume_at = payload.last_consume_at === null ? dbCmd.remove() : payload.last_consume_at
    }
    if (payload.first_consume_at !== undefined) {
      updates.first_consume_at = payload.first_consume_at === null ? dbCmd.remove() : payload.first_consume_at
    }
    if (payload.first_purchase_at !== undefined) {
      updates.first_purchase_at = payload.first_purchase_at === null ? dbCmd.remove() : payload.first_purchase_at
    }
    if (!Object.keys(updates).length) {
      return { errCode: 'INVALID_PARAM', errMsg: '无可更新字段' }
    }
    updates.update_time = Date.now()
    const res = await CUSTOMERS.where({
      _id: id,
      user_id: this.uid
    }).update(updates)
    const updated = res.updated || res.affectedDocs || 0
    if (!updated) {
      return { errCode: 'NOT_FOUND', errMsg: '客户不存在或无权限' }
    }
    return {
      errCode: 0,
      updated
    }
  },

  async deleteCustomer (payload = {}) {
    assertAuthed(this)
    const id = typeof payload === 'string' ? payload : (payload._id || payload.id)
    if (!id) {
      return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
    }
    const res = await CUSTOMERS.where({
      _id: id,
      user_id: this.uid
    }).remove()
    return {
      errCode: 0,
      deleted: res.deleted || res.affectedDocs || 0
    }
  }
}
