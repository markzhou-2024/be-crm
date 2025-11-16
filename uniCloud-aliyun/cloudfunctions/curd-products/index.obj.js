const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command
const productsCollection = db.collection('products')

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

function formatProduct (doc) {
	if (!doc) return null
	return {
		id: doc._id || doc.id,
		_id: doc._id,
		user_id: doc.user_id,
		store_id: doc.store_id || '',
		product_name: doc.product_name,
		price: Number(doc.price || 0),
		total_times: Number(doc.total_times || 0),
		status: doc.status || 'on_sale',
		is_draft: !!doc.is_draft,
		source: doc.source || '',
		create_time: doc.create_time,
		update_time: doc.update_time
	}
}

function validateNumber (value, options = {}) {
	const num = Number(value)
	if (!Number.isFinite(num)) return { valid: false }
	if (options.min !== undefined && num < options.min) return { valid: false }
	if (options.integer && !Number.isInteger(num)) return { valid: false }
	return { valid: true, value: num }
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
	async getList () {
		assertAuthed(this)
		const { data } = await productsCollection.where({ user_id: this.uid }).orderBy('update_time', 'desc').get()
		return {
			errCode: 0,
			data: (data || []).map(formatProduct)
		}
	},
	async getDetail (params = {}) {
		assertAuthed(this)
		const productId = params.product_id || params.id
		if (!productId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少产品ID' }
		}
		const { data } = await productsCollection.where({
			_id: productId,
			user_id: this.uid
		}).limit(1).get()
		if (!data || !data.length) {
			return { errCode: 'NOT_FOUND', errMsg: '产品不存在' }
		}
		return {
			errCode: 0,
			data: formatProduct(data[0])
		}
	},
	async create (payload = {}) {
		assertAuthed(this)
		const name = (payload.product_name || '').trim()
		if (!name) {
			return { errCode: 'INVALID_PARAM', errMsg: '产品名称必填' }
		}
		const { data: exist } = await productsCollection.where({
			user_id: this.uid,
			product_name: name
		}).limit(1).get()
		if (exist && exist.length) {
			return { errCode: 'DUPLICATE', errMsg: '该产品已存在' }
		}
		const priceCheck = validateNumber(payload.price, { min: 0 })
		if (!priceCheck.valid) {
			return { errCode: 'INVALID_PARAM', errMsg: '价格格式不正确' }
		}
		const totalTimesCheck = validateNumber(payload.total_times, { min: 0, integer: true })
		if (!totalTimesCheck.valid) {
			return { errCode: 'INVALID_PARAM', errMsg: '次数格式不正确' }
		}
		const now = Date.now()
		const doc = {
			user_id: this.uid,
			store_id: (payload.store_id || '').trim(),
			product_name: name,
			price: priceCheck.value,
			total_times: totalTimesCheck.value,
			status: 'on_sale',
			is_draft: false,
			source: payload.source || 'manual',
			create_time: now,
			update_time: now
		}
		const res = await productsCollection.add(doc)
		const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
		return {
			errCode: 0,
			data: formatProduct({ _id: insertedId, ...doc })
		}
	},
	async update (payload = {}) {
		assertAuthed(this)
		const productId = payload.product_id || payload.id
		if (!productId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少产品ID' }
		}
		const updates = {}
		if (payload.product_name !== undefined) {
			const name = (payload.product_name || '').trim()
			if (!name) {
				return { errCode: 'INVALID_PARAM', errMsg: '产品名称必填' }
			}
			updates.product_name = name
			const { data: dup } = await productsCollection.where({
				user_id: this.uid,
				product_name: name,
				_id: dbCmd.neq(productId)
			}).limit(1).get()
			if (dup && dup.length) {
				return { errCode: 'DUPLICATE', errMsg: '该产品已存在' }
			}
		}
		if (payload.price !== undefined) {
			const priceCheck = validateNumber(payload.price, { min: 0 })
			if (!priceCheck.valid) {
				return { errCode: 'INVALID_PARAM', errMsg: '价格格式不正确' }
			}
			updates.price = priceCheck.value
		}
		if (payload.total_times !== undefined) {
			const totalTimesCheck = validateNumber(payload.total_times, { min: 0, integer: true })
			if (!totalTimesCheck.valid) {
				return { errCode: 'INVALID_PARAM', errMsg: '次数格式不正确' }
			}
			updates.total_times = totalTimesCheck.value
		}
		if (!Object.keys(updates).length) {
			return { errCode: 'INVALID_PARAM', errMsg: '无可更新字段' }
		}
		updates.update_time = Date.now()
		const res = await productsCollection.where({
			_id: productId,
			user_id: this.uid
		}).update(updates)
		return {
			errCode: 0,
			updated: res.updated || res.affectedDocs || 0
		}
	},
	async toggleStatus (params = {}) {
		assertAuthed(this)
		const productId = params.product_id || params.id
		if (!productId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少产品ID' }
		}
		const { data } = await productsCollection.where({
			_id: productId,
			user_id: this.uid
		}).limit(1).get()
		if (!data || !data.length) {
			return { errCode: 'NOT_FOUND', errMsg: '产品不存在' }
		}
		const product = data[0]
		if (product.is_draft) {
			return { errCode: 'INVALID_STATUS', errMsg: '草稿不可切换状态' }
		}
		const nextStatus = product.status === 'on_sale' ? 'off_sale' : 'on_sale'
		await productsCollection.doc(product._id).update({
			status: nextStatus,
			update_time: Date.now()
		})
		return {
			errCode: 0,
			data: { status: nextStatus }
		}
	},
	async confirmDraft (payload = {}) {
		assertAuthed(this)
		const productId = payload.product_id || payload.id
		if (!productId) {
			return { errCode: 'INVALID_PARAM', errMsg: '缺少产品ID' }
		}
		const priceCheck = validateNumber(payload.price, { min: 0 })
		if (!priceCheck.valid) {
			return { errCode: 'INVALID_PARAM', errMsg: '价格格式不正确' }
		}
		const totalTimesCheck = validateNumber(payload.total_times, { min: 0, integer: true })
		if (!totalTimesCheck.valid) {
			return { errCode: 'INVALID_PARAM', errMsg: '次数格式不正确' }
		}
		const { data } = await productsCollection.where({
			_id: productId,
			user_id: this.uid
		}).limit(1).get()
		if (!data || !data.length) {
			return { errCode: 'NOT_FOUND', errMsg: '产品不存在' }
		}
		const product = data[0]
		if (!product.is_draft) {
			return { errCode: 'INVALID_STATUS', errMsg: '仅草稿可确认' }
		}
		await productsCollection.doc(product._id).update({
			price: priceCheck.value,
			total_times: totalTimesCheck.value,
			is_draft: false,
			update_time: Date.now()
		})
		return { errCode: 0, msg: 'ok' }
	}
}
