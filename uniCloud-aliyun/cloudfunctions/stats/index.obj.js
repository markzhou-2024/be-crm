// 完整版 stats 云对象（保留旧 getMonthlyOverview，只新增月度经营指标）

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

// 计算某月份的时间范围（13 位时间戳）
function parseMonthRange (month) {
  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr)
  const m = parseInt(monthStr) - 1
  const start = new Date(year, m, 1).getTime()
  const end = new Date(year, m + 1, 1).getTime()
  return { start, end }
}

// 独立重算函数：不要挂在 this 上，避免 this 丢失
async function recalcMonthlyBusinessKpis ({ user_id, month, store_id = '' }) {
  const { start, end } = parseMonthRange(month)

  // 顾问负责门店
  const shopRes = await db.collection('shops')
    .where(dbCmd.or({ owner_uid: user_id }, { user_id }))
    .field({ _id: 1 })
    .get()

  const allStoreIds = shopRes.data.map(s => s._id)
  const storeCount = allStoreIds.length

  let targetStores = allStoreIds
  if (store_id) {
    if (!allStoreIds.includes(store_id)) {
      return {
        storeCount,
        shopStats: {},
        serviceStats: {},
        financeStats: {}
      }
    }
    targetStores = [store_id]
  }

  // ------- consume -------
  const consumeRes = await db.collection('consume')
    .where({
      user_id,
      store_id: dbCmd.in(targetStores),
      consumed_at: dbCmd.gte(start).and(dbCmd.lt(end))
    }).get()
  const consumes = consumeRes.data

  // ------- booking -------
  const bookingRes = await db.collection('booking')
    .where({
      user_id,
      store_id: dbCmd.in(targetStores),
      start_ts: dbCmd.gte(start).and(dbCmd.lt(end)),
      arrived: true
    }).get()
  const bookings = bookingRes.data

  // ------- buy -------
  const buyRes = await db.collection('buy')
    .where({
      user_id,
      store_id: dbCmd.in(targetStores),
      buy_at: dbCmd.gte(start).and(dbCmd.lt(end))
    }).get()
  const buys = buyRes.data

  // ========= 门店数据 =========
  // 到客：按 customer_id + 日期 去重
  const visitMap = new Map()
  for (const c of consumes) {
    const d = new Date(c.consumed_at)
    const key = `${c.customer_id}_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!visitMap.has(key)) visitMap.set(key, 1)
  }
  const totalVisitors = visitMap.size

  // 后续可补充通过 customers / buy 判断新客、老客
  const shopStats = {
    total_visitors: totalVisitors,
    old_customer_visitors: 0,
    new_customers: 0,
    old_customer_visit_times: 0
  }

  // ========= 服务数据 =========
  const serviceStats = {
    consultant_visits: bookings.length,
    consultant_services: 0,
    store_self_services: 0
  }

  for (const c of consumes) {
    const cnt = Number(c.count || 0)
    if (c.operator_role === 'consultant') serviceStats.consultant_services += cnt
    else if (c.operator_role === 'store') serviceStats.store_self_services += cnt
  }

  // ========= 财务数据 =========
  let monthSalesAmount = 0
  for (const b of buys) monthSalesAmount += Number(b.amount || 0)

  let monthConsumeAmount = 0
  for (const c of consumes) monthConsumeAmount += Number(c.amount || 0)

  const financeStats = {
    month_sales_amount: monthSalesAmount,
    month_consume_amount: monthConsumeAmount
  }

  return {
    storeCount,
    shopStats,
    serviceStats,
    financeStats
  }
}

module.exports = {
  // -----------------------------
  // Token 解析，统一获取 this.uid
  // -----------------------------
  async _before () {
    const clientInfo = this.getClientInfo()
    this.uniID = uniID.createInstance({ clientInfo })

    const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
    let token = ''

    if (clientInfo && clientInfo.uniIdToken) token = clientInfo.uniIdToken
    if (!token && httpInfo && httpInfo.headers) {
      token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
    }
    if (!token && httpInfo && httpInfo.body) {
      try {
        token = (JSON.parse(httpInfo.body).uniIdToken) || ''
      } catch (e) {}
    }

    this.uid = null
    if (token) {
      const payload = await this.uniID.checkToken(token)
      if (payload && !payload.errCode && !payload.code) this.uid = payload.uid
    }
  },

  // -----------------------------
  // 旧方法：保留原有月度概览
  // -----------------------------
  async getMonthlyOverview (params = {}) {
    const { start, end, month } = (() => {
      const base = params.month ? new Date(`${params.month}-01T00:00:00`) : new Date()
      const s = new Date(base.getFullYear(), base.getMonth(), 1).getTime()
      const e = new Date(base.getFullYear(), base.getMonth() + 1, 1).getTime()
      return { start: s, end: e, month: params.month || '' }
    })()

    const scope = 'mine'
    const requestedStoreId = (params.store_id || params.storeId || '').trim()

    const consumeWhere = [{ consumed_at: dbCmd.gte(start) }, { consumed_at: dbCmd.lt(end) }]
    if (this.uid) consumeWhere.push({ user_id: this.uid })
    if (requestedStoreId) consumeWhere.push({ store_id: requestedStoreId })

    const consumeCol = db.collection('consume')
    const bookingCol = db.collection('booking')

    let consumeDocs = []
    try {
      const res = await consumeCol.where(dbCmd.and(consumeWhere)).field('count,store_service').get()
      consumeDocs = Array.isArray(res.data) ? res.data : []
    } catch (e) {}

    let totalVisits = 0
    let consultantVisits = 0
    let storeStaffVisits = 0
    consumeDocs.forEach(doc => {
      const c = Number(doc.count || 0)
      totalVisits += c
      if (doc.store_service === true) storeStaffVisits += c
      else consultantVisits += c
    })

    let calendarBookings = 0
    try {
      const bookingWhere = [
        { start_ts: dbCmd.gte(start) },
        { start_ts: dbCmd.lt(end) }
      ]
      if (this.uid) bookingWhere.push({ user_id: this.uid })
      if (requestedStoreId) bookingWhere.push({ store_id: requestedStoreId })

      const res = await bookingCol.where(dbCmd.and(bookingWhere)).field('_id').count()
      calendarBookings = Number(res.total || 0)
    } catch (e) {}

    return {
      code: 0,
      data: {
        month,
        scope,
        storeData: {
          totalVisits,
          consultantVisits,
          storeStaffVisits,
          newCustomers: 0,
          newCustomersChangeRate: 0,
          oldCustomers: 0,
          oldCustomersActiveRate: 0,
          oldCustomersVisits: Math.max(0, Math.floor(totalVisits * 0.6))
        },
        consultantData: {
          visits: consultantVisits,
          visitsChangeRate: 0,
          calendarBookings
        },
        financeData: {
          totalConsumeAmount: 0,
          totalConsumeAmountChangeRate: 0,
          packageUnitPrice: 0,
          totalConsumeCount: totalVisits
        }
      }
    }
  },

  // -----------------------------
  // 新方法：月度经营指标统计（主入口）
  // -----------------------------
  async getMonthlyBusinessKpis ({ month, storeId = '' }) {
    const uid = this.uid
    if (!uid) return { code: 401, msg: '未登录', data: null }
    if (!month) return { code: 400, msg: '缺少月份参数 YYYY-MM', data: null }

    const scope = storeId ? 'store' : 'all'
    const store_id = storeId || ''
    const now = Date.now()

    const col = db.collection('stats_monthly_kpi')

    // 查询缓存
    const cacheRes = await col.where({
      user_id: uid,
      month,
      scope,
      store_id
    }).limit(1).get()

    let doc = cacheRes.data[0]
    const expired = !doc || !doc.update_time || (now - doc.update_time > 3600 * 1000)

    if (expired) {
      // 重算
      const calc = await recalcMonthlyBusinessKpis({ user_id: uid, month, store_id })

      const newDoc = {
        user_id: uid,
        month,
        scope,
        store_id,
        store_count: calc.storeCount,
        shop_stats: calc.shopStats,
        service_stats: calc.serviceStats,
        finance_stats: calc.financeStats,
        calc_version: 1,
        update_time: now
      }

      if (!doc) {
        newDoc.create_time = now
        await col.add(newDoc)
        doc = newDoc
      } else {
        await col.where({ _id: doc._id }).update(newDoc)
        doc = Object.assign({ create_time: doc.create_time }, newDoc)
      }
    }

    return {
      code: 0,
      msg: 'ok',
      data: {
        month,
        storeCount: doc.store_count,
        shopStats: doc.shop_stats,
        serviceStats: doc.service_stats,
        financeStats: doc.finance_stats
      }
    }
  }
}
