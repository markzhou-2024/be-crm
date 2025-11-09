// 云对象教程 https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const customersCollection = db.collection('customers')

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

async function ensurePhoneUnique (uid, phone, excludeId) {
	if (!phone) return
	const where = {
		user_id: uid,
		phone
	}
	if (excludeId) {
		where._id = dbCmd.neq(excludeId)
	}
	const { data } = await customersCollection.where(where).limit(1).get()
	if (data && data.length) {
		throw {
			errCode: 'PHONE_EXISTS',
			errMsg: '手机号已存在'
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
	async createCustomer (customer = {}) {
		assertAuthed(this)
		const name = (customer.name || '').trim()
		const storeId = (customer.store_id || '').trim()
		if (!name || !storeId) {
			return {
				errCode: 'INVALID_PARAM',
				errMsg: '姓名与归属门店为必填项'
			}
		}
		const phone = (customer.phone || '').trim()
		await ensurePhoneUnique(this.uid, phone)
		const now = Date.now()
		const payload = {
			user_id: this.uid,
			name,
			store_id: storeId,
			store_name: customer.store_name || '',
			phone,
			is_vip: !!customer.is_vip,
			avatar: customer.avatar || '',
			tags: customer.tags || '',
			city: customer.city || '',
			notes: customer.notes || '',
			total_spend: Number(customer.total_spend) || 0,
			visit_count: Number(customer.visit_count) || 0,
			last_visit_days: Number(customer.last_visit_days) || 0,
			last_visit_label: customer.last_visit_label || '',
			create_time: now,
			update_time: now
		}
		const res = await customersCollection.add(payload)
		const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
		return {
			errCode: 0,
			data: {
				_id: insertedId || payload._id,
				...payload
			}
		}
	},
	async updateCustomer (customer = {}) {
		assertAuthed(this)
		const id = customer._id || customer.id
		if (!id) {
			return {
				errCode: 'INVALID_PARAM',
				errMsg: '缺少客户ID'
			}
		}
		const name = customer.name !== undefined ? String(customer.name || '').trim() : undefined
		const storeId = customer.store_id !== undefined ? String(customer.store_id || '').trim() : undefined
		if (name === '') {
			return { errCode: 'INVALID_PARAM', errMsg: '姓名不能为空' }
		}
		if (storeId === '') {
			return { errCode: 'INVALID_PARAM', errMsg: '归属门店不能为空' }
		}
		const phone = customer.phone === undefined ? undefined : String(customer.phone || '').trim()
		await ensurePhoneUnique(this.uid, phone, id)

		const updates = {}
		const assign = (field, value) => {
			if (value !== undefined) updates[field] = value
		}
		assign('name', name !== undefined ? name : undefined)
		assign('store_id', storeId !== undefined ? storeId : undefined)
		assign('store_name', customer.store_name)
		if (phone !== undefined) {
			assign('phone', phone)
		}
		assign('is_vip', customer.is_vip !== undefined ? !!customer.is_vip : undefined)
		assign('avatar', customer.avatar)
		assign('tags', customer.tags)
		assign('city', customer.city)
		assign('notes', customer.notes)
		assign('total_spend', customer.total_spend !== undefined ? Number(customer.total_spend) || 0 : undefined)
		assign('visit_count', customer.visit_count !== undefined ? Number(customer.visit_count) || 0 : undefined)
		assign('last_visit_days', customer.last_visit_days !== undefined ? Number(customer.last_visit_days) || 0 : undefined)
		assign('last_visit_label', customer.last_visit_label)
		if (!Object.keys(updates).length) {
			return { errCode: 0, updated: 0 }
		}
		updates.update_time = Date.now()
		const res = await customersCollection.where({
			_id: id,
			user_id: this.uid
		}).update(updates)
		return {
			errCode: 0,
			updated: res.updated || res.affectedDocs || 0
		}
	},
	async deleteCustomer (id) {
		assertAuthed(this)
		if (!id) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
		}
		const res = await customersCollection.where({
			_id: id,
			user_id: this.uid
		}).remove()
		return {
			errCode: 0,
			deleted: res.deleted || res.affectedDocs || 0
		}
	},
	async listCustomers () {
		assertAuthed(this)
		const { data } = await customersCollection.where({
			user_id: this.uid
		}).orderBy('create_time', 'desc').get()
		return data || []
	},
	async getCustomerById (id) {
		assertAuthed(this)
		if (!id) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少客户ID' }
		}
		const { data } = await customersCollection.where({
			_id: id,
			user_id: this.uid
		}).limit(1).get()
		return data && data[0] ? data[0] : null
	}
}
