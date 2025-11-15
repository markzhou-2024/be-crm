const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const bookingCollection = db.collection('booking')
const consumeCollection = db.collection('consume')
const buyCollection = db.collection('buy')
const customersCollection = db.collection('customers')

const DAY_MS = 24 * 60 * 60 * 1000

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			code: 401,
			message: '请登录后再试'
		}
	}
}

function toNumber (value, fallback = 0) {
	const num = Number(value)
	return Number.isFinite(num) ? num : fallback
}

function toTimestamp (value) {
	if (!value && value !== 0) return null
	if (typeof value === 'number') return value
	if (typeof value === 'string') {
		const numeric = Number(value)
		if (!Number.isNaN(numeric)) return numeric
		const parsed = Date.parse(value)
		if (!Number.isNaN(parsed)) return parsed
	}
	return null
}

function formatDate (dateObj) {
	const date = typeof dateObj === 'number' ? new Date(dateObj) : dateObj
	const y = date.getFullYear()
	const m = `${date.getMonth() + 1}`.padStart(2, '0')
	const d = `${date.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${d}`
}

function startOfDay (time) {
	const date = new Date(time || Date.now())
	date.setHours(0, 0, 0, 0)
	return date.getTime()
}

function parseMonthRange (month) {
	const base = month ? new Date(`${month}-01T00:00:00`) : new Date()
	if (Number.isNaN(base.getTime())) {
		throw { code: 400, message: '月份格式应为 YYYY-MM' }
	}
	const startDate = new Date(base.getFullYear(), base.getMonth(), 1)
	const endDate = new Date(base.getFullYear(), base.getMonth() + 1, 1)
	const calendarStart = new Date(startDate)
	const weekday = startDate.getDay() // 0-6, 周日为0
	const offset = (weekday + 6) % 7 // 以周一开头
	calendarStart.setDate(calendarStart.getDate() - offset)
	const calendarEnd = new Date(calendarStart)
	calendarEnd.setDate(calendarStart.getDate() + 42)
	return {
		start: startDate.getTime(),
		end: endDate.getTime(),
		calendarStart: calendarStart.getTime(),
		calendarEnd: calendarEnd.getTime(),
		displayMonth: `${startDate.getFullYear()}-${`${startDate.getMonth() + 1}`.padStart(2, '0')}`
	}
}

async function fetchBuyMap (uid, buyIds) {
	if (!buyIds || !buyIds.length) return {}
	const { data } = await buyCollection.where(dbCmd.and([
		{ user_id: uid },
		{ _id: dbCmd.in(buyIds) }
	])).field('_id,amount,service_times,quantity').get()
	const map = {}
	if (Array.isArray(data)) {
		data.forEach(doc => {
			const quantity = Number(doc.quantity ?? doc.service_times ?? 0)
			const unitPrice = quantity > 0 ? Number(doc.amount || 0) / quantity : 0
			map[doc._id] = unitPrice
		})
	}
	return map
}

async function ensureFirstPurchaseMap (uid, baseCustomers) {
	const missingIds = []
	const map = {}
	baseCustomers.forEach(c => {
		const ts = toTimestamp(c.first_purchase_at)
		if (ts) {
			map[c._id] = ts
		} else {
			map[c._id] = toTimestamp(c.created_at) || 0
			missingIds.push(c._id)
		}
	})
	if (!missingIds.length) return map
	const { data } = await buyCollection.where(dbCmd.and([
		{ user_id: uid },
		{ customer_id: dbCmd.in(missingIds) }
	])).field('customer_id,create_time').get()
	if (Array.isArray(data)) {
		const earliest = {}
		data.forEach(doc => {
			const ts = toTimestamp(doc.create_time)
			if (!ts) return
			if (!(doc.customer_id in earliest) || ts < earliest[doc.customer_id]) {
				earliest[doc.customer_id] = ts
			}
		})
		missingIds.forEach(id => {
			if (earliest[id]) {
				map[id] = earliest[id]
			}
		})
	}
	return map
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
	async next7DaysBookings (params = {}) {
		assertAuthed(this)
		const storeId = (params.store_id || '').trim()
		const start = startOfDay(Date.now())
		const end = start + 7 * DAY_MS
		const conditions = [
			{ user_id: this.uid },
			{ status: 'scheduled' },
			{ start_ts: dbCmd.gte(start) },
			{ start_ts: dbCmd.lt(end) }
		]
		if (storeId) {
			conditions.push({ store_id: storeId })
		}
		const { data } = await bookingCollection.where(dbCmd.and(conditions)).orderBy('start_ts', 'asc').get()
		const groups = {}
		if (Array.isArray(data)) {
			data.forEach(item => {
				const key = formatDate(new Date(item.start_ts))
				if (!groups[key]) {
					groups[key] = []
				}
				const time = new Date(item.start_ts)
				const hh = `${time.getHours()}`.padStart(2, '0')
				const mm = `${time.getMinutes()}`.padStart(2, '0')
				groups[key].push({
					id: item._id || item.id,
					time: `${hh}:${mm}`,
					customer_id: item.customer_id,
					customer_name: item.customer_name,
					service_name: item.service_name,
					store_id: item.store_id,
					store_name: item.store_name
				})
			})
		}
		const result = []
		for (let i = 0; i < 7; i++) {
			const dayKey = formatDate(new Date(start + i * DAY_MS))
			result.push({
				date: dayKey,
				items: groups[dayKey] || []
			})
		}
		return { code: 0, data: result }
	},
	async monthCalendarSummary (params = {}) {
		assertAuthed(this)
		const storeId = (params.store_id || '').trim()
		const { calendarStart, calendarEnd, displayMonth } = parseMonthRange(params.month)
		const bookingConditions = [
			{ user_id: this.uid },
			{ status: dbCmd.in(['scheduled', 'completed']) },
			{ start_ts: dbCmd.gte(calendarStart) },
			{ start_ts: dbCmd.lt(calendarEnd) }
		]
		const consumeConditions = [
			{ user_id: this.uid },
			{ consumed_at: dbCmd.gte(calendarStart) },
			{ consumed_at: dbCmd.lt(calendarEnd) }
		]
		if (storeId) {
			bookingConditions.push({ store_id: storeId })
			consumeConditions.push({ store_id: storeId })
		}
		const [bookingRes, consumeRes] = await Promise.all([
			bookingCollection.where(dbCmd.and(bookingConditions)).field('start_ts').get(),
			consumeCollection.where(dbCmd.and(consumeConditions)).field('consumed_at,count').get()
		])
		const bookingMap = {}
		if (Array.isArray(bookingRes.data)) {
			bookingRes.data.forEach(item => {
				const key = formatDate(new Date(item.start_ts))
				bookingMap[key] = (bookingMap[key] || 0) + 1
			})
		}
		const consumeMap = {}
		if (Array.isArray(consumeRes.data)) {
			consumeRes.data.forEach(item => {
				const key = formatDate(new Date(item.consumed_at))
				const count = Number(item.count || 0)
				consumeMap[key] = (consumeMap[key] || 0) + count
			})
		}
		const days = []
		for (let i = 0; i < 42; i++) {
			const dayTs = calendarStart + i * DAY_MS
			const key = formatDate(new Date(dayTs))
			days.push({
				date: key,
				booking_count: bookingMap[key] || 0,
				consume_count: consumeMap[key] || 0
			})
		}
		return {
			code: 0,
			data: {
				month: displayMonth,
				days
			}
		}
	},
	async storeMonthlyKPI (params = {}) {
		assertAuthed(this)
		const storeId = (params.store_id || '').trim()
		if (!storeId) {
			return { code: 400, message: 'store_id 为必填项' }
		}
		const { start, end } = parseMonthRange(params.month)
		const conditions = [
			{ user_id: this.uid },
			{ store_id: storeId },
			{ consumed_at: dbCmd.gte(start) },
			{ consumed_at: dbCmd.lt(end) }
		]
		const { data } = await consumeCollection.where(dbCmd.and(conditions)).field('customer_id,count,buy_id').get()
		const distinct = new Set()
		let serviceCount = 0
		const buyIds = new Set()
		if (Array.isArray(data)) {
			data.forEach(item => {
				if (item.customer_id) distinct.add(item.customer_id)
				serviceCount += Number(item.count || 0)
				if (item.buy_id) buyIds.add(item.buy_id)
			})
		}
		const buyMap = await fetchBuyMap(this.uid, Array.from(buyIds))
		let consumeAmount = 0
		if (Array.isArray(data)) {
			data.forEach(item => {
				const unitPrice = buyMap[item.buy_id] || 0
				consumeAmount += unitPrice * Number(item.count || 0)
			})
		}
		return {
			code: 0,
			data: {
				arrive_customer_distinct: distinct.size,
				service_count: serviceCount,
				consume_amount: Number(consumeAmount.toFixed(2))
			}
		}
	},
	async customerStoreVisitCount (params = {}) {
		assertAuthed(this)
		const customerId = (params.customer_id || '').trim()
		const storeId = (params.store_id || '').trim()
		if (!customerId || !storeId) {
			return { code: 400, message: 'customer_id 与 store_id 均为必填' }
		}
		const { start, end } = parseMonthRange(params.month)
		const conditions = [
			{ user_id: this.uid },
			{ customer_id: customerId },
			{ store_id: storeId },
			{ consumed_at: dbCmd.gte(start) },
			{ consumed_at: dbCmd.lt(end) }
		]
		const { data } = await consumeCollection.where(dbCmd.and(conditions)).field('count').get()
		let total = 0
		if (Array.isArray(data)) {
			data.forEach(item => {
				total += Number(item.count || 0)
			})
		}
		return { code: 0, data: { visit_count: total } }
	},
	async customerSegmentationMonthly (params = {}) {
		assertAuthed(this)
		const storeId = (params.store_id || '').trim()
		const { start, end } = parseMonthRange(params.month)
		const customerWhere = { user_id: this.uid }
		if (storeId) {
			customerWhere.store_id = storeId
		}
		const customerRes = await customersCollection.where(customerWhere).field('_id,first_purchase_at,created_at').get()
		const customers = Array.isArray(customerRes.data) ? customerRes.data : []
		if (!customers.length) {
			return {
				code: 0,
				data: {
					old_customer_count: 0,
					old_customer_visit_count_this_month: 0,
					new_customer_count: 0,
					new_customer_with_purchase_count: 0
				}
			}
		}
		const firstPurchaseMap = await ensureFirstPurchaseMap(this.uid, customers)
		const oldSet = new Set()
		const newSet = new Set()
		Object.keys(firstPurchaseMap).forEach(id => {
			const ts = firstPurchaseMap[id]
			if (!ts && ts !== 0) return
			if (ts < start) {
				oldSet.add(id)
			} else if (ts >= start && ts < end) {
				newSet.add(id)
			}
		})
		const consumeConditions = [
			{ user_id: this.uid },
			{ consumed_at: dbCmd.gte(start) },
			{ consumed_at: dbCmd.lt(end) }
		]
		if (storeId) consumeConditions.push({ store_id: storeId })
		const consumeRes = await consumeCollection.where(dbCmd.and(consumeConditions)).field('customer_id,count').get()
		let oldVisitCount = 0
		if (Array.isArray(consumeRes.data)) {
			consumeRes.data.forEach(item => {
				if (oldSet.has(item.customer_id)) {
					oldVisitCount += Number(item.count || 0)
				}
			})
		}
		const buyConditions = [
			{ user_id: this.uid },
			{ create_time: dbCmd.gte(start) },
			{ create_time: dbCmd.lt(end) }
		]
		if (storeId) buyConditions.push({ store_id: storeId })
		const buyRes = await buyCollection.where(dbCmd.and(buyConditions)).field('customer_id').get()
		const newWithPurchase = new Set()
		if (Array.isArray(buyRes.data)) {
			buyRes.data.forEach(item => {
				if (newSet.has(item.customer_id)) {
					newWithPurchase.add(item.customer_id)
				}
			})
		}
		return {
			code: 0,
			data: {
				old_customer_count: oldSet.size,
				old_customer_visit_count_this_month: oldVisitCount,
				new_customer_count: newSet.size,
				new_customer_with_purchase_count: newWithPurchase.size
			}
		}
	}
}
