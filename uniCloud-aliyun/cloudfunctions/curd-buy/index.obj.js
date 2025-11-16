const uniID = require('uni-id-common')
const db = uniCloud.database()
const buyCollection = db.collection('buy')
const customersCollection = db.collection('customers')

function assertAuthed (ctx) {
  if (!ctx.uid) {
    throw {
      errCode: 'AUTH_REQUIRED',
      errMsg: '请登录后再试'
    }
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
    if (!token && httpInfo && httpInfo.body) {
      try {
        const parsed = JSON.parse(httpInfo.body)
        token = parsed.uniIdToken || ''
      } catch (e) {}
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
  async createPurchase (purchase = {}) {
    assertAuthed(this)
    const packageName = (purchase.package_name || '').trim()
    const customerId = (purchase.customer_id || '').trim()
    const storeName = (purchase.store_name || '').trim()
    const storeIdInput = (purchase.store_id || '').trim()
    if (!packageName || !customerId) {
      return { errCode: 'INVALID_PARAM', errMsg: '套餐名称与客户ID必填' }
    }
    const times = Number(purchase.service_times)
    if (!Number.isInteger(times) || times <= 0) {
      return { errCode: 'INVALID_PARAM', errMsg: '服务次数须为正整数' }
    }
    const amount = Number(purchase.amount)
    if (isNaN(amount) || amount < 0) {
      return { errCode: 'INVALID_PARAM', errMsg: '金额不合法' }
    }
    const date = purchase.purchase_date || new Date().toISOString().slice(0, 10)
    const now = Date.now()
    let storeId = storeIdInput
    let finalStoreName = storeName
    const { data: customerDocs } = await customersCollection.where({
      _id: customerId,
      user_id: this.uid
    }).field({
      store_id: true,
      store_name: true
    }).limit(1).get()
    const customerInfo = customerDocs && customerDocs[0]
    if (customerInfo) {
      if (!storeId) storeId = (customerInfo.store_id || '').trim()
      if (!finalStoreName) finalStoreName = customerInfo.store_name || ''
    }
    const payload = {
      user_id: this.uid,
      customer_id: customerId,
      package_name: packageName,
      service_times: times,
      amount,
      purchase_date: date,
      remark: purchase.remark || '',
      store_id: storeId,
      store_name: finalStoreName,
      create_time: now,
      update_time: now
    }
    const res = await buyCollection.add(payload)
    const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
    return {
      errCode: 0,
      data: {
        _id: insertedId || payload._id,
        ...payload
      }
    }
  },
  async listPurchases (customerId) {
    assertAuthed(this)
    const where = {
      user_id: this.uid
    }
    if (customerId) {
      where.customer_id = customerId
    }
    const { data } = await buyCollection.where(where).orderBy('purchase_date', 'desc').get()
    return data || []
  }
}
