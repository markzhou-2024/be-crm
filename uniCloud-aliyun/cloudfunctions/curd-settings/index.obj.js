const uniID = require('uni-id-common')
const db = uniCloud.database()
const settingsCollection = db.collection('settings')

function assertAuthed (ctx) {
	if (!ctx.uid) {
		throw {
			errCode: 'AUTH_REQUIRED',
			errMsg: '请登录后再试'
		}
	}
}

async function ensureConfig (uid) {
	const { data } = await settingsCollection.where({ user_id: uid }).limit(1).get()
	if (Array.isArray(data) && data.length) {
		return data[0]
	}
	const now = Date.now()
	const doc = {
		user_id: uid,
		auto_supplement_product: true,
		create_time: now,
		update_time: now
	}
	await settingsCollection.add(doc)
	return doc
}

function normalizeConfig (doc) {
	return {
		user_id: doc.user_id,
		auto_supplement_product: doc.auto_supplement_product !== false
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
	async getConfig () {
		assertAuthed(this)
		const config = await ensureConfig(this.uid)
		return {
			code: 0,
			msg: 'ok',
			data: normalizeConfig(config)
		}
	},
	async updateConfig (payload = {}) {
		assertAuthed(this)
		const enabled = payload.auto_supplement_product
		if (enabled !== true && enabled !== false) {
			return { code: 400, msg: '参数错误' }
		}
		const now = Date.now()
		const { data } = await settingsCollection.where({ user_id: this.uid }).limit(1).get()
		if (Array.isArray(data) && data.length) {
			await settingsCollection.doc(data[0]._id).update({
				auto_supplement_product: enabled,
				update_time: now
			})
		} else {
			await settingsCollection.add({
				user_id: this.uid,
				auto_supplement_product: enabled,
				create_time: now,
				update_time: now
			})
		}
		return {
			code: 0,
			msg: 'ok',
			data: {
				user_id: this.uid,
				auto_supplement_product: enabled
			}
		}
	}
}
