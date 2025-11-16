// uniCloud/cloudfunctions/consume-service/index.obj.js

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const consumeCollection = db.collection('consume')
const customersCollection = db.collection('customers')
const buyCollection = db.collection('buy')

module.exports = {
  /**
   * 统一从 token 中解析 uid
   */
  async _before () {
    const clientInfo = this.getClientInfo()
    this.uniID = uniID.createInstance({ clientInfo })

    const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null

    let token = ''
    // 小程序 / App 端常规 token
    if (clientInfo && clientInfo.uniIdToken) {
      token = clientInfo.uniIdToken
    }
    // HTTP 头里的 token（云函数直调）
    if (!token && httpInfo && httpInfo.headers) {
      token = httpInfo.headers['x-uni-id-token'] ||
              httpInfo.headers['uni-id-token'] ||
              ''
    }
    // body 里的 token（POST JSON）
    if (!token && httpInfo && httpInfo.body) {
      try {
        const body = JSON.parse(httpInfo.body)
        token = body.uniIdToken || ''
      } catch (e) {}
    }

    this.uid = null
    if (token) {
      const payload = await this.uniID.checkToken(token)
      if (payload && !payload.errCode && !payload.code) {
        this.uid = payload.uid
      }
    }
  },

  /**
   * 新增一条消耗记录，并同步维护 customers 统计信息
   * @param {Object} params
   *  - customer_id: 顾客ID（必填）
   *  - buy_id: 购买记录ID（可选，但有最好）
   *  - product_name: 项目/套餐名称
   *  - count: 本次消耗次数（必填，正整数）
   *  - store_id: 门店ID（可选）
   *  - store_name: 门店名称（可选）
   *  - store_service: 是否门店人员登记 true/false（可选，默认 false=顾问）
   *  - consumed_at: 消耗发生时间戳（ms，可选，不传则用当前时间）
   */
  async createConsumeRecord (params = {}) {
    if (!this.uid) {
      return { code: 401, msg: '未登录或登录已失效' }
    }

    const {
      customer_id,
      buy_id = '',
      product_name = '',
      count,
      store_id = '',
      store_name = '',
      store_service = false,
      consumed_at
    } = params

    // 基本参数校验
    if (!customer_id) {
      return { code: 400, msg: 'customer_id 必填' }
    }
    const cnt = Number(count)
    if (!cnt || !Number.isFinite(cnt) || cnt <= 0) {
      return { code: 400, msg: 'count 必须为大于 0 的数字' }
    }

    // 查询顾客是否存在（假设顾客在其他模块已创建）
    const customerRes = await customersCollection.doc(customer_id).get()
    if (!customerRes.data || !customerRes.data.length) {
      return { code: 404, msg: '对应顾客不存在，请先创建顾客' }
    }
    const customerDoc = customerRes.data[0]

    // 计算单价与金额（基于 buy 记录）
    let unitPrice   = null  // 这里用 null 表示未计算到，数据库可以不写这个字段
    let amount      = null
    let buySnapshot = null

    if (buy_id) {
      const buyRes = await buyCollection.doc(buy_id).get()
      if (buyRes.data && buyRes.data.length) {
        buySnapshot = buyRes.data[0]
        const serviceTimes = Number(buySnapshot.service_times || 0)
        const totalAmount  = Number(buySnapshot.amount || 0)
        if (serviceTimes > 0 && Number.isFinite(totalAmount)) {
          unitPrice = totalAmount / serviceTimes
          amount = unitPrice * cnt
        }
      }
    }

    const nowTs = Date.now()
    const consumedAtTs = consumed_at ? Number(consumed_at) : nowTs

    // 组装即将写入 consume 的文档
    const consumeDoc = {
      user_id: this.uid,
      customer_id,
      buy_id,
      product_name,
      count: cnt,
      store_id,
      store_name,
      store_service: !!store_service,
      consumed_at: consumedAtTs,
      create_time: nowTs,
      update_time: nowTs
    }

    if (unitPrice != null && Number.isFinite(unitPrice)) {
      consumeDoc.unit_price = unitPrice
    }
    if (amount != null && Number.isFinite(amount)) {
      consumeDoc.amount = amount
    }

    // 1. 写入 consume 记录
    let consumeId = ''
    try {
      const addRes = await consumeCollection.add(consumeDoc)
      consumeId = addRes.id || ''
    } catch (e) {
      console.error('createConsumeRecord - insert consume error', e)
      return { code: 500, msg: '新增消耗记录失败' }
    }

    // 2. 更新 customers 统计信息
    try {
      const customerUpdate = {
        // 最近消费时间 & 门店
        last_consume_at: consumedAtTs,
        last_store_id: store_id || customerDoc.last_store_id || '',
        // 更新时间
        update_time: nowTs
      }

      // 累计次数与金额（amount 可能为 null）
      customerUpdate.total_consume_count = dbCmd.inc(cnt)
      if (amount != null && Number.isFinite(amount)) {
        customerUpdate.total_consume_amount = dbCmd.inc(amount)
      } else {
        // 未算出金额则不去修改 total_consume_amount
      }

      // 首次消费时间 / 门店，只在首次为空时写入
      if (!customerDoc.first_consume_at) {
        customerUpdate.first_consume_at = consumedAtTs
      }
      if (!customerDoc.first_store_id && store_id) {
        customerUpdate.first_store_id = store_id
      }

      await customersCollection.doc(customer_id).update(customerUpdate)
    } catch (e) {
      console.error('createConsumeRecord - update customer error', e)
      // 这里不回滚 consume 记录，只打日志；有需要可以再增加补偿逻辑
    }

    return {
      code: 0,
      msg: 'ok',
      data: {
        consume_id: consumeId,
        unit_price: unitPrice,
        amount
      }
    }
  }
}
