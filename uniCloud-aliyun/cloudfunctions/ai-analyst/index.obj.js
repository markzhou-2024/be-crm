const uniID = require('uni-id-common')
const db = uniCloud.database()

const ALLOWED_COLLECTIONS = ['stats_monthly_kpi', 'buy', 'consume', 'booking', 'customers']
const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  apiKey: process.env.AI_API_KEY || 'YOUR_API_KEY',
  model: process.env.AI_MODEL || 'deepseek-chat'
}

function normalizeWhere (uid, rawWhere) {
  const userClause = `user_id == "${uid}"`
  if (!rawWhere) return userClause
  if (typeof rawWhere === 'string') {
    return `(${userClause}) && (${rawWhere})`
  }
  if (typeof rawWhere === 'object') {
    return { ...rawWhere, user_id: uid }
  }
  return userClause
}

module.exports = {
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

  async ask (question = '') {
    if (!this.uid) {
      return { code: 401, msg: '请先登录' }
    }

    const trimmed = (question || '').trim()
    if (!trimmed) {
      return { code: 400, msg: '请输入想要咨询的问题' }
    }

    if (!AI_CONFIG.apiKey || AI_CONFIG.apiKey === 'YOUR_API_KEY') {
      return { code: 503, msg: '请先在 ai-analyst 云对象中配置 AI 接口的 apiKey' }
    }

    const dbSchemaPrompt = `你是我的经营分析助手，负责把用户自然语言转成 uniCloud JQL 查询。\n\n数据表结构：\n1) stats_monthly_kpi：月度经营指标缓存，字段示例：month(YYYY-MM)、scope(all/store)、store_id、shop_stats.totalVisitors、shop_stats.newCustomers、service_stats.consultantServices、finance_stats.monthSalesAmount 等。\n2) buy：客户购买记录，字段示例：purchase_date(YYYY-MM-DD)、total_fee、store_id、customer_id、user_id。\n3) consume：消耗记录，字段示例：consumed_at(时间戳)、count、store_id、customer_id、user_id、operator_role。\n4) booking：预约到访记录，字段示例：start_ts(时间戳)、store_id、user_id、arrived。\n5) customers：客户信息，字段示例：created_at、first_purchase_at、store_id、user_id。\n\n要求：只返回 JSON 对象，不要解释，字段包含 collection、where、field、orderBy、orderType、limit。所有查询必须以 user_id 作为条件。用户问题：${trimmed}`

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
        return { code: 0, answer: aiResponseText, isChat: true }
      }

      if (!queryOption || !queryOption.collection || !ALLOWED_COLLECTIONS.includes(queryOption.collection)) {
        return {
          code: 400,
          msg: '暂不支持查询该数据表，请调整提问',
          raw: queryOption
        }
      }

      const collection = db.collection(queryOption.collection)
      let query = collection
      const whereClause = normalizeWhere(this.uid, queryOption.where)
      query = query.where(whereClause)

      if (queryOption.field) query = query.field(queryOption.field)
      if (queryOption.orderBy) query = query.orderBy(queryOption.orderBy, queryOption.orderType || 'desc')
      if (queryOption.limit) query = query.limit(Math.min(Number(queryOption.limit) || 10, 50))

      const dbRes = await query.get()
      const dataResult = dbRes.data || []

      const analysisPrompt = `用户问题：${trimmed}\n数据库数据：${JSON.stringify(dataResult)}\n请用温暖、简洁的中文给出结论和建议。如果没有数据，直接说明未查询到记录。`

      const finalRes = await this._callAI([
        { role: 'user', content: analysisPrompt }
      ])

      return {
        code: 0,
        answer: finalRes.choices?.[0]?.message?.content || '暂未生成答案',
        dataReference: dataResult
      }
    } catch (err) {
      return {
        code: 500,
        answer: `分析暂时不可用，请稍后再试（${err.message || '未知错误'}）`,
        error: true
      }
    }
  },

  async _callAI (messages = []) {
    const baseUrl = (AI_CONFIG.baseUrl || '').replace(/\/$/, '')
    const result = await uniCloud.httpclient.request(`${baseUrl}/chat/completions`, {
      method: 'POST',
      dataType: 'json',
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      data: {
        model: AI_CONFIG.model,
        messages,
        temperature: 0.7
      }
    })

    if (!result || result.status !== 200) {
      throw new Error('AI 接口请求失败：' + JSON.stringify(result && result.data || result))
    }
    return result.data
  }
}
