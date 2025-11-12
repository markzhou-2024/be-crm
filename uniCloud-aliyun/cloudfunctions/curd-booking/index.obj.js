const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const bookingCollection = db.collection('booking')

const STATUS_ENUM = ['scheduled', 'completed', 'canceled']

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			code: 401,
			message: '请登录后再试'
		}
	}
}

function getInsertedId (res) {
	return res?.id || res?.insertId || (Array.isArray(res?.insertedIds) ? res.insertedIds[0] : res?.documentId) || null
}

function cleanString (value) {
	return typeof value === 'string' ? value.trim() : ''
}

function parseTimestamp (value) {
	if (typeof value === 'number') return value
	if (typeof value === 'string' && value) {
		const numeric = Number(value)
		if (!Number.isNaN(numeric)) return numeric
		const parsed = Date.parse(value)
		if (!Number.isNaN(parsed)) return parsed
	}
	return null
}

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
		} catch (e) {}
	}
	return token
}

module.exports = {
	async _before () {
		const token = buildAuthContext(this)
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
	async add (payload = {}) {
		assertAuthed(this)
		const customerId = cleanString(payload.customer_id)
		const customerName = cleanString(payload.customer_name)
		const serviceName = cleanString(payload.service_name)
		const storeName = cleanString(payload.store_name)
		const serviceId = cleanString(payload.service_id)
		const storeId = cleanString(payload.store_id)
		const staffId = cleanString(payload.staff_id)
		const staffName = cleanString(payload.staff_name)
		const startTs = parseTimestamp(payload.start_ts)
		const endTs = parseTimestamp(payload.end_ts)

		if (!customerId || !customerName) {
			return { code: 400, message: '缺少客户信息' }
		}
		if (!serviceName) {
			return { code: 400, message: '请输入服务/项目' }
		}
		if (!storeName) {
			return { code: 400, message: '请输入门店' }
		}
		if (!startTs || !endTs) {
			return { code: 400, message: '请选择有效的开始/结束时间' }
		}
		if (endTs <= startTs) {
			return { code: 400, message: '结束时间需晚于开始时间' }
		}

		const overlapExpr = dbCmd.and([
			{ start_ts: dbCmd.lt(endTs) },
			{ end_ts: dbCmd.gt(startTs) }
		])
		const orConditions = [
			dbCmd.and([{ customer_id: customerId }, overlapExpr])
		]
		if (storeId || staffId) {
			const conds = []
			if (storeId) conds.push({ store_id: storeId })
			if (staffId) conds.push({ staff_id: staffId })
			conds.push(overlapExpr)
			orConditions.push(dbCmd.and(conds))
		}
		const conflictWhere = dbCmd.and([
			{ user_id: this.uid },
			{ status: dbCmd.neq('canceled') },
			orConditions.length > 1 ? dbCmd.or(orConditions) : orConditions[0]
		])
		const conflict = await bookingCollection.where(conflictWhere).limit(1).get()
		if (Array.isArray(conflict?.data) && conflict.data.length) {
			return { code: 409, message: '时间段已被占用，请更换时间/人员' }
		}

		const now = Date.now()
		const record = {
			user_id: this.uid,
			customer_id: customerId,
			customer_name: customerName,
			service_name: serviceName,
			store_name: storeName,
			start_ts: startTs,
			end_ts: endTs,
			status: 'scheduled',
			remark: cleanString(payload.remark),
			created_at: now,
			updated_at: now
		}
		if (serviceId) record.service_id = serviceId
		if (storeId) record.store_id = storeId
		if (staffId) record.staff_id = staffId
		if (staffName) record.staff_name = staffName
		const res = await bookingCollection.add(record)
		const insertedId = getInsertedId(res)
		return {
			code: 0,
			data: {
				_id: insertedId,
				...record
			}
		}
	},
	async listByCustomer (params = {}) {
		assertAuthed(this)
		const customerId = cleanString(params.customer_id)
		if (!customerId) {
			return { code: 400, message: '缺少客户ID' }
		}
		const status = cleanString(params.status)
		const page = Math.max(1, Number(params.page) || 1)
		const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
		const conditions = [
			{ user_id: this.uid },
			{ customer_id: customerId }
		]
		if (status && STATUS_ENUM.includes(status)) {
			conditions.push({ status })
		}
		const dateFrom = parseTimestamp(params.date_from)
		const dateTo = parseTimestamp(params.date_to)
		if (dateFrom || dateTo) {
			if (dateFrom) conditions.push({ start_ts: dbCmd.gte(dateFrom) })
			if (dateTo) conditions.push({ start_ts: dbCmd.lt(dateTo) })
		}
		const whereExpr = dbCmd.and(conditions)
		let query = bookingCollection.where(whereExpr).orderBy('start_ts', 'desc')
		const offset = (page - 1) * limit
		if (offset > 0) {
			query = query.skip(offset)
		}
		const res = await query.limit(limit).get()
		return {
			code: 0,
			data: res.data || [],
			pagination: {
				page,
				limit,
				count: res.data?.length || 0
			}
		}
	},
	async updateStatus (params = {}) {
		assertAuthed(this)
		const bookingId = cleanString(params.booking_id || params._id)
		const nextStatus = cleanString(params.status)
		if (!bookingId || !STATUS_ENUM.includes(nextStatus)) {
			return { code: 400, message: '状态或ID不合法' }
		}
		const { updated } = await bookingCollection.where({
			_id: bookingId,
			user_id: this.uid
		}).update({
			status: nextStatus,
			updated_at: Date.now()
		})
		if (!updated) {
			return { code: 404, message: '预约不存在或无权限' }
		}
		return { code: 0, data: { updated: true } }
	},
	async listToday (filters = {}) {
		assertAuthed(this)
		const now = new Date()
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
		const end = start + 24 * 60 * 60 * 1000
		const conditions = [
			{ user_id: this.uid },
			{ start_ts: dbCmd.gte(start) },
			{ start_ts: dbCmd.lt(end) }
		]
		const storeId = cleanString(filters.store_id)
		const staffId = cleanString(filters.staff_id)
		if (storeId) conditions.push({ store_id: storeId })
		if (staffId) conditions.push({ staff_id: staffId })
		const whereExpr = dbCmd.and(conditions)
		const { data } = await bookingCollection.where(whereExpr).orderBy('start_ts', 'asc').get()
		return { code: 0, data: data || [] }
	}
}
