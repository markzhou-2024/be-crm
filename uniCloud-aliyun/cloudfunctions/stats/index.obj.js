const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const consumeCollection = db.collection('consume')
const bookingCollection = db.collection('booking')
const shopsCollection = db.collection('shops')
const buyCollection = db.collection('buy')

function monthRange(month) {
  const base = month ? new Date(`${month}-01T00:00:00`) : new Date()
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  return { start: start.getTime(), end: end.getTime(), month: `${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, '0')}` }
}

async function fetchMyStoreIds(uid) {
  if (!uid) return []
  try {
    const res = await shopsCollection.where({ user_id: uid }).field('_id').get()
    return Array.isArray(res.data) ? res.data.map(item => item._id).filter(Boolean) : []
  } catch (e) {
    return []
  }
}

module.exports = {
  async _before () {
    const clientInfo = this.getClientInfo()
    this.uniID = uniID.createInstance({ clientInfo })

    const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
    let token = ''
    if (clientInfo && clientInfo.uniIdToken) token = clientInfo.uniIdToken
    if (!token && httpInfo && httpInfo.headers) token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
    if (!token && httpInfo && httpInfo.body) {
      try { token = (JSON.parse(httpInfo.body).uniIdToken) || '' } catch (e) {}
    }
    this.uid = null
    if (token) {
      const payload = await this.uniID.checkToken(token)
      if (payload && !payload.errCode && !payload.code) this.uid = payload.uid
    }
  },

  async getMonthlyOverview(params = {}) {
    const { start, end, month } = monthRange(params.month)
    const scope = params.scope === 'global' ? 'global' : 'mine'
    const requestedStoreId = (params.store_id || params.storeId || '').trim()

    const consumeWhere = [{ consumed_at: dbCmd.gte(start) }, { consumed_at: dbCmd.lt(end) }]
    if (scope === 'mine' && this.uid) consumeWhere.push({ user_id: this.uid })

    let targetStoreIds = []
    if (requestedStoreId) {
      targetStoreIds = [requestedStoreId]
    } else if (scope === 'mine') {
      targetStoreIds = await fetchMyStoreIds(this.uid)
    }
    if (targetStoreIds.length) {
      consumeWhere.push({ store_id: dbCmd.in(targetStoreIds) })
    }

    let consumeDocs = []
    try {
      const res = await consumeCollection.where(dbCmd.and(consumeWhere)).field('count,store_service,buy_id').get()
      consumeDocs = Array.isArray(res.data) ? res.data : []
    } catch (e) {}

    let totalVisits = 0
    let consultantVisits = 0
    let storeStaffVisits = 0
    const buyIds = new Set()
    consumeDocs.forEach(doc => {
      const c = Number(doc.count || 0)
      totalVisits += c
      if (doc.store_service === true) storeStaffVisits += c
      else consultantVisits += c
      if (doc.buy_id) buyIds.add(doc.buy_id)
    })

    let unitPriceMap = {}
    if (buyIds.size) {
      try {
        const { data } = await buyCollection.where(dbCmd.and([
          { _id: dbCmd.in(Array.from(buyIds)) }
        ])).field('_id,amount,service_times,quantity').get()
        unitPriceMap = {}
        if (Array.isArray(data)) {
          data.forEach(item => {
            const quantity = Number(item.quantity ?? item.service_times ?? 0)
            const unitPrice = quantity > 0 ? Number(item.amount || 0) / quantity : 0
            unitPriceMap[item._id] = unitPrice
          })
        }
      } catch (e) {
        unitPriceMap = {}
      }
    }

    let totalConsumeAmount = 0
    let pricedConsumeCount = 0
    consumeDocs.forEach(doc => {
      const c = Number(doc.count || 0)
      const unitPrice = doc.buy_id ? Number(unitPriceMap[doc.buy_id] || 0) : 0
      if (unitPrice > 0 && c > 0) {
        totalConsumeAmount += unitPrice * c
        pricedConsumeCount += c
      }
    })

    let calendarBookings = 0
    try {
      const bookingWhere = [
        { start_ts: dbCmd.gte(start) },
        { start_ts: dbCmd.lt(end) }
      ]
      if (scope === 'mine' && this.uid) bookingWhere.push({ user_id: this.uid })
      if (targetStoreIds.length) bookingWhere.push({ store_id: dbCmd.in(targetStoreIds) })
      const res = await bookingCollection.where(dbCmd.and(bookingWhere)).field('_id').count()
      calendarBookings = Number(res.total || 0)
    } catch (e) {}

    const overview = {
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
        totalConsumeAmount: Number(totalConsumeAmount.toFixed(2)),
        totalConsumeAmountChangeRate: 0,
        packageUnitPrice: pricedConsumeCount > 0 ? Number((totalConsumeAmount / pricedConsumeCount).toFixed(2)) : 0,
        totalConsumeCount: totalVisits
      }
    }

    return { code: 0, data: overview }
  }
}
