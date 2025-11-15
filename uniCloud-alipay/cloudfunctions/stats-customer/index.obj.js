'use strict'
const uniID = require('uni-id-common')
const db = uniCloud.database()
const BUY = db.collection('buy')
const CONSUME = db.collection('consume')
const CUSTOMERS = db.collection('customers')

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
    if (!this.uid) return { code: 401, msg: '未登录或登录已失效' }
  },

  /**
   * 统计顾客累计消费 & 到店次数（到店次数=consume.count 之和）
   * @param {String} customer_id
   * @return { code, data: { total_spend, visit_count } }
   */
  async summary ({ customer_id }) {
    if (!customer_id) return { code: 400, msg: 'customer_id 必填' }

    let total_spend = 0
    try {
      const r = await BUY.where({ user_id: this.uid, customer_id })
        .groupBy()
        .groupField('sum(amount) as s')
        .get()
      total_spend = Number(r.data?.[0]?.s || 0)
    } catch (e) {
      total_spend = 0
    }

    let visit_count = 0
    try {
      const r = await CONSUME.where({ user_id: this.uid, customer_id })
        .groupBy()
        .groupField('sum(count) as c')
        .get()
      visit_count = Number(r.data?.[0]?.c || 0)
    } catch (e) {
      visit_count = 0
    }

    try {
      await CUSTOMERS.where({ _id: customer_id, user_id: this.uid }).update({
        total_spend,
        visit_count,
        update_time: Date.now()
      })
    } catch (e) {}

    return { code: 0, data: { total_spend, visit_count } }
  }
}
