'use strict'
const uniID = require('uni-id-common')
const db = uniCloud.database()

const AI_CONFIG = {
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || 'YOUR_DEEPSEEK_API_KEY',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
}

const ALLOWED_COLLECTIONS = ['stats_monthly_kpi', 'purchases']

function buildAuthContext (ctx) {
  const clientInfo = ctx.getClientInfo()
  ctx.uniID = uniID.createInstance({ clientInfo })

  const httpInfo = typeof ctx.getHttpInfo === 'function' ? ctx.getHttpInfo() : null
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
      token = parsed.uniIdToken || parsed.uni_id_token || ''
    } catch (e) {
      // ignore parse error
    }
  }
  return { clientInfo, token }
}

module.exports = {
  async _before () {
    const { token } = buildAuthContext(this)
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

  async ask (payload = {}) {
    const question = typeof payload === 'string' ? payload : payload.question
    if (!question || typeof question !== 'string') {
      return { code: 400, msg: '问题不能为空' }
    }
    if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === 'YOUR_DEEPSEEK_API_KEY') {
      return { code: 400, msg: '请先在 ai-analyst 云对象中配置有效的 AI API Key' }
    }

    const dbSchemaPrompt = `
你是我的门店经营分析助手。我的数据库使用的是 uniCloud JQL 语法。

我有以下数据表：
1. 表名: "stats_monthly_kpi" (月度统计表)
   - 字段: month (字符串, 格式"YYYY-MM")
   - 字段: totalSales (数字, 总销售额)
   - 字段: newCustomers (数字, 新增客户数)
   - 字段: totalOrders (数字, 订单数)

2. 表名: "purchases" (消费记录表)
   - 字段: total_fee (数字, 金额)
   - 字段: add_time (时间戳)
   - 字段: goods_name (商品名称)

用户的问题是: "${question}"

请分两步思考：
第一步：判断用户想查询什么数据。请直接返回一个 JQL 查询对象代码（JSON 格式），不要任何解释。
例如用户问"上个月销售额"，返回: {"collection": "stats_monthly_kpi", "where": "month == '2023-10'", "field": "totalSales"}
如果需要聚合统计，尽量简化查询。
`

    try {
      const intentRes = await this._callAI([
        { role: 'system', content: dbSchemaPrompt }
      ])
      let aiResponseText = intentRes.choices?.[0]?.message?.content || ''
      aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim()

      let queryOption = null
      try {
        queryOption = JSON.parse(aiResponseText)
      } catch (e) {
        return { code: 0, answer: aiResponseText, data: { answer: aiResponseText, isChat: true } }
      }

      if (!ALLOWED_COLLECTIONS.includes(queryOption.collection)) {
        return { code: 400, msg: '不支持的查询集合' }
      }

      const collection = db.collection(queryOption.collection)
      let query = collection
      const userScope = { user_id: this.uid }
      if (queryOption.where) {
        if (typeof queryOption.where === 'string') {
          query = query.where(queryOption.where).where(userScope)
        } else if (typeof queryOption.where === 'object') {
          query = query.where(Object.assign({}, queryOption.where, userScope))
        } else {
          query = query.where(userScope)
        }
      } else {
        query = query.where(userScope)
      }
      if (queryOption.field) query = query.field(queryOption.field)
      if (queryOption.orderBy) {
        query = query.orderBy(queryOption.orderBy, queryOption.orderType || 'desc')
      }
      if (queryOption.limit) query = query.limit(queryOption.limit)
      else query = query.limit(50)

      const dbRes = await query.get()
      const dataResult = dbRes.data || []

      const analysisPrompt = `
用户问题: "${question}"
查询到的数据库数据: ${JSON.stringify(dataResult)}

请扮演一位专业的门店经营顾问，根据以上数据，用简洁、鼓励的语气回答用户。
如果数据为空，请告诉用户没有查到相关记录。
如果数据有波动，可以给出简单的分析建议。
`

      const finalRes = await this._callAI([
        { role: 'user', content: analysisPrompt }
      ])

      const answer = finalRes.choices?.[0]?.message?.content || '未能生成回复'
      return {
        code: 0,
        answer,
        dataReference: dataResult,
        data: { answer, dataReference: dataResult, query: queryOption }
      }
    } catch (err) {
      return { code: 500, msg: err?.message || 'AI 分析失败' }
    }
  },

  async _callAI (messages) {
    const result = await uniCloud.httpclient.request(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      dataType: 'json',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_CONFIG.apiKey}`
      },
      data: {
        model: AI_CONFIG.model,
        messages,
        temperature: 0.7
      }
    })

    if (result.status !== 200) {
      throw new Error('AI 接口请求失败: ' + JSON.stringify(result.data))
    }
    return result.data
  }
}
