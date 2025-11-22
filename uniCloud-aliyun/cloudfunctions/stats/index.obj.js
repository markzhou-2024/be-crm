// 完整版 stats 云对象（保留旧 getMonthlyOverview，只新增月度经营指标）

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

// 缓存集合与字段对齐 schema: stats_monthly_kpi
const KPI_COLL = 'stats_monthly_kpi'

// 计算某月份的时间范围（13 位时间戳）
function parseMonthRange (month) {
  const [yearStr, monthStr] = month.split('-')
  const year = parseInt(yearStr)
  const m = parseInt(monthStr) - 1
  const start = new Date(year, m, 1).getTime()
  const end = new Date(year, m + 1, 1).getTime()
  return { start, end }
}

function getMonthRangeString (month) {
  const [yearStr, monthStr] = month.split('-')
  const y = parseInt(yearStr)
  const m = parseInt(monthStr)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : (m + 1)
  const cur = `${y}-${String(m).padStart(2, '0')}`
  const next = `${nextY}-${String(nextM).padStart(2, '0')}`
  return { cur, next }
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
  // 注意：buy 集合按 purchase_date(YYYY-MM-DD) 过滤月份
  const { cur: curMonth, next: nextMonth } = getMonthRangeString(month)
  const buyRes = await db.collection('buy')
    .where({
      user_id,
      store_id: dbCmd.in(targetStores),
      purchase_date: dbCmd.gte(`${curMonth}-01`).and(dbCmd.lt(`${nextMonth}-01`))
    }).get()
  const buys = buyRes.data

  // ------- customers (用于老客/新客判定) -------
  function toTs (v) {
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number') return v
    const n = Number(v)
    if (!Number.isNaN(n)) return n
    const parsed = Date.parse(v)
    return Number.isNaN(parsed) ? null : parsed
  }
  const customerWhere = { user_id }
  if (store_id) customerWhere.store_id = store_id
  const customerRes = await db.collection('customers')
    .where(customerWhere)
    .field({ _id: 1, first_purchase_at: 1, created_at: 1 })
    .get()
  const customers = Array.isArray(customerRes.data) ? customerRes.data : []
  const firstPurchaseMap = new Map()
  const missing = []
  for (const c of customers) {
    const ts = toTs(c.first_purchase_at) // 按业务定义：以首次购买时间为准
    if (ts) {
      firstPurchaseMap.set(c._id, ts)
    } else {
      missing.push(c._id)
    }
  }
  if (missing.length) {
    const buysAllRes = await db.collection('buy')
      .where({ user_id, customer_id: dbCmd.in(missing) })
      .field({ customer_id: 1, create_time: 1 })
      .get()
    const earliest = {}
    for (const b of (buysAllRes.data || [])) {
      const ts = toTs(b.create_time)
      if (!ts) continue
      if (!(b.customer_id in earliest) || ts < earliest[b.customer_id]) {
        earliest[b.customer_id] = ts
      }
    }
    for (const id of missing) {
      if (earliest[id]) firstPurchaseMap.set(id, earliest[id])
    }
  }
  const oldSet = new Set()
  const newSet = new Set()
  firstPurchaseMap.forEach((ts, id) => {
    if (ts < start) oldSet.add(id)
    else if (ts >= start && ts < end) newSet.add(id)
  })

  // ========= 门店数据 =========
  // 到客：按 customer_id + 日期 去重
  const visitMap = new Map()
  for (const c of consumes) {
    const d = new Date(c.consumed_at)
    const key = `${c.customer_id}_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!visitMap.has(key)) visitMap.set(key, 1)
  }
  const totalVisitors = visitMap.size

  // 老客、新客判定
  const consumeCustomerSet = new Set()
  for (const c of consumes) { if (c && c.customer_id) consumeCustomerSet.add(c.customer_id) }
  const oldVisitorSet = new Set()
  let oldCustomerVisitTimes = 0
  // 初始用 firstPurchaseMap 推断
  for (const c of consumes) {
    if (oldSet.has(c.customer_id)) {
      oldVisitorSet.add(c.customer_id)
      oldCustomerVisitTimes += Number(c.count || 0)
    }
  }
  let oldCustomerVisitors = oldVisitorSet.size
  let newCustomers = newSet.size
  const oldCustomersActiveRate = (oldSet.size > 0) ? (oldCustomerVisitors / oldSet.size) : 0

  // 同时提供下划线和驼峰命名
  const shopStats = {
    // 下划线
    total_visitors: totalVisitors,
    old_customer_visitors: oldCustomerVisitors,
    new_customers: newCustomers,
    old_customer_visit_times: oldCustomerVisitTimes,
    old_customers_active_rate: oldCustomersActiveRate,
    // 驼峰
    totalVisitors,
    oldCustomerVisitors,
    newCustomers,
    oldCustomerVisitTimes,
    oldCustomersActiveRate
  }

  // ========= 服务数据 =========
  let consultantServices = 0
  let storeSelfServices = 0

  for (const c of consumes) {
    const cnt = Number(c.count || 0)
    if (c.operator_role === 'consultant') consultantServices += cnt
    else if (c.operator_role === 'store') storeSelfServices += cnt
  }

  const consultantVisits = bookings.length
  const totalServices = consultantServices + storeSelfServices

  const serviceStats = {
    // 下划线
    consultant_visits: consultantVisits,
    consultant_services: consultantServices,
    store_self_services: storeSelfServices,
    total_services: totalServices,
    // 驼峰
    consultantVisits,
    consultantServices,
    storeSelfServices,
    totalServices
  }

  // ========= 财务数据 =========
  let monthSalesAmount = 0
  for (const b of buys) monthSalesAmount += Number(b.amount || 0)

  let monthConsumeAmount = 0
  for (const c of consumes) monthConsumeAmount += Number(c.amount || 0)

  const totalConsumeAmount = monthConsumeAmount
  const packageUnitPrice = totalVisitors > 0
    ? monthConsumeAmount / totalVisitors
    : 0

  const financeStats = {
    // 下划线
    month_sales_amount: monthSalesAmount,
    month_consume_amount: monthConsumeAmount,
    total_consume_amount: totalConsumeAmount,
    package_unit_price: packageUnitPrice,
    // 驼峰
    monthSalesAmount,
    monthConsumeAmount,
    totalConsumeAmount,
    packageUnitPrice
  }

  // ========= 新客数量（优先使用业务标记 is_first_purchase） =========
  const newCustomerFlagSet = new Set()
  for (const b of buys) {
    if (b && (b.is_first_purchase === true)) {
      if (b.customer_id) newCustomerFlagSet.add(b.customer_id)
    }
  }
  const flagged = newCustomerFlagSet.size
  if (flagged > 0) {
    // 当月有明确新客打标：
    // 新客 = 打标客户数；老客 = 本月到店且未打标的客户
    newCustomers = flagged
    oldVisitorSet.clear()
    oldCustomerVisitTimes = 0
    for (const c of consumes) {
      const cid = c.customer_id
      if (!cid) continue
      if (!newCustomerFlagSet.has(cid)) {
        oldVisitorSet.add(cid)
        oldCustomerVisitTimes += Number(c.count || 0)
      }
    }
    oldCustomerVisitors = oldVisitorSet.size
    // 同步修正已构造的 shopStats
    if (shopStats) {
      shopStats.new_customers = newCustomers
      shopStats.newCustomers = newCustomers
      shopStats.old_customer_visitors = oldCustomerVisitors
      shopStats.oldCustomerVisitors = oldCustomerVisitors
      shopStats.old_customer_visit_times = oldCustomerVisitTimes
      shopStats.oldCustomerVisitTimes = oldCustomerVisitTimes
      const recalRate = (oldSet.size > 0) ? (oldCustomerVisitors / oldSet.size) : 0
      shopStats.old_customers_active_rate = recalRate
      shopStats.oldCustomersActiveRate = recalRate
    }
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
      return { start: s, end: e, month: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}` }
    })()

    const uid = this.uid
    if (!uid) {
      return {
        code: 401,
        msg: '未登录'
      }
    }

    // 示例：简单统计 consume 记录数量（旧逻辑保持不变）
    const consumeRes = await db.collection('consume')
      .where({
        user_id: uid,
        consumed_at: dbCmd.gte(start).and(dbCmd.lt(end))
      })
      .count()

    return {
      code: 0,
      msg: 'success',
      data: {
        month,
        totalConsumeRecords: consumeRes.total
      }
    }
  },

  // -----------------------------
  // 新方法：月度经营指标（按顾问维度）
  // -----------------------------
  async getMonthlyBusinessKpis ({ month, storeId = '', force = false }) {
    const uid = this.uid
    if (!uid) {
      return {
        code: 401,
        msg: '未登录'
      }
    }

    if (!month) {
      const now = new Date()
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    const { start, end } = parseMonthRange(month)
    const scope = storeId ? 'store' : 'all'

    // 查询是否已有缓存（对齐 schema）
    const cacheRes = await db.collection(KPI_COLL)
      .where({ user_id: uid, month, scope, store_id: storeId || '' })
      .get()

    const doc = (cacheRes.data && cacheRes.data[0]) || null

    if (doc && !force) {
      return {
        code: 0,
        msg: 'success',
        data: {
          month,
          scope: storeId ? 'store' : 'mine',
          storeId,
          storeCount: doc.store_count || 0,
          shopStats: doc.shop_stats || {},
          serviceStats: doc.service_stats || {},
          financeStats: doc.finance_stats || {}
        }
      }
    }

    // 重算并写入（upsert）
    const calc = await recalcMonthlyBusinessKpis({ user_id: uid, month, store_id: storeId })
    const { storeCount, shopStats, serviceStats, financeStats } = calc
    const nowTs = Date.now()

    if (doc) {
      await db.collection(KPI_COLL).doc(doc._id).update({
        store_count: storeCount,
        shop_stats: shopStats,
        service_stats: serviceStats,
        finance_stats: financeStats,
        calc_version: 1,
        update_time: nowTs
      })
    } else {
      await db.collection(KPI_COLL).add({
        user_id: uid,
        month,
        scope,
        store_id: storeId || '',
        store_count: storeCount,
        shop_stats: shopStats,
        service_stats: serviceStats,
        finance_stats: financeStats,
        calc_version: 1,
        create_time: nowTs,
        update_time: nowTs
      })
    }

    return {
      code: 0,
      msg: 'success',
      data: {
        month,
        scope: storeId ? 'store' : 'mine',
        storeId,
        storeCount,
        shopStats,
        serviceStats,
        financeStats
      }
    }
  },

  // -----------------------------
  // 手动触发：重算并刷新缓存
  // -----------------------------
  async recalcMonthlyBusinessKpis ({ month, storeId = '' }) {
    const uid = this.uid
    if (!uid) {
      return {
        code: 401,
        msg: '未登录'
      }
    }

    if (!month) {
      const now = new Date()
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    const { start, end } = parseMonthRange(month)

    const calc = await recalcMonthlyBusinessKpis({ user_id: uid, month, store_id: storeId })
    const { storeCount, shopStats, serviceStats, financeStats } = calc
    const scope = storeId ? 'store' : 'all'

    // upsert 到 stats_monthly_kpi
    const existing = await db.collection(KPI_COLL).where({ user_id: uid, month, scope, store_id: storeId || '' }).limit(1).get()
    const nowTs = Date.now()
    if (existing.data && existing.data.length) {
      await db.collection(KPI_COLL).doc(existing.data[0]._id).update({
        store_count: storeCount,
        shop_stats: shopStats,
        service_stats: serviceStats,
        finance_stats: financeStats,
        calc_version: 1,
        update_time: nowTs
      })
    } else {
      await db.collection(KPI_COLL).add({
        user_id: uid,
        month,
        scope,
        store_id: storeId || '',
        store_count: storeCount,
        shop_stats: shopStats,
        service_stats: serviceStats,
        finance_stats: financeStats,
        calc_version: 1,
        create_time: nowTs,
        update_time: nowTs
      })
    }

    return {
      code: 0,
      msg: 'success',
      data: {
        month,
        scope: storeId ? 'store' : 'mine',
        storeId,
        storeCount,
        shopStats,
        serviceStats,
        financeStats
      }
    }
  }
}
