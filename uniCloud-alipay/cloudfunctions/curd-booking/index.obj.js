// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const bookingCollection = db.collection('booking')

const ALLOWED_STATUS = ['scheduled', 'completed', 'canceled']

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

function toTimestamp (value) {
	if (value === undefined || value === null || value === '') {
		return null
	}
	if (typeof value === 'number') {
		return value
	}
	const numeric = Number(value)
	if (!Number.isNaN(numeric)) {
		return numeric
	}
	const parsed = Date.parse(value)
	if (!Number.isNaN(parsed)) {
		return parsed
	}
	return null
}

function startOfDay (time) {
	const date = new Date(time || Date.now())
	date.setHours(0, 0, 0, 0)
	return date.getTime()
}

function buildRangeCondition (start, end) {
	const conditions = []
	if (start !== null) {
		conditions.push({ start_ts: dbCmd.gte(start) })
	}
	if (end !== null) {
		conditions.push({ start_ts: dbCmd.lt(end) })
	}
	if (!conditions.length) {
		return null
	}
	return conditions.length === 1 ? conditions[0] : dbCmd.and(conditions)
}

module.exports = {
	/**
	 * token 预处理 (token 验证并提取 uid)
	 */
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

		this.authInfo = null
		this.uid = null
		if (token) {
			const payload = await this.uniID.checkToken(token)
			if (!payload || payload.errCode || payload.code) {
				this.authInfo = payload
				return
			}
			this.authInfo = payload
			this.uid = payload.uid
			if (payload.token) {
				this.response = this.response || {}
				this.response.newToken = {
					token: payload.token,
					tokenExpired: payload.tokenExpired
				}
			}
		}
	},
	async add (booking = {}) {
		assertAuthed(this)
		const customerId = (booking.customer_id || booking.customerId || '').trim()
		const startTs = toTimestamp(booking.start_ts || booking.startTs)
		const endTs = toTimestamp(booking.end_ts || booking.endTs)
		if (!customerId || !startTs || !endTs || endTs <= startTs) {
			return { errCode: 'INVALID_PARAM', errMsg: '客户与时间为必填项' }
		}
		const now = Date.now()
		const doc = {
			user_id: this.uid,
			customer_id: customerId,
			customer_name: (booking.customer_name || booking.customerName || '').trim(),
			service_name: (booking.service_name || booking.service || booking.title || '').trim(),
			store_id: (booking.store_id || booking.storeId || '').trim(),
			store_name: (booking.store_name || booking.storeName || '').trim(),
			staff_name: (booking.staff_name || booking.staffName || '').trim(),
			remark: booking.remark || booking.note || '',
			start_ts: startTs,
			end_ts: endTs,
			status: 'scheduled',
			calendar_only: false,
			create_time: now,
			update_time: now
		}
		const res = await bookingCollection.add(doc)
		const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
		return {
			errCode: 0,
			data: {
				_id: insertedId || doc._id,
				...doc
			}
		}
	},
	async listByCustomer (params = {}) {
		assertAuthed(this)
		const customerId = (params.customer_id || params.customerId || '').trim()
		if (!customerId) {
			return []
		}
		const filters = [
			{ user_id: this.uid },
			{ customer_id: customerId },
			{ calendar_only: dbCmd.ne(true) }
		]
		if (params.status) {
			filters.push({ status: params.status })
		}
		const query = filters.length > 1 ? dbCmd.and(filters) : filters[0]
		const { data } = await bookingCollection.where(query).orderBy('start_ts', 'desc').get()
		return data || []
	},
	async updateStatus (params = {}) {
		assertAuthed(this)
		const bookingId = params.booking_id || params.bookingId
		const targetStatus = (params.status || '').trim()
		if (!bookingId || !targetStatus) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少预约ID或状态' }
		}
		if (!ALLOWED_STATUS.includes(targetStatus)) {
			return { errCode: 'INVALID_PARAM', errMsg: '无效的状态值' }
		}
		const res = await bookingCollection.where({
			_id: bookingId,
			user_id: this.uid,
			calendar_only: dbCmd.ne(true)
		}).update({
			status: targetStatus,
			update_time: Date.now()
		})
		return {
			errCode: 0,
			updated: res.updated || res.affectedDocs || 0
		}
	},
	async listToday (filters = {}) {
		assertAuthed(this)
		const start = startOfDay(filters.start || filters.date || undefined)
		const end = start + 24 * 60 * 60 * 1000
		const conditions = [
			{ user_id: this.uid },
			{ calendar_only: dbCmd.ne(true) },
			{ start_ts: dbCmd.gte(start) },
			{ start_ts: dbCmd.lt(end) }
		]
		if (filters.store_id || filters.storeId) {
			const storeId = (filters.store_id || filters.storeId || '').trim()
			if (storeId) {
				conditions.push({ store_id: storeId })
			}
		}
		if (filters.status && ALLOWED_STATUS.includes(filters.status)) {
			conditions.push({ status: filters.status })
		}
		const query = conditions.length > 1 ? dbCmd.and(conditions) : conditions[0]
		const { data } = await bookingCollection.where(query).orderBy('start_ts', 'asc').get()
		return data || []
	},
	async listCalendar (options = {}) {
		assertAuthed(this)
		const start = toTimestamp(options.date_from || options.start)
		const end = toTimestamp(options.date_to || options.end)
		const storeId = (options.store_id || options.storeId || '').trim()
		const conditions = [{ user_id: this.uid }]
		const rangeCondition = buildRangeCondition(start, end)
		if (rangeCondition) {
			conditions.push(rangeCondition)
		}
		if (storeId) {
			conditions.push({ store_id: storeId })
		}
		const query = conditions.length > 1 ? dbCmd.and(conditions) : conditions[0]
		const { data } = await bookingCollection.where(query).orderBy('start_ts', 'asc').get()
		return data || []
	},
	async addCalendar (payload = {}) {
		assertAuthed(this)
		const startTs = toTimestamp(payload.start_ts || payload.startTs)
		const endTs = toTimestamp(payload.end_ts || payload.endTs)
		if (!startTs || !endTs || endTs <= startTs) {
			return { errCode: 'INVALID_PARAM', errMsg: '开始与结束时间不正确' }
		}
		const now = Date.now()
		const doc = {
			user_id: this.uid,
			title: (payload.title || '日程安排').trim(),
			note: payload.note || '',
			store_id: (payload.store_id || payload.storeId || '').trim(),
			store_name: (payload.store_name || payload.storeName || '').trim(),
			start_ts: startTs,
			end_ts: endTs,
			calendar_only: true,
			create_time: now,
			update_time: now
		}
		const res = await bookingCollection.add(doc)
		const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
		return {
			errCode: 0,
			data: {
				_id: insertedId || doc._id,
				...doc
			}
		}
	},
	async updateCalendar (payload = {}) {
		assertAuthed(this)
		const bookingId = payload.id || payload._id
		const startTs = toTimestamp(payload.start_ts || payload.startTs)
		const endTs = toTimestamp(payload.end_ts || payload.endTs)
		if (!bookingId || !startTs || !endTs || endTs <= startTs) {
			return { errCode: 'INVALID_PARAM', errMsg: '请确认任务ID及时间' }
		}
		const updates = {
			title: (payload.title || '日程安排').trim(),
			note: payload.note || '',
			store_id: (payload.store_id || payload.storeId || '').trim(),
			store_name: (payload.store_name || payload.storeName || '').trim(),
			start_ts: startTs,
			end_ts: endTs,
			update_time: Date.now()
		}
		const res = await bookingCollection.where({
			_id: bookingId,
			user_id: this.uid,
			calendar_only: true
		}).update(updates)
		return {
			errCode: 0,
			updated: res.updated || res.affectedDocs || 0
		}
	},
	async removeCalendar (params = {}) {
		assertAuthed(this)
		const bookingId = params.id || params._id
		if (!bookingId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少任务ID' }
		}
		const res = await bookingCollection.where({
			_id: bookingId,
			user_id: this.uid,
			calendar_only: true
		}).remove()
		return {
			errCode: 0,
			deleted: res.deleted || res.affectedDocs || 0
		}
	}
}
