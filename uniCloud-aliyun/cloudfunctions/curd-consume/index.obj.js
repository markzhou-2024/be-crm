// 消耗记录 CRUD 云对象
const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const consumeCollection = db.collection('consume')

function normalizeDateString (value) {
	const str = typeof value === 'string' ? value.trim() : ''
	if (!str) return ''
	if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
		return str
	}
	const parsed = Date.parse(str)
	if (Number.isNaN(parsed)) return ''
	const date = new Date(parsed)
	const m = `${date.getMonth() + 1}`.padStart(2, '0')
	const d = `${date.getDate()}`.padStart(2, '0')
	return `${date.getFullYear()}-${m}-${d}`
}

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
				token = parsed.uniIdToken || parsed.uni_id_token || ''
			} catch (e) {
				// ignore
			}
		}

		this.uid = null
		if (token) {
			const payload = await this.uniID.checkToken(token)
			if (payload && !payload.errCode && !payload.code) {
				this.uid = payload.uid
			}
		}
	},

	async listByCustomer (params = {}) {
		assertAuthed(this)
		const customerId = (params.customer_id || params.customerId || '').trim()
		if (!customerId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
		}

		const conditions = [
			{ user_id: this.uid },
			{ customer_id: customerId }
		]

		const dateFrom = params.date_from || params.start_at || params.startAt || ''
		const dateTo = params.date_to || params.end_at || params.endAt || ''
		const normalizedFrom = normalizeDateString(dateFrom)
		const normalizedTo = normalizeDateString(dateTo)
		const tsFrom = normalizedFrom ? Date.parse(`${normalizedFrom}T00:00:00`) : null
		const tsTo = normalizedTo ? Date.parse(`${normalizedTo}T23:59:59`) : null
		if (tsFrom) {
			conditions.push({ consumed_at: dbCmd.gte(tsFrom) })
		}
		if (tsTo) {
			conditions.push({ consumed_at: dbCmd.lte(tsTo) })
		}

		const where = conditions.length > 1 ? dbCmd.and(conditions) : conditions[0]
		const page = Math.max(1, Number(params.page) || 1)
		const pageSize = Math.min(100, Math.max(1, Number(params.page_size || params.pageSize) || 50))
		const skip = (page - 1) * pageSize

		const query = consumeCollection.where(where).orderBy('consumed_at', 'desc').skip(skip).limit(pageSize)
		const { data = [] } = await query.get()
		return data
	}
}
