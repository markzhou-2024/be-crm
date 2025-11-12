const uniID = require('uni-id-common')
const db = uniCloud.database()
const consumeCollection = db.collection('consume')
const customersCollection = db.collection('customers')

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

function getInsertedId (res) {
	return res?.id || res?.insertId || (Array.isArray(res?.insertedIds) ? res.insertedIds[0] : res?.documentId) || null
}

function parseTimestamp (value, fallback = Date.now()) {
	if (!value && value !== 0) {
		return fallback
	}
	if (typeof value === 'number') {
		return value
	}
	if (typeof value === 'string') {
		const numeric = Number(value)
		if (!Number.isNaN(numeric)) {
			return numeric
		}
		const date = Date.parse(value)
		return Number.isNaN(date) ? fallback : date
	}
	return fallback
}

function cleanString (value) {
	return typeof value === 'string' ? value.trim() : ''
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
	async add (consume = {}) {
		assertAuthed(this)
		const customerId = cleanString(consume.customer_id)
		const productName = cleanString(consume.product_name || consume.package_name)
		if (!customerId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少客户信息' }
		}
		if (!productName) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少项目名称' }
		}
		const count = Number(consume.count ?? consume.service_times ?? 0)
		if (!Number.isFinite(count) || count <= 0) {
			return { errCode: 'INVALID_PARAM', errMsg: '消耗次数须为正数' }
		}
		const now = Date.now()
		const consumedAt = parseTimestamp(consume.consumed_at ?? consume.service_date, now)
		let storeId = cleanString(consume.store_id)
		let storeName = cleanString(consume.store_name)
		if (!storeId || !storeName) {
			const { data: customerDocs } = await customersCollection.where({
				_id: customerId,
				user_id: this.uid
			}).field('store_id,store_name').limit(1).get()
			const customer = customerDocs && customerDocs[0]
			if (customer) {
				if (!storeId) storeId = cleanString(customer.store_id)
				if (!storeName) storeName = cleanString(customer.store_name)
			}
		}
		const payload = {
			user_id: this.uid,
			customer_id: customerId,
			buy_id: cleanString(consume.buy_id),
			product_name: productName,
			count,
			note: consume.note || consume.remark || '',
			consumed_at: consumedAt,
			store_id: storeId,
			store_name: storeName,
			create_time: now,
			update_time: now
		}
		const res = await consumeCollection.add(payload)
		const insertedId = getInsertedId(res)
		return {
			errCode: 0,
			data: {
				_id: insertedId || payload._id,
				...payload
			}
		}
	},
	async listByCustomer (params = {}) {
		assertAuthed(this)
		const { customer_id: customerId } = params || {}
		const where = {
			user_id: this.uid
		}
		if (customerId) {
			where.customer_id = customerId
		}
		const { data } = await consumeCollection.where(where).orderBy('consumed_at', 'desc').get()
		return {
			errCode: 0,
			data: data || []
		}
	}
}
