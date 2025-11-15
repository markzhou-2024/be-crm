// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129
const uniID = require('uni-id-common')
const db = uniCloud.database()
const shopsCollection = db.collection('shops')

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

module.exports = {
	/**
	 * 通用预处理器：创建 uni-id 实例并校验 token，解析 uid
	 */
	async _before () {
		// 1) 获取客户端信息并创建 uni-id 实例
		const clientInfo = this.getClientInfo()
		this.uniID = uniID.createInstance({
			clientInfo
		})

		// 2) 统一从多来源获取 token（clientInfo、HTTP Header、HTTP Body）
		const httpInfo = typeof this.getHttpInfo === 'function' ? this.getHttpInfo() : null
		let token = ''
		if (clientInfo && clientInfo.uniIdToken) {
			token = clientInfo.uniIdToken
		}
		if (!token && httpInfo && httpInfo.headers) {
			// 常见约定头：x-uni-id-token / uni-id-token
			token = httpInfo.headers['x-uni-id-token'] || httpInfo.headers['uni-id-token'] || ''
		}
		if (!token && httpInfo && httpInfo.body) {
			try {
				const parsed = JSON.parse(httpInfo.body)
				token = parsed.uniIdToken || ''
			} catch (e) {
				// ignore body parse error
			}
		}

		// 3) 校验并解密 token，提取 uid
		this.authInfo = null
		this.uid = null
		if (token) {
			const payload = await this.uniID.checkToken(token)
			// 兼容不同返回字段：errCode 或 code 表示失败
			if (!payload || payload.errCode || payload.code) {
				// token 校验失败时，不抛错，交由具体方法按需处理
				this.authInfo = payload
				return
			}
			this.authInfo = payload
			this.uid = payload.uid
			// 可选：如果返回了新 token，可在此返回给前端（示例保留字段）
			if (payload.token) {
				this.response = this.response || {}
				this.response.newToken = {
					token: payload.token,
					tokenExpired: payload.tokenExpired
				}
			}
		}
	},
	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/
	async createShop (shop = {}) {
		assertAuthed(this)
		const storeName = (shop.store_name || '').trim()
		const storeAddress = (shop.store_address || '').trim()
		if (!storeName || !storeAddress) {
			return {
				errCode: 'INVALID_PARAM',
				errMsg: '门店名称与地址为必填项'
			}
		}
		const now = Date.now()
		const payload = {
			user_id: this.uid,
			store_name: storeName,
			store_address: storeAddress,
			phone: shop.phone || '',
			business_hours: shop.business_hours || '10:00 - 22:00',
			cover_image: shop.cover_image || '',
			customer_count: Number(shop.customer_count) || 0,
			month_revenue: Number(shop.month_revenue) || 0,
			status: shop.status || 'active',
			create_time: now
		}
		const res = await shopsCollection.add(payload)
		const insertedId = res.id || res.insertId || (Array.isArray(res.insertedIds) ? res.insertedIds[0] : null)
		return {
			errCode: 0,
			data: {
				_id: insertedId || payload._id,
				...payload
			}
		}
	},
	async listMyShops () {
		assertAuthed(this)
		const { data } = await shopsCollection.where({
			user_id: this.uid
		}).orderBy('create_time', 'desc').get()
		return data || []
	},
	async listHistoryShops (options = {}) {
		const limit = Number(options.limit) > 0 ? Math.min(Number(options.limit), 200) : 50
		const { data } = await shopsCollection.orderBy('create_time', 'desc').limit(limit).get()
		return data || []
	},
	async getShopById (id) {
		assertAuthed(this)
		if (!id) {
			return {
				errCode: 'INVALID_PARAM',
				errMsg: '缺少门店ID'
			}
		}
		const { data } = await shopsCollection.where({
			user_id: this.uid,
			_id: id
		}).limit(1).get()
		return data && data[0] ? data[0] : null
	},
	async updateShop (shop = {}) {
		assertAuthed(this)
		const id = shop._id || shop.id
		if (!id) {
			return {
				errCode: 'INVALID_PARAM',
				errMsg: '缺少门店ID'
			}
		}
		const updates = {}
		const assignIfSet = (field, formatter) => {
			if (shop[field] !== undefined) {
				updates[field] = typeof formatter === 'function' ? formatter(shop[field]) : shop[field]
			}
		}
		assignIfSet('store_name', (v) => String(v || '').trim())
		assignIfSet('store_address', (v) => String(v || '').trim())
		assignIfSet('phone', (v) => v || '')
		assignIfSet('business_hours', (v) => v || '10:00 - 22:00')
		assignIfSet('cover_image', (v) => v || '')
		assignIfSet('status', (v) => v || 'active')
		assignIfSet('customer_count', (v) => Number(v) || 0)
		assignIfSet('month_revenue', (v) => Number(v) || 0)
		if (Object.prototype.hasOwnProperty.call(updates, 'store_name') && !updates.store_name) {
			return { errCode: 'INVALID_PARAM', errMsg: '门店名称不能为空' }
		}
		if (Object.prototype.hasOwnProperty.call(updates, 'store_address') && !updates.store_address) {
			return { errCode: 'INVALID_PARAM', errMsg: '门店地址不能为空' }
		}
		if (!Object.keys(updates).length) {
			return { errCode: 0, updated: 0 }
		}
		const res = await shopsCollection.where({
			user_id: this.uid,
			_id: id
		}).update(updates)
		return {
			errCode: 0,
			updated: res.updated || res.affectedDocs || 0
		}
	}
}
